Baue "Gopa", eine private Rezept-App als Weihnachtsgeschenk für meine Freundin
(Android-Handy). Sie sieht Kochvideos auf Instagram/TikTok und will daraus ein
deutsches Rezept machen, es speichern, nach Kategorien filtern, den Link zum
Original behalten, eine Einkaufsliste führen und im Kochmodus kochen.
Nutzer: genau eine Person (plus ich als Admin). Kein Store-Release, kein
Multi-User-System.

## Design-Vorlage (verbindlich)
Im Projektordner liegt gopa-design.zip. Entpacke den Ordner "design" nach
docs/design. Lies zuerst docs/design/DESIGN.md. Die Bildschirme liegen als
HTML-Dateien in docs/design/screens (im Browser öffnen), Farben und Maße in
tokens.json bzw. tokens.css, Maskottchen und Icons in assets/. Setze die
Screens 1:1 um. Das Maskottchen ist ein eigener Bär mit Kochmütze (kein
Fremd-Charakter): baue es als SVG-Komponente <GopaBear />. Die Beispiel-
Rezepte in den Entwürfen sind Platzhalter.

## Repository (GitHub)
- Monorepo "gopa": /backend, /frontend, /docs (inkl. docs/design aus dem ZIP),
  docker-compose.yml, .env.example, .gitignore, README.md
- Git-Ablauf: main + ein Branch pro Meilenstein (feature/...), kleine Commits
  mit klaren Nachrichten (feat:, fix:, docs:), nach jedem Meilenstein Merge
  nach main, am Ende Tag v1.0.0
- Niemals Secrets committen (.env nur lokal, .env.example mit Platzhaltern)
- Optional: GitHub Actions für Tests (backend pytest, frontend build)

## Architektur
- Frontend: installierbare PWA (React + Vite + TypeScript, mobile-first),
  Manifest (Name "Gopa", Icons aus docs/design/assets: 192, 512, maskable),
  Service Worker, Web Share Target, damit sie in Instagram/TikTok auf
  "Teilen" tippen und Gopa auswählen kann. Zusätzlich Eingabefeld
  "Link hier einfügen" mit Button "Einfügen" (Zwischenablage).
- Backend: Python + FastAPI, läuft per docker-compose auf meinem eigenen
  Server hinter Reverse Proxy mit HTTPS (nötig für PWA, Share Target und
  Wake Lock). SQLite zur Speicherung.
- Auth: ein einfaches Passwort bzw. Token aus Umgebungsvariable, keine
  Registrierung, Anmeldung bleibt auf dem Handy gespeichert.
- Secrets (ANTHROPIC_API_KEY, APP_PASSWORD) nur über .env.

## Pipeline "Link -> Rezept" (asynchroner Job mit Statusanzeige)
1. Link validieren (nur instagram.com, tiktok.com inkl. vm.tiktok.com).
2. Mit yt-dlp Beschreibung, Titel, Creator und Video holen. Bei Fehler (v. a.
   Instagram) sauberer Fallback: Text einfügen und/oder Video bzw. Screenshots
   hochladen.
3. Quellen in dieser Reihenfolge auswerten:
   a) Caption: enthält sie ein vollständiges Rezept, direkt verwenden.
   b) Audio extrahieren (ffmpeg), lokal mit faster-whisper transkribieren
      (Sprache automatisch erkennen).
   c) Optional: alle ~2 Sekunden einen Frame ziehen, eingeblendeten Text per
      OCR (Tesseract) lesen, Duplikate entfernen.
4. Alle Texte an die Claude-API geben (Modell per Env-Variable). Claude liefert
   ausschließlich valides JSON nach Schema, komplett auf Deutsch. Regeln:
   - Keine Mengen oder Zutaten erfinden. Fehlt etwas, Feld leer lassen und in
     "hinweise" vermerken ("Menge im Video nicht genannt").
   - Einheiten umrechnen: Cups/oz/lb -> g/ml, °F -> °C, Stick Butter -> g.
     Originalangabe in "original" behalten.
   - Zutaten nach Gruppen ordnen (z. B. "Teig", "Soße").
   - Schritte kurz und klar, mit optionalem timer_min und optionalem
     kurzem "tipp" (für die Sprechblase im Kochmodus), nur wenn im Video
     genannt.
   - Kategorie vorschlagen (siehe Schema).
5. Video und Zwischendateien nach der Verarbeitung löschen. Gespeichert werden
   nur Rezept, Quell-Link, Plattform und Creator.

## Datenmodell / JSON-Schema
{
  "titel": str, "beschreibung": str, "portionen": int,
  "kategorie": "Frühstück"|"Mittagessen"|"Abendessen"|"Dessert"|"Snacks"|"Sonstiges",
  "zeit_vorbereitung_min": int|null, "zeit_kochen_min": int|null,
  "zutaten": [{"gruppe": str|null, "name": str, "menge": number|null,
               "einheit": str|null, "original": str|null}],
  "schritte": [{"nr": int, "text": str, "timer_min": int|null, "tipp": str|null}],
  "tags": [str], "hinweise": [str],
  "quelle": {"url": str, "plattform": "TikTok"|"Instagram", "creator": str|null}
}
Beim Speichern zusätzlich: id, erstellt_am, favorit (bool).

## Funktionen
- Rezepte speichern, bearbeiten, löschen
- Filter nach Kategorie (Chips: Alle, Frühstück, Mittagessen, Abendessen,
  Dessert, Snacks) und Suche über Titel, Zutaten und Tags
- Kategorie pro Rezept änderbar
- Der Link zum Original wird mit jedem Rezept gespeichert und per Button
  "Original-Video öffnen" in der Rezeptansicht geöffnet
- Portionsrechner (Mengen skalieren)
- Kochmodus: ein Schritt pro Bildschirm, Timer pro Schritt, Wake Lock API
- Einkaufsliste: Zutaten eines Rezepts mit einem Tipp hinzufügen, gleiche
  Zutaten zusammenfassen (Mengen addieren), abhaken, Erledigte löschen,
  gespeichert und offline lesbar
- Fehlerfall: verständliche deutsche Meldung (Gopa-Sprechblase) und
  Fallback-Optionen

## Screens
Siehe docs/design/DESIGN.md und docs/design/screens:
1 Rezeptsammlung, 2 Rezeptansicht, 3 Neues Rezept, 4 Kochmodus,
5 Einkaufsliste. Zusätzlich ein Leer-Zustand und ein Fehler-Zustand im
gleichen Stil (Bär mit Sprechblase).

## Qualität
- Teste die Pipeline mit je mindestens 3 echten TikTok- und Instagram-Links
  (die liefere ich dir) und berichte ehrlich, was nicht funktioniert.
- Unit-Tests: Einheiten-Umrechnung, Mengen-Zusammenfassung der Einkaufsliste,
  JSON-Validierung, Filter nach Kategorie.
- Rate-Limit und Größenlimit für Downloads, Timeouts für jeden Pipeline-Schritt.
- Barrierefreiheit: Touch-Ziele mindestens 44 px, Kontrast mindestens 4,5:1,
  echte Buttons und Links, aria-label an Icon-Buttons.
- README: Setup, .env-Beispiel, docker compose up, Domain/HTTPS, Installation
  der PWA auf Android (Chrome: "Zum Startbildschirm hinzufügen"),
  Troubleshooting (yt-dlp aktualisieren), Backup der SQLite-Datei.

## Vorgehen
Arbeite in Meilensteinen und zeige mir nach jedem das Ergebnis:
1) Repo-Grundgerüst, docs/design einsortieren, Backend-Pipeline als
   CLI/Endpoint, getestet mit echten Links
2) Rezeptspeicherung, Kategorien, Filter, Quell-Link (API)
3) PWA: Rezeptsammlung und Rezeptansicht im Gopa-Design
4) Neues Rezept, Kochmodus, Einkaufsliste
5) Share Target, Passwortschutz, Docker, README, Tag v1.0.0
Frag nach, bevor du größere Annahmen triffst.
