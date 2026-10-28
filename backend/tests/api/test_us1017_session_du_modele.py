"""US-1017 — Session du modèle d'authentification du directeur (lot 5, PAM)."""

from tests.employees import EMP_A

IDENTIFY, CODE, VERIFY = "/api/auth/identify", "/api/auth/code", "/api/auth/verify"


def _cookie_header(response) -> str:
    return next(value for name, value in response.headers.multi_items() if name.lower() == "set-cookie")


def test_ca01_cookie_de_session_employe_900_secondes(client):
    identified = client.post(IDENTIFY, json={"employee_code": EMP_A.employee_code, "birth_date": EMP_A.typed_birth_date})
    assert "Max-Age=1200" in _cookie_header(identified)  # le défi : 20 minutes

    code = client.post(CODE, json={"channel": "EMAIL"}).json()["local_code"]
    verified = client.post(VERIFY, json={"code": code})

    cookie = _cookie_header(verified)
    assert "Max-Age=900" in cookie and "HttpOnly" in cookie and "SameSite=strict" in cookie.replace("Strict", "strict")


def test_ca02_en_tetes_de_securite_sur_chaque_reponse(client):
    response = client.get("/api/auth/session-options")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["content-security-policy"].startswith("default-src 'self'")
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def test_ca02_hsts_seulement_en_https(app):
    from fastapi.testclient import TestClient

    with TestClient(app, base_url="https://pam.exemple.test") as secure:
        assert secure.get("/api/auth/session-options").headers["strict-transport-security"] == (
            "max-age=31536000; includeSubDomains"
        )
    with TestClient(app) as plain:
        assert "strict-transport-security" not in plain.get("/api/auth/session-options").headers
