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
import { execSync } from 'node:child_process';
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

// Globaler Schalter aus dem CMS (src/data/push.json → { "aktiv": true }).
// Steht "aktiv" auf false, wird gar nichts verschickt. Fehlt/kaputt die
// Datei, gilt Push als aktiv (fail-open, damit ein Tippfehler nicht alles
// stumm schaltet).
try {
  if (JSON.parse(fs.readFileSync('src/data/push.json', 'utf8')).aktiv === false) {
    console.log('Push global deaktiviert (src/data/push.json → aktiv: false).');
    process.exit(0);
  }
} catch {
  /* Datei fehlt oder unlesbar → als aktiv behandeln */
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

/**
 * Stand einer Datei im vorherigen Commit (github.event.before, per GIT_BEFORE).
 * Liefert, ob die Datei damals schon existierte und ob sie ein Entwurf war.
 * Ohne verwertbares GIT_BEFORE gilt die Datei als "vorher nicht vorhanden".
 */
function vorherStand(datei) {
  const before = process.env.GIT_BEFORE;
  if (!before || /^0+$/.test(before)) return { existierte: false, entwurf: false };
  try {
    const roh = execSync(`git show "${before}:${datei}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return { existierte: true, entwurf: matter(roh).data.entwurf === true };
  } catch {
    return { existierte: false, entwurf: false };
  }
}

// ---- geänderte Dateien → Benachrichtigungen bauen ----
const dateien = process.argv.slice(2).filter(Boolean);
const events = [];

for (const datei of dateien) {
  if (!fs.existsSync(datei)) continue;
  const roh = fs.readFileSync(datei, 'utf8');
  const { data } = matter(roh);
  const slug = path.basename(datei, '.md');

  // Nur beim ÜBERGANG auf "veröffentlicht" pushen: aktuell kein Entwurf und
  // vorher entweder gar nicht vorhanden oder noch Entwurf. So löst sowohl das
  // direkte Anlegen als auch das spätere Freischalten eines Entwurfs genau
  // einmal einen Push aus – spätere Korrektur-Edits an einem bereits
  // veröffentlichten Beitrag dagegen nicht.
  if (data.entwurf === true) continue;
  const vorher = vorherStand(datei);
  if (vorher.existierte && !vorher.entwurf) continue;

  if (datei.includes('/content/berichte/')) {
    events.push({
      channel: 'berichte',
      payload: {
        // Titel signalisiert die Art des Beitrags; der Berichtstitel folgt im
        // Body. (Absender ist auf iOS zusätzlich der App-Name "FF Weiden".)
        title: '🚒 Neuer Bericht 🚒',
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
