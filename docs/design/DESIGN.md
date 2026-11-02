# Gopa – Design-Beschreibung

Gopa ist eine private Rezept-App für Android (PWA). Das Maskottchen ist ein eigener Bär mit Kochmütze. Das Design ist blau, süß und warm: Himmelblau als Grund, Creme-Karten, Honig-Buttons, Bärenfell-Braun nur im Maskottchen.

## Inhalt dieses Ordners

- `tokens.json` und `tokens.css`: Farben, Schriften, Radien, Größen
- `assets/`: Maskottchen (SVG, PNG), App-Icons (SVG, PNG 192/512, maskable 512), Favicon
- `screens/`: die Bildschirme als einzelne HTML-Dateien, im Browser öffnen (Referenz, Breite 390 px)
- `source/`: die Original-Quellen der Entwürfe (.dc.html). Die Inline-Styles dort sind die exakten Maße.

Die Screens in `screens/` sind die verbindliche Vorlage. Setze sie 1:1 um (Abstände, Radien, Farben, Texte). Die Rezepte in den Entwürfen sind Platzhalter.

## Grundregeln

- Schriften: Baloo 2 (Titel, Zahlen im Kochmodus, Kartentitel), Nunito (Text, Chips, Buttons)
- Alle Texte auf Deutsch
- Touch-Ziele mindestens 44 px, Kontrast mindestens 4,5:1
- Keine Emojis, Icons als Linien-SVG (Strichstärke 2 bis 2,8, runde Enden)
- Karten: Creme `#FFF8EC`, Rahmen 2 px `#F0DDB8`, Radius 22–24 px
- Chips und Buttons voll rund (Radius 999 px)
- Haupt-Button: Honig `#F6B74A` mit dunkelbraunem Text `#3B2412`
- Sekundär-Button: transparent, Rahmen 2 px Gopa-Blau, Text Gopa-Blau
- Aktiver Chip: Gopa-Blau mit weißem Text. Inaktiver Chip: Creme mit Rahmen und Text `#5A3A22`
- Hintergrund: Himmelblau `#E6F0FF` mit wenigen dezenten Pfotenabdrücken (`#C4D9F7`, leicht gedreht)
- Zutaten-Listen: gestrichelte Trennlinien `#EBD3A6` (wie auf einem Notizzettel)

## Maskottchen

Bär mit Kochmütze, drei weiße Mützen-Puffs, Mützenband (blau `#2F6FE0`, im Icon honig `#F6B74A`), Fell `#B97A4B`, Creme-Schnauze, braune Nase, glänzende Augen, rosa Wangen `#FF9DA8`. Datei: `assets/gopa-bear.svg`. In der App als wiederverwendbare Komponente `<GopaBear size={...} bandColor={...} />`.

App-Icon: Bärenkopf auf blauem Grund `#2F6FE0`, Android-Maskable-Variante mit größerem Rand.

## Bildschirme

### 1 Rezeptsammlung (Startseite)
- Kopf: Bär (72 px) links, daneben Titel "Gopas Rezepte" (Baloo 2, 30 px, Gopa-Blau) und Zeile "Was kochen wir heute? · N Rezepte" (braun `#7A4A28`)
- Suchfeld rund, weiß, Rahmen `#C4D9F7`, Platzhalter "Rezept oder Zutat suchen"
- Filter-Chips: Alle, Frühstück, Mittagessen, Abendessen, Dessert, Snacks (umbrechen in zwei Zeilen). Tippen filtert die Liste.
- Rezeptkarte: Pfoten-Thumbnail (84 px, Honig-hell `#FBE3B4`) links, rechts Titel (Baloo 2, 19 px), Kategorie-Badge (blau), Zeit, Quelle mit Link-Icon (TikTok oder Instagram). Tippen öffnet das Rezept.
- Untere Leiste: Rezepte, runder Honig-Plus-Button (ragt nach oben, öffnet "Neues Rezept"), Einkauf. Leiste Creme mit oberen Rundungen 28 px.

### 2 Rezeptansicht
- Hero in Gopa-Blau, unten rund (36 px): Zurück-Button und Bearbeiten-Button (Creme, rund), Titel weiß (Baloo 2, 32 px), Kategorie-Chip (Creme, änderbar per Auswahl), Zeit, Bär (96 px) rechts unten
- Quell-Karte: Honig-Icon mit Link-Symbol, Text "Quelle · Plattform · @creator", Link "Original-Video öffnen" (öffnet den gespeicherten Link, Gopa-Blau)
- Zutaten mit Portionsrechner (Minus, "2 Portionen", Plus), Mengen skalieren. Hinweis "Gopa hat Cups und Unzen für dich in Gramm und Milliliter umgerechnet." nur anzeigen, wenn umgerechnet wurde.
- Schritte unterhalb der Zutaten
- Untere Leiste: "Zur Einkaufsliste" (sekundär) und "Los geht's!" (Honig, startet den Kochmodus)

### 3 Neues Rezept
- Bär (84 px) mit Sprechblase "Zeig mir das Video, ich schreibe das Rezept auf Deutsch auf!"
- Eingabe "Link hier einfügen" + Button "Einfügen" (Zwischenablage). Tipp: Im Video auf Teilen tippen und Gopa auswählen.
- Kategorie-Chips (Auswahl, Standard wird automatisch vorgeschlagen)
- Fortschrittskarte "Gopa kocht das Rezept…" mit drei Schritten (Video und Beschreibung geladen, Gesprochenen Text erkennen, Auf Deutsch übersetzen und umrechnen) und Honig-Fortschrittsbalken
- Honig-Button "Rezept erstellen"; darunter Textbutton "Klappt nicht? Text oder Screenshot hinzufügen"

### 4 Kochmodus
- Dunkelblau `#0F2E63`, Pfotenmuster dunkel `#1B4585`
- Oben: Schließen-Button, Rezepttitel. Darunter "Schritt X von Y" und Fortschrittsleiste (aktive Segmente Honig)
- Schritt-Text groß (Baloo 2, 32 px, weiß), Timer-Pille (Honig-Kreis mit Uhr, Zeit in Baloo 2 28 px, "Timer starten")
- Bär (92 px) unten links mit Sprechblase (Creme) mit kurzem Tipp zum Schritt (nur wenn ein Tipp vorhanden ist)
- Buttons: Zurück (rund, `#1B4585`) und "Weiter" (Honig, 64 px hoch)
- Display bleibt an (Wake Lock). Hinweis: Wake Lock braucht HTTPS.

### 5 Einkaufsliste
- Kopf: Bär (72 px), Titel "Einkaufsliste", Zeile "Noch N Dinge im Korb", Button "Erledigte löschen"
- Zutaten nach Rezept gruppiert (Gruppenüberschrift Baloo 2, 17 px, braun), Creme-Karten mit gestrichelten Linien
- Checkbox 28 px, Radius 10 px. Abgehakt: Honig gefüllt mit Haken, Text durchgestrichen und gedämpft
- Gleiche Zutaten aus mehreren Rezepten werden zusammengefasst (Mengen addieren)
- Liste ist offline lesbar

## Texte mit Charakter

- Startseite: "Was kochen wir heute?"
- Ladeansicht: "Gopa kocht das Rezept…"
- Rezept-Button: "Los geht's!"
- Kochmodus-Sprechblase: kurzer Tipp pro Schritt
- Leere Sammlung: Bär mit Sprechblase "Noch nichts im Topf. Teile dein erstes Rezept-Video mit mir!"
- Fehler: Bär mit Sprechblase und verständlicher deutscher Meldung plus Fallback-Optionen
