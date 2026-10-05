"""Contrôle d'un CSV employés avant le test (phase 6, tâches 6.2 et 6.3).

Usage (depuis backend/) :
    .venv\\Scripts\\python -m app.tools.check_csv                 # CSV de backend/.env
    .venv\\Scripts\\python -m app.tools.check_csv chemin\\du.csv

1. Chargement : employés actifs / inactifs, dates illisibles, accents abîmés (encodage),
   formats de téléphone, identités en double (écran « Contactez l'administration »).
2. Exposition : l'application est démarrée sur ce CSV avec une base **temporaire** ; toutes les
   réponses JSON (admin et employé, pour chaque employé actif) sont collectées puis on y cherche les
   valeurs des colonnes exclues. Les journaux sont aussi contrôlés (aucun mot de passe).

Le rapport ne contient **que des nombres, des formats et des noms de colonnes** : aucune donnée du
CSV n'est affichée. Rien n'est écrit à côté du CSV ni dans ACME_DATA_DIR.
"""

import csv
import io
import logging
import re
import sys
import tempfile
import warnings
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from app.config import Settings
from app.employee.infrastructure.csv_employee_repository import _TEXT_COLUMNS
from app.shared.domain.text import normalize

# Colonnes lues par l'application en plus des colonnes texte (liste blanche).
_OTHER_READ_COLUMNS = {"active", "date_of_birth", "date_of_hire"}
WHITELIST = set(_TEXT_COLUMNS.values()) | _OTHER_READ_COLUMNS

# Une valeur trop courte (« 1 », « non »…) se retrouve partout : elle ne prouve aucune fuite.
MIN_SECRET_LENGTH = 4
# Valeurs génériques (colonnes oui/non) : elles apparaissent forcément dans le JSON (« "declined": false »).
GENERIC_VALUES = {"true", "false", "oui", "non", "yes", "no", "null", "none", "n/a"}
_MOJIBAKE = re.compile("Ã.|Â|�")
PROBE_PASSWORD = "Controle-Exposition-2026"


@dataclass
class LoadReport:
    columns: list[str] = field(default_factory=list)
    active: int = 0
    inactive: int = 0
    unreadable_dates: list[tuple[int, str]] = field(default_factory=list)
    """(ligne du fichier, colonne)"""
    names_with_accents: int = 0
    damaged_text: dict[str, int] = field(default_factory=dict)
    phone_formats: Counter = field(default_factory=Counter)
    duplicate_identities: int = 0
    """Groupes d'au moins deux employés actifs avec mêmes nom, prénom et date de naissance."""
    employees_in_duplicates: int = 0

    @property
    def missing_columns(self) -> list[str]:
        return sorted((set(_TEXT_COLUMNS.values()) | {"active", "date_of_birth"}) - set(self.columns))

    @property
    def excluded_columns(self) -> list[str]:
        return [column for column in self.columns if column not in WHITELIST]


@dataclass
class ExposureReport:
    responses: int = 0
    leaks: dict[str, int] = field(default_factory=dict)
    """colonne exclue → nombre de valeurs retrouvées dans les réponses"""
    password_in_logs: bool = False
    session_cookie_flags_ok: bool = False


def phone_format(value: str) -> str:
    """Forme d'un numéro sans son contenu : chaque chiffre devient 9 (« +509 3722-1111 » → « +999 9999-9999 »)."""
    return re.sub(r"\d", "9", value.strip()) or "(vide)"


def _read_rows(csv_path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with csv_path.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        return list(reader.fieldnames or []), list(reader)


def check_load(csv_path: Path) -> LoadReport:
    columns, rows = _read_rows(csv_path)
    report = LoadReport(columns=columns)
    identities = defaultdict(int)
    damaged = Counter()
    for line, row in enumerate(rows, start=2):
        if (row.get("active") or "").strip().lower() != "true":
            report.inactive += 1
            continue
        report.active += 1
        for column in ("date_of_birth", "date_of_hire"):
            value = (row.get(column) or "").strip()
            if value:
                try:
                    datetime.strptime(value, "%m/%d/%Y")
                except ValueError:
                    report.unreadable_dates.append((line, column))
        names = f"{row.get('last_name', '')}{row.get('first_name', '')}"
        if any(ord(char) > 127 for char in names):
            report.names_with_accents += 1
        for column in _TEXT_COLUMNS.values():
            if _MOJIBAKE.search(row.get(column) or ""):
                damaged[column] += 1
        report.phone_formats[phone_format(row.get("telephone_number") or "")] += 1
        key = (normalize(row.get("last_name")), normalize(row.get("first_name")), (row.get("date_of_birth") or "").strip())
        identities[key] += 1
    report.damaged_text = dict(damaged)
    groups = [count for count in identities.values() if count > 1]
    report.duplicate_identities = len(groups)
    report.employees_in_duplicates = sum(groups)
    return report


def secret_values(csv_path: Path) -> dict[str, set[str]]:
    """Valeurs des colonnes exclues (employés actifs), sauf celles qui figurent aussi dans une colonne lue."""
    columns, rows = _read_rows(csv_path)
    active = [row for row in rows if (row.get("active") or "").strip().lower() == "true"]
    allowed = {(row.get(column) or "").strip() for row in active for column in columns if column in WHITELIST}
    secrets: dict[str, set[str]] = defaultdict(set)
    for row in active:
        for column in columns:
            value = (row.get(column) or "").strip()
            if (
                column not in WHITELIST
                and len(value) >= MIN_SECRET_LENGTH
                and value.lower() not in GENERIC_VALUES
                and value not in allowed
            ):
                secrets[column].add(value)
    return secrets


def _appears(value: str, corpus: str) -> bool:
    """La valeur figure comme mot entier (pas au milieu d'un prénom ou d'un autre mot)."""
    return re.search(rf"(?<!\w){re.escape(value)}(?!\w)", corpus) is not None


def find_leaks(texts: list[str], secrets: dict[str, set[str]]) -> dict[str, int]:
    corpus = "\n".join(texts)
    leaks = {column: sum(1 for value in values if _appears(value, corpus)) for column, values in secrets.items()}
    return {column: count for column, count in leaks.items() if count}


def collect_responses(csv_path: Path, data_dir: Path) -> tuple[list[str], str, str]:
    """Démarre l'application sur ce CSV et une base temporaire ; renvoie (réponses, journaux, en-tête Set-Cookie)."""
    with warnings.catch_warnings():
        # Avertissement de dépréciation de Starlette, sans rapport avec le contrôle.
        warnings.simplefilter("ignore")
        from fastapi.testclient import TestClient

    from app.auth.api.dependencies import SESSION_COOKIE
    from app.auth.domain.model import SubjectType
    from app.main import create_app

    settings = Settings(acme_csv_path=csv_path, acme_data_dir=data_dir, frontend_dist_dir=data_dir / "pas-de-frontend")
    logs = io.StringIO()
    handler = logging.StreamHandler(logs)
    logging.getLogger().addHandler(handler)
    previous_level = logging.getLogger().level
    logging.getLogger().setLevel(logging.DEBUG)
    texts: list[str] = []
    try:
        app = create_app(settings)
        container = app.state.container
        sessions = container.session_service()
        employees = container.employees.list_all()

        # Compte administrateur de contrôle, dans la base temporaire uniquement.
        admins = container.admin_accounts.list_all() or [
            container.create_first_admin().execute("controle", PROBE_PASSWORD, PROBE_PASSWORD)
        ]
        with TestClient(app, cookies={SESSION_COOKIE: sessions.open(SubjectType.ADMIN, admins[0].id)}) as admin:
            texts.append(admin.get("/api/admin/statistics").text)
            first = admin.get("/api/admin/employees", params={"page_size": 100}).json()
            for page in range(1, first["page_count"] + 1):
                texts.append(admin.get("/api/admin/employees", params={"page": page, "page_size": 100}).text)
            for employee in employees:
                texts.append(admin.get(f"/api/admin/employees/{employee.id}").text)
                texts.append(admin.get(f"/api/admin/employees/{employee.id}/documents").text)

        for employee in employees:
            token = sessions.open(SubjectType.EMPLOYEE, employee.id)
            with TestClient(app, cookies={SESSION_COOKIE: token}) as client:
                for path in ("/api/me/profile", "/api/me/update", "/api/me/update/fields", "/api/me/documents"):
                    texts.append(client.get(path).text)

        # Parcours d'identification réel sur un employé sans homonyme : mot de passe créé puis saisi.
        set_cookie = ""
        identities = Counter((normalize(e.last_name), normalize(e.first_name), e.birth_date) for e in employees)
        probe = next((e for e in employees if identities[(normalize(e.last_name), normalize(e.first_name), e.birth_date)] == 1), None)
        if probe is not None:
            identity = {"last_name": probe.last_name, "first_name": probe.first_name, "birth_date": probe.birth_date.isoformat()}
            with TestClient(app) as client:
                texts.append(client.post("/api/auth/identify", json=identity).text)
                created = client.post(
                    "/api/auth/register",
                    json={**identity, "password": PROBE_PASSWORD, "password_confirmation": PROBE_PASSWORD},
                )
                set_cookie = created.headers.get("set-cookie", "")
                client.post("/api/auth/logout")
                texts.append(client.post("/api/auth/login", json={**identity, "password": "mauvais-mot-de-passe"}).text)
                texts.append(client.post("/api/auth/login", json={**identity, "password": PROBE_PASSWORD}).text)
        container.close()
    finally:
        logging.getLogger().removeHandler(handler)
        logging.getLogger().setLevel(previous_level)
    return texts, logs.getvalue(), set_cookie


def check_exposure(csv_path: Path) -> ExposureReport:
    with tempfile.TemporaryDirectory(prefix="acme-controle-") as data_dir:
        texts, logs, set_cookie = collect_responses(csv_path, Path(data_dir))
    report = ExposureReport(responses=len(texts))
    report.leaks = find_leaks(texts, secret_values(csv_path))
    report.password_in_logs = PROBE_PASSWORD in logs or "argon2" in logs.lower()
    report.session_cookie_flags_ok = "HttpOnly" in set_cookie and "samesite=strict" in set_cookie.lower()
    return report


def _print_report(load: LoadReport, exposure: ExposureReport) -> bool:
    ok = True

    def line(passed: bool, text: str) -> None:
        nonlocal ok
        ok = ok and passed
        print(f"  [{'OK' if passed else '!!'}] {text}")

    print("\n1. Chargement du CSV")
    line(not load.missing_columns, f"Colonnes attendues présentes{'' if not load.missing_columns else ' — manquantes : ' + ', '.join(load.missing_columns)}")
    print(f"  [--] Employés actifs : {load.active} ; inactifs (ignorés) : {load.inactive}")
    line(
        not load.unreadable_dates,
        "Dates lisibles (MM/JJ/AAAA)"
        + ("" if not load.unreadable_dates else " — illisibles : " + ", ".join(f"ligne {n} ({c})" for n, c in load.unreadable_dates[:20])),
    )
    print(f"  [--] Noms ou prénoms avec accents : {load.names_with_accents}")
    line(
        not load.damaged_text,
        "Aucun accent abîmé (encodage)"
        + ("" if not load.damaged_text else " — colonnes suspectes : " + ", ".join(f"{c} ({n})" for c, n in load.damaged_text.items())),
    )
    print("  [--] Formats de téléphone (chiffres remplacés par 9) :")
    for pattern, count in load.phone_formats.most_common():
        print(f"         {pattern!r:24} {count}")
    print(
        f"  [--] Identités en double : {load.duplicate_identities} groupe(s), {load.employees_in_duplicates} employé(s)"
        " (ils verront « Contactez l'administration »)"
    )

    print("\n2. Exposition des données")
    print(f"  [--] Colonnes exclues dans le CSV : {len(load.excluded_columns)} ; réponses de l'API contrôlées : {exposure.responses}")
    line(
        not exposure.leaks,
        "Aucune valeur de colonne exclue dans les réponses"
        + ("" if not exposure.leaks else " — FUITE : " + ", ".join(f"{c} ({n} valeur(s))" for c, n in exposure.leaks.items())),
    )
    line(not exposure.password_in_logs, "Aucun mot de passe ni hash dans les journaux")
    line(exposure.session_cookie_flags_ok, "Cookie de session HttpOnly et SameSite=Strict")
    print(f"\nRésultat : {'tout est conforme' if ok else 'à corriger (voir les lignes !!)'}.")
    return ok


def main() -> None:
    csv_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Settings().acme_csv_path
    if not csv_path.is_file():
        sys.exit(f"CSV introuvable : {csv_path}")
    print(f"Contrôle de {csv_path.name}")
    load = check_load(csv_path)
    if load.unreadable_dates or load.missing_columns:
        # L'application refuserait de démarrer sur ce fichier : on s'arrête au rapport de chargement.
        _print_report(load, ExposureReport(session_cookie_flags_ok=True))
        sys.exit("Contrôle d'exposition non lancé : corriger d'abord le chargement.")
    ok = _print_report(load, check_exposure(csv_path))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
