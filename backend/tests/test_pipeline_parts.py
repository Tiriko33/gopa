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


def test_images_are_sent_to_claude_as_image_blocks():
    seen = {}

    class C(FakeClient):
        def _create(self, **kw):
            seen["content"] = kw["messages"][0]["content"]
            return super()._create(**kw)

    d = rezept_dict(); d.pop("quelle")
    llm.structure_recipe({}, QUELLE, CFG, client=C([("speichere_rezept", d)]), images=[("image/png", b"abc")])
    assert seen["content"][0]["type"] == "image" and seen["content"][-1]["type"] == "text"


# --- Ollama (gemockt) ---
import json as _json
from dataclasses import replace

OLLAMA_CFG = replace(CFG, llm_provider="ollama", ollama_model="qwen2.5:7b", anthropic_api_key="", claude_model="")


class FakeHttp:
    def __init__(self, replies):
        self.replies = list(replies)
        self.calls = []

    def post(self, url, timeout=None, json=None):
        self.calls.append((url, json))
        reply = self.replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        resp = types.SimpleNamespace(raise_for_status=lambda: None,
                                     json=lambda: {"message": {"content": reply}})
        return resp


def _good():
    d = rezept_dict(zutaten=[{"name": "Mehl", "menge": 1, "einheit": "cup"}])
    d.pop("quelle")
    return _json.dumps(d)


def test_ollama_returns_recipe_and_sends_schema_and_converts():
    http = FakeHttp([_good()])
    r = llm.structure_recipe({"caption": "x"}, QUELLE, OLLAMA_CFG, client=http)
    assert r.zutaten[0].einheit == "ml" and r.zutaten[0].original == "1 cup"
    url, body = http.calls[0]
    assert url.endswith("/api/chat") and body["model"] == "qwen2.5:7b" and body["stream"] is False
    assert body["keep_alive"] == 0  # Modell nach dem Rezept sofort entladen
    assert body["format"]["properties"].get("titel") and "quelle" not in body["format"]["properties"]


def test_ollama_retries_on_invalid_json():
    http = FakeHttp(["kein json", _good()])
    assert llm.structure_recipe({"caption": "x"}, QUELLE, OLLAMA_CFG, client=http).titel == "Pfannkuchen"
    assert len(http.calls) == 2


def test_ollama_gives_up_after_two_invalid_answers():
    with pytest.raises(PipelineError) as e:
        llm.structure_recipe({"caption": "x"}, QUELLE, OLLAMA_CFG, client=FakeHttp(["{}", "{}"]))
    assert e.value.code == "invalid_json"


def test_ollama_unreachable_gives_german_message():
    with pytest.raises(PipelineError) as e:
        llm.structure_recipe({"caption": "x"}, QUELLE, OLLAMA_CFG, client=FakeHttp([ConnectionError("down")]))
    assert e.value.code == "llm_failed" and "Ollama" in e.value.message


def test_ollama_needs_model_but_no_api_key():
    with pytest.raises(PipelineError) as e:
        llm.structure_recipe({"caption": "x"}, QUELLE, replace(OLLAMA_CFG, ollama_model=""))
    assert e.value.code == "not_configured"


# --- Download: Längenlimit (Regression: --match-filter bricht bei TikTok ab) ---
import json as _j
import subprocess as _sp
from app import sources as _src


def _fake_run(duration):
    def run(cmd, **kw):
        assert "--match-filter" not in cmd
        wd = Path(cmd[cmd.index("-o") + 1]).parent
        (wd / "video.info.json").write_text(_j.dumps({"duration": duration, "description": "d", "uploader": "u"}))
        (wd / "video.mp4").write_bytes(b"x")
        return _sp.CompletedProcess(cmd, 0, "", "")
    return run


def test_download_rejects_too_long_video(tmp_path, monkeypatch):
    monkeypatch.setattr(_src.subprocess, "run", _fake_run("900"))  # TikTok liefert Dauer teils als String
    with pytest.raises(PipelineError) as e:
        _src.download("https://www.tiktok.com/@a/video/1", tmp_path, CFG)
    assert e.value.code == "too_large" and not (tmp_path / "video.mp4").exists()


def test_download_accepts_short_video(tmp_path, monkeypatch):
    monkeypatch.setattr(_src.subprocess, "run", _fake_run(30))
    d = _src.download("https://www.tiktok.com/@a/video/1", tmp_path, CFG)
    assert d.creator == "u" and d.video_path.name == "video.mp4"


def test_original_only_kept_when_it_proves_a_us_conversion():
    d = rezept_dict(zutaten=[{"name": "Salz", "original": "Salz"},
                             {"name": "Hähnchen", "menge": 1000, "einheit": "g", "original": "1kg"},
                             {"name": "Mehl", "menge": 240, "einheit": "ml", "original": "1 cup flour"}])
    r, _ = llm.postprocess(Rezept.model_validate(d))
    assert [z.original for z in r.zutaten] == [None, None, "1 cup flour"]
