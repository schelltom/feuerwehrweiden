import { getCollection } from 'astro:content';

/**
 * Nachschlage-Map für Wehren – bewusst nach BEIDEN Schlüsseln (Datei-Slug und
 * Name), da `wehr` in Vorgängen den Namen speichert (neu) oder noch den Slug
 * (Altbestand). So löst `.get(v.wehr)` in jedem Fall auf.
 */
async function wehrenMap() {
  const map = new Map<string, { name: string; email: string }>();
  for (const w of await getCollection('wehren')) {
    map.set(w.id, w.data);
    map.set(w.data.name, w.data);
  }
  return map;
}

/** Vorgänge der Atemschutzwerkstatt, alphabetisch nach Wehr-Name, mit aufgelöstem Wehr-Namen. */
export async function ladePflege() {
  const wehren = await wehrenMap();
  return (await getCollection('pflege'))
    .map((v) => ({
      ...v.data,
      id: v.id,
      wehrName: wehren.get(v.data.wehr)?.name ?? v.data.wehr,
    }))
    .sort((a, b) => a.wehrName.localeCompare(b.wehrName, 'de'));
}

/** Vorgänge der Schlauchpflegestelle, alphabetisch nach Wehr-Name, mit aufgelöstem Wehr-Namen. */
export async function ladeSchlaeuche() {
  const wehren = await wehrenMap();
  return (await getCollection('schlaeuche'))
    .map((v) => ({
      ...v.data,
      id: v.id,
      wehrName: wehren.get(v.data.wehr)?.name ?? v.data.wehr,
    }))
    .sort((a, b) => a.wehrName.localeCompare(b.wehrName, 'de'));
}

type Mengen = { geraete: number; masken: number; flaschen: number };

const TEILE: [keyof Mengen, string, string][] = [
  ['geraete', 'Gerät', 'Geräte'],
  ['masken', 'Maske', 'Masken'],
  ['flaschen', 'Flasche', 'Flaschen'],
];

/** "2 Geräte · 4 Masken" aus den Stückzahlen eines Atemschutz-Vorgangs. */
export function inhaltText(v: Mengen) {
  const teile = TEILE.filter(([feld]) => v[feld] > 0).map(
    ([feld, einzahl, mehrzahl]) => `${v[feld]} ${v[feld] === 1 ? einzahl : mehrzahl}`
  );
  return teile.join(' · ');
}

export function statusText(v: { abgeholt: boolean; abholbereit: boolean }) {
  return v.abgeholt ? 'Abgeholt' : v.abholbereit ? 'Abholbereit' : 'Angeliefert';
}

const format = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const datum = (d: Date | string) => format.format(typeof d === 'string' ? new Date(d) : d);
