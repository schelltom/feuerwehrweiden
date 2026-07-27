import { getCollection } from 'astro:content';

export type Einsatzart = 'Brand' | 'THL' | 'ABC' | 'Sicherheitswache' | 'Sonstige';

/**
 * Einsatzart automatisch aus dem Alarmstichwort ableiten (für die
 * Einsatzbilanz und die Farb-/Symbol-Zuordnung). Es gibt kein eigenes
 * Feld mehr – die Kategorie ergibt sich allein aus dem Stichwort:
 *   B …             → Brand   (B 1, B 3 Person, B-BMA …)
 *   THL …           → THL     (auch "2× THL")
 *   ABC …           → ABC     (ABC Explosion, ABC Öl …)
 *   … SICHERHEITSWACHE → Sicherheitswache ("INF SICHERHEITSWACHE")
 *   alles andere    → Sonstige (inkl. ältere Freitext-Stichwörter)
 * Eine führende Mengenangabe ("2× …") wird vorher entfernt.
 */
export function artVonStichwort(stichwort: string): Einsatzart {
  const s = stichwort.trim().replace(/^\d+\s*[×x]\s*/i, '').toUpperCase();
  if (s === 'B' || /^B[\s\-\d]/.test(s)) return 'Brand';
  if (s.startsWith('THL')) return 'THL';
  if (s.startsWith('ABC')) return 'ABC';
  if (s.includes('SICHERHEITSWACHE')) return 'Sicherheitswache';
  return 'Sonstige';
}

/**
 * Einsätze laden, neuester zuerst, mit fertig formatiertem Datum/Uhrzeit
 * fürs Anzeigen (Ticker, Monitor, Einsatzliste). Die Einsatzart wird aus
 * dem (rohen) Stichwort abgeleitet.
 */
export async function ladeEinsaetze() {
  const datumsformat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const zeitformat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
  return (await getCollection('einsaetze'))
    .map((e) => ({
      ...e.data,
      art: artVonStichwort(e.data.stichwort),
      stichwort: e.data.details ? `${e.data.stichwort} – ${e.data.details}` : e.data.stichwort,
      datum: datumsformat.format(e.data.wann),
      zeit: zeitformat.format(e.data.wann),
    }))
    .sort((a, b) => b.wann.getTime() - a.wann.getTime());
}

/**
 * Wie oft ein Eintrag in der Bilanz zählt. Maßgeblich ist das Feld "anzahl"
 * (z.B. 20× THL Unwetter an einem Tag = 1 Eintrag, zählt 20). Für ältere
 * Freitext-Einträge greift ersatzweise das alte "N×"-Muster im Stichwort/Zusatz.
 */
export function anzahlVon(e: { stichwort: string; anzahl?: number }) {
  if (e.anzahl && e.anzahl > 1) return e.anzahl;
  const m = e.stichwort.match(/(?:^|–\s*)(\d+)\s*×/);
  return m ? Number(m[1]) : 1;
}
