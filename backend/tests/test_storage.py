from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.db import RecipeRepo
from app.main import create_app
from app.schema import Rezept

QUELLE = {"url": "https://www.tiktok.com/@a/video/1", "plattform": "TikTok", "creator": "a"}


def mk(titel, kategorie="Abendessen", zutat="Mehl", tags=()):
    return Rezept.model_validate({
        "titel": titel, "kategorie": kategorie, "tags": list(tags),
        "zutaten": [{"name": zutat, "menge": 1, "einheit": "g"}],
        "schritte": [{"nr": 1, "text": "Kochen"}], "quelle": QUELLE})


@pytest.fixture
def repo():
    r = RecipeRepo(":memory:")
    r.create(mk("Pfannkuchen", "Frühstück", "Milch", ["süß"]))
    r.create(mk("Spaghetti Bolognese", "Abendessen", "Hackfleisch", ["Pasta"]))
    r.create(mk("Tiramisu", "Dessert", "Mascarpone"))
    r.create(mk("Käsekuchen", "Dessert", "Quark"))
    return r


def titles(rows):
    return sorted(r["titel"] for r in rows)


def test_filter_by_category(repo):
    assert titles(repo.list("Dessert")) == ["Käsekuchen", "Tiramisu"]
    assert titles(repo.list("Frühstück")) == ["Pfannkuchen"]
    assert len(repo.list("Alle")) == 4 and len(repo.list(None)) == 4
    assert repo.list("Snacks") == []


def test_search_title_ingredient_tag(repo):
    assert titles(repo.list(q="tiramisu")) == ["Tiramisu"]
    assert titles(repo.list(q="hackfleisch")) == ["Spaghetti Bolognese"]
    assert titles(repo.list(q="pasta")) == ["Spaghetti Bolognese"]


def test_search_umlauts_case_and_combination(repo):
    assert titles(repo.list(q="KÄSE")) == ["Käsekuchen"]
    assert titles(repo.list("Dessert", "quark")) == ["Käsekuchen"]
    assert repo.list("Frühstück", "quark") == []


def test_search_wildcards_are_literal(repo):
    assert repo.list(q="%") == []


def test_change_category_and_favorite(repo):
    rid = repo.list(q="tiramisu")[0]["id"]
    out = repo.patch(rid, kategorie="Snacks", favorit=True)
    assert out["kategorie"] == "Snacks" and out["favorit"] is True
    assert titles(repo.list("Snacks")) == ["Tiramisu"]


def test_update_and_delete(repo):
    rid = repo.list(q="tiramisu")[0]["id"]
    repo.update(rid, mk("Tiramisu klassisch", "Dessert"))
    assert repo.get(rid)["titel"] == "Tiramisu klassisch"
    assert repo.delete(rid) and not repo.delete(rid) and repo.get(rid) is None


def test_source_link_is_stored(repo):
    assert repo.list()[0]["quelle"]["url"] == QUELLE["url"]


# --- API ---
@pytest.fixture
def client(tmp_path):
    cfg = Settings("", "", "", "small", 1, 1, 1, 1, 1, 1, False, 20, Path(tmp_path))
    return TestClient(create_app(cfg))


def test_api_roundtrip(client):
    body = mk("Pizza", "Abendessen").model_dump()
    created = client.post("/api/recipes", json=body)
    assert created.status_code == 201
    rid = created.json()["id"]
    assert client.get("/api/recipes", params={"kategorie": "Abendessen"}).json()[0]["id"] == rid
    assert client.patch(f"/api/recipes/{rid}", json={"kategorie": "Snacks"}).json()["kategorie"] == "Snacks"
    assert client.patch(f"/api/recipes/{rid}", json={"kategorie": "Pizza"}).status_code == 422
    assert client.delete(f"/api/recipes/{rid}").status_code == 204
    assert client.get(f"/api/recipes/{rid}").status_code == 404


def test_api_rejects_invalid_recipe(client):
    assert client.post("/api/recipes", json={"titel": "x"}).status_code == 422


def test_job_upload_images_accepted_and_invalid_link_reported(client):
    r = client.post("/api/jobs", data={"link": "https://youtube.com/x"},
                    files=[("files", ("a.png", b"\x89PNG", "image/png"))])
    assert r.status_code == 200
    import time
    time.sleep(0.5)
    job = client.get(f"/api/jobs/{r.json()['id']}").json()
    assert job["status"] == "error" and job["error"]["code"] == "invalid_link"
