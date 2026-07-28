/**
 * ffw-push – Abo-Speicher für die Web-Push-Benachrichtigungen der
 * Feuerwehr Weiden. Läuft als Cloudflare Worker, speichert die Push-Abos
 * in einem KV-Namespace (Binding: SUBS).
 *
 * Endpunkte:
 *   POST /subscribe    { subscription, channels }  → Abo speichern/aktualisieren
 *   POST /unsubscribe  { endpoint }                → Abo löschen
 *   GET  /count                                    → Anzahl Abos (öffentlich, nur Zahl)
 *   GET  /reactions?slug=…                          → Reaktions-Zähler eines Berichts (öffentlich)
 *   POST /react        { slug, key, delta }         → Reaktion ±1 (öffentlich, erlaubte keys)
 *   GET  /subscriptions   (Bearer LIST_TOKEN)      → alle Abos (für die Action)
 *
 * Keine personenbezogenen Klarnamen – gespeichert wird nur der vom Browser
 * erzeugte Push-Endpoint samt Schlüsseln und die gewünschten Kanäle.
 */

const ERLAUBTE_ORIGINS = [
  'https://feuerwehr-weiden.de',
  'https://www.feuerwehr-weiden.de',
  'http://localhost:4321',
  'http://localhost:4322',
];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ERLAUBTE_ORIGINS.includes(origin) ? origin : ERLAUBTE_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

async function schluessel(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // ---- Abo speichern / aktualisieren ----
    if (request.method === 'POST' && url.pathname === '/subscribe') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'kein JSON' }, 400, request);
      }
      const sub = body && body.subscription;
      if (!sub || !sub.endpoint) return json({ error: 'subscription fehlt' }, 400, request);

      const kanaele = Array.isArray(body.channels) && body.channels.length ? body.channels : ['berichte'];
      const key = await schluessel(sub.endpoint);
      await env.SUBS.put(
        key,
        JSON.stringify({ subscription: sub, channels: kanaele, ts: Date.now() })
      );
      return json({ ok: true }, 200, request);
    }

    // ---- Abo löschen ----
    if (request.method === 'POST' && url.pathname === '/unsubscribe') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'kein JSON' }, 400, request);
      }
      if (!body || !body.endpoint) return json({ error: 'endpoint fehlt' }, 400, request);
      await env.SUBS.delete(await schluessel(body.endpoint));
      return json({ ok: true }, 200, request);
    }

    // ---- Öffentliche Abo-Anzahl (nur die Zahl, keine Daten) ----
    if (request.method === 'GET' && url.pathname === '/count') {
      let anzahl = 0;
      let cursor;
      do {
        const list = await env.SUBS.list({ cursor, limit: 1000 });
        // Nur echte Abos zählen. Abo-Keys sind reine SHA-256-Hashes (kein ":");
        // Hilfs-Keys wie "push:"/"react:" enthalten ":" und werden übersprungen.
        anzahl += list.keys.filter((k) => !k.name.includes(':')).length;
        cursor = list.list_complete ? undefined : list.cursor;
      } while (cursor);
      return json({ count: anzahl }, 200, request);
    }

    // ---- Reaktionen eines Berichts lesen (öffentlich, nur Zahlen) ----
    if (request.method === 'GET' && url.pathname === '/reactions') {
      const slug = url.searchParams.get('slug') || '';
      const raw = slug ? await env.SUBS.get(`react:${slug}`) : null;
      return json({ counts: raw ? JSON.parse(raw) : {} }, 200, request);
    }

    // ---- Reaktion setzen/zurücknehmen (öffentlich, ±1, nur erlaubte Keys) ----
    if (request.method === 'POST' && url.pathname === '/react') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'kein JSON' }, 400, request);
      }
      const ERLAUBT = ['stark', 'danke', 'respekt'];
      const slug = body && typeof body.slug === 'string' ? body.slug : '';
      if (!slug || !ERLAUBT.includes(body && body.key)) {
        return json({ error: 'ungültig' }, 400, request);
      }
      const schritt = Number(body.delta) < 0 ? -1 : 1; // nur ±1
      const key = `react:${slug}`;
      const raw = await env.SUBS.get(key);
      const counts = raw ? JSON.parse(raw) : {};
      counts[body.key] = Math.max(0, (Number(counts[body.key]) || 0) + schritt);
      await env.SUBS.put(key, JSON.stringify(counts));
      return json({ counts }, 200, request);
    }

    // ---- Dedup: einen Push-Tag "reservieren" (nur für die GitHub-Action) ----
    // Beim ersten Aufruf frei (fresh:true) und für windowSeconds gesperrt;
    // ein zweiter Aufruf im Fenster liefert fresh:false → Action pusht nicht.
    if (request.method === 'POST' && url.pathname === '/pushed') {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== `Bearer ${env.LIST_TOKEN}`) {
        return json({ error: 'nicht autorisiert' }, 401, request);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'kein JSON' }, 400, request);
      }
      if (!body || !body.tag) return json({ error: 'tag fehlt' }, 400, request);
      const fenster = Math.max(60, Number(body.windowSeconds) || 21600); // KV-TTL min. 60 s
      const key = `push:${body.tag}`;
      if (await env.SUBS.get(key)) return json({ fresh: false }, 200, request);
      await env.SUBS.put(key, String(Date.now()), { expirationTtl: fenster });
      return json({ fresh: true }, 200, request);
    }

    // ---- Alle Abos ausliefern (nur für die GitHub-Action) ----
    if (request.method === 'GET' && url.pathname === '/subscriptions') {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== `Bearer ${env.LIST_TOKEN}`) {
        return json({ error: 'nicht autorisiert' }, 401, request);
      }
      const abos = [];
      let cursor;
      do {
        const list = await env.SUBS.list({ cursor });
        for (const k of list.keys) {
          if (k.name.includes(':')) continue; // Hilfs-Keys (push:/react:) sind keine Abos
          const raw = await env.SUBS.get(k.name);
          if (raw) abos.push(JSON.parse(raw));
        }
        cursor = list.list_complete ? undefined : list.cursor;
      } while (cursor);
      return json({ subscriptions: abos }, 200, request);
    }

    return json({ error: 'nicht gefunden' }, 404, request);
  },
};
