from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import make_token
from app.config import Settings
from app.main import create_app


def client(tmp_path, password="geheim", static=None):
    cfg = Settings("", "", password, "small", 1, 1, 1, 1, 1, 1, False, 20, Path(tmp_path), static)
    return TestClient(create_app(cfg))


def test_api_requires_token(tmp_path):
    c = client(tmp_path)
    assert c.get("/api/recipes").status_code == 401
    assert c.get("/api/recipes", headers={"Authorization": "Bearer falsch"}).status_code == 401
    assert c.post("/api/jobs", data={"link": "x"}).status_code == 401
    assert c.get("/api/health").status_code == 200  # Health bleibt offen


def test_login_flow(tmp_path):
    c = client(tmp_path)
    assert c.post("/api/login", json={"password": "nope"}).status_code == 401
    token = c.post("/api/login", json={"password": "geheim"}).json()["token"]
    assert token == make_token("geheim")
    assert c.get("/api/recipes", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_login_is_rate_limited(tmp_path):
    c = client(tmp_path)
    for _ in range(10):
        assert c.post("/api/login", json={"password": "x"}).status_code == 401
    assert c.post("/api/login", json={"password": "geheim"}).status_code == 429


def test_fails_closed_without_password(tmp_path):
    c = client(tmp_path, password="")
    assert c.post("/api/login", json={"password": ""}).status_code == 503
    assert c.get("/api/recipes", headers={"Authorization": "Bearer "}).status_code == 503


def test_static_frontend_and_spa_fallback(tmp_path):
    static = tmp_path / "static"
    static.mkdir()
    (static / "index.html").write_text("<html>app</html>")
    (static / "sw.js").write_text("//sw")
    c = client(tmp_path / "data", static=static)
    assert "app" in c.get("/rezept/123").text           # App-Route -> index.html
    assert c.get("/sw.js").text == "//sw"
    assert c.get("/api/unbekannt").status_code in (401, 404)  # kein HTML für API-Pfade
    assert c.get("/../../etc/passwd").status_code in (200, 404)
    assert "root:" not in c.get("/..%2f..%2fetc/passwd").text


def test_cors_allows_the_android_app_origin(tmp_path):
    c = client(tmp_path)
    r = c.options("/api/login", headers={"Origin": "http://localhost", "Access-Control-Request-Method": "POST",
                                         "Access-Control-Request-Headers": "content-type"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost"
    r = c.options("/api/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers
