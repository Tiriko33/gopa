# Gopa

Private Rezept-App (PWA) für Android: Kochvideo-Link aus TikTok oder Instagram rein, deutsches Rezept raus.
Speichern, nach Kategorie filtern, Original-Link behalten, Einkaufsliste, Kochmodus.

Gebaut für eine Person (plus Admin). Kein Store-Release, kein Multi-User-System.

```
backend/   FastAPI, SQLite, Pipeline (yt-dlp, ffmpeg, faster-whisper, Tesseract, Claude oder Ollama)
frontend/  React + Vite + TypeScript, PWA (Manifest, Service Worker, Share Target)
docs/      Design-Vorlage (docs/design) und ursprünglicher Auftrag
Dockerfile, docker-compose.yml, .env.example
```

## So funktioniert es

1. Link einfügen oder in TikTok/Instagram auf **Teilen → Gopa** tippen.
2. Das Backend lädt Beschreibung und Video (yt-dlp). Steht ein vollständiges Rezept in der Beschreibung, wird sie direkt benutzt. Sonst wird der Ton transkribiert (faster-whisper) und eingeblendeter Text gelesen (Tesseract, optional).
3. Ein Sprachmodell (Claude-API **oder** lokales Ollama-Modell, siehe unten) macht daraus ein deutsches Rezept als JSON (Mengen umgerechnet, nichts erfunden, Lücken stehen in "Hinweise").
4. Video und Zwischendateien werden gelöscht. Gespeichert werden nur Rezept, Quell-Link, Plattform und Creator.

Wenn Instagram das Laden verweigert (kommt vor), bietet die App als Fallback an: Rezepttext einfügen und/oder Screenshots bzw. Video hochladen.

## Setup auf deinem Server

Voraussetzungen: Docker mit Compose, eine Domain und ein Reverse Proxy mit **HTTPS**. HTTPS ist Pflicht, sonst funktionieren Installation als App, Teilen-Funktion und Display-an-Modus (Wake Lock) nicht.

```bash
git clone <dein-repo> gopa && cd gopa
cp .env.example .env        # Werte eintragen, siehe unten
docker compose up -d --build
```

Die App lauscht auf `127.0.0.1:8000`. Der erste Rezept-Job lädt einmalig das Whisper-Modell (einige hundert MB), das dauert dann länger.

### Sprachmodell: Ollama (ohne Key) oder Claude-API

Ein Sprachmodell formt die Rohtexte aus dem Video zum deutschen Rezept. Du wählst mit `LLM_PROVIDER`:

| | `ollama` (lokal) | `anthropic` (Claude-API) |
|---|---|---|
| Kosten | keine | wenige Cent pro Rezept |
| Key nötig | nein | ja (console.anthropic.com) |
| Qualität bei Deutsch, Umrechnung, JSON | geringer, Modellwahl wichtig | sehr gut |
| Server | RAM/GPU nötig, 7B-Modell braucht ca. 6 bis 8 GB | egal |
| Screenshots lesen | nur mit Vision-Modell (z. B. `qwen2.5vl`) | ja |

**Ollama auf dem Server einrichten** (zwei Wege):

```bash
# Weg 1: Ollama läuft schon auf dem Host (https://ollama.com), Modell laden:
ollama pull qwen2.5:7b
# in .env:  LLM_PROVIDER=ollama, OLLAMA_URL=http://host.docker.internal:11434, OLLAMA_MODEL=qwen2.5:7b

# Weg 2: Ollama als Container neben Gopa
docker compose --profile ollama up -d --build
docker compose exec ollama ollama pull qwen2.5:7b
# in .env:  OLLAMA_URL=http://ollama:11434
```

Die Rezeptqualität hängt stark vom Modell ab. Größere Modelle (z. B. `qwen2.5:14b`) machen weniger Fehler, brauchen aber mehr Speicher und Zeit. Ein Rezept dauert auf der CPU schnell mehrere Minuten; `OLLAMA_TIMEOUT` (Standard 300 Sekunden) bei Bedarf erhöhen. Prüfe neue Rezepte bei Ollama kurz gegen das Video, vor allem Mengen.

### .env

```
LLM_PROVIDER=ollama               # oder anthropic
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen2.5:7b
ANTHROPIC_API_KEY=sk-ant-...      # nur bei LLM_PROVIDER=anthropic
CLAUDE_MODEL=claude-sonnet-5-5    # nur bei LLM_PROVIDER=anthropic
APP_PASSWORD=ein-langes-zufaelliges-passwort
WHISPER_MODEL=small               # tiny/base/small/medium: größer = genauer, aber langsamer
MAX_VIDEO_MB=150
MAX_VIDEO_SECONDS=600
RATE_LIMIT_PER_HOUR=20
```

Alle Optionen mit Standardwerten stehen in `.env.example`. Die `.env` gehört nie ins Repository.

### Domain und HTTPS

Beispiel mit Caddy (holt Zertifikate automatisch), `Caddyfile`:

```
gopa.deine-domain.de {
    reverse_proxy 127.0.0.1:8000
    request_body { max_size 200MB }
}
```

Bei nginx: `proxy_pass http://127.0.0.1:8000;`, `client_max_body_size 200m;` und `proxy_read_timeout 120s;` setzen, TLS z. B. mit certbot.

## Installation auf dem Android-Handy

1. In **Chrome** `https://gopa.deine-domain.de` öffnen und mit dem Passwort anmelden (bleibt gespeichert).
2. Menü (drei Punkte) → **Zum Startbildschirm hinzufügen** → **Installieren**.
3. Danach erscheint Gopa in der Teilen-Liste: im Video auf **Teilen** tippen und **Gopa** wählen. Der Link ist dann schon eingetragen, nur noch auf "Rezept erstellen" tippen.

Gopa speichert Rezepte auf dem Server und merkt sich die zuletzt geladenen Rezepte offline. Die Einkaufsliste liegt lokal auf dem Handy und ist offline lesbar.

## Entwicklung

```bash
# Backend
cd backend
python -m venv .venv && . .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env                        # und ausfüllen; für lokal APP_PASSWORD setzen
python -m pytest
uvicorn app.main:app --reload                     # Port 8000
python -m app.cli "https://www.tiktok.com/@creator/video/123"   # Pipeline ohne App testen

# Frontend (zweites Terminal)
cd frontend
npm ci
npm run dev                                       # Port 5173, leitet /api an localhost:8000 weiter
npm test
```

Lokal brauchst du für die volle Pipeline `ffmpeg` und optional `tesseract`. Im Docker-Image ist beides enthalten.

## Troubleshooting

**Videos von TikTok/Instagram lassen sich nicht laden.** Das ist der häufigste Fehler: die Plattformen ändern ihre Seiten, und yt-dlp muss dann aktualisiert werden.

```bash
docker compose build --no-cache --pull
docker compose up -d
```

Der Build installiert die neueste yt-dlp-Version. Bei Instagram hilft oft auch der Fallback in der App (Text oder Screenshot).

**"Gopa ist noch nicht eingerichtet".** `APP_PASSWORD` fehlt in der `.env` (ohne Passwort ist die API gesperrt) oder bei der gewählten KI fehlt `OLLAMA_MODEL` bzw. der Claude-Key.

**"Gopa erreicht das lokale Sprachmodell nicht".** Läuft Ollama (`curl http://localhost:11434`)? Stimmt `OLLAMA_URL` (im Container nicht `localhost`!)? Wurde das Modell mit `ollama pull` geladen?

**Anmeldung klappt nicht mehr.** Wurde `APP_PASSWORD` geändert, melden sich alle Geräte neu an. Nach 10 falschen Versuchen sperrt Gopa die Anmeldung für 10 Minuten.

**Teilen-Funktion fehlt in der Liste.** Die App muss über HTTPS installiert sein. Nach einem Update ggf. deinstallieren und neu installieren, damit Android das Manifest neu liest.

**Display geht im Kochmodus aus.** Wake Lock braucht HTTPS. Manche Energiesparmodi blockieren ihn trotzdem.

**Logs ansehen:** `docker compose logs -f gopa`

## Backup

Alles Wichtige liegt in der SQLite-Datei `gopa.db` im Docker-Volume `gopa-data`:

```bash
docker compose cp gopa:/data/gopa.db ./backup-$(date +%F).db
```

Zum Wiederherstellen die Datei zurückkopieren (`docker compose cp ./backup.db gopa:/data/gopa.db`) und neu starten. Für ein konsistentes Backup kurz vorher `docker compose stop gopa`.

## Grenzen

- Instagram blockiert Downloads häufiger als TikTok. Gopa fällt dann auf Text/Screenshot zurück.
- Ein Rezept ist nur so gut wie das, was im Video gesagt, eingeblendet oder beschrieben wird. Fehlende Mengen bleiben leer und stehen unter "Hinweise".
- Die Einkaufsliste wird nicht zwischen Geräten synchronisiert.
- Pro Stunde sind standardmäßig 20 Rezept-Jobs erlaubt (`RATE_LIMIT_PER_HOUR`), Videos sind auf 150 MB und 10 Minuten begrenzt.
