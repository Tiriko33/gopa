# Gopa selbst nachbauen: Schritt für Schritt

Diese Anleitung führt dich durch den kompletten Bau von Gopa, von der leeren Ordner bis zur installierbaren Android-App. Du tippst den Code selbst ab (oder fügst ihn ein), verstehst ihn dabei und **testest nach jedem Kapitel**, ob das Gebaute funktioniert.

## So arbeitest du

1. **Eigener Ordner.** Baue in einem neuen Ordner, z. B. `C:\Temp\gopa-nachbau`. Der fertige Code in `C:\Temp\gupa` ist deine **Musterlösung**. Wenn etwas nicht läuft, vergleichst du Datei für Datei (in VS Code: zwei Dateien markieren → Rechtsklick → *Select for Compare* / *Compare with Selected*).
2. **Ein Kapitel = ein Meilenstein.** Am Ende jedes Kapitels gibt es einen **Test**. Erst wenn er grün ist, machst du weiter. Dann `git commit`.
3. **Fehler sind normal.** Jedes Kapitel hat einen Abschnitt *Wenn etwas schiefgeht*. Zusätzlich gibt es einen großen [Fehlerkatalog](12-Fehlerkatalog.md).
4. **Dateien immer als UTF-8 speichern** (VS Code unten rechts: *UTF-8*). Das Projekt ist voller Umlaute (`Frühstück`). Falsch gespeicherte Umlaute sind einer der häufigsten Stolperer.

## Der Plan

| Kapitel | Was du baust | Wie du es testest |
|---|---|---|
| [0 Werkzeuge](00-Werkzeuge.md) | Git, Python, Node, ffmpeg, Ollama installieren | je ein Versions-Befehl |
| [1 Projektgerüst](01-Projektgeruest.md) | Ordner, Git, Python-Umgebung, erster Server | `/api/health` im Browser, pytest |
| [2 Datenmodell](02-Datenmodell.md) | Rezept-Schema, Einheiten, Link-Prüfung | 14 Unit-Tests |
| [3 Speicherung und Login](03-Speicherung-und-Login.md) | SQLite, Passwort, Rezept-API | 10 Tests + Aufrufe per PowerShell |
| [4 Pipeline](04-Pipeline.md) | Video laden, Sprache erkennen, Ollama schreibt das Rezept | 10 Tests + echter TikTok-Link |
| [5 Frontend-Start](05-Frontend-Start.md) | React/Vite-Projekt, Konfiguration | leere Seite im Browser |
| [6 Frontend-Logik](06-Frontend-Logik.md) | Portionsrechner, Einkaufsliste, API-Zugriff | Vitest |
| [7 Oberfläche](07-Oberflaeche.md) | Bär, Navigation, Sammlung, Login, Einkauf | Seite im Browser (390 px) |
| [8 Rezept-Seiten](08-Rezept-Seiten.md) | Rezeptansicht, Neues Rezept, Kochmodus, Bearbeiten | kompletter Durchlauf im Browser |
| [9 Android-App](09-Android-App.md) | Capacitor, Teilen-Plugin, Signatur | `npx cap sync` ohne Fehler |
| [10 GitHub und APK](10-GitHub-und-APK.md) | Repository, Actions, Pages, Release | APK-Download auf dem Handy |
| [11 Betrieb am PC](11-Betrieb-am-PC.md) | Start-Skript, Firewall, Handy verbindet sich | Rezept per Handy erstellen |
| [12 Fehlerkatalog](12-Fehlerkatalog.md) | Symptom → Ursache → Lösung | zum Nachschlagen |

## Das Gesamtbild (einmal lesen, dann wird alles klarer)

```
 Handy (Gopa-App, React in einer Android-Hülle)
   │  WLAN: http://192.168.x.x:8000  (Passwort-Token im Header)
   ▼
 Dein PC "Gopas Küche"  =  Python-Backend (FastAPI)
   ├─ yt-dlp         lädt TikTok/Instagram-Video + Beschreibung
   ├─ ffmpeg         holt die Tonspur heraus
   ├─ faster-whisper wandelt Sprache in Text
   ├─ Ollama         lokales Sprachmodell macht daraus ein deutsches Rezept (JSON)
   └─ SQLite         speichert die Rezepte
```

Warum so? Die App selbst kann keine Videos analysieren: Das braucht Rechenleistung und Programme (ffmpeg, Whisper, ein Sprachmodell), die nicht auf ein Handy gehören. Deshalb gibt es "Gopas Küche" auf deinem PC, die nur läuft, wenn du kochen willst. Das Modell wird nach jedem Rezept sofort aus dem Speicher entladen (`keep_alive: 0`), damit dein PC beim Zocken nicht leidet.

## Ordnerstruktur am Ende

```
gopa-nachbau/
├─ backend/            Python-Server
│  ├─ app/             der Code (config, schema, units, urls, db, auth, sources, llm, pipeline, jobs, main, cli)
│  ├─ tests/           Tests
│  └─ requirements.txt
├─ frontend/           React-App + Android-Projekt
│  ├─ src/             lib/ components/ pages/ + CSS
│  ├─ android/         von Capacitor erzeugt, plus 2 eigene Java-Dateien
│  └─ package.json
├─ .github/workflows/  ci.yml, android.yml
├─ docs/               Design, Wiki
├─ scripts/            start-gopa.ps1 / .bat
├─ .env.example
└─ .gitignore
```

## Ehrlicher Stand der Musterlösung

Getestet und für gut befunden: Backend-Tests (46), Frontend-Tests (21), TikTok → Whisper → Ollama (`gemma4:12b`) → deutsches Rezept, Bedienung im Browser bei 390 px Breite.

**Nicht getestet** (weil in meiner Umgebung nicht möglich): die fertige APK auf einem echten Handy, das Teilen aus TikTok/Instagram per Android-Intent (die Java-Dateien wurden nie kompiliert), Instagram-Links (von meinem Rechner nicht erreichbar), OCR mit Tesseract, das Docker-Image und das Start-Skript. Bei diesen Teilen sind die Hinweise in den Kapiteln 9 bis 11 besonders wichtig, und du bist hier der erste echte Tester.
