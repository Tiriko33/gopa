# Gopa

Private Rezept-App (PWA): TikTok-/Instagram-Link rein, deutsches Rezept raus.

Status: Meilenstein 1 (Backend-Pipeline). Vollständige Anleitung folgt in Meilenstein 5.

## Backend lokal starten

```bash
cd backend
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env                      # Werte eintragen
python -m pytest
python -m app.cli "https://www.tiktok.com/@creator/video/123"
uvicorn app.main:app --reload
```

Systemvoraussetzungen für die volle Pipeline: `ffmpeg`, optional `tesseract` (OCR). Im Docker-Image sind beide enthalten.
