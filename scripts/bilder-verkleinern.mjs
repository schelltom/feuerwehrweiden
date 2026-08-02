/**
 * Bilder verkleinern – gegen das „schwarze Bild" auf dem iPhone.
 *
 * Kamera-Fotos kommen mit 5000–6000px Kantenlänge (24 MP). iOS Safari hält
 * für ENTPACKTE Bilder nur ein begrenztes Speicher-Budget; ein 24-MP-Foto
 * belegt entpackt ~100 MB RAM – egal wie klein es angezeigt wird. Sind zu
 * viele solche Bilder auf einer Seite (Startseite + Slideshow), reißt Safari
 * das Budget und rendert einzelne Bilder schwarz. Reload hilft, weil sich die
 * Reihenfolge ändert – daher „mal dieses, mal jenes Bild".
 *
 * Abhilfe: jede lange Kante auf MAX Pixel deckeln. Dateinamen/Pfade bleiben
 * gleich, es ändert sich also nichts an Berichten oder Code. Das Skript ist
 * idempotent – schon kleine Bilder werden übersprungen – und läuft
 * automatisch bei jedem `astro build` (siehe astro.config.mjs).
 *
 * Manuell: `npm run bilder`
 */
import { readdir, stat, rename, unlink } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

/** Längste zulässige Kante in Pixel. 2560 ist auf Handys gestochen scharf und
 *  liegt weit unter dem iOS-Speicherlimit. */
const MAX = 2560;
/** JPEG-Qualität (mozjpeg). 82 ist praktisch verlustfrei fürs Auge. */
const JPEG_QUALITAET = 82;

const ENDUNGEN = new Set(['.jpg', '.jpeg', '.png']);

async function* alleBilder(verzeichnis) {
  for (const eintrag of await readdir(verzeichnis, { withFileTypes: true })) {
    const pfad = join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) yield* alleBilder(pfad);
    else if (ENDUNGEN.has(extname(eintrag.name).toLowerCase())) yield pfad;
  }
}

/**
 * Verkleinert alle zu großen Bilder unterhalb von `wurzel` in-place.
 * @param {string} wurzel  z.B. .../public/bilder
 * @param {{ log?: (nachricht: string) => void }} [optionen]
 */
export async function verkleinereBilder(wurzel, { log = () => {} } = {}) {
  let geprueft = 0;
  let verkleinert = 0;
  let gespart = 0;

  for await (const datei of alleBilder(wurzel)) {
    geprueft++;
    let meta;
    try {
      meta = await sharp(datei).metadata();
    } catch {
      continue; // kaputt/kein Bild – in Ruhe lassen
    }

    // Bei EXIF-Orientierung 5–8 sind Breite/Höhe vertauscht; wir messen die
    // Kantenlänge so, wie das Bild später angezeigt wird.
    const gedreht = (meta.orientation ?? 0) >= 5;
    const breite = gedreht ? meta.height : meta.width;
    const hoehe = gedreht ? meta.width : meta.height;
    if (!breite || !hoehe) continue;
    if (breite <= MAX && hoehe <= MAX) continue; // schon klein genug

    const endung = extname(datei).toLowerCase();
    const zwischendatei = `${datei}.tmp${endung}`;
    const vorher = (await stat(datei)).size;

    // .rotate() ohne Argument dreht anhand der EXIF-Daten aufrecht und brennt
    // die Drehung ein – sonst läge das Bild nach dem Verkleinern seitlich.
    let bild = sharp(datei)
      .rotate()
      .resize({ width: MAX, height: MAX, fit: 'inside', withoutEnlargement: true });
    bild = endung === '.png'
      ? bild.png({ compressionLevel: 9 })
      : bild.jpeg({ quality: JPEG_QUALITAET, mozjpeg: true });

    await bild.toFile(zwischendatei);
    const nachher = (await stat(zwischendatei)).size;

    if (nachher < vorher) {
      await rename(zwischendatei, datei); // atomar ersetzen
      verkleinert++;
      gespart += vorher - nachher;
      log(
        `  ${datei}: ${breite}×${hoehe} → max ${MAX}px  ` +
          `(${(vorher / 1e6).toFixed(1)} → ${(nachher / 1e6).toFixed(1)} MB)`
      );
    } else {
      await unlink(zwischendatei); // brachte nichts – Original behalten
    }
  }

  log(
    `Bilder: ${geprueft} geprüft, ${verkleinert} verkleinert, ` +
      `${(gespart / 1e6).toFixed(1)} MB gespart.`
  );
  return { geprueft, verkleinert, gespart };
}

// Direktaufruf über die Kommandozeile: `node scripts/bilder-verkleinern.mjs`
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'bilder');
  await verkleinereBilder(wurzel, { log: (m) => console.log(m) });
}
