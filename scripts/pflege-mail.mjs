/**
 * Atemschutzwerkstatt & Schlauchpflegestelle: verschickt die Abholbereit-E-Mail und stempelt den Zeitpunkt.
 *
 * Läuft in der GitHub-Action .github/workflows/pflege-mail.yml bei jedem Push,
 * der src/content/pflege/** berührt. Verarbeitet alle Vorgänge mit
 * abholbereit=true, benachrichtigt=false, abgeholt=false:
 *   1. abholbereitSeit wird (falls leer) auf jetzt gesetzt
 *   2. E-Mail an die bei der Wehr hinterlegte Adresse
 *   3. benachrichtigt=true (nur wenn die Mail raus ist)
 *
 * SMTP-Zugang kommt aus den Repo-Secrets SMTP_HOST/PORT/USER/PASS und
 * MAIL_FROM. Fehlen die Secrets, wird nur gestempelt und gewarnt.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';

const PFLEGE = 'src/content/pflege';
const SCHLAEUCHE = 'src/content/schlaeuche';
const WEHREN = 'src/content/wehren';

const frontmatter = (text) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const felder = {};
  if (!m) return felder;
  for (const zeile of m[1].split(/\r?\n/)) {
    const mm = zeile.match(/^([A-Za-z]+):\s*(.*)$/);
    if (mm) felder[mm[1]] = mm[2].replace(/^["']|["']$/g, '');
  }
  return felder;
};

const setzeFeld = (text, feld, wert) => {
  const zeile = `${feld}: ${wert}`;
  if (new RegExp(`^${feld}:`, 'm').test(text)) return text.replace(new RegExp(`^${feld}:.*$`, 'm'), zeile);
  return text.replace(/\n---/, `\n${zeile}\n---`);
};

const inhaltText = (v) => {
  const teile = [
    [v.geraete, 'Gerät', 'Geräte'],
    [v.masken, 'Maske', 'Masken'],
    [v.flaschen, 'Flasche', 'Flaschen'],
    [v.schlaeucheB, 'B-Schlauch', 'B-Schläuche'],
    [v.schlaeucheC, 'C-Schlauch', 'C-Schläuche'],
  ]
    .map(([n, einzahl, mehrzahl]) => [Number(n || 0), einzahl, mehrzahl])
    .filter(([n]) => n > 0)
    .map(([n, einzahl, mehrzahl]) => `${n} ${n === 1 ? einzahl : mehrzahl}`);
  return teile.join(', ') || 'eure Anlieferung';
};

// Zeitstempel in deutscher Zeit, Format wie im CMS (YYYY-MM-DDTHH:mm)
const jetzt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})
  .format(new Date())
  .replace(' ', 'T');

const smtpBereit = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
let transport = null;
if (smtpBereit) {
  const { default: nodemailer } = await import('nodemailer');
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
} else {
  console.warn('⚠ SMTP-Secrets fehlen – es wird nur gestempelt, keine E-Mail verschickt.');
}

for (const datei of readdirSync(PFLEGE).filter((d) => d.endsWith('.md'))) {
  const pfad = `${PFLEGE}/${datei}`;
  let text = readFileSync(pfad, 'utf8');
  const v = frontmatter(text);
  if (v.abholbereit !== 'true' || v.benachrichtigt === 'true' || v.abgeholt === 'true') continue;

  if (!v.abholbereitSeit) text = setzeFeld(text, 'abholbereitSeit', `"${jetzt}"`);

  const wehrPfad = `${WEHREN}/${v.wehr}.md`;
  const wehr = existsSync(wehrPfad) ? frontmatter(readFileSync(wehrPfad, 'utf8')) : { name: v.wehr, email: '' };

  if (!wehr.email) {
    console.warn(`⚠ ${datei}: keine E-Mail bei ${wehr.name} hinterlegt – Mail wird nachgeholt, sobald sie gepflegt ist.`);
  } else if (transport) {
    const abgegeben = v.abgegeben ? v.abgegeben.slice(0, 10).split('-').reverse().join('.') : '';
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: wehr.email,
      subject: `Atemschutzwerkstatt & Schlauchpflegestelle Feuerwehr Weiden: abholbereit für ${wehr.name}`,
      text:
        `Hallo ${wehr.name},\n\n` +
        `eure Anlieferung${abgegeben ? ` vom ${abgegeben}` : ''} ist geprüft und abholbereit: ${inhaltText(v)}.\n` +
        (v.hinweis ? `\nHinweis: ${v.hinweis}\n` : '') +
        `\nAbholung zu den Öffnungszeiten der Hauptfeuerwache, Landgerichtsstraße 13, 92637 Weiden.\n` +
        `Fragen: 0961 / 391 609-11\n\n` +
        `Mit kameradschaftlichen Grüßen\nAtemschutzwerkstatt & Schlauchpflegestelle\nFeuerwehr Weiden i.d.OPf.\n\n` +
        `(Diese E-Mail wurde automatisch versendet.)`,
    });
    text = setzeFeld(text, 'benachrichtigt', 'true');
    console.log(`✓ ${datei}: E-Mail an ${wehr.email} verschickt.`);
  }

  writeFileSync(pfad, text);
}

// Abgeholte Vorgänge (Atemschutz + Schläuche) automatisch entfernen – hält das
// CMS-Backend sauber. (Auf der Website waren sie ohnehin schon ausgeblendet;
// die Git-Historie bewahrt sie weiterhin auf, falls doch mal nachgesehen wird.)
for (const ordner of [PFLEGE, SCHLAEUCHE]) {
  if (!existsSync(ordner)) continue;
  for (const datei of readdirSync(ordner).filter((d) => d.endsWith('.md'))) {
    const pfad = `${ordner}/${datei}`;
    const v = frontmatter(readFileSync(pfad, 'utf8'));
    if (v.abgeholt === 'true') {
      unlinkSync(pfad);
      console.log(`🗑 ${pfad}: abgeholt → gelöscht.`);
    }
  }
}
