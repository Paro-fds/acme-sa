"""Point d'entrée : crée l'application FastAPI, branche les routes et sert le frontend compilé."""

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.admin.api import routes as admin_routes
from app.auth.api import admin_account_routes
from app.auth.api import routes as auth_routes
from app.career.api import routes as career_routes
from app.config import Settings
from app.container import Container
from app.document.api import routes as document_routes
from app.employee.api import routes as employee_routes
from app.shared.api import health
from app.shared.api.errors import register_error_handlers
from app.shared.domain.errors import NotFound
from app.update.api import routes as update_routes


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    docs = settings.api_docs
    app = FastAPI(
        title="Portail employés ACME SA",
        docs_url="/api/docs" if docs else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs else None,
    )
    app.state.container = Container(settings)

    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth_routes.router)
    app.include_router(employee_routes.router)
    app.include_router(update_routes.router)
    app.include_router(document_routes.router)
    app.include_router(career_routes.router)
    app.include_router(admin_routes.router)
    app.include_router(admin_account_routes.router)

    @app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], include_in_schema=False)
    def unknown_api_route(path: str) -> None:
        raise NotFound("Ressource introuvable.")

    _serve_frontend(app, settings)
    return app


def _serve_frontend(app: FastAPI, settings: Settings) -> None:
    """En production, sert le build Vite ; toute route non-API renvoie index.html (routage React)."""
    dist = settings.frontend_dist_dir
    index = dist / "index.html"
    if not index.exists():
        return

    if (dist / "assets").exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(index)
