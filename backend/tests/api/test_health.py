def test_health_returns_ok(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_api_route_returns_404(client):
    response = client.get("/api/inexistant")

    assert response.status_code == 404


def test_data_directories_are_created(client, settings):
    if settings.database_url.startswith("sqlite"):  # sur PostgreSQL (TEST_POSTGRES_URL), pas de fichier de base
        assert (settings.acme_data_dir / "portail.db").exists()
    assert settings.documents_dir.is_dir()
