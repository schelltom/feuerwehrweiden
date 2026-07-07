import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

/**
 * Berichte / News – eine Markdown-Datei pro Beitrag.
 * Neuer Bericht = neue Datei in src/content/berichte/ (oder über das CMS unter /admin).
 */
const berichte = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/berichte' }),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    ressort: z.string().default('Feuerwehr'),
    titelbild: z.string().optional(),
    kurz: z.string().optional(),
    stats: z
      .array(z.object({ wert: z.string(), label: z.string() }))
      .default([]),
  }),
});

/**
 * Fahrzeuge – eine Markdown-Datei pro Fahrzeug.
 * Jedes Fahrzeug bekommt automatisch eine Detailseite unter /fuhrpark/<dateiname>.
 */
const fahrzeuge = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/fahrzeuge' }),
  schema: z.object({
    name: z.string(),
    typ: z.string(),
    funkruf: z.string(),
    standort: z.string().default('Hauptfeuerwache'),
    bild: z.string(),
    reihenfolge: z.number().default(99),
    specs: z
      .array(z.object({ label: z.string(), wert: z.string() }))
      .default([]),
    ausstattungTitel: z.string().optional(),
    ausstattung: z.array(z.string()).default([]),
    beladung: z
      .array(z.object({ raum: z.string(), inhalt: z.array(z.string()) }))
      .default([]),
    galerie: z
      .array(z.object({ bild: z.string(), text: z.string().optional() }))
      .default([]),
  }),
});

/** Einsatzticker – einfache Liste in src/content/daten/einsaetze.json */
const einsaetze = defineCollection({
  loader: file('./src/content/daten/einsaetze.json', {
    parser: (text) => JSON.parse(text).einsaetze,
  }),
  schema: z.object({
    id: z.string(),
    datum: z.string(), // TT.MM.JJJJ
    zeit: z.string(), // HH:MM
    stichwort: z.string(),
    art: z.enum(['THL', 'Brand', 'Sonstige']),
  }),
});

/** Termine – einfache Liste in src/content/daten/termine.json */
const termine = defineCollection({
  loader: file('./src/content/daten/termine.json', {
    parser: (text) => JSON.parse(text).termine,
  }),
  schema: z.object({
    id: z.string(),
    datum: z.coerce.date(),
    titel: z.string(),
    von: z.string(),
    bis: z.string(),
  }),
});

export const collections = { berichte, fahrzeuge, einsaetze, termine };
