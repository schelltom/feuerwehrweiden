// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Die Seite läuft unter der Custom-Domain an der Wurzel. Alle Pfade im
// Quellcode sind wurzel-relativ (/berichte/, /bilder/ …) und funktionieren
// direkt – kein Unterpfad-Rewrite mehr nötig (früher GitHub-Pages-Unterpfad
// /feuerwehrweiden). Die Datei public/CNAME setzt die Custom-Domain.
// `site` bestimmt Canonical-URLs, Sitemap und Open-Graph-URLs – beim
// Domain-Umzug hier auf https://feuerwehr-weiden.de umstellen.
export default defineConfig({
  site: 'https://stadtfeuerwehrverband-weiden.de',
  integrations: [sitemap()],
});
