/**
 * Atemschutzpflegestelle: E-Mail-Benachrichtigung.
 *
 * Sucht in src/content/daten/atemschutz.json alle Vorgänge mit
 * status "abholbereit", die noch nicht benachrichtigt wurden, schickt der
 * jeweiligen Wehr eine E-Mail und setzt danach benachrichtigt: true.
 *
 * Versand über https://resend.com (kostenlos bis 100 Mails/Tag).
 * Benötigte Umgebungsvariablen:
 *   RESEND_API_KEY  – API-Schlüssel von Resend
 *   MAIL_VON        – Absender, z.B. "Atemschutzpflegestelle <pflegestelle@feuerwehr-weiden.de>"
 *
 * Aufruf: node scripts/atemschutz-benachrichtigen.mjs
 * (läuft automatisch über .github/workflows/atemschutz-mail.yml)
 */
import { readFile, writeFile } from 'node:fs/promises';

const DATEI = new URL('../src/content/daten/atemschutz.json', import.meta.url);
const API_KEY = process.env.RESEND_API_KEY;
const VON = process.env.MAIL_VON;

if (!API_KEY || !VON) {
  console.log('RESEND_API_KEY oder MAIL_VON nicht gesetzt – kein Versand.');
  process.exit(0);
}

const daten = JSON.parse(await readFile(DATEI, 'utf-8'));
const faellig = daten.vorgaenge.filter(
  (v) => v.status === 'abholbereit' && !v.benachrichtigt && v.email
);

if (faellig.length === 0) {
  console.log('Nichts zu benachrichtigen.');
  process.exit(0);
}

let geaendert = false;

for (const v of faellig) {
  const antwort = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: VON,
      to: [v.email],
      subject: `Atemschutz abholbereit: ${v.artikel}`,
      text: [
        `Liebe Kameradinnen und Kameraden der ${v.wehr},`,
        '',
        `eure Anlieferung ist fertig gepflegt und abholbereit:`,
        '',
        `  ${v.artikel}`,
        v.hinweis ? `  Hinweis: ${v.hinweis}` : null,
        '',
        'Abholung zu den Öffnungszeiten der Hauptfeuerwache Weiden,',
        'Landgerichtsstraße 13, 92637 Weiden. Fragen: 0961 / 391 609-11.',
        '',
        'Aktueller Status jederzeit unter:',
        'https://feuerwehr-weiden.de/service/atemschutz/',
        '',
        'Mit kameradschaftlichen Grüßen',
        'Atemschutzpflegestelle der Feuerwehr Weiden',
      ]
        .filter((zeile) => zeile !== null)
        .join('\n'),
    }),
  });

  if (antwort.ok) {
    v.benachrichtigt = true;
    geaendert = true;
    console.log(`✓ ${v.wehr} benachrichtigt (${v.email})`);
  } else {
    console.error(`✗ ${v.wehr}: Versand fehlgeschlagen (${antwort.status})`, await antwort.text());
  }
}

if (geaendert) {
  await writeFile(DATEI, JSON.stringify(daten, null, 2) + '\n', 'utf-8');
  console.log('atemschutz.json aktualisiert (benachrichtigt-Flags gesetzt).');
}
