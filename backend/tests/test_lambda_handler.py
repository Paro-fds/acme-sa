"""Déploiement AWS : le point d'entrée Lambda répond à un événement d'API Gateway (HTTP API, format 2.0)."""

import importlib
import json


def _event(path: str, method: str = "GET", body: dict | None = None) -> dict:
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": {"host": "pam.exemple.test", "x-forwarded-proto": "https", "content-type": "application/json"},
        "requestContext": {
            "http": {"method": method, "path": path, "protocol": "HTTP/1.1", "sourceIp": "203.0.113.7"},
            "domainName": "pam.exemple.test",
            "stage": "$default",
        },
        "body": json.dumps(body) if body is not None else None,
        "isBase64Encoded": False,
    }


def _handler(monkeypatch, tmp_path):
    monkeypatch.setenv("ACME_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("AUTO_CREATE_SCHEMA", "true")
    import app.lambda_handler as module

    return importlib.reload(module).handler


def test_une_requete_api_gateway_passe_par_l_application(monkeypatch, tmp_path):
    handler = _handler(monkeypatch, tmp_path)

    response = handler(_event("/api/auth/session-options"), None)

    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == {"employee_idle_minutes": 5, "admin_idle_minutes": 15}
    headers = {name.lower(): value for name, value in response["headers"].items()}
    assert headers["strict-transport-security"].startswith("max-age=31536000")  # HTTPS d'origine
    assert headers["x-frame-options"] == "DENY"


def test_l_identification_voit_l_adresse_du_visiteur(monkeypatch, tmp_path):
    handler = _handler(monkeypatch, tmp_path)
    from app.auth.api import routes

    seen = []
    monkeypatch.setattr(routes, "client_ip", lambda request: seen.append(request.client.host) or request.client.host)

    handler(_event("/api/auth/identify", "POST", {"employee_code": "AC-1001", "birth_date": "15031996"}), None)

    assert seen == ["203.0.113.7"]


def test_l_ecran_compile_est_servi_par_la_meme_fonction(monkeypatch, tmp_path):
    """Pas d'Amplify : la fonction sert aussi l'écran (même adresse, cookie SameSite=Strict, pas de CORS)."""
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>PAM</title>", encoding="utf-8")
    (dist / "assets" / "police.woff2").write_bytes(b"wOF2\x00\x01\x02binaire")
    monkeypatch.setenv("FRONTEND_DIST_DIR", str(dist))
    handler = _handler(monkeypatch, tmp_path)

    page = handler(_event("/certificats"), None)  # route React : index.html
    assert page["statusCode"] == 200 and "<title>PAM</title>" in page["body"]
    assert page["headers"]["cache-control"] == "no-cache"  # une mise à jour de l'écran est vue tout de suite

    font = handler(_event("/assets/police.woff2"), None)
    assert font["statusCode"] == 200 and font["isBase64Encoded"] is True
    assert font["headers"]["cache-control"] == "public, max-age=31536000, immutable"
    import base64

    assert base64.b64decode(font["body"]) == b"wOF2\x00\x01\x02binaire"


def test_us1027_les_secrets_sont_lus_avant_la_configuration(monkeypatch, tmp_path):
    from app.shared.infrastructure import aws_secrets

    class Fake:
        def get_secret_value(self, SecretId):  # noqa: N803
            return {"SecretString": f"cle-lue-dans-{SecretId}"}

    monkeypatch.setattr(aws_secrets, "secrets_client", Fake)
    monkeypatch.setenv("OTP_HMAC_SECRET_ID", "pam-dev/otp-hmac")
    monkeypatch.setenv("OTP_HMAC_KEY", "")  # rendue vide après le test
    handler = _handler(monkeypatch, tmp_path)

    import os

    assert os.environ["OTP_HMAC_KEY"] == "cle-lue-dans-pam-dev/otp-hmac"
    assert handler(_event("/api/auth/session-options"), None)["statusCode"] == 200
