# Kapitel 0: Werkzeuge installieren

**Ziel:** Alles, was du zum Bauen brauchst, ist installiert und jeder Befehl meldet eine Version.
**Dauer:** 20 bis 40 Minuten (der Ollama-Modell-Download ist der längste Teil).

Öffne **PowerShell** (Windows-Taste → "PowerShell"). Alle Befehle in dieser Anleitung sind PowerShell, wenn nichts anderes dabeisteht.

## Was du brauchst

| Werkzeug | Wozu | Installieren | Prüfen |
|---|---|---|---|
| **Git** | Versionsverwaltung, Upload zu GitHub | `winget install Git.Git` | `git --version` |
| **Python 3.12** | Backend | `winget install Python.Python.3.12` | `py -3.12 --version` |
| **Node.js 22 LTS** | Frontend bauen | `winget install OpenJS.NodeJS.LTS` | `node --version` und `npm --version` |
| **ffmpeg** | Tonspur aus dem Video holen | `winget install Gyan.FFmpeg` | `ffmpeg -version` |
| **Ollama** | lokales Sprachmodell | Installer von <https://ollama.com/download> | `ollama --version` |
| **VS Code** (empfohlen) | Editor | `winget install Microsoft.VisualStudioCode` | startet |
| **GitHub-Konto** | APK bauen lassen, Download-Seite | <https://github.com/signup> | Anmeldung klappt |

**Nicht nötig:** Java, Android Studio, Android SDK. Die APK baut GitHub für dich (Kapitel 10). Optional: Tesseract für OCR von eingeblendetem Text (`winget install UB-Mannheim.TesseractOCR`), Gopa funktioniert auch ohne.

### Das Sprachmodell laden

```powershell
ollama pull gemma4:12b
ollama list
```

`gemma4:12b` ist das Modell der Musterlösung (versteht auch Bilder, braucht ca. 7 bis 8 GB Grafikspeicher). Hast du weniger Grafikspeicher, nimm ein kleineres wie `qwen2.5:7b`. Das Modell ist nur eine Einstellung (`OLLAMA_MODEL`), du kannst später wechseln.

Ob Ollama läuft, prüfst du so:

```powershell
curl.exe http://localhost:11434/api/tags
```

**Erwartet:** eine JSON-Antwort mit deinem Modell darin.

## Wichtig: PowerShell neu öffnen

Nach jeder Installation kennt ein **bereits offenes** Terminal die neuen Programme noch nicht (der `PATH` wird nur beim Start gelesen). Schließe PowerShell und öffne sie neu, bevor du prüfst.

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `winget : Die Benennung "winget" wurde nicht erkannt` | App Installer fehlt (alte Windows-Version) | Microsoft Store → "App Installer" aktualisieren, oder Programme von den Webseiten laden |
| `git` / `node` / `ffmpeg` "nicht erkannt" direkt nach der Installation | altes Terminal | PowerShell schließen und neu öffnen. Hilft das nicht: Windows neu anmelden |
| `py` nicht erkannt, `python` öffnet den Microsoft Store | Python nicht im PATH / Store-Platzhalter | Python-Installer erneut starten → *Modify* → Haken bei "Add python.exe to PATH". Oder Einstellungen → Apps → "App-Ausführungsaliase" → Python-Einträge ausschalten |
| `winget` bricht mit Zertifikat-/Netzwerkfehler ab | Firmen-Proxy oder VPN | VPN aus, anderes Netz (Handy-Hotspot), oder Installer manuell herunterladen |
| Python 3.14 oder neuer installiert | Neue Python-Versionen bekommen Pakete (`ctranslate2`, `av`) oft erst später | **Nimm 3.12.** Es läuft in der Musterlösung zwar auch mit 3.14, aber 3.12 ist der sichere Weg |
| `ollama pull` ist sehr langsam oder bricht ab | 8 GB Download, instabile Verbindung | Befehl einfach wiederholen, er setzt fort |
| Ollama meldet "model requires more system memory" | zu wenig RAM/VRAM | kleineres Modell (`qwen2.5:7b`, `llama3.2:3b`) |
| `curl` zeigt in PowerShell etwas Seltsames | In PowerShell 5.1 ist `curl` ein Alias für `Invoke-WebRequest` | immer `curl.exe` schreiben |
| `ffmpeg -version` geht nur in neuem Terminal | PATH | siehe oben. Notfalls Pfad suchen: `Get-ChildItem $env:LOCALAPPDATA\Microsoft\WinGet -Recurse -Filter ffmpeg.exe` |

## Test für dieses Kapitel

```powershell
git --version
py -3.12 --version
node --version
ffmpeg -version
ollama list
```

Alle fünf antworten ohne Fehler? Dann weiter zu [Kapitel 1](01-Projektgeruest.md).
