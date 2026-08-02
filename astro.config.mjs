// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { verkleinereBilder } from './scripts/bilder-verkleinern.mjs';

/**
 * Deckelt vor jedem Build zu große Bilder in public/bilder auf eine
 * web-taugliche Kantenlänge. Verhindert das „schwarze Bild" auf iPhones
 * (iOS-Speicherlimit für entpackte Bilder) auch dann, wenn übers CMS ein
 * Foto in voller Kamera-Auflösung hochgeladen wurde. Idempotent.
 */
function bilderVerkleinern() {
  return {
    name: 'bilder-verkleinern',
    hooks: {
      'astro:build:start': async ({ logger }) => {
        const wurzel = fileURLToPath(new URL('./public/bilder', import.meta.url));
        await verkleinereBilder(wurzel, { log: (m) => logger.info(m) });
      },
    },
  };
}

// Die Seite läuft unter der Custom-Domain an der Wurzel. Alle Pfade im
// Quellcode sind wurzel-relativ (/berichte/, /bilder/ …) und funktionieren
// direkt – kein Unterpfad-Rewrite mehr nötig (früher GitHub-Pages-Unterpfad
// /feuerwehrweiden). Die Datei public/CNAME setzt die Custom-Domain.
// `site` bestimmt Canonical-URLs, Sitemap und Open-Graph-URLs – beim
// Domain-Umzug hier auf https://feuerwehr-weiden.de umstellen.
export default defineConfig({
  site: 'https://feuerwehr-weiden.de',
  integrations: [
    bilderVerkleinern(),
    sitemap({
      // Noch nicht öffentliche Seiten aus der Sitemap heraushalten
      // (nur per Direktlink erreichbar, zusätzlich noindex im Layout).
      filter: (page) => !page.includes('/service/benachrichtigungen'),
    }),
  ],
});
