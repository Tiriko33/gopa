import types

import pytest
from pydantic import ValidationError

from app import llm
from app.config import Settings
from app.schema import Rezept
from app.sources import PipelineError, caption_has_full_recipe, dedupe_texts
from app.units import convert_amount, convert_temperatures, fahrenheit_to_celsius
from app.urls import InvalidLink, validate_link
from pathlib import Path

CFG = Settings("key", "model-x", "pw", "small", 150, 600, 10, 10, 10, 10, False, 20, Path("."))

QUELLE = {"url": "https://www.tiktok.com/@a/video/1", "plattform": "TikTok", "creator": "a"}


def rezept_dict(**over):
    d = {"titel": "Pfannkuchen", "beschreibung": "", "portionen": 2, "kategorie": "Frühstück",
         "zutaten": [{"name": "Mehl", "menge": 200, "einheit": "g"}],
         "schritte": [{"nr": 7, "text": "Alles verrühren"}], "quelle": QUELLE}
    d.update(over)
    return d


# --- Einheiten ---
def test_cups_to_ml():
    assert convert_amount(1, "cup") == (240.0, "ml", True)


def test_oz_lb_stick():
    assert convert_amount(8, "oz") == (227.0, "g", True)
    assert convert_amount(1, "lb") == (454.0, "g", True)
    assert convert_amount(1, "stick") == (113.0, "g", True)


def test_unknown_and_none_unchanged():
    assert convert_amount(2, "Stück") == (2, "Stück", False)
    assert convert_amount(None, "cup") == (None, "cup", False)  # nichts erfinden


def test_tbsp_becomes_el_without_scaling():
    assert convert_amount(2, "tbsp") == (2, "EL", False)


def test_fahrenheit():
    assert fahrenheit_to_celsius(350) == 175
    assert convert_temperatures("Bei 350°F backen") == "Bei 175 °C backen"


# --- URL ---
@pytest.mark.parametrize("url,plat", [
    ("https://www.tiktok.com/@x/video/123?is_from_webapp=1", "TikTok"),
    ("https://vm.tiktok.com/ZMabc/", "TikTok"),
    ("Schau mal https://www.instagram.com/reel/ABC/?igsh=zzz", "Instagram"),
])
def test_valid_links(url, plat):
    clean, p = validate_link(url)
    assert p == plat and "?" not in clean


@pytest.mark.parametrize("url", ["https://youtube.com/watch?v=1", "https://evil-tiktok.com/x",
                                 "https://tiktok.com.evil.de/x", "kein link", "file:///etc/passwd"])
def test_invalid_links(url):
    with pytest.raises(InvalidLink):
        validate_link(url)


# --- Schema ---
def test_schema_valid_renumbers_steps():
    r = Rezept.model_validate(rezept_dict())
    assert r.schritte[0].nr == 1


def test_schema_rejects_bad_category_and_empty():
    with pytest.raises(ValidationError):
        Rezept.model_validate(rezept_dict(kategorie="Pizza"))
    with pytest.raises(ValidationError):
        Rezept.model_validate(rezept_dict(zutaten=[]))


# --- Caption / OCR ---
def test_caption_full_recipe():
    cap = "Ingredients:\n2 cups flour\n1 tsp salt\n200 g sugar\n3 eggs\n1 stück Zitrone\nMix and bake 20 minutes"
    assert caption_has_full_recipe(cap)
    assert not caption_has_full_recipe("So lecker!! #fyp #food")


def test_dedupe_texts():
    assert dedupe_texts(["Mehl 200 g", "Mehl  200 g", "ab", "Zucker 100 g"]) == ["Mehl 200 g", "Zucker 100 g"]


# --- LLM (gemockt) ---
class FakeClient:
    def __init__(self, inputs):
        self.inputs = list(inputs)
        self.messages = types.SimpleNamespace(create=self._create)

    def _create(self, **kw):
        name, data = self.inputs.pop(0)
        block = types.SimpleNamespace(type="tool_use", name=name, input=data, id="t1")
        return types.SimpleNamespace(content=[block])


def test_structure_recipe_converts_leftover_us_units():
    d = rezept_dict(zutaten=[{"name": "Mehl", "menge": 2, "einheit": "cups"}],
                    schritte=[{"nr": 1, "text": "Bei 350°F backen"}])
    d.pop("quelle")
    r = llm.structure_recipe({"caption": "x"}, QUELLE, CFG, client=FakeClient([("speichere_rezept", d)]))
    assert r.zutaten[0].einheit == "ml" and r.zutaten[0].original == "2 cups"
    assert "175 °C" in r.schritte[0].text


def test_structure_recipe_retries_on_invalid_json():
    bad = {"titel": "X"}
    good = rezept_dict(); good.pop("quelle")
    c = FakeClient([("speichere_rezept", bad), ("speichere_rezept", good)])
    assert llm.structure_recipe({"caption": "x"}, QUELLE, CFG, client=c).titel == "Pfannkuchen"


def test_structure_recipe_no_recipe():
    with pytest.raises(PipelineError) as e:
        llm.structure_recipe({"caption": "x"}, QUELLE, CFG, client=FakeClient([("kein_rezept", {"grund": "Tanz"})]))
    assert e.value.code == "no_recipe"


def test_missing_config():
    cfg = Settings("", "", "", "small", 1, 1, 1, 1, 1, 1, False, 1, Path("."))
    with pytest.raises(PipelineError) as e:
        llm.structure_recipe({"caption": "x"}, QUELLE, cfg)
    assert e.value.code == "not_configured"
