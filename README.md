# Feuerwehr Weiden – neue Website

Moderne, schnelle Website der Freiwilligen Feuerwehr Weiden i.d.OPf. –
gebaut mit [Astro](https://astro.build) als statische Seite. Kein Joomla,
keine Datenbank, nichts zu warten: Inhalte sind einfache Textdateien,
gepflegt wird bequem im Browser.

## Entwicklung

| Befehl            | Zweck                                            |
| ----------------- | ------------------------------------------------ |
| `npm install`     | Abhängigkeiten installieren (einmalig)           |
| `npm run dev`     | Entwicklungsserver: <http://localhost:4321>      |
| `npm run build`   | Fertige Seite nach `dist/` bauen                 |
| `npm run preview` | Gebaute Seite lokal ansehen                      |

## Inhalte pflegen

Alle Inhalte liegen unter `src/content/`:

```
src/content/
├── berichte/     ← eine .md-Datei pro Bericht/News
├── fahrzeuge/    ← eine .md-Datei pro Fahrzeug (Detailseite entsteht automatisch)
└── daten/
    ├── einsaetze.json   ← Einsatzticker
    └── termine.json     ← Übungen & Veranstaltungen
```

### Neuer Bericht

Datei `src/content/berichte/mein-bericht.md` anlegen:

```markdown
---
titel: Übungsabend mit der Drehleiter
datum: 2026-08-01
ressort: Einsatzdienst
titelbild: /bilder/berichte/mein-foto.jpg   # optional
kurz: Ein Satz Zusammenfassung.             # optional
stats:                                       # optional – Zahlen-Kacheln
  - wert: "25"
    label: Teilnehmer
---

Hier steht der Berichtstext in normalem Deutsch.
Leerzeile = neuer Absatz. Fotos vorher nach public/bilder/berichte/ legen.
```

### Neuer Einsatz / Termin

In `src/content/daten/einsaetze.json` bzw. `termine.json` oben einen
Eintrag ergänzen – Muster stehen drin.

### Neues Fahrzeug

`src/content/fahrzeuge/` – am besten `dlak-m32.md` als Vorlage kopieren.
Specs, Beladung und Galerie sind optional; was fehlt, wird auf der
Detailseite einfach weggelassen.

## Pflege im Browser (Decap CMS)

Unter `/admin` liegt eine Redaktions-Oberfläche (Formulare statt Dateien,
Fotos per Drag & Drop). Zum Aktivieren im Live-Betrieb:

1. Projekt zu GitHub pushen und bei [Netlify](https://netlify.com) anbinden
   (Build-Befehl `npm run build`, Ausgabeordner `dist`).
2. In Netlify **Identity** aktivieren und **Git Gateway** einschalten.
3. Redakteure per E-Mail einladen – fertig. Jede Änderung im CMS wird als
   Git-Commit gespeichert, die Seite baut sich automatisch neu.

Lokal testen ohne Login: `npx decap-server` starten, dann `npm run dev`
und <http://localhost:4321/admin> öffnen.

## Offene Punkte

- [ ] Platzhalter-Links füllen (Impressum, Datenschutz, Warn-Apps, Einheiten-Kacheln)
- [ ] Echte Zahlen prüfen (Hero/Zahlenleiste: Fahrzeuge, Ehrenamt)
- [ ] Ortsteilwehren-Seiten anlegen
- [ ] Hochauflösende Fahrzeugfotos nachliefern (HLF, TLF, …)
- [ ] Einsatzticker ggf. automatisch aus Alarmierungssystem füllen
