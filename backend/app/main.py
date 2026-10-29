"""Point d'entrée : crée l'application FastAPI, branche les routes et sert le frontend compilé."""

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.carrieres.api import routes as carrieres_routes
from app.per.api import routes as per_routes
from app.admin.api import notification_routes as admin_notification_routes
from app.admin.api import routes as admin_routes
from app.auth.api import admin_account_routes, mfa_routes
from app.auth.api import routes as auth_routes
from app.career.api import routes as career_routes
from app.certificate.api import admin_routes as admin_certificate_routes
from app.certificate.api import routes as certificate_routes
from app.config import Settings
from app.container import Container
from app.dossier.api import admin_routes as admin_report_routes
from app.dossier.api import routes as dossier_routes
from app.job.api import routes as job_routes
from app.referential.api import routes as referential_routes
from app.employee.api import routes as employee_routes
from app.shared.api import health
from app.shared.api.errors import register_error_handlers
from app.shared.domain.errors import NotFound


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    docs = settings.api_docs
    app = FastAPI(
        title="PAM — Plateforme ACME Multifonction",
        docs_url="/api/docs" if docs else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if docs else None,
    )
    app.state.container = Container(settings)

    @app.middleware("http")
    async def security_headers(request, call_next):
        """US-1017 : en-têtes de sécurité du modèle du directeur, sur chaque réponse."""
        response = await call_next(request)
        headers = response.headers
        headers.setdefault("X-Content-Type-Options", "nosniff")
        headers.setdefault("X-Frame-Options", "DENY")
        headers.setdefault("Referrer-Policy", "no-referrer")
        # 'self' comme le modèle ; images blob:/data: pour l'aperçu des scans, styles en ligne posés par React.
        headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; "
            "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
        )
        if request.url.scheme == "https":
            headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        path = request.url.path
        if path.startswith("/api/"):
            headers.setdefault("Cache-Control", "no-store")
        elif path.startswith("/assets/"):
            # Noms changés à chaque compilation (index-Bshr0KLO.js) : gardés un an sans risque.
            headers.setdefault("Cache-Control", "public, max-age=31536000, immutable")
        else:
            # La page et les fichiers sans empreinte : revérifiés à chaque visite, pour qu'une mise à jour de
            # l'écran soit vue tout de suite (jamais une ancienne page qui appelle des fichiers disparus).
            headers.setdefault("Cache-Control", "no-cache")
        return response

    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth_routes.router)
    app.include_router(employee_routes.router)
    app.include_router(career_routes.router)
    app.include_router(admin_routes.router)
    app.include_router(admin_notification_routes.router)
    app.include_router(admin_account_routes.router)
    app.include_router(mfa_routes.router)
    app.include_router(referential_routes.router)
    app.include_router(dossier_routes.router)
    app.include_router(certificate_routes.router)
    app.include_router(carrieres_routes.router)
    app.include_router(per_routes.router)
    app.include_router(admin_certificate_routes.router)
    app.include_router(admin_report_routes.router)
    app.include_router(admin_report_routes.employee_router)
    app.include_router(job_routes.router)
    app.include_router(job_routes.catalogue_router)
    app.include_router(job_routes.me_router)
    app.include_router(job_routes.my_notifications_router)
    app.include_router(job_routes.my_applications_router)
    app.include_router(job_routes.admin_applications_router)
    mfa_routes.restrict_rh_space_to_office_network(app)

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
