"""Documentation interactive de l'API : désactivée par défaut (phase 6, accès par tunnel)."""

from fastapi.testclient import TestClient

from app.main import create_app


def test_api_docs_are_disabled_by_default(client):
    for path in ("/api/docs", "/api/openapi.json", "/api/redoc"):
        assert client.get(path).status_code == 404


def test_api_docs_can_be_enabled(settings):
    with TestClient(create_app(settings.model_copy(update={"api_docs": True}))) as client:
        assert client.get("/api/docs").status_code == 200
        assert "/api/admin/statistics" in client.get("/api/openapi.json").json()["paths"]
