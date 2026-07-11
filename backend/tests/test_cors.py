from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_allows_frontend_origin():
    r = client.options(
        "/separate",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_rejects_unknown_origin():
    r = client.options(
        "/separate",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.headers.get("access-control-allow-origin") != "https://evil.example.com"
    assert r.headers.get("access-control-allow-origin") != "*"
