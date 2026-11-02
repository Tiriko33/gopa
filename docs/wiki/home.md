# Gopa

Gopa ist eine private Rezept-App für Android. Du siehst ein Kochvideo auf TikTok oder Instagram, tippst auf **Teilen → Gopa**, und Gopa schreibt dir daraus ein **deutsches Rezept**: mit Zutaten, Schritten, Timern und umgerechneten Mengen. Den Link zum Original-Video behält Gopa bei jedem Rezept.

**[Gopa für Android herunterladen (APK)](https://DEIN-NAME.gitlab.io/gopa/gopa.apk)**

## Was kann Gopa?

| Funktion | So geht es |
|---|---|
| Rezept aus Video | Teilen → Gopa, oder Link einfügen |
| Umrechnen | Cups, Unzen, Pfund und °F werden zu g, ml und °C. Die Originalangabe bleibt gespeichert. |
| Nichts erfinden | Fehlt eine Menge im Video, bleibt das Feld leer und steht unter **Hinweise von Gopa** |
| Sammlung | Suche über Titel, Zutaten und Tags, Filter nach Kategorie |
| Portionsrechner | Plus und Minus über der Zutatenliste, alle Mengen rechnen mit |
| Kochmodus | Ein Schritt pro Bildschirm, Timer pro Schritt, Display bleibt an |
| Einkaufsliste | Zutaten mit einem Tipp hinzufügen, gleiche Zutaten werden zusammengezählt |

## Wie funktioniert es im Hintergrund?

Die Android-App ist nur die Oberfläche. Das Erkennen macht **Gopas Küche**, ein Programm auf einem PC:

1. Es lädt Beschreibung und Video des Links (yt-dlp).
2. Steht ein vollständiges Rezept in der Beschreibung, nutzt es diese. Sonst hört es den Ton ab (Whisper).
3. Ein lokales KI-Modell (Ollama, Standard: `gemma4:12b`) macht daraus das deutsche Rezept.
4. Video und Zwischendateien werden sofort gelöscht. Gespeichert werden nur Rezept, Link, Plattform und Creator.

Der PC muss **nur beim Erstellen eines Rezepts** laufen, nicht dauerhaft. Danach gibt das Modell seinen Speicher wieder frei (`OLLAMA_KEEP_ALIVE=0`), damit der PC nicht langsamer wird.

## Weiter

- [Installation der App](installation)
- [Gopas Küche auf dem PC einrichten](gopas-kueche)
- [Benutzung](benutzung)
- [Probleme lösen](probleme)
