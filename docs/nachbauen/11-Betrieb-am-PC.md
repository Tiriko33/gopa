# Kapitel 11: Betrieb am PC und die APK im Alltag

**Ziel:** Du startest Gopas Küche mit einem Doppelklick, das Handy findet den PC im WLAN, und ein Rezept per "Teilen" aus TikTok klappt. Du weißt, was bei Problemen zu tun ist.

> **Ehrlicher Hinweis:** Das Start-Skript wurde von mir nur auf **Syntax** geprüft, nie ausgeführt. Der Ablauf Handy → PC → Rezept ist in dieser Form ungetestet. Du bist hier der erste Tester, und die Tabelle unten ist deine Hilfe.

## 11.1 Die Einstellungsdatei `.env`

Alle Einstellungen liegen in **einer** Datei im Projektordner (nicht im Code, nicht in Git). Zuerst die Vorlage:

```
# Kopiere diese Datei nach .env und trage echte Werte ein. .env NIE committen.
# Welches Sprachmodell macht aus den Video-Texten das Rezept?
#   anthropic = Claude-API (beste Qualität, braucht API-Key, kostet wenige Cent pro Rezept)
#   ollama    = lokales Modell auf deinem Server (kein Key, keine Kosten, braucht Rechenleistung)
LLM_PROVIDER=ollama

# --- Option A: Ollama (lokal) ---
# Aus dem Docker-Container erreicht man Ollama auf dem Host unter host.docker.internal.
# Mit `docker compose --profile ollama up -d` startet Ollama stattdessen als Container: OLLAMA_URL=http://ollama:11434
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_TIMEOUT=300
# 0 = Modell sofort nach jedem Rezept entladen (schont Grafikkarte/RAM, z. B. zum Zocken). Z. B. 5m = 5 Minuten behalten.
OLLAMA_KEEP_ALIVE=0

# --- Option B: Claude-API ---
ANTHROPIC_API_KEY=sk-ant-HIER-EINTRAGEN
CLAUDE_MODEL=claude-sonnet-5-5
APP_PASSWORD=ein-langes-zufaelliges-passwort

# Pipeline
WHISPER_MODEL=small
MAX_VIDEO_MB=150
MAX_VIDEO_SECONDS=600
STEP_TIMEOUT_DOWNLOAD=120
STEP_TIMEOUT_TRANSCRIBE=300
STEP_TIMEOUT_OCR=120
STEP_TIMEOUT_LLM=90
ENABLE_OCR=true
RATE_LIMIT_PER_HOUR=20
DATA_DIR=./data
```

Kopiere sie und trage deine Werte ein:

```powershell
cd C:\Temp\gopa-nachbau
Copy-Item .env.example .env
notepad .env
```

Die wichtigsten Zeilen für deinen Betrieb:

```
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:12b
OLLAMA_KEEP_ALIVE=0
APP_PASSWORD=ein-langes-zufaelliges-passwort
```

- `APP_PASSWORD`: Ein langes Passwort, das **nur** du und deine Freundin kennen. Wer es kennt und im selben Netz ist, kann Rezepte anlegen und deinen PC rechnen lassen.
- Die `.env` speicherst du als **UTF-8** (Notepad: *Speichern unter* → Codierung UTF-8). Die Zeilen `ANTHROPIC_...` darfst du löschen, wenn du keine Claude-API nutzt.
- `.env` steht in `.gitignore`. Prüfe das mit `git status`: `.env` darf **nicht** als neue Datei auftauchen.

## 11.2 Das Start-Skript

`scripts/start-gopa.ps1` liest die `.env`, startet bei Bedarf Ollama, zeigt dir die Adressen deines PCs und startet das Backend (auf allen Netzwerk-Adaptern, nicht nur `localhost`):

```powershell
# Startet Gopas Küche: Ollama (falls nötig) und das Backend. Beenden mit Strg+C.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$port = 8000

# .env laden (Zeilen KEY=Wert, Kommentare mit # werden ignoriert)
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
  Write-Host "Es fehlt die Datei .env. Kopiere .env.example nach .env und trage APP_PASSWORD ein." -ForegroundColor Red
  Read-Host "Enter zum Schliessen"; exit 1
}
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $value = ($Matches[2] -split '\s+#')[0].Trim()
    [Environment]::SetEnvironmentVariable($Matches[1], $value, "Process")
  }
}
if (-not $env:APP_PASSWORD) {
  Write-Host "In der .env fehlt APP_PASSWORD." -ForegroundColor Red
  Read-Host "Enter zum Schliessen"; exit 1
}
if (-not $env:DATA_DIR) { $env:DATA_DIR = Join-Path $root "data" }
if (-not $env:LLM_PROVIDER) { $env:LLM_PROVIDER = "ollama" }
if ($env:OLLAMA_URL -like "*host.docker.internal*") { $env:OLLAMA_URL = "http://localhost:11434" }  # Docker-Adresse gilt hier nicht

function Test-Ollama {
  try { Invoke-WebRequest "http://localhost:11434" -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}

# Ollama starten, falls es nicht läuft
$startedOllama = $null
if ($env:LLM_PROVIDER -eq "ollama" -and -not (Test-Ollama)) {
  Write-Host "Starte Ollama ..."
  $startedOllama = Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden -PassThru
  $up = $false
  for ($i = 0; $i -lt 20 -and -not $up; $i++) { Start-Sleep -Seconds 1; $up = Test-Ollama }
  if (-not $up) {
    Write-Host "Ollama startet nicht. Ist es installiert (ollama.com)?" -ForegroundColor Red
    Read-Host "Enter zum Schliessen"; exit 1
  }
}

$python = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) { $python = "python" }

Write-Host ""
Write-Host "Gopas Küche läuft. Trage in der App eine dieser Adressen ein:" -ForegroundColor Green
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
  ForEach-Object { Write-Host ("  http://{0}:{1}" -f $_.IPAddress, $port) }
Write-Host "Beenden mit Strg+C." -ForegroundColor Yellow
Write-Host ""

try {
  Push-Location (Join-Path $root "backend")
  & $python -m uvicorn app.main:app --host 0.0.0.0 --port $port
} finally {
  Pop-Location
  if ($startedOllama -and -not $startedOllama.HasExited) { Stop-Process -Id $startedOllama.Id -Force }
}
```

Wichtig im Skript:
- `--host 0.0.0.0`: Der Server hört auf **allen** Adaptern. Ohne das erreicht nur dein PC selbst ihn und das Handy nie.
- Es werden **die IP-Adressen** deines PCs ausgegeben (z. B. `http://192.168.1.20:8000`). Diese trägst du in der App ein.
- Beim Beenden mit `Strg+C` stoppt es auch das von ihm gestartete Ollama.
- Die Datei muss als **UTF-8 mit BOM** gespeichert sein, damit Windows PowerShell 5.1 die Umlaute richtig liest (VS Code: unten rechts *UTF-8 with BOM*).

`scripts/start-gopa.bat` ist nur ein Doppelklick-Starter, der das Skript ohne Richtlinien-Hürde öffnet:

```bat
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-gopa.ps1"
pause
```

Lege ein Desktop-Symbol an (Rechtsklick auf `start-gopa.bat` → *Senden an* → *Desktop*).

## 11.3 Die Windows-Firewall

Beim **ersten** Start fragt Windows "Python den Zugriff auf Netzwerke erlauben?". Hake **Private Netzwerke** an. Hast du das verpasst oder abgelehnt, erreicht das Handy den PC nicht. Dann in einer **PowerShell als Administrator**:

```powershell
New-NetFirewallRule -DisplayName "Gopa Kueche" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
```

Und stelle sicher, dass dein WLAN als **Privat** gilt (bei "Öffentlich" blockt Windows viel mehr):

```powershell
Get-NetConnectionProfile
```

Steht bei `NetworkCategory` `Public`, ändere es: `Set-NetConnectionProfile -InterfaceAlias "WLAN" -NetworkCategory Private` (Namen aus der vorigen Ausgabe).

## 11.4 Verbindung Schritt für Schritt prüfen

Prüfe von **innen nach außen**. So weißt du bei einem Fehler sofort, an welcher Stelle er liegt:

| Schritt | Test | Wenn nicht |
|---|---|---|
| 1. Läuft der Server? | auf dem PC `http://localhost:8000/api/health` im Browser → `{"ok":true}` | Server-Fenster lesen (rote Fehler), Port belegt? |
| 2. Hört er im Netz? | auf dem PC `http://192.168.x.x:8000/api/health` (deine IP aus dem Skript) | Skript startet mit `--host 0.0.0.0`? |
| 3. Erreicht das Handy den PC? | **Browser am Handy** (im selben WLAN, **nicht** Mobilfunk) `http://192.168.x.x:8000/api/health` | Firewall (11.3), anderes WLAN, Gast-WLAN mit "Client-Isolierung" |
| 4. Klappt die App? | In Gopa die Adresse **mit** `http://` und `:8000` eingeben | Tippfehler, andere IP |
| 5. Klappt ein Rezept? | Link teilen → "Gopa" → Rezept erstellen | Fehlermeldung der Sprechblase lesen, dann Kapitel 4 |

Schritt 3 ist der wichtigste: **Wenn der Browser am Handy die Adresse nicht erreicht, wird es die App auch nie.** Das trennt Netzwerkprobleme von App-Problemen.

## 11.5 Alltag

- **IP-Adresse ändert sich?** Routers vergeben sie neu. Im Router (Fritz!Box: *Heimnetz → Netzwerk → Gerät → Immer dieselbe IP-Adresse*) kannst du dem PC eine feste Adresse geben. Sonst trägst du nach Neustarts die neue Adresse in den Einstellungen ein.
- **Nur im WLAN zu Hause.** Unterwegs braucht es ein VPN zum Heimnetz, z. B. das kostenlose Tailscale. Das ist optional und nicht Teil des Baus.
- **Rezepte lesen und kochen geht ohne PC.** Der Offline-Zwischenspeicher hält zuletzt geladene Rezepte, und die Einkaufsliste liegt auf dem Handy. Nur neu erstellen und bearbeiten braucht den PC.
- **Sicherung:** Alle Rezepte liegen in `backend\data\gopa.db` (oder `data\gopa.db`, je nachdem, wo du gestartet hast, siehe `DATA_DIR`). Kopiere die Datei ab und zu weg.
- **yt-dlp aktualisieren**, wenn TikTok/Instagram nicht mehr laden: `backend\.venv\Scripts\python -m pip install -U yt-dlp`.
- **PC wird beim Spielen langsam?** Das Modell ist mit `OLLAMA_KEEP_ALIVE=0` nach jedem Rezept aus dem Grafikspeicher. Wenn ein Rezept läuft, brauchst du aber Leistung, erstelle Rezepte also nicht mitten im Spiel.
- **App aktualisieren:** Neue APK von der Download-Seite laden und **über** die alte installieren. Die Rezepte liegen auf dem PC, die Einkaufsliste bleibt erhalten (dieselbe Signatur vorausgesetzt).

## Test für dieses Kapitel

1. Doppelklick auf `start-gopa.bat`. Es erscheinen deine Adressen und "Gopas Küche läuft".
2. Handy: Gopa öffnen → Adresse + Passwort → die Sammlung erscheint.
3. In TikTok ein Rezept-Video → *Teilen* → **Gopa** in der Liste → Gopa öffnet "Neues Rezept" mit dem Link → *Rezept erstellen* → Rezept erscheint.
4. WLAN am Handy kurz aus → Sammlung lässt sich weiter öffnen (Offline-Zwischenspeicher), ein Rezept ebenso.
5. Einstellungen → *Abmelden* → wieder Anmeldung.

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| Doppelklick auf `.bat`: Fenster blitzt und schließt | PowerShell-Fehler | im Terminal `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\start-gopa.ps1` starten, um die Meldung zu lesen |
| "Es fehlt die Datei .env" | `.env` nicht angelegt | `Copy-Item .env.example .env` |
| "In der .env fehlt APP_PASSWORD" | leer/auskommentiert | Zeile ohne `#` am Anfang |
| Skript: Zeichensalat (`Ã¼`) | Datei nicht als UTF-8 mit BOM | in VS Code neu speichern |
| "Ollama startet nicht" | nicht installiert oder nicht im PATH | Ollama installieren; `ollama --version` |
| Handy-Browser lädt endlos | Firewall blockt / anderes WLAN | 11.3, Handy im selben WLAN, Mobilfunk-Daten nicht als Umweg |
| Handy: `ERR_CONNECTION_REFUSED` | Server hört nur auf `127.0.0.1` | mit `--host 0.0.0.0` starten |
| App: "Gopa erreicht den Server nicht" | falsche Adresse (alte IP) | neue IP aus dem Skript, mit `http://` und `:8000` |
| App: "Das Passwort stimmt nicht" | anderes `APP_PASSWORD` | in `.env` nachsehen. Nach Änderung Server neu starten |
| Teilen zeigt Gopa nicht | App nicht über die APK installiert / Manifest | Kapitel 9.4; App deinstallieren und neu installieren |
| Rezept erstellen: sofort "Instagram lässt Gopa dieses Video nicht ansehen" | Instagram verlangt Login | Fallback-Feld: Beschreibung kopieren und einfügen |
| Rezept dauert über 5 Minuten | Modell läuft auf der CPU | kleineres Modell, `WHISPER_MODEL=base`, `OLLAMA_TIMEOUT` erhöhen |
| Nach PC-Neustart nichts geht | Server läuft nicht mehr | `start-gopa.bat` erneut starten. Ein Autostart ist bewusst nicht eingerichtet, damit Gopas Küche nur läuft, wenn du sie brauchst |
