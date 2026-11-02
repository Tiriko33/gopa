# Kapitel 2: Datenmodell, Einheiten, Link-Prüfung

**Ziel:** Vier kleine Dateien ohne Netzwerk und ohne KI, die du komplett mit Tests absicherst: wie ein Rezept aussieht (`schema.py`), US-Einheiten umrechnen (`units.py`), Links prüfen (`urls.py`) und Einstellungen lesen (`config.py`).

Warum zuerst das? Alles andere (Datenbank, KI, App) hängt an der Frage "Was ist ein Rezept?". Das Schema ist der **Vertrag** zwischen Sprachmodell, Server und App.

## 2.1 `backend/app/config.py`: Einstellungen aus der Umgebung

```python
import os
from dataclasses import dataclass
from pathlib import Path


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str
    claude_model: str
    app_password: str
    whisper_model: str
    max_video_mb: int
    max_video_seconds: int
    timeout_download: int
    timeout_transcribe: int
    timeout_ocr: int
    timeout_llm: int
    enable_ocr: bool
    rate_limit_per_hour: int
    data_dir: Path
    static_dir: Path | None = None
    llm_provider: str = "anthropic"  # anthropic | ollama
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = ""
    ollama_timeout: int = 300
    ollama_keep_alive: str = "0"  # "0" = Modell sofort nach dem Rezept entladen (gibt RAM/VRAM frei)


def load_settings() -> Settings:
    return Settings(
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
        claude_model=os.environ.get("CLAUDE_MODEL", ""),
        app_password=os.environ.get("APP_PASSWORD", ""),
        whisper_model=os.environ.get("WHISPER_MODEL", "small"),
        max_video_mb=_int("MAX_VIDEO_MB", 150),
        max_video_seconds=_int("MAX_VIDEO_SECONDS", 600),
        timeout_download=_int("STEP_TIMEOUT_DOWNLOAD", 120),
        timeout_transcribe=_int("STEP_TIMEOUT_TRANSCRIBE", 300),
        timeout_ocr=_int("STEP_TIMEOUT_OCR", 120),
        timeout_llm=_int("STEP_TIMEOUT_LLM", 90),
        enable_ocr=os.environ.get("ENABLE_OCR", "true").lower() == "true",
        rate_limit_per_hour=_int("RATE_LIMIT_PER_HOUR", 20),
        data_dir=Path(os.environ.get("DATA_DIR", "./data")),
        static_dir=Path(os.environ["STATIC_DIR"]) if os.environ.get("STATIC_DIR") else None,
        llm_provider=os.environ.get("LLM_PROVIDER", "anthropic").strip().lower(),
        ollama_url=os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/"),
        ollama_model=os.environ.get("OLLAMA_MODEL", ""),
        ollama_timeout=_int("OLLAMA_TIMEOUT", 300),
        ollama_keep_alive=os.environ.get("OLLAMA_KEEP_ALIVE", "0").strip(),
    )
```

Was hier passiert:
- Alle Einstellungen kommen aus **Umgebungsvariablen** (später aus der `.env`). So steht kein Passwort im Code.
- `@dataclass(frozen=True)`: eine Einstellungs-Hülle, die man nach dem Erzeugen nicht mehr verändern kann (verhindert Bugs).
- `_int(...)`: liest eine Zahl; bei Tippfehlern (`MAX_VIDEO_MB=abc`) nimmt es den Standardwert, statt abzustürzen.
- Felder **mit** Standardwert (`static_dir = None`, `llm_provider = ...`) müssen in Python **hinter** den Feldern ohne Standardwert stehen, sonst gibt es `TypeError: non-default argument follows default argument`.
- `ollama_keep_alive = "0"`: das Modell wird sofort nach jedem Rezept aus dem Grafikspeicher entladen.

## 2.2 `backend/app/schema.py`: das Rezept

```python
from typing import Literal

from pydantic import BaseModel, Field, field_validator

Kategorie = Literal["Frühstück", "Mittagessen", "Abendessen", "Dessert", "Snacks", "Sonstiges"]
Plattform = Literal["TikTok", "Instagram"]


class Zutat(BaseModel):
    gruppe: str | None = None
    name: str = Field(min_length=1)
    menge: float | None = None
    einheit: str | None = None
    original: str | None = None


class Schritt(BaseModel):
    nr: int
    text: str = Field(min_length=1)
    timer_min: int | None = None
    tipp: str | None = None


class Quelle(BaseModel):
    url: str
    plattform: Plattform
    creator: str | None = None


class Rezept(BaseModel):
    titel: str = Field(min_length=1)
    beschreibung: str = ""
    portionen: int = Field(ge=1, default=2)
    kategorie: Kategorie = "Sonstiges"
    zeit_vorbereitung_min: int | None = None
    zeit_kochen_min: int | None = None
    zutaten: list[Zutat] = Field(min_length=1)
    schritte: list[Schritt] = Field(min_length=1)
    tags: list[str] = []
    hinweise: list[str] = []
    quelle: Quelle

    @field_validator("schritte")
    @classmethod
    def _renumber(cls, v: list[Schritt]) -> list[Schritt]:
        for i, s in enumerate(v, start=1):
            s.nr = i
        return v


# JSON-Schema für Claude (ohne "quelle": die setzt das Backend selbst)
def claude_json_schema() -> dict:
    schema = Rezept.model_json_schema()
    schema["properties"].pop("quelle", None)
    schema["required"] = [r for r in schema.get("required", []) if r != "quelle"]
    return schema
```

Was hier passiert:
- `class Zutat(BaseModel)`: pydantic prüft beim Erzeugen jede Eigenschaft. `menge: float | None = None` heißt: Zahl **oder leer**. Leer ist wichtig: Gopa darf **nie Mengen erfinden**; fehlt eine Angabe, bleibt sie leer.
- `Literal[...]` erlaubt nur genau diese Wörter. Eine Kategorie "Nachtisch" wird abgelehnt.
- `Field(min_length=1)`: ein Rezept braucht mindestens eine Zutat und einen Schritt.
- `@field_validator("schritte")`: nummeriert die Schritte immer neu 1, 2, 3, egal was das Sprachmodell geliefert hat.
- `claude_json_schema()`: erzeugt aus dem Modell eine **JSON-Schema**-Beschreibung (für das Sprachmodell: "so muss deine Antwort aussehen"). `quelle` wird entfernt, weil der Server sie selbst einträgt (URL kennt er besser als die KI).

## 2.3 `backend/app/units.py`: Sicherheitsnetz für Einheiten

```python
"""Einheiten-Umrechnung (US -> metrisch). Dient als deterministisches Sicherheitsnetz
nach dem Claude-Aufruf und als Hilfsfunktion für Tests."""
import re

# Einheit (klein) -> (Faktor, Zieleinheit)
_FACTORS: dict[str, tuple[float, str]] = {
    "cup": (240.0, "ml"),
    "cups": (240.0, "ml"),
    "tasse": (240.0, "ml"),
    "fl oz": (29.57, "ml"),
    "fl. oz": (29.57, "ml"),
    "oz": (28.35, "g"),
    "ounce": (28.35, "g"),
    "ounces": (28.35, "g"),
    "unze": (28.35, "g"),
    "unzen": (28.35, "g"),
    "lb": (453.6, "g"),
    "lbs": (453.6, "g"),
    "pound": (453.6, "g"),
    "pounds": (453.6, "g"),
    "stick": (113.0, "g"),
    "sticks": (113.0, "g"),
    "pint": (473.0, "ml"),
    "quart": (946.0, "ml"),
    "gallon": (3785.0, "ml"),
}

_ALIASES = {"tbsp": "EL", "tablespoon": "EL", "tablespoons": "EL", "tsp": "TL", "teaspoon": "TL", "teaspoons": "TL"}


def _round_nice(value: float, unit: str) -> float:
    if unit in ("g", "ml"):
        if value >= 500:
            return float(round(value / 5) * 5)
        return float(round(value))
    return round(value, 1)


def convert_amount(menge: float | None, einheit: str | None) -> tuple[float | None, str | None, bool]:
    """Gibt (menge, einheit, umgerechnet) zurück. Unbekannte Einheiten bleiben unverändert."""
    if einheit is None:
        return menge, einheit, False
    key = einheit.strip().lower().rstrip(".")
    if key in _ALIASES:
        return menge, _ALIASES[key], False
    if key not in _FACTORS or menge is None:
        return menge, einheit, False
    factor, target = _FACTORS[key]
    return _round_nice(menge * factor, target), target, True


def fahrenheit_to_celsius(f: float) -> int:
    """Rundet auf 5 °C, wie im Backofen üblich."""
    c = (f - 32) * 5 / 9
    return int(round(c / 5) * 5)


_TEMP_RE = re.compile(r"(\d{2,3})\s*(?:°|º|grad)?\s*F\b", re.IGNORECASE)


def convert_temperatures(text: str) -> str:
    """Ersetzt '350°F' im Text durch '175 °C'."""
    return _TEMP_RE.sub(lambda m: f"{fahrenheit_to_celsius(float(m.group(1)))} °C", text)
```

Das Sprachmodell soll Cups und Unzen selbst umrechnen. Es macht das aber nicht zuverlässig. Deshalb rechnet **Code** noch einmal nach: Was ein Rechner kann, gehört nicht ins Sprachmodell.

Wichtige Entscheidungen:
- `tbsp`/`tsp` werden zu `EL`/`TL`, **nicht** in ml umgerechnet (ein Esslöffel ist in deutschen Rezepten eine eigene Einheit).
- Unbekannte Einheiten (`Stück`, `Prise`) bleiben unverändert.
- `_round_nice`: 237,6 ml wären unpraktisch, also ganze Zahlen; ab 500 auf 5er gerundet.
- `fahrenheit_to_celsius` rundet auf 5 °C, wie bei Backöfen üblich (350 °F → 175 °C).

## 2.4 `backend/app/urls.py`: nur TikTok und Instagram

```python
from urllib.parse import urlparse

ALLOWED = {
    "TikTok": ("tiktok.com", "vm.tiktok.com", "vt.tiktok.com"),
    "Instagram": ("instagram.com",),
}


class InvalidLink(ValueError):
    pass


def validate_link(raw: str) -> tuple[str, str]:
    """Gibt (bereinigte_url, plattform) zurück oder wirft InvalidLink."""
    raw = (raw or "").strip()
    # Share-Texte enthalten oft Text + Link: ersten http-Token nehmen
    for token in raw.split():
        if token.startswith(("http://", "https://")):
            raw = token
            break
    p = urlparse(raw)
    if p.scheme not in ("http", "https") or not p.hostname:
        raise InvalidLink("Das sieht nicht wie ein Link aus.")
    host = p.hostname.lower()
    for plattform, domains in ALLOWED.items():
        if any(host == d or host.endswith("." + d) for d in domains):
            # Query/Fragment (Tracking-Parameter) werden verworfen
            return f"https://{host}{p.path}", plattform
    raise InvalidLink("Gopa kann nur Links von TikTok und Instagram lesen.")
```

Warum so streng? Der Server lädt, was in dem Link steht. Ohne Prüfung könnte jemand ihn dazu bringen, **beliebige Adressen** aufzurufen (z. B. dein Router im Heimnetz). Deshalb:
- Der Host muss **genau** `tiktok.com` sein oder auf `.tiktok.com` enden. `evil-tiktok.com` besteht nicht (der Test unten prüft das).
- Share-Texte wie "Schau mal https://… cool" enthalten oft Text und Link: wir nehmen das erste `http`-Stück.
- Alles nach dem `?` (Tracking-Parameter) wird weggeworfen.

## 2.5 Tests

`backend/tests/test_s2.py`:

```python
import pytest
from pydantic import ValidationError

from app.schema import Rezept
from app.units import convert_amount, convert_temperatures, fahrenheit_to_celsius
from app.urls import InvalidLink, validate_link


def rezept_daten(**extra):
    daten = {
        "titel": "Pfannkuchen",
        "zutaten": [{"name": "Mehl", "menge": 250, "einheit": "g"}],
        "schritte": [{"nr": 7, "text": "Alles verrühren."}, {"nr": 7, "text": "Backen."}],
        "quelle": {"url": "https://www.tiktok.com/@x/video/1", "plattform": "TikTok"},
    }
    daten.update(extra)
    return daten


def test_schema_nummeriert_schritte_neu():
    r = Rezept.model_validate(rezept_daten())
    assert [s.nr for s in r.schritte] == [1, 2]
    assert r.kategorie == "Sonstiges"      # Standardwert
    assert r.portionen == 2


def test_schema_lehnt_leere_zutaten_ab():
    with pytest.raises(ValidationError):
        Rezept.model_validate(rezept_daten(zutaten=[]))


def test_schema_lehnt_unbekannte_kategorie_ab():
    with pytest.raises(ValidationError):
        Rezept.model_validate(rezept_daten(kategorie="Nachtisch"))


def test_cups_werden_zu_ml():
    assert convert_amount(2, "cups") == (480.0, "ml", True)


def test_el_bleibt_el():
    assert convert_amount(2, "tbsp") == (2, "EL", False)


def test_unbekannte_einheit_bleibt():
    assert convert_amount(3, "Stück") == (3, "Stück", False)


def test_fahrenheit():
    assert fahrenheit_to_celsius(350) == 175
    assert convert_temperatures("Bei 350°F backen") == "Bei 175 °C backen"


def test_link_tiktok_und_tracking_wird_entfernt():
    url, plattform = validate_link("Schau mal https://www.tiktok.com/@x/video/1?utm_source=abc")
    assert plattform == "TikTok"
    assert url == "https://www.tiktok.com/@x/video/1"


def test_link_kurzlink_tiktok():
    assert validate_link("https://vm.tiktok.com/ZMabc/")[1] == "TikTok"


def test_link_instagram():
    assert validate_link("https://www.instagram.com/reel/ABC/")[1] == "Instagram"


@pytest.mark.parametrize("raw", ["", "hallo", "https://youtube.com/watch?v=1", "https://evil-tiktok.com/x"])
def test_ungueltige_links(raw):
    with pytest.raises(InvalidLink):
        validate_link(raw)
```

Merke dir die Struktur: ein Test ist eine Funktion `test_...`, `assert` prüft eine Behauptung, `pytest.raises` prüft, dass ein Fehler kommt, `parametrize` führt einen Test mit mehreren Eingaben aus.

## Test für dieses Kapitel

```powershell
cd C:\Temp\gopa-nachbau\backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

**Erwartet:** `15 passed` (1 aus Kapitel 1 und 14 neue).

Versuche zum Lernen, einen Test **absichtlich** kaputt zu machen: Ändere in `units.py` den Faktor `"cup": (240.0, "ml")` auf `250.0`, starte pytest, lies die Fehlermeldung, und mache es wieder rückgängig. So lernst du, Testausgaben zu lesen.

```powershell
cd ..
git add -A
git commit -m "feat: Rezept-Schema, Einheiten, Link-Prüfung, Einstellungen"
```

## Wenn etwas schiefgeht

| Meldung / Symptom | Ursache | Lösung |
|---|---|---|
| `TypeError: non-default argument ... follows default argument` | Reihenfolge der Felder in `Settings` | Felder ohne Standardwert zuerst |
| `AttributeError: ... has no attribute 'model_validate'` | altes pydantic 1.x | `pip install -U "pydantic>=2.7"` |
| `SyntaxError` bei `str \| None` | Python älter als 3.10 | mit `py -3.12` neue venv bauen |
| `UnicodeDecodeError` oder Umlaute als `FrÃ¼hstÃ¼ck` | Datei nicht als UTF-8 gespeichert | VS Code: unten rechts → *Mit Kodierung speichern* → UTF-8 |
| `Literal`-Test schlägt fehl, obwohl "Frühstück" stimmt | Umlaut im Test anders kodiert (ü als u + Punkte) | Wort in beiden Dateien neu tippen |
| `ValidationError` bei `Rezept.model_validate` | echte Fehlermeldung lesen: sie nennt Feld und Grund (`zutaten ... List should have at least 1 item`) | die Daten korrigieren, nicht das Schema |
| Link-Test `evil-tiktok.com` besteht fälschlich | Host-Prüfung mit `in` statt `==`/`endswith` | exakt wie oben: `host == d or host.endswith("." + d)` |
| `ImportError: attempted relative import` | Datei direkt mit `python datei.py` gestartet | Module immer als Paket starten: `python -m app.cli` |
