# Kapitel 3: Speicherung, Passwort, Rezept-API

**Ziel:** Rezepte in einer SQLite-Datenbank speichern, mit Passwort schützen und über HTTP anlegen, lesen, ändern, löschen, filtern und durchsuchen.

## 3.1 `backend/app/db.py`: Rezepte in SQLite

```python
"""SQLite-Speicherung der Rezepte. Das Rezept liegt als JSON in `data`; Spalten dienen Filter und Suche."""
import json
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from .schema import Rezept

FILTER_KATEGORIEN = ["Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snacks"]


def _search_text(r: Rezept) -> str:
    parts = [r.titel, *(z.name for z in r.zutaten), *r.tags]
    return " ".join(parts).lower()  # Python-lower statt SQLite-lower: Umlaute


class RecipeRepo:
    def __init__(self, path: Path | str):
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._db.execute(
            """CREATE TABLE IF NOT EXISTS recipes (
                id TEXT PRIMARY KEY, data TEXT NOT NULL, kategorie TEXT NOT NULL,
                favorit INTEGER NOT NULL DEFAULT 0, erstellt_am TEXT NOT NULL, search_text TEXT NOT NULL)"""
        )
        self._db.commit()

    @staticmethod
    def _to_dict(row: sqlite3.Row) -> dict:
        d = json.loads(row["data"])
        d.update(id=row["id"], erstellt_am=row["erstellt_am"], favorit=bool(row["favorit"]))
        return d

    def create(self, r: Rezept) -> dict:
        rid = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._lock:
            self._db.execute(
                "INSERT INTO recipes (id, data, kategorie, favorit, erstellt_am, search_text) VALUES (?,?,?,0,?,?)",
                (rid, r.model_dump_json(), r.kategorie, now, _search_text(r)))
            self._db.commit()
        return self.get(rid)  # type: ignore[return-value]

    def get(self, rid: str) -> dict | None:
        row = self._db.execute("SELECT * FROM recipes WHERE id=?", (rid,)).fetchone()
        return self._to_dict(row) if row else None

    def list(self, kategorie: str | None = None, q: str | None = None, favorit: bool | None = None) -> list[dict]:
        """kategorie None oder 'Alle' = alle. q sucht in Titel, Zutaten und Tags (alle Wörter müssen passen)."""
        sql, args = "SELECT * FROM recipes WHERE 1=1", []
        if kategorie and kategorie != "Alle":
            sql += " AND kategorie=?"
            args.append(kategorie)
        if favorit is not None:
            sql += " AND favorit=?"
            args.append(int(favorit))
        for word in (q or "").lower().split():
            esc = word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            sql += " AND search_text LIKE ? ESCAPE '\\'"
            args.append(f"%{esc}%")
        sql += " ORDER BY erstellt_am DESC, rowid DESC"
        return [self._to_dict(r) for r in self._db.execute(sql, args).fetchall()]

    def update(self, rid: str, r: Rezept) -> dict | None:
        with self._lock:
            cur = self._db.execute("UPDATE recipes SET data=?, kategorie=?, search_text=? WHERE id=?",
                                   (r.model_dump_json(), r.kategorie, _search_text(r), rid))
            self._db.commit()
        return self.get(rid) if cur.rowcount else None

    def patch(self, rid: str, kategorie: str | None = None, favorit: bool | None = None) -> dict | None:
        cur = self.get(rid)
        if cur is None:
            return None
        if kategorie is not None:
            data = {k: v for k, v in cur.items() if k not in ("id", "erstellt_am", "favorit")}
            data["kategorie"] = kategorie
            self.update(rid, Rezept.model_validate(data))
        if favorit is not None:
            with self._lock:
                self._db.execute("UPDATE recipes SET favorit=? WHERE id=?", (int(favorit), rid))
                self._db.commit()
        return self.get(rid)

    def delete(self, rid: str) -> bool:
        with self._lock:
            cur = self._db.execute("DELETE FROM recipes WHERE id=?", (rid,))
            self._db.commit()
        return cur.rowcount > 0

    def count(self) -> int:
        return self._db.execute("SELECT COUNT(*) FROM recipes").fetchone()[0]
```

Der Kern in einfachen Worten:
- **Eine Tabelle, ein JSON-Feld.** Das ganze Rezept liegt als Text (JSON) in der Spalte `data`. Nur das, wonach man filtert, hat eigene Spalten: `kategorie`, `favorit`, `erstellt_am`. So brauchst du keine fünf verknüpften Tabellen.
- `search_text`: Titel + Zutaten + Tags in Kleinbuchstaben. Die Suche ist dann ein einfaches `LIKE`. Das Kleinschreiben macht **Python** (`.lower()`), weil SQLites eigenes `lower()` Umlaute (`Ä`) nicht kann.
- Suche mit mehreren Wörtern: **alle** Wörter müssen vorkommen ("mehl tomaten" findet nur Rezepte mit beidem).
- `ESCAPE '\\'`: wer nach `%` oder `_` sucht, soll normalen Text suchen und nicht Platzhalter auslösen. Das ist auch ein Schutz vor SQL-Tricks (die Werte kommen immer als `?` an, nie direkt in den SQL-Text).
- `threading.Lock` + `check_same_thread=False`: FastAPI bearbeitet Anfragen in mehreren Threads. Schreibzugriffe laufen nacheinander.
- `get` liefert die Rezeptdaten **plus** `id`, `erstellt_am`, `favorit` (die liegen in Spalten, nicht im JSON).
- `patch` ändert gezielt nur Kategorie oder Favorit.

## 3.2 `backend/app/auth.py`: ein Passwort für eine Person

```python
"""Einfacher Passwortschutz für genau eine Person: Passwort aus APP_PASSWORD, kein Benutzersystem.
Der Token ist ein HMAC über eine feste Zeichenkette mit dem Passwort als Schlüssel. Er bleibt auf dem Handy
gespeichert und wird ungültig, sobald das Passwort geändert wird."""
import hashlib
import hmac
import time
from collections import deque

from fastapi import Header, HTTPException

MAX_FAILS = 10
WINDOW_SECONDS = 600


def make_token(password: str) -> str:
    return hmac.new(password.encode(), b"gopa-session-v1", hashlib.sha256).hexdigest()


class Auth:
    def __init__(self, password: str):
        self.password = password
        self._fails: deque[float] = deque()

    def login(self, given: str) -> str:
        if not self.password:
            raise HTTPException(503, "Gopa ist noch nicht eingerichtet (APP_PASSWORD fehlt).")
        now = time.time()
        while self._fails and now - self._fails[0] > WINDOW_SECONDS:
            self._fails.popleft()
        if len(self._fails) >= MAX_FAILS:
            raise HTTPException(429, "Zu viele Versuche. Warte ein paar Minuten.")
        if not hmac.compare_digest(given.encode(), self.password.encode()):
            self._fails.append(now)
            raise HTTPException(401, "Das Passwort stimmt nicht.")
        return make_token(self.password)

    def require(self, authorization: str | None = Header(default=None)) -> None:
        if not self.password:
            raise HTTPException(503, "Gopa ist noch nicht eingerichtet (APP_PASSWORD fehlt).")
        token = (authorization or "").removeprefix("Bearer ").strip()
        if not hmac.compare_digest(token.encode(), make_token(self.password).encode()):
            raise HTTPException(401, "Bitte melde dich an.")
```

Wie das Login funktioniert:
1. Das Passwort steht in `APP_PASSWORD` (Umgebungsvariable auf deinem PC).
2. Die App schickt es an `/api/login`. Stimmt es, bekommt sie einen **Token** zurück: ein HMAC (eine Art Unterschrift) über einen festen Text, mit dem Passwort als Schlüssel.
3. Die App speichert den Token und schickt ihn bei jeder Anfrage im Header `Authorization: Bearer ...` mit.
4. Ändert sich das Passwort, ändert sich der Token, und alle alten Anmeldungen werden ungültig.

Sicherheitsdetails, die du verstehen solltest:
- `hmac.compare_digest`: vergleicht in gleichbleibender Zeit. Ein normaler `==` verrät durch seine Dauer, wie viele Buchstaben stimmten.
- **Fail-closed:** ist `APP_PASSWORD` leer, antwortet der Server mit **503**, statt alle hereinzulassen. Ein vergessenes Passwort darf nie "offen" bedeuten.
- Ratenbegrenzung: nach 10 falschen Versuchen in 10 Minuten gibt es **429**.

## 3.3 `backend/app/main.py` (Stufe 3): die Rezept-API

Ersetze die `main.py` aus Kapitel 1 vollständig:

```python
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .auth import Auth
from .config import Settings, load_settings
from .db import RecipeRepo
from .schema import Kategorie, Rezept


class Login(BaseModel):
    password: str


class Patch(BaseModel):
    kategorie: Kategorie | None = None
    favorit: bool | None = None


def create_app(cfg: Settings, repo: RecipeRepo | None = None) -> FastAPI:
    repo = repo or RecipeRepo(cfg.data_dir / "gopa.db")
    app = FastAPI(title="Gopa")
    # Die Android-App (Capacitor) läuft unter http://localhost und ruft diesen Server direkt auf.
    # Es gibt keine Cookies, nur den Authorization-Header, deshalb ist das ungefährlich.
    app.add_middleware(CORSMiddleware, allow_origins=["http://localhost", "https://localhost", "capacitor://localhost"],
                       allow_methods=["*"], allow_headers=["Authorization", "Content-Type"])
    auth = Auth(cfg.app_password)
    api = APIRouter(dependencies=[Depends(auth.require)])  # alles an "api" verlangt die Anmeldung

    @app.get("/api/health")
    def health():
        return {"ok": True}

    @app.post("/api/login")
    def login(body: Login):
        return {"token": auth.login(body.password)}

    # ---- Rezepte ----
    @api.get("/api/recipes")
    def list_recipes(kategorie: str | None = None, q: str | None = None, favorit: bool | None = None):
        return repo.list(kategorie, q, favorit)

    @api.post("/api/recipes", status_code=201)
    def save_recipe(r: Rezept):
        return repo.create(r)

    @api.get("/api/recipes/{rid}")
    def get_recipe(rid: str):
        rec = repo.get(rid)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @api.put("/api/recipes/{rid}")
    def update_recipe(rid: str, r: Rezept):
        rec = repo.update(rid, r)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @api.patch("/api/recipes/{rid}")
    def patch_recipe(rid: str, p: Patch):
        rec = repo.patch(rid, p.kategorie, p.favorit)
        if not rec:
            raise HTTPException(404, "Rezept nicht gefunden")
        return rec

    @api.delete("/api/recipes/{rid}", status_code=204)
    def delete_recipe(rid: str):
        if not repo.delete(rid):
            raise HTTPException(404, "Rezept nicht gefunden")

    app.include_router(api)
    return app


app = create_app(load_settings())
```

Neu hier:
- `APIRouter(dependencies=[Depends(auth.require)])`: **alles**, was an diesem Router hängt, prüft zuerst den Token. `/api/health` und `/api/login` hängen direkt an `app` und sind deshalb offen.
- `CORSMiddleware`: Die Android-App läuft unter der Adresse `http://localhost` (das ist die Hülle der App), dein Server unter `http://192.168.x.x:8000`. Browser (und WebViews) verbieten solche Aufrufe, außer der Server erlaubt sie ausdrücklich. Genau das tut diese Zeile, nur für die drei App-Adressen.
- Antworten `201` (angelegt) und `204` (gelöscht, kein Inhalt) sind die üblichen HTTP-Codes.
- `HTTPException(404, ...)`: Fehler mit deutscher Meldung. Die App zeigt sie später in Gopas Sprechblase.
- `create_app(cfg, repo)` ist eine **Funktion**, die eine App baut. Dadurch kann jeder Test seine eigene App mit eigener Datenbank bekommen.
- Die letzte Zeile `app = create_app(load_settings())` ist die App, die uvicorn startet.

## 3.4 Tests

`backend/tests/test_s3.py`:

```python
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import RecipeRepo
from app.main import create_app
from app.schema import Rezept


def make_cfg(tmp_path: Path, passwort: str = "geheim") -> Settings:
    return Settings(
        anthropic_api_key="", claude_model="", app_password=passwort, whisper_model="tiny",
        max_video_mb=10, max_video_seconds=60, timeout_download=5, timeout_transcribe=5,
        timeout_ocr=5, timeout_llm=5, enable_ocr=False, rate_limit_per_hour=5, data_dir=tmp_path,
    )


def rezept(titel="Pfannkuchen", kategorie="Frühstück", zutat="Mehl", tags=None) -> Rezept:
    return Rezept.model_validate({
        "titel": titel, "kategorie": kategorie, "tags": tags or [],
        "zutaten": [{"name": zutat, "menge": 250, "einheit": "g"}],
        "schritte": [{"nr": 1, "text": "Verrühren."}],
        "quelle": {"url": "https://www.tiktok.com/@x/video/1", "plattform": "TikTok"},
    })


# ---------- Datenbank ----------

def test_anlegen_lesen_loeschen():
    repo = RecipeRepo(":memory:")
    neu = repo.create(rezept())
    assert neu["id"] and neu["favorit"] is False
    assert repo.get(neu["id"])["titel"] == "Pfannkuchen"
    assert repo.delete(neu["id"]) is True
    assert repo.get(neu["id"]) is None
    assert repo.delete(neu["id"]) is False


def test_filter_und_suche_mit_umlauten():
    repo = RecipeRepo(":memory:")
    repo.create(rezept("Pfannkuchen", "Frühstück", "Mehl", ["süß"]))
    repo.create(rezept("Nudeln", "Mittagessen", "Tomaten"))
    assert [r["titel"] for r in repo.list(kategorie="Frühstück")] == ["Pfannkuchen"]
    assert len(repo.list(kategorie="Alle")) == 2
    assert [r["titel"] for r in repo.list(q="TOMATEN")] == ["Nudeln"]   # Zutat, Groß/klein egal
    assert [r["titel"] for r in repo.list(q="süß")] == ["Pfannkuchen"]  # Umlaut im Tag
    assert repo.list(q="mehl tomaten") == []                            # alle Wörter müssen passen


def test_prozentzeichen_in_der_suche_ist_normaler_text():
    repo = RecipeRepo(":memory:")
    repo.create(rezept())
    assert repo.list(q="%") == []


def test_patch_kategorie_und_favorit():
    repo = RecipeRepo(":memory:")
    rid = repo.create(rezept())["id"]
    neu = repo.patch(rid, kategorie="Dessert", favorit=True)
    assert neu["kategorie"] == "Dessert" and neu["favorit"] is True
    assert repo.patch("gibt-es-nicht", kategorie="Dessert") is None


# ---------- API ----------

@pytest.fixture
def client(tmp_path):
    return TestClient(create_app(make_cfg(tmp_path)))


def anmelden(client, passwort="geheim"):
    return {"Authorization": "Bearer " + client.post("/api/login", json={"password": passwort}).json()["token"]}


def test_ohne_anmeldung_401(client):
    assert client.get("/api/recipes").status_code == 401


def test_falsches_passwort_401(client):
    assert client.post("/api/login", json={"password": "falsch"}).status_code == 401


def test_ohne_passwort_in_der_konfiguration_503(tmp_path):
    c = TestClient(create_app(make_cfg(tmp_path, passwort="")))
    assert c.post("/api/login", json={"password": "x"}).status_code == 503
    assert c.get("/api/recipes").status_code == 503


def test_login_sperre_nach_zehn_fehlversuchen(client):
    for _ in range(10):
        assert client.post("/api/login", json={"password": "falsch"}).status_code == 401
    assert client.post("/api/login", json={"password": "geheim"}).status_code == 429


def test_crud_ueber_die_api(client):
    h = anmelden(client)
    daten = rezept().model_dump()
    r = client.post("/api/recipes", json=daten, headers=h)
    assert r.status_code == 201
    rid = r.json()["id"]
    assert client.get(f"/api/recipes/{rid}", headers=h).json()["titel"] == "Pfannkuchen"
    daten["titel"] = "Waffeln"
    assert client.put(f"/api/recipes/{rid}", json=daten, headers=h).json()["titel"] == "Waffeln"
    assert client.patch(f"/api/recipes/{rid}", json={"favorit": True}, headers=h).json()["favorit"] is True
    assert client.get("/api/recipes?kategorie=Frühstück", headers=h).json()[0]["titel"] == "Waffeln"
    assert client.delete(f"/api/recipes/{rid}", headers=h).status_code == 204
    assert client.get(f"/api/recipes/{rid}", headers=h).status_code == 404


def test_ungueltiges_rezept_422(client):
    h = anmelden(client)
    assert client.post("/api/recipes", json={"titel": "Nur Titel"}, headers=h).status_code == 422
```

Beachte `RecipeRepo(":memory:")`: eine Datenbank, die nur im Arbeitsspeicher lebt, also für Tests ideal und ohne Aufräumen.

## Test für dieses Kapitel

### Automatisch

```powershell
cd C:\Temp\gopa-nachbau\backend
python -m pytest -q
```

**Erwartet:** `25 passed`. (Beim Import von `app.main` entsteht ein Ordner `backend\data` mit einer leeren Datenbank, das ist normal und steht in der `.gitignore`.)

### Von Hand

Starte den Server mit Passwort:

```powershell
$env:APP_PASSWORD = "geheim"
python -m uvicorn app.main:app --reload --port 8000
```

Öffne in einem **zweiten** PowerShell-Fenster diese Befehle nacheinander:

```powershell
# 1. Ohne Anmeldung muss es scheitern (Erwartet: Fehler 401)
Invoke-RestMethod http://localhost:8000/api/recipes

# 2. Anmelden und Token merken
$t = (Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/login -ContentType "application/json" -Body '{"password":"geheim"}').token
$h = @{ Authorization = "Bearer $t" }

# 3. Liste ist leer (Erwartet: nichts / [])
Invoke-RestMethod http://localhost:8000/api/recipes -Headers $h

# 4. Rezept anlegen (Umlaute: als UTF-8-Bytes senden!)
$r = @{ titel="Pfannkuchen"; kategorie="Frühstück"
        zutaten=@(@{name="Mehl";menge=250;einheit="g"})
        schritte=@(@{nr=1;text="Alles verrühren."})
        quelle=@{url="https://www.tiktok.com/@x/video/1";plattform="TikTok"} } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/recipes -Headers $h -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($r))

# 5. Suchen
Invoke-RestMethod "http://localhost:8000/api/recipes?q=mehl" -Headers $h
```

**Erwartet:** bei 4 kommt das Rezept mit `id` zurück, bei 5 steht es in der Liste.

Alternativ per Maus: <http://localhost:8000/docs> → `POST /api/login` → *Try it out* → Token aus der Antwort kopieren → bei den anderen Aufrufen in das Feld `authorization` schreiben: `Bearer <token>`.

```powershell
cd ..
git add -A
git commit -m "feat: SQLite-Speicherung, Passwort-Login, Rezept-API"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| Antwort 503 "Gopa ist noch nicht eingerichtet" | `APP_PASSWORD` nicht gesetzt (in **diesem** Terminal) | `$env:APP_PASSWORD="geheim"` im selben Fenster, in dem uvicorn startet, dann neu starten |
| 401 "Bitte melde dich an" nach Passwortwechsel | alter Token ungültig | neu anmelden (die App tut das automatisch beim 401) |
| 429 "Zu viele Versuche" | 10 Fehlversuche | 10 Minuten warten oder Server neu starten (Zähler liegt im Speicher) |
| 422 beim Anlegen | JSON passt nicht zum Schema | in der Antwort steht, **welches** Feld (`loc`) und warum (`msg`) |
| Umlaute kommen als `FrÃ¼hstÃ¼ck` an | PowerShell 5.1 sendet Strings nicht als UTF-8 | Body als `[Text.Encoding]::UTF8.GetBytes(...)` senden, wie oben |
| `sqlite3.OperationalError: database is locked` | zweiter Prozess hält die Datei offen (z. B. alter Server) | alte Server beenden (`netstat -ano \| findstr :8000`) |
| `sqlite3.ProgrammingError: SQLite objects created in a thread` | `check_same_thread=False` fehlt | wie in `db.py` |
| Suche findet "süß" nicht | `.lower()` in SQL statt in Python | `search_text` in Python bauen und klein schreiben, wie gezeigt |
| Browser: "blocked by CORS policy" | Adresse der App nicht in `allow_origins` | Origin eintragen. Im Dev-Betrieb löst der Vite-Proxy (Kapitel 5) das Problem ganz |
| `ValueError: ... Depends` / `Header` Fehler | `auth.require` ohne `self` aufgerufen | `Depends(auth.require)`, **ohne** Klammern |
| Änderungen am Code wirken nicht | Server ohne `--reload` gestartet | Server neu starten |
