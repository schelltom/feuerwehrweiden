import { ladeEinsaetze } from '../lib/einsaetze';

/**
 * Aktuelle Einsätze als JSON, bei jedem Build neu erzeugt. Ticker und
 * Einsatzmonitor holen sich damit nach dem Laden den frischen Stand – auch
 * wenn die Startseite selbst noch aus dem Browser-/CDN-Cache kommt
 * (GitHub Pages liefert Seiten mit max-age=600 aus).
 */
export async function GET() {
  const einsaetze = (await ladeEinsaetze())
    .slice(0, 10)
    .map(({ wann, datum, zeit, stichwort, art }) => ({ wann, datum, zeit, stichwort, art }));
  return new Response(JSON.stringify(einsaetze), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
