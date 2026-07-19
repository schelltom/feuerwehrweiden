/**
 * Läuft im Browser: holt /einsaetze.json ungecacht (Cache-Buster umgeht
 * Browser- UND CDN-Cache von GitHub Pages) und meldet frischere Einsätze an
 * alle Beobachter (Lauftext im Hero, Einsatzmonitor). Geprüft wird beim
 * Seitenaufruf, beim Zurückkehren in den Tab und alle 5 Minuten.
 */
export interface EinsatzLive {
  /** ISO-Zeitstempel, dient auch als Versionsvergleich */
  wann: string;
  datum: string;
  zeit: string;
  stichwort: string;
  art: 'THL' | 'Brand' | 'Sonstige';
}

type Melder = (einsaetze: EinsatzLive[]) => void;

const melder: Melder[] = [];
let quelle = '';
let letzterStand = '';

async function pruefe() {
  try {
    const antwort = await fetch(`${quelle}?stand=${Date.now()}`, { cache: 'no-store' });
    if (!antwort.ok) return;
    const einsaetze: EinsatzLive[] = await antwort.json();
    const stand = einsaetze[0]?.wann ?? '';
    /* ISO-Zeitstempel lassen sich als Text vergleichen; nur echte Neuigkeiten melden */
    if (!stand || stand <= letzterStand) return;
    letzterStand = stand;
    melder.forEach((m) => m(einsaetze));
  } catch {
    /* offline o. Ä. – beim nächsten Anlauf wieder versuchen */
  }
}

/**
 * @param neueQuelle Pfad zu einsaetze.json (aus data-quelle, damit der
 *                   Unterpfad-Rewrite im Build greift)
 * @param stand      ISO-Zeitstempel des neuesten mitgelieferten Einsatzes
 */
export function beobachteEinsaetze(neueQuelle: string, stand: string, m: Melder) {
  melder.push(m);
  if (stand > letzterStand) letzterStand = stand;
  if (quelle) return; // Prüf-Rhythmus läuft schon (vom anderen Beobachter gestartet)
  quelle = neueQuelle;
  /* Erst prüfen, wenn alle Beobachter des Seitenaufbaus registriert sind */
  setTimeout(pruefe, 0);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pruefe();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') pruefe();
  }, 5 * 60 * 1000);
}

/** Für sicheres Einsetzen der Einsatzdaten in HTML-Vorlagen */
export function esc(text: string) {
  return text.replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z]!);
}

/** "Neu" nur, wenn der Einsatz keine 6 Stunden her ist */
export function istNeu(wann: string) {
  return Date.now() - Date.parse(wann) < 6 * 60 * 60 * 1000;
}
