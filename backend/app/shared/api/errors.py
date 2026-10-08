"""Traduction unique des erreurs métier et de validation en réponses HTTP.

Format commun : {"error": {"code": "...", "message": "...", "field"?: "..."}}, plus les informations
complémentaires de l'erreur (`DomainError.extra`, par exemple `retry_after`).
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.shared.domain.errors import (
    Conflict,
    DomainError,
    Forbidden,
    InvalidInput,
    NotFound,
    Unauthorized,
)

_STATUS_BY_ERROR: list[tuple[type[DomainError], int]] = [
    (Unauthorized, 401),
    (Forbidden, 403),
    (NotFound, 404),
    (Conflict, 409),
    (InvalidInput, 422),
]


def error_body(code: str, message: str, field: str | None = None, extra: dict | None = None) -> dict:
    error = {"code": code, "message": message}
    if field is not None:
        error["field"] = field
    error.update(extra or {})
    return {"error": error}


def status_for(error: DomainError) -> int:
    for error_type, status in _STATUS_BY_ERROR:
        if isinstance(error, error_type):
            return getattr(error, "http_status", status)
    return getattr(error, "http_status", 400)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def handle_domain_error(_: Request, error: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=status_for(error),
            content=error_body(error.code, error.message, error.field, error.extra),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, __: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_body("INVALID_INPUT", "Les informations saisies ne sont pas valides."),
        )
