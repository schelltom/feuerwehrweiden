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
    funkruf: z.string().default(''),
    standort: z.string().default('Hauptfeuerwache'),
    kategorie: z.enum(['fahrzeug', 'anhaenger']).default('fahrzeug'),
    /** In der Fahrzeughalle auf der Startseite zeigen */
    inHalle: z.boolean().default(false),
    bild: z.string().default(''),
    reihenfolge: z.number().default(99),
    specs: z
      .array(z.object({ label: z.string(), wert: z.string() }))
      .default([]),
    ausstattungTitel: z.string().optional(),
    ausstattung: z.array(z.string()).default([]),
    beladung: z
      .array(
        z.object({
          raum: z.string(),
          bild: z.string().optional(),
          inhalt: z.array(z.string()).default([]),
        })
      )
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

/**
 * Atemschutzpflegestelle – Status je Anlieferung.
 * Beim Wechsel auf "abholbereit" verschickt die GitHub-Action
 * (.github/workflows/atemschutz-mail.yml) automatisch eine E-Mail an die Wehr.
 */
const atemschutz = defineCollection({
  loader: file('./src/content/daten/atemschutz.json', {
    parser: (text) => JSON.parse(text).vorgaenge,
  }),
  schema: z.object({
    id: z.string(),
    wehr: z.string(),
    email: z.string().default(''),
    artikel: z.string(),
    status: z.enum(['eingegangen', 'in-pflege', 'abholbereit', 'abgeholt']),
    eingegangen: z.string(),
    hinweis: z.string().default(''),
    benachrichtigt: z.boolean().default(false),
  }),
});

/**
 * Feuerwehr-Bereich (Über uns + Einheiten) – eine Markdown-Datei pro Seite.
 * Route: /feuerwehr/<bereich>/<dateiname>. Die Bausteine (Kontakt, Personen,
 * Zeitstrahl, Galerie) sind optional – was da ist, wird gerendert.
 */
const seiten = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/seiten' }),
  schema: z.object({
    titel: z.string(),
    bereich: z.enum(['ueber-uns', 'einheiten', 'ortsteile']),
    reihenfolge: z.number().default(99),
    kurz: z.string().default(''),
    titelbild: z.string().optional(),
    wappen: z.string().optional(),
    kontakt: z
      .object({
        name: z.string(),
        telefon: z.string().optional(),
        fax: z.string().optional(),
        email: z.string().optional(),
        adresse: z.string().optional(),
        bild: z.string().optional(),
      })
      .optional(),
    gruppenfoto: z.object({ bild: z.string(), text: z.string().default('') }).optional(),
    personen: z
      .array(
        z.object({
          name: z.string(),
          funktion: z.string().optional(),
          sachgebiete: z.array(z.string()).default([]),
          email: z.string().optional(),
          bild: z.string().optional(),
        })
      )
      .default([]),
    zeitstrahl: z
      .array(
        z.object({
          zeit: z.string(),
          titel: z.string(),
          quelle: z.string().optional(),
          text: z.string().default(''),
        })
      )
      .default([]),
    galerie: z
      .array(z.object({ bild: z.string(), text: z.string().optional() }))
      .default([]),
  }),
});

export const collections = { berichte, fahrzeuge, einsaetze, termine, atemschutz, seiten };
