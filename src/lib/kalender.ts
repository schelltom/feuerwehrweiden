/** Gemeinsame Helfer für Kalenderansicht und iCal-Export */

export interface Termin {
  id: string;
  datum: Date;
  titel: string;
  von: string;
  bis: string;
  kategorie: string;
}

/** Farben der Termin-Kategorien (Filter, Kalender-Chips) */
export const KATEGORIE_FARBEN: Record<string, string> = {
  'Zugübung 1. Zug': '#E10600',
  'Zugübung 2. Zug': '#F27B21',
  Maschinisten: '#2B54D4',
  'UG-ÖEL': '#7A3FD1',
  Dienstgrade: '#0E8A5F',
  Dienstversammlung: '#B98900',
  Vereinsveranstaltung: '#D6249F',
  Atemschutz: '#0E9AA7',
  'Jugendfeuerwehr Weiden': '#5A8F1F',
  Kinderfeuerwehr: '#C2411C',
  Sonstiges: '#5B6170',
};

export function kategorieSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function icsDatum(datum: Date, zeit: string): string {
  const [h, m] = zeit.split(':').map(Number);
  const j = datum.getFullYear();
  const mo = String(datum.getMonth() + 1).padStart(2, '0');
  const t = String(datum.getDate()).padStart(2, '0');
  return `${j}${mo}${t}T${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
}

/** Termine als iCal-Datei (schwebende Ortszeit – importiert überall korrekt) */
export function alsIcs(termine: Termin[], name: string): string {
  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Feuerwehr Weiden//Kalender//DE',
    `X-WR-CALNAME:Feuerwehr Weiden – ${name}`,
  ];
  for (const t of termine) {
    zeilen.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@feuerwehr-weiden.de`,
      `DTSTART:${icsDatum(t.datum, t.von)}`,
      `DTEND:${icsDatum(t.datum, t.bis)}`,
      `SUMMARY:${t.titel.replace(/([,;\\])/g, '\\$1')}`,
      `CATEGORIES:${t.kategorie.replace(/([,;\\])/g, '\\$1')}`,
      'END:VEVENT'
    );
  }
  zeilen.push('END:VCALENDAR');
  return zeilen.join('\r\n') + '\r\n';
}
