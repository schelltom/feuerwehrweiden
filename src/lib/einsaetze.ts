import { getCollection } from 'astro:content';

/**
 * Einsätze laden, neuester zuerst, mit fertig formatiertem Datum/Uhrzeit
 * fürs Anzeigen (Ticker, Monitor, Einsatzliste).
 */
export async function ladeEinsaetze() {
  const datumsformat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const zeitformat = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
  return (await getCollection('einsaetze'))
    .map((e) => ({
      ...e.data,
      stichwort: e.data.details ? `${e.data.stichwort} – ${e.data.details}` : e.data.stichwort,
      datum: datumsformat.format(e.data.wann),
      zeit: zeitformat.format(e.data.wann),
    }))
    .sort((a, b) => b.wann.getTime() - a.wann.getTime());
}

/** "2× Gegenstand sichern" (auch im Zusatz: "THL 1 – 2× …") zählt in der Statistik als 2 Einsätze */
export function anzahlVon(e: { stichwort: string }) {
  const m = e.stichwort.match(/(?:^|–\s*)(\d+)\s*×/);
  return m ? Number(m[1]) : 1;
}
