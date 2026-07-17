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
      datum: datumsformat.format(e.data.wann),
      zeit: zeitformat.format(e.data.wann),
    }))
    .sort((a, b) => b.wann.getTime() - a.wann.getTime());
}

/** "2× Gegenstand sichern" zählt in der Statistik als 2 Einsätze */
export function anzahlVon(e: { stichwort: string }) {
  const m = e.stichwort.match(/^(\d+)\s*×/);
  return m ? Number(m[1]) : 1;
}
