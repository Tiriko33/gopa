# Kapitel 12: Fehlerkatalog und Methode

## Die Methode: Fehler immer gleich eingrenzen

Neunzig Prozent aller Probleme lösen sich mit diesen vier Fragen:

1. **Wo genau tritt es auf?** Das Gerät (PC oder Handy), das Programm (Backend, Frontend, GitHub), der Schritt.
2. **Was sagt die letzte Zeile?** Bei Python-Fehlern (`Traceback`) steht die Ursache in der **letzten** Zeile, die Zeilen darüber zeigen den Weg dorthin. Bei GitHub-Actions steht sie **unten** im roten Schritt.
3. **Was hat sich zuletzt geändert?** Rückgängig machen mit `git status` und `git diff` (was ist anders als beim letzten Commit?). Genau dafür committest du nach jedem Kapitel.
4. **Läuft es in der Musterlösung?** Vergleiche deine Datei mit `C:\Temp\gupa\...` in VS Code (*Compare*). Unterschiede sind fast immer ein Tippfehler.

Werkzeuge, die du kennen solltest:

| Wo | Werkzeug |
|---|---|
| Backend | die Ausgabe im Terminal, in dem `uvicorn` läuft; `http://localhost:8000/docs` zum Ausprobieren einzelner Aufrufe |
| Frontend im Browser | `F12` → **Konsole** (JavaScript-Fehler) und **Netzwerk** (jede Anfrage mit Status und Antwort) |
| Gespeicherte Daten im Browser | `F12` → **Application** → *Local Storage* (Token, Einkaufsliste, Zwischenspeicher) |
| Typfehler | `npx tsc --noEmit` |
| Tests | `python -m pytest -q` und `npm test` |
| App auf dem Handy | Handy per USB, USB-Debugging an, am PC in Chrome `chrome://inspect` → die Gopa-WebView prüfen (wie `F12`). Zusätzlich `adb logcat` (aus den Android-Plattform-Tools) |
| GitHub | Actions → Lauf → Job → Schritt, **ganz unten** lesen |

Und der eiserne Grundsatz: **Immer nur eine Sache ändern und dann testen.** Wer fünf Dinge ändert, weiß nie, was geholfen hat.

---

## A. Werkzeuge und Umgebung

| Symptom | Ursache | Lösung |
|---|---|---|
| Befehl "nicht erkannt" direkt nach Installation | PATH wird nur beim Terminal-Start gelesen | Terminal neu öffnen |
| `Activate.ps1 ... Ausführung von Skripts deaktiviert` | PowerShell-Richtlinie | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `(.venv)` fehlt vorn | venv nicht aktiv | `.\.venv\Scripts\Activate.ps1` im Ordner `backend` |
| Pakete "fehlen", obwohl installiert | in anderes Python installiert | `where.exe python`; in aktiver venv `pip install ...` |
| `pip install` scheitert an `av`/`ctranslate2` | Python zu neu | Python 3.12 |
| Umlaute kaputt (`Ã¼`) | Datei nicht UTF-8 | in VS Code *UTF-8* speichern (Start-Skript: *UTF-8 mit BOM*) |
| `curl` zeigt PowerShell-Kauderwelsch | Alias für `Invoke-WebRequest` | `curl.exe` |
| Port 8000 / 5173 belegt | alter Prozess läuft | `netstat -ano \| findstr :8000` → `taskkill /PID <nr> /F` |

## B. Backend

| Symptom | Ursache | Lösung |
|---|---|---|
| `ModuleNotFoundError: app` | falscher Ordner oder `pytest.ini` | in `backend` arbeiten |
| `ImportError: attempted relative import` | Datei direkt gestartet | `python -m app.cli`, `python -m pytest` |
| `ValidationError` | Daten passen nicht zum Schema | Feld (`loc`) und Grund (`msg`) lesen |
| 401 | kein/falscher Token | neu anmelden; Header `Authorization: Bearer <token>` |
| 503 "nicht eingerichtet" | `APP_PASSWORD` fehlt | in dem Terminal setzen, in dem der Server startet |
| 429 | Login-Sperre oder Stundenlimit | warten / `RATE_LIMIT_PER_HOUR` |
| 413 | Datei über Limit | `MAX_VIDEO_MB` |
| 422 | Anfrage hat falsche Form | Antwort-Text: nennt das Feld |
| `database is locked` | zweiter Prozess | alten Server beenden |
| CORS-Fehler im Browser | Herkunft nicht erlaubt | Dev: Vite-Proxy nutzen; App: Origins in `main.py` |
| Änderungen wirken nicht | Server ohne `--reload` | neu starten |

## C. Pipeline

| Symptom | Ursache | Lösung |
|---|---|---|
| yt-dlp: 403 / "Unable to extract" | veraltet | `pip install -U yt-dlp` |
| Instagram "lässt Gopa nicht ansehen" | Instagram verlangt Login | Text/Screenshot-Rückfallweg |
| "ffmpeg fehlt" | nicht im PATH des Server-Terminals | neues Terminal, PATH |
| Whisper hängt/sehr langsam | Erst-Download / CPU | warten; `WHISPER_MODEL=base` |
| "gesprochenen Text nicht erkennen" | Whisper-Fehler | Traceback im Server-Terminal |
| "Sprachmodell nicht erreichbar" | Ollama aus / Modellname / Timeout | `ollama list`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT` |
| `invalid_json` | Modell zu klein | größeres Modell, Text mitschicken |
| erfundene Mengen | Modell ignoriert Regeln | anderes Modell; `hinweise` lesen; im Editor korrigieren |
| Hinweis "Cups umgerechnet" obwohl nicht | `original` gefüllt | `postprocess` in `llm.py` wie in der Vorlage |
| "Job nicht gefunden" | Server neu gestartet | Rezept neu erstellen |
| PC wird langsam | Modell bleibt im Speicher | `OLLAMA_KEEP_ALIVE=0` (Standard) |

## D. Frontend

| Symptom | Ursache | Lösung |
|---|---|---|
| Weiße Seite | JS-Fehler | `F12` → Konsole |
| `Failed to resolve import` | Datei fehlt / Tippfehler im Pfad | Dateiname, Groß/Klein |
| `tsc`-Fehler `Property ... does not exist` | Feldname falsch | mit `types.ts`/`schema.py` abgleichen |
| `ERESOLVE` bei `npm install` | andere Versionen | `package.json` der Vorlage, `--legacy-peer-deps` |
| `npm ci` Fehler auf GitHub | Lock-Datei nicht committet | `package-lock.json` committen |
| Alte Seite trotz Änderung | Service Worker | *Application* → *Unregister*, Strg+F5 |
| Fortschritt bleibt bei 8 % | `alive`-Flag (StrictMode) | `alive.current = true` im Effekt |
| Sammlung leer trotz Rezepten | falscher Filter / Cache | Chip *Alle*, Local Storage leeren |
| Mengen `NaN` | Text statt Zahl | im Schema `float` |
| Einkaufsliste verdoppelt | Schlüssel nicht normalisiert | `itemKey` mit `toLowerCase().trim()` |
| Timer geht falsch | Sekundenzähler statt Endzeit | `endAt` speichern |
| Zwischenablage verweigert | Berechtigung | Feld lange drücken → Einfügen |
| Display geht im Kochmodus aus | Wake Lock braucht sicheren Kontext | `localhost` / in der APK `androidScheme: "http"` |
| Animation ruckelt | `width`/`box-shadow` animiert | nur `transform`/`opacity` |

## E. Android / APK

| Symptom | Ursache | Lösung |
|---|---|---|
| `Could not find the web assets directory` | `dist` fehlt | `npm run build` |
| `Unsupported class file major version` | falsches JDK | JDK **21** |
| `SDK location not found` | kein Android SDK | GitHub bauen lassen / Android Studio |
| `Keystore ... not found` / `tampered` | Datei fehlt / Passwort | Pfad `../gopa-test.keystore`; Passwort `gopa-test` |
| App weiß beim Start | `sync` vergessen | `npm run build && npx cap sync android` |
| `ERR_CLEARTEXT_NOT_PERMITTED` | `http` nicht erlaubt | Manifest `usesCleartextTraffic` + `cleartext: true` |
| Teilen: Gopa fehlt in der Liste | `intent-filter` fehlt | Manifest 9.4, App neu installieren |
| Teilen öffnet Gopa, Feld leer | Plugin nicht registriert | `registerPlugin` vor `super.onCreate` |
| "Paket steht in Konflikt" | andere Signatur | festes Test-Zertifikat; alte App deinstallieren |
| "App nicht installiert" | Speicher / Signatur | Platz schaffen, deinstallieren |
| Play Protect warnt | App nicht im Store | "Trotzdem installieren" |

## F. Netzwerk Handy ↔ PC

| Symptom | Ursache | Lösung |
|---|---|---|
| App: "Gopa erreicht den Server nicht" | Server aus / IP alt / Firewall | 11.4 von innen nach außen prüfen |
| Handy-Browser erreicht den PC nicht | Firewall, öffentliches Profil, Gast-WLAN | Regel + Profil *Privat* (11.3) |
| Geht zu Hause, nicht unterwegs | kein Heimnetz | VPN (Tailscale) oder nur zu Hause nutzen |
| IP ändert sich ständig | DHCP | feste IP im Router |
| Verbindung bricht beim Rezept ab | PC-Energiesparen | Ruhezustand verhindern, solange ein Rezept erstellt wird |

## G. Git und GitHub

| Symptom | Ursache | Lösung |
|---|---|---|
| `Please tell me who you are` | Name/Mail fehlen | `git config user.name/email` |
| `remote origin already exists` | schon gesetzt | `git remote -v`, `git remote set-url origin <url>` |
| `could not connect to server`, `Could not resolve host` | Netzwerk | VPN/Proxy aus, Netz wechseln |
| `Authentication failed` / `403` | Token fehlt/falsch | Token (`repo`, `workflow`) |
| Geheimnis versehentlich committet | `.env` nicht ignoriert | Passwort **sofort ändern**, `git rm --cached .env`, `.gitignore` |
| Workflow läuft nicht | falscher Ordner/Einrückung | `.github/workflows/`, nur Leerzeichen |
| Actions rot | siehe Kapitel 10.7 | letzte Zeilen im roten Schritt lesen |
| Pages 404 | Pages nicht aktiviert / erster Lauf läuft | Settings → Pages → *GitHub Actions* |
| Release fehlt | kein Tag gepusht | `git tag v1.0.1; git push origin v1.0.1` |

## H. Wenn du nicht weiterkommst

Schreibe dir diese Punkte auf und schicke sie (an mich oder in ein Forum):

1. **Kapitel und Schritt**, an dem es hängt.
2. Der **vollständige Befehl** und die **letzten 15 Zeilen** der Ausgabe (Text, kein Foto der halben Meldung).
3. Was du **zuletzt geändert** hast.
4. Ob die **Musterlösung** an derselben Stelle läuft.

Fast jeder Fehler wird dadurch in zwei Minuten lösbar.
