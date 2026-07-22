import { getCollection } from 'astro:content';

async function wehrenMap() {
  return new Map((await getCollection('wehren')).map((w) => [w.id, w.data]));
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
