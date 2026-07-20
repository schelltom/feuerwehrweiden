// @ts-check
import { defineConfig } from 'astro/config';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Die Seite liegt auf GitHub Pages unter https://schelltom.github.io/feuerwehrweiden/.
 * Damit alle absoluten Pfade (/berichte/, /bilder/… – auch in Markdown-Inhalten
 * und CMS-Uploads) dort funktionieren, hängt dieser Build-Schritt den Unterpfad
 * nachträglich an alle Links im fertigen HTML/CSS an. Im Quellcode und lokal
 * (astro dev) bleibt alles unter der Wurzel; `astro preview` zeigt daher
 * das Unterpfad-Ergebnis nicht korrekt an.
 */
const BASIS = '/feuerwehrweiden';

function basisPfad() {
  /** @type {import('astro').AstroIntegration} */
  const integration = {
    name: 'basis-pfad',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const wurzel = fileURLToPath(dir);
        const dateien = await readdir(wurzel, { recursive: true });
        for (const rel of dateien) {
          if (!/\.(html|css)$/.test(rel)) continue;
          const datei = path.join(wurzel, rel);
          const alt = await readFile(datei, 'utf8');
          const neu = alt
            // Bereits mit /feuerwehrweiden versehene Pfade (z.B. CMS-Bilduploads,
            // deren public_folder den Unterpfad enthält) NICHT erneut voranstellen.
            .replace(/(href|src|content|action|srcset|data-quelle)="\/(?!\/|feuerwehrweiden\/)/g, `$1="${BASIS}/`)
            .replace(/url\(\/(?!\/|feuerwehrweiden\/)/g, `url(${BASIS}/`);
          if (neu !== alt) await writeFile(datei, neu);
        }
      },
    },
  };
  return integration;
}

export default defineConfig({
  site: 'https://schelltom.github.io/feuerwehrweiden',
  integrations: [basisPfad()],
});
