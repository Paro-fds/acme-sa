"""Serveur local de PAM. Le cookie de session n'est pas mis dans l'adresse ni dans localStorage.

Les en-têtes de sécurité sont posés sur chaque réponse. Les journaux d'accès
n'écrivent que le chemin et le statut.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import noyau

ICI = Path(__file__).resolve().parent
STATIQUE = ICI / "statique"
SECRET = os.environ.get("PAM_OTP_SECRET", "developpement-local").encode("utf-8")


def application_depuis_environnement() -> noyau.Application:
    profils: dict[str, noyau.Profil] = {}
    balances: dict[str, dict] = {}
    csv = os.environ.get("PAM_VAULT_CSV", "")
    if csv and Path(csv).is_file():
        profils = noyau.lire_profils(Path(csv).read_text(encoding="utf-8-sig"))
    dossier = os.environ.get("PAM_BALANCES", "")
    if dossier:
        racine = Path(dossier)
        for chemin in racine.glob("per/*.json"):
            document = json.loads(chemin.read_text(encoding="utf-8"))
            code = document.get("code_employe") or chemin.stem
            balances[str(code).upper()] = document
    return noyau.Application(profils, balances, noyau.Boite(), secret=SECRET, maintenant=datetime.now)


APPLICATION = application_depuis_environnement()


class Gestionnaire(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        print(f"{self.command} {urlparse(self.path).path} {args[1] if len(args) > 1 else ''}")

    def _entetes(self, statut: int, contenu: str, cookie: str = "") -> None:
        corps = contenu.encode("utf-8")
        self.send_response(statut)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'")
        self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(corps)

    def _json(self, statut: int, charge: dict, cookie: str = "") -> None:
        self._entetes(statut, json.dumps(charge, ensure_ascii=False), cookie)

    def _attributs_cookie(self) -> str:
        hote = (self.headers.get("Host") or "").split(":")[0]
        secure = "" if hote in {"127.0.0.1", "localhost"} else "; Secure"
        return f"HttpOnly{secure}; SameSite=Strict; Path=/"

    def _cookie(self) -> str:
        brute = self.headers.get("Cookie", "")
        for morceau in brute.split(";"):
            nom, _, valeur = morceau.strip().partition("=")
            if nom == "pam_session":
                return valeur
        return ""

    def _corps(self) -> dict:
        longueur = int(self.headers.get("Content-Length", "0") or 0)
        if not longueur:
            return {}
        return json.loads(self.rfile.read(longueur).decode("utf-8"))

    def do_GET(self) -> None:
        chemin = urlparse(self.path).path
        if chemin == "/api/balance":
            try:
                demande = APPLICATION.lire(self._cookie())
            except noyau.ErreurPam as exc:
                self._json(401, {"message": str(exc)})
                return
            self._json(200, {"etape": demande.etape, "message": demande.message, "balance": demande.balance})
            return
        relatif = "index.html" if chemin in {"", "/"} else chemin.lstrip("/")
        fichier = (STATIQUE / relatif).resolve()
        if STATIQUE not in fichier.parents and fichier != STATIQUE:
            self.send_error(404)
            return
        if not fichier.is_file():
            self.send_error(404)
            return
        types = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8"}
        corps = fichier.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", types.get(fichier.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'")
        self.end_headers()
        self.wfile.write(corps)

    def do_POST(self) -> None:
        chemin = urlparse(self.path).path
        ip = self.client_address[0]
        try:
            charge = self._corps()
            if chemin == "/api/identifier":
                demande = APPLICATION.identifier(
                    str(charge.get("code", "")),
                    str(charge.get("naissance", "")),
                    ip,
                    str(charge.get("captcha", "")),
                )
                self._json(200, {"etape": demande.etape, "message": demande.message, "defi": demande.defi, "canaux": demande.canaux, "captcha": demande.captcha})
                return
            if chemin == "/api/envoyer":
                demande = APPLICATION.envoyer(str(charge.get("defi", "")), str(charge.get("canal", "")), ip)
                self._json(200, {"etape": demande.etape, "message": demande.message, "defi": demande.defi})
                return
            if chemin == "/api/verifier":
                demande = APPLICATION.verifier(str(charge.get("defi", "")), str(charge.get("otp", "")), ip)
                cookie = f"pam_session={demande.session}; {self._attributs_cookie()}; Max-Age=900"
                self._json(200, {"etape": demande.etape, "message": demande.message}, cookie)
                return
            if chemin == "/api/sortir":
                APPLICATION.sortir(self._cookie())
                self._json(200, {"etape": "identification"}, f"pam_session=; {self._attributs_cookie()}; Max-Age=0")
                return
        except noyau.ErreurPam as exc:
            self._json(400, {"message": str(exc)})
            return
        except json.JSONDecodeError:
            self._json(400, {"message": "Demande illisible."})
            return
        self._json(404, {"message": "Adresse inconnue."})


_APPLICATION_AWS: noyau.Application | None = None
_PROFILS_INSTANT = 0.0


class CourrielSes:
    def __init__(self, expediteur: str, reponse: str) -> None:
        self.expediteur = expediteur
        self.reponse = reponse

    def envoyer(self, destinataire: str, sujet: str, corps: str, html: str = "") -> None:
        import boto3

        corps_message: dict = {"Text": {"Charset": "UTF-8", "Data": corps}}
        if html:
            corps_message["Html"] = {"Charset": "UTF-8", "Data": html}
        try:
            boto3.client("ses", region_name="us-east-1").send_email(
                Source=self.expediteur,
                Destination={"ToAddresses": [destinataire]},
                ReplyToAddresses=[self.reponse],
                Message={
                    "Subject": {"Charset": "UTF-8", "Data": sujet},
                    "Body": corps_message,
                },
            )
        except Exception as exc:
            code_ses = getattr(getattr(exc, "response", {}), "get", lambda *_: {})("Error", {}).get("Code", "")
            if not code_ses and hasattr(exc, "response"):
                code_ses = exc.response.get("Error", {}).get("Code", "")
            print("ses", type(exc).__name__, code_ses)
            raise noyau.ErreurPam("Le courriel n'a pas pu être envoyé. Contactez la DIT.") from None


class LecturesS3:
    def __init__(self, client: object, seau: str, prefixe: str) -> None:
        self.client = client
        self.seau = seau
        self.prefixe = prefixe

    def get(self, code: str, default: object = None) -> dict | None:
        from botocore.exceptions import ClientError

        cle = f"{self.prefixe}/per/{noyau.normaliser_code(code)}.json"
        try:
            reponse = self.client.get_object(Bucket=self.seau, Key=cle)
        except ClientError as exc:
            # Sans s3:ListBucket, une clé absente revient en AccessDenied plutôt qu'en 404.
            if exc.response.get("Error", {}).get("Code") in {"NoSuchKey", "NoSuchBucket", "404", "NotFound", "AccessDenied", "403"}:
                return None
            raise
        return json.loads(reponse["Body"].read().decode("utf-8"))


def _secret_otp() -> bytes:
    arn = os.environ.get("PAM_SECRET_ARN", "")
    if not arn:
        return SECRET
    import boto3

    valeur = boto3.client("secretsmanager", region_name="us-east-1").get_secret_value(SecretId=arn)["SecretString"]
    return valeur.encode("utf-8")


def _profils_vault() -> dict[str, noyau.Profil]:
    global _PROFILS_INSTANT
    import time

    import boto3

    maintenant = time.time()
    if _APPLICATION_AWS is not None and maintenant - _PROFILS_INSTANT < 900:
        return _APPLICATION_AWS.profils
    seau = os.environ["PAM_VAULT_BUCKET"]
    cle = os.environ["PAM_VAULT_KEY"]
    corps = boto3.client("s3", region_name="us-east-1").get_object(Bucket=seau, Key=cle)["Body"].read().decode("utf-8-sig")
    _PROFILS_INSTANT = maintenant
    return noyau.lire_profils(corps)


def application_aws() -> noyau.Application:
    global _APPLICATION_AWS
    import boto3

    import depot

    if _APPLICATION_AWS is not None:
        import time

        if time.time() - _PROFILS_INSTANT > 900:
            _APPLICATION_AWS.profils = _profils_vault()
        return _APPLICATION_AWS
    def moment() -> datetime:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    _APPLICATION_AWS = noyau.Application(
        _profils_vault(),
        LecturesS3(boto3.client("s3", region_name="us-east-1"), os.environ["PAM_S3_BUCKET"], os.environ.get("PAM_S3_PREFIX", "pam/balances")),
        CourrielSes(os.environ.get("PAM_EXPEDITEUR", "autorapport@acmehaiti.com"), os.environ.get("PAM_REPONSE", "dit@acmehaiti.com")),
        secret=_secret_otp(),
        maintenant=moment,
        depot=depot.DepotDynamo(os.environ["PAM_TABLE"], boto3.client("dynamodb", region_name="us-east-1"), moment),
    )
    return _APPLICATION_AWS


def _reponse(statut: int, charge: object, cookie: str = "", type_contenu: str = "application/json; charset=utf-8") -> dict:
    if isinstance(charge, (dict, list)):
        corps = json.dumps(charge, ensure_ascii=False)
    else:
        corps = str(charge)
    entetes = {
        "content-type": type_contenu,
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "content-security-policy": "default-src 'self'",
        "strict-transport-security": "max-age=31536000; includeSubDomains",
        "cache-control": "no-store",
    }
    reponse = {"statusCode": statut, "headers": entetes, "body": corps}
    if cookie:
        reponse["cookies"] = [cookie]
    return reponse


def gestionnaire_lambda(event: dict, _contexte: object) -> dict:
    """Pages et API sur la même adresse, pour que le cookie de session reste sur ce site."""
    chemin = event.get("rawPath") or event.get("path") or "/"
    methode = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod") or "GET"
    if chemin.startswith("/prod/"):
        chemin = chemin[5:]
    corps: dict = {}
    brut = event.get("body") or ""
    if brut:
        if event.get("isBase64Encoded"):
            import base64

            brut = base64.b64decode(brut).decode("utf-8")
        if methode == "POST":
            corps = json.loads(brut)
    ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "0.0.0.0")
    jeton = ""
    for cookie in event.get("cookies") or []:
        nom, _, valeur = cookie.partition("=")
        if nom == "pam_session":
            jeton = valeur
    try:
        if methode == "GET" and chemin in {"", "/"}:
            return _fichier_statique("index.html")
        if methode == "GET" and chemin in {"/pam.css", "/pam.js"}:
            return _fichier_statique(chemin.lstrip("/"))
        application = application_aws() if os.environ.get("PAM_TABLE") else APPLICATION
        if methode == "POST" and chemin.endswith("/identifier"):
            demande = application.identifier(str(corps.get("code", "")), str(corps.get("naissance", "")), ip, str(corps.get("captcha", "")))
            return _reponse(200, {"etape": demande.etape, "message": demande.message, "defi": demande.defi, "canaux": demande.canaux, "captcha": demande.captcha})
        if methode == "POST" and chemin.endswith("/envoyer"):
            demande = application.envoyer(str(corps.get("defi", "")), str(corps.get("canal", "")), ip)
            return _reponse(200, {"etape": demande.etape, "message": demande.message, "defi": demande.defi})
        if methode == "POST" and chemin.endswith("/verifier"):
            demande = application.verifier(str(corps.get("defi", "")), str(corps.get("otp", "")), ip)
            return _reponse(200, {"etape": demande.etape, "message": demande.message}, f"pam_session={demande.session}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900")
        if methode == "GET" and chemin.endswith("/balance"):
            demande = application.lire(jeton)
            return _reponse(200, {"etape": demande.etape, "message": demande.message, "balance": demande.balance})
        if methode == "POST" and chemin.endswith("/sortir"):
            application.sortir(jeton)
            return _reponse(200, {"etape": "identification"}, "pam_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0")
    except noyau.ErreurPam as exc:
        return _reponse(400, {"message": str(exc)})
    except json.JSONDecodeError:
        return _reponse(400, {"message": "Demande illisible."})
    except Exception as exc:
        code_exc = ""
        if hasattr(exc, "response"):
            code_exc = exc.response.get("Error", {}).get("Code", "")
        print(type(exc).__name__, code_exc)
        return _reponse(500, {"message": "Service momentanément indisponible."})
    return _reponse(404, {"message": "Adresse inconnue."})


def _fichier_statique(nom: str) -> dict:
    fichier = (STATIQUE / nom).resolve()
    if STATIQUE not in fichier.parents and fichier != STATIQUE:
        return _reponse(404, {"message": "Adresse inconnue."})
    if not fichier.is_file():
        return _reponse(404, {"message": "Adresse inconnue."})
    types = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8"}
    return _reponse(200, fichier.read_text(encoding="utf-8"), type_contenu=types.get(fichier.suffix, "text/plain; charset=utf-8"))


def main() -> None:
    port = int(os.environ.get("PAM_PORT", "8765"))
    serveur = ThreadingHTTPServer(("127.0.0.1", port), Gestionnaire)
    print(f"PAM écoute sur http://127.0.0.1:{port}")
    serveur.serve_forever()


if __name__ == "__main__":
    main()
