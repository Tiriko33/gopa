# Kapitel 1: Projektgerüst und erster Server

**Ziel:** Ein Ordner mit Git, eine Python-Umgebung, und ein winziger Server, der auf `http://localhost:8000/api/health` antwortet. Dazu dein erster automatischer Test.

## 1.1 Ordner und Git

```powershell
mkdir C:\Temp\gopa-nachbau
cd C:\Temp\gopa-nachbau
git init -b main
git config user.name "Dein Name"
git config user.email "deine@mail.de"
```

`git init -b main` legt das Repository an, der Hauptzweig heißt `main`. Name und Mail brauchst du nur für die Commits.

Lege die Datei `.gitignore` an (genau diese Zeilen). Sie hält Geheimnisse und Müll aus Git heraus: `.env` (dein Passwort!), die Datenbank, die Python-Umgebung, `node_modules`.

```text
.env
*.db
*.sqlite
data/
__pycache__/
*.pyc
.venv/
.pytest_cache/
node_modules/
dist/
tmp/
*.log
frontend/dev-dist/
backend/.devdata/
```

> **Regel Nummer eins:** Nie ein Passwort, einen API-Schlüssel oder die `.env` committieren. Wenn es doch passiert ist: Passwort ändern. Aus der Git-Historie bekommst du es nicht zuverlässig wieder heraus.

## 1.2 Ordnerstruktur

```powershell
mkdir backend, backend\app, backend\tests
New-Item backend\app\__init__.py -ItemType File
```

`__init__.py` (leer) macht aus `app` ein Python-Paket, damit `from .config import ...` funktioniert.

## 1.3 Python-Umgebung (venv)

Eine "virtuelle Umgebung" ist ein Ordner, in dem die Pakete **nur für dieses Projekt** liegen.

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" python-multipart pydantic httpx pytest
```

Vorne in der Zeile steht jetzt `(.venv)`. **Das musst du in jedem neuen Terminal wiederholen** (`.\.venv\Scripts\Activate.ps1`, aus dem Ordner `backend`).

Wofür die Pakete?
- `fastapi` + `uvicorn`: der Webserver
- `python-multipart`: damit FastAPI hochgeladene Dateien/Formulare lesen kann (Kapitel 4)
- `pydantic`: prüft, ob Daten die richtige Form haben (Kapitel 2)
- `httpx`: ruft Ollama auf, und der Test-Client von FastAPI braucht es
- `pytest`: Tests

Die schweren Pakete (Whisper, yt-dlp) kommen erst in Kapitel 4.

## 1.4 Der erste Server

`backend/pytest.ini`: sagt pytest, wo die Tests liegen und dass `app` importierbar ist.

```ini
[pytest]
pythonpath = .
testpaths = tests
```

`backend/app/main.py` (Stufe 1, wächst in den nächsten Kapiteln):

```python
from fastapi import FastAPI

app = FastAPI(title="Gopa")


@app.get("/api/health")
def health():
    return {"ok": True}
```

Erklärung: `FastAPI()` erzeugt die Anwendung. `@app.get("/api/health")` bindet die Funktion an die Adresse. Was die Funktion zurückgibt (ein `dict`), macht FastAPI automatisch zu JSON. Die Adresse `/api/health` nutzt die App später, um zu prüfen, ob "Gopas Küche" erreichbar ist.

## 1.5 Der erste Test

`backend/tests/test_s1.py`:

```python
from fastapi.testclient import TestClient

from app.main import app


def test_health():
    r = TestClient(app).get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True}
```

`TestClient` ruft die App direkt im Speicher auf, ohne dass ein Server laufen muss. So testest du in Millisekunden.

## Test für dieses Kapitel

**1. Automatisch** (im Ordner `backend`, `(.venv)` aktiv):

```powershell
python -m pytest -q
```

**Erwartet:** `1 passed`.

**2. Von Hand:**

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Öffne <http://localhost:8000/api/health>, dort steht `{"ok":true}`. Öffne <http://localhost:8000/docs>: FastAPI hat dir automatisch eine **Bedienoberfläche** für deine API gebaut. Die brauchst du in Kapitel 3. Beenden mit `Strg+C`.

Commit:

```powershell
cd ..
git add -A
git commit -m "feat: Projektgerüst und /api/health"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `Activate.ps1 kann nicht geladen werden, da die Ausführung von Skripts auf diesem System deaktiviert ist` | PowerShell-Richtlinie | einmalig: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, dann nochmal aktivieren |
| `uvicorn : Die Benennung ... nicht erkannt` | venv nicht aktiv | `.\.venv\Scripts\Activate.ps1` und immer `python -m uvicorn ...` schreiben |
| `ModuleNotFoundError: No module named 'app'` | falscher Ordner oder `pytest.ini` fehlt | im Ordner `backend` starten, `pytest.ini` prüfen (Schreibweise!) |
| `ModuleNotFoundError: fastapi` | venv nicht aktiv oder Pakete in anderes Python installiert | `(.venv)` vorn? Dann `pip install ...` wiederholen. `where.exe python` zeigt, welches Python gilt |
| `Address already in use` / `Fehler 10048` | Port 8000 ist belegt (alter Server läuft noch) | `netstat -ano \| findstr :8000` → PID notieren → `taskkill /PID <PID> /F`. Oder anderen Port: `--port 8001` |
| `git commit`: "Please tell me who you are" | Name/Mail fehlen | die zwei `git config`-Befehle aus 1.1 |
| `git add` meldet `LF will be replaced by CRLF` | nur eine Warnung (Windows-Zeilenenden) | ignorieren |
| Seite zeigt `{"detail":"Not Found"}` | falsche Adresse | genau `/api/health` |
| `--reload` startet endlos neu | Änderungen im `.venv`-Ordner lösen Neustart aus | `--reload-dir app` anhängen |
