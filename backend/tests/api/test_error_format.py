"""Format d'erreur commun : {"error": {"code", "message"}} (Solution Design §10)."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.shared.api.errors import register_error_handlers
from app.shared.domain.errors import Conflict, InvalidInput, NotFound, Unauthorized


class UpdateAlreadySubmitted(Conflict):
    code = "UPDATE_ALREADY_SUBMITTED"
    message = "Votre mise à jour a déjà été soumise."


class Payload(BaseModel):
    name: str


def _app_raising(error: Exception) -> TestClient:
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/boom")
    def boom():
        raise error

    @app.post("/validate")
    def validate(payload: Payload):
        return payload

    return TestClient(app)


@pytest.mark.parametrize(
    ("error", "status", "code"),
    [
        (Unauthorized(), 401, "UNAUTHORIZED"),
        (NotFound(), 404, "NOT_FOUND"),
        (UpdateAlreadySubmitted(), 409, "UPDATE_ALREADY_SUBMITTED"),
        (InvalidInput(), 422, "INVALID_INPUT"),
    ],
)
def test_domain_errors_are_translated(error, status, code):
    response = _app_raising(error).get("/boom")

    assert response.status_code == status
    assert response.json() == {"error": {"code": code, "message": error.message}}


def test_validation_errors_use_common_format():
    response = _app_raising(NotFound()).post("/validate", json={})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_INPUT"
