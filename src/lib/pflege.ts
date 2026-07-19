import { getCollection } from 'astro:content';

/** Vorgänge der Pflegestelle, neueste zuerst, mit aufgelöstem Wehr-Namen. */
export async function ladePflege() {
  const wehren = new Map((await getCollection('wehren')).map((w) => [w.id, w.data]));
  return (await getCollection('pflege'))
    .map((v) => ({
      ...v.data,
      id: v.id,
      wehrName: wehren.get(v.data.wehr)?.name ?? v.data.wehr,
    }))
    .sort((a, b) => b.abgegeben.getTime() - a.abgegeben.getTime());
}

type Mengen = { geraete: number; masken: number; flaschen: number; schlaeucheB: number; schlaeucheC: number };

const TEILE: [keyof Mengen, string, string][] = [
  ['geraete', 'Gerät', 'Geräte'],
  ['masken', 'Maske', 'Masken'],
  ['flaschen', 'Flasche', 'Flaschen'],
  ['schlaeucheB', 'B-Schlauch', 'B-Schläuche'],
  ['schlaeucheC', 'C-Schlauch', 'C-Schläuche'],
];

/** "2 Geräte · 4 Masken" aus den Stückzahlen eines Vorgangs. */
export function inhaltText(v: Mengen) {
  const teile = TEILE.filter(([feld]) => v[feld] > 0).map(
    ([feld, einzahl, mehrzahl]) => `${v[feld]} ${v[feld] === 1 ? einzahl : mehrzahl}`
  );
  return teile.join(' · ');
}

export function statusText(v: { abgeholt: boolean; abholbereit: boolean }) {
  return v.abgeholt ? 'Abgeholt' : v.abholbereit ? 'Abholbereit' : 'Angeliefert';
}

/** "Atemschutz", "Schläuche" oder beides – grobe Kategorie ohne Stückzahlen. */
export function kategorieText(v: Mengen) {
  const atemschutz = v.geraete + v.masken + v.flaschen > 0;
  const schlaeuche = v.schlaeucheB + v.schlaeucheC > 0;
  return [atemschutz && 'Atemschutz', schlaeuche && 'Schläuche'].filter(Boolean).join(' & ');
}

const format = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const datum = (d: Date | string) => format.format(typeof d === 'string' ? new Date(d) : d);
