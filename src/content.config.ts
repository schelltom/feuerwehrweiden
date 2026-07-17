import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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
    /** Bildergalerie – wird unter dem Berichtstext als Slideshow gezeigt */
    galerie: z
      .array(z.object({ bild: z.string(), text: z.string().optional() }))
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

/**
 * Einsatzticker – eine Markdown-Datei pro Einsatz (nur Frontmatter, kein Text).
 * Neuer Einsatz = übers CMS unter /admin ("Einsätze" → "Neuer Einsatz").
 */
const einsaetze = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/einsaetze' }),
  schema: z.object({
    /** Datum & Uhrzeit, z.B. 2026-07-17T10:19 (ohne Zeitzone, lokal) */
    wann: z.coerce.date(),
    stichwort: z.string(),
    art: z.enum(['THL', 'Brand', 'Sonstige']),
  }),
});

/** Termine – eine Markdown-Datei pro Termin (übers CMS unter "Termine" pflegbar) */
const termine = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/termine' }),
  schema: z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    von: z.string(),
    bis: z.string(),
    kategorie: z.string().default('Sonstiges'),
  }),
});

/** Termin-Kategorien (Name + Farbe) – im CMS frei anlegbar */
const terminkategorien = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/terminkategorien' }),
  schema: z.object({
    name: z.string(),
    farbe: z.string().default('#5B6170'),
  }),
});

/**
 * Feuerwehren, die bei der Pflegestelle anliefern – Name + E-Mail für die
 * Abholbereit-Benachrichtigung. Wird im CMS als Auswahlliste angeboten.
 */
const wehren = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/wehren' }),
  schema: z.object({
    name: z.string(),
    email: z.string().default(''),
  }),
});

/**
 * Atemschutz- & Schlauchpflegestelle – eine Datei pro Anlieferung.
 * Setzt der Gerätewart den Haken "abholbereit", stempelt die GitHub-Action
 * (.github/workflows/pflege-mail.yml) Datum/Uhrzeit und schickt die E-Mail
 * an die bei der Wehr hinterlegte Adresse.
 */
const pflege = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pflege' }),
  schema: z.object({
    /** Verweis auf die Wehr (Dateiname in src/content/wehren) */
    wehr: z.string(),
    abgegeben: z.coerce.date(),
    geraete: z.number().default(0),
    masken: z.number().default(0),
    flaschen: z.number().default(0),
    schlaeucheB: z.number().default(0),
    schlaeucheC: z.number().default(0),
    hinweis: z.string().default(''),
    abholbereit: z.boolean().default(false),
    /** Trägt der Bot beim E-Mail-Versand ein (ISO-Zeitstempel) */
    abholbereitSeit: z.string().default(''),
    benachrichtigt: z.boolean().default(false),
    abgeholt: z.boolean().default(false),
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
    /** Abweichendes Bild für die Übersichtskarte (Standard: titelbild) */
    kartenbild: z.string().optional(),
    wappen: z.string().optional(),
    /** Externer Auftritt (z.B. eigene Website einer Ortsteilwehr) */
    extern: z.string().optional(),
    /** Gezeichnetes Motiv statt Foto auf der Übersichtskarte */
    kartenmotiv: z.enum(['geraetehaus']).optional(),
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
          telefon: z.string().optional(),
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
          bild: z.string().optional(),
          bildtext: z.string().optional(),
        })
      )
      .default([]),
    uebungsplan: z
      .array(
        z.object({
          tag: z.string().default(''),
          datum: z.string(),
          zeit: z.string().default(''),
          thema: z.string(),
        })
      )
      .default([]),
    galerie: z
      .array(z.object({ bild: z.string(), text: z.string().optional() }))
      .default([]),
  }),
});

export const collections = { berichte, fahrzeuge, einsaetze, termine, terminkategorien, wehren, pflege, seiten };
