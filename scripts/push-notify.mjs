/**
 * Verschickt Web-Push-Benachrichtigungen, wenn ein neuer Bericht oder Einsatz
 * dazugekommen ist. Wird von .github/workflows/push-notify.yml aufgerufen und
 * bekommt die neu hinzugefügten Dateien als Argumente übergeben.
 *
 *   node scripts/push-notify.mjs <datei1> <datei2> ...
 *
 * Kanäle:
 *   - Berichte  → an ALLE Abos (jeder hat "berichte").
 *   - Einsätze  → nur an Abos mit Kanal "einsaetze" (verstecktes Feature).
 *
 * Nötige Umgebungsvariablen (als GitHub-Secrets gesetzt):
 *   VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, PUSH_WORKER_URL, LIST_TOKEN
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import webpush from 'web-push';

const SITE = 'https://feuerwehr-weiden.de';

const {
  VAPID_PUBLIC,
  VAPID_PRIVATE,
  VAPID_SUBJECT = 'mailto:info@feuerwehr-weiden.de',
  PUSH_WORKER_URL,
  LIST_TOKEN,
} = process.env;

if (!VAPID_PUBLIC || !VAPID_PRIVATE || !PUSH_WORKER_URL || !LIST_TOKEN) {
  console.log('Push übersprungen: Secrets nicht vollständig gesetzt.');
  process.exit(0);
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

// ---- neue Dateien → Benachrichtigungen bauen ----
const dateien = process.argv.slice(2).filter(Boolean);
const events = [];

for (const datei of dateien) {
  if (!fs.existsSync(datei)) continue;
  const roh = fs.readFileSync(datei, 'utf8');
  const { data } = matter(roh);
  const slug = path.basename(datei, '.md');

  if (datei.includes('/content/berichte/')) {
    if (data.entwurf === true) continue; // Entwürfe nicht pushen
    events.push({
      channel: 'berichte',
      payload: {
        // Absender ist auf iOS technisch der App-Name ("FF Weiden"); "Florian
        // Weiden" (Funkrufname) daher fest als Titel jeder Bericht-Push.
        title: 'Florian Weiden',
        body: data.kurz
          ? `${data.titel} – ${data.kurz}`
          : data.titel || 'Neuer Beitrag der Feuerwehr Weiden.',
        url: `${SITE}/berichte/${slug}/`,
        tag: `bericht-${slug}`,
      },
    });
  } else if (datei.includes('/content/einsaetze/')) {
    const zusatz = data.details ? ` – ${String(data.details).trim()}` : '';
    events.push({
      channel: 'einsaetze',
      payload: {
        title: '🚒 Einsatz für Florian Weiden',
        body: `${data.stichwort || 'Einsatz'}${zusatz}`,
        url: `${SITE}/einsaetze/`,
        tag: `einsatz-${slug}`,
      },
    });
  }
}

if (events.length === 0) {
  console.log('Nichts Neues zum Benachrichtigen.');
  process.exit(0);
}

// ---- Abos holen ----
const res = await fetch(`${PUSH_WORKER_URL}/subscriptions`, {
  headers: { Authorization: `Bearer ${LIST_TOKEN}` },
});
if (!res.ok) {
  console.error(`Abos konnten nicht geladen werden: ${res.status}`);
  process.exit(1);
}
const { subscriptions } = await res.json();
console.log(`${subscriptions.length} Abo(s), ${events.length} Meldung(en).`);

// ---- versenden ----
let gesendet = 0;
let entfernt = 0;

for (const ev of events) {
  const empfaenger = subscriptions.filter(
    (s) => Array.isArray(s.channels) && s.channels.includes(ev.channel)
  );
  const nutzlast = JSON.stringify(ev.payload);

  await Promise.all(
    empfaenger.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, nutzlast);
        gesendet++;
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          // Abo ist tot → beim Worker austragen
          try {
            await fetch(`${PUSH_WORKER_URL}/unsubscribe`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: s.subscription.endpoint }),
            });
            entfernt++;
          } catch {
            /* ignore */
          }
        } else {
          console.error(`Sendefehler (${code || '?'}):`, err?.body || err?.message || err);
        }
      }
    })
  );
}

console.log(`Fertig: ${gesendet} gesendet, ${entfernt} tote Abos entfernt.`);
