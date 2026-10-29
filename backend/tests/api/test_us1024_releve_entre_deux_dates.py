"""US-1024 — Voir mon relevé PER entre deux dates et l'enregistrer en PDF, sur les balances fictives de `backend/demo/per`."""

import pytest

from app.per.domain.statement import statement
from app.per.domain.statement_period import StartAfterEnd, UnreadableDate, day_iso, statement_between
from tests.employees import EMP_A, EMP_B

PDF = "/api/me/per/statement.pdf"
DOCUMENT = {
    "snapshots": [
        {"periode": "2026-08", "date_rapport": "2026-08-31", "balance": "118250", "interet_cumule": "2300", "comptes": []},
        {"periode": "2026-09", "date_rapport": "2026-09-30", "balance": "121480.75", "interet_cumule": "2455.10",
         "nom": "JOSEPH Jean", "comptes": []},
        {"periode": "2026-07", "date_rapport": "", "balance": "1", "comptes": []},  # sans date : jamais retenue
    ]
}


def _text(pdf: bytes) -> str:
    return pdf.decode("cp1252", errors="replace")


def test_ca01_l_api_donne_la_date_du_rapport_de_chaque_photo(employee_client):
    photos = employee_client(EMP_A).get("/api/me/per").json()["statement"]

    assert [photo["reported_on"] for photo in photos] == ["2026-09-30", "2026-08-31"]


@pytest.mark.parametrize("value", ["", "31/01/2026", "2026-02-30", "2026-13-01", "26-01-31"])
def test_ca01_date_illisible(value):
    with pytest.raises(UnreadableDate):
        day_iso(value)


def test_ca01_debut_apres_fin():
    with pytest.raises(StartAfterEnd) as error:
        statement_between(statement(DOCUMENT), "2026-10-01", "2026-09-01")

    assert error.value.message == "La date de début est postérieure à la date de fin."


def test_ca02_les_photos_de_l_intervalle_de_la_plus_ancienne_a_la_plus_recente():
    photos = statement_between(statement(DOCUMENT), "2026-08-01", "2026-12-31")

    assert [photo.period for photo in photos] == ["2026-08", "2026-09"]
    assert statement_between(statement(DOCUMENT), "2026-09-01", "2026-09-29") == ()  # un mois absent n'est pas inventé
    assert statement_between(statement(DOCUMENT), "2026-08-31", "2026-08-31")[0].period == "2026-08"  # bornes incluses


def test_ca03_le_releve_pdf_s_enregistre(employee_client):
    response = employee_client(EMP_A).get(PDF, params={"start": "2026-08-01", "end": "2026-10-29"})

    assert response.status_code == 200, response.text
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="Releve-PER-2026-08-01-au-2026-10-29.pdf"'
    assert response.headers["cache-control"] == "no-store"
    text = _text(response.content)
    for expected in (
        "Direction des Ressources Humaines", "RELEV\xc9 PER", "Du 01/08/2026 au 29/10/2026", "AC-1001",
        "Montants en USD.", "Septembre 2026", "Ao\xfbt 2026", "balance 121.480,75 USD", "Compte", "Ouverture",
        "PER-FICTIF-01", r"Pour authentifier ce document \(signature et sceau ACME\), contactez les Ressources humaines.",
    ):
        assert expected in text, expected
    assert "/Subtype /Image" in text  # logo
    assert text.index("Ao\xfbt 2026") < text.index("Septembre 2026")  # du plus ancien au plus récent


def test_ca03_en_tete_repete_sur_chaque_page():
    from app.per.domain.statement_period import StatementSheet
    from app.per.infrastructure.statement_pdf import PdfStatementRenderer

    many = {"snapshots": [
        {"periode": f"20{year}-{month:02d}", "date_rapport": f"20{year}-{month:02d}-28", "balance": "1",
         "comptes": [{"numero": f"C{n}", "date_ouverture": "2019-01-15", "balance": "1"} for n in range(3)]}
        for year in (24, 25, 26) for month in range(1, 13)
    ]}
    photos = statement_between(statement(many), "2024-01-01", "2026-12-31")
    pdf = PdfStatementRenderer.with_acme_logo().render(StatementSheet("AC-1001", "", "2024-01-01", "2026-12-31", photos))

    pages = int(pdf.split(b"/Count ")[1].split(b" ")[0])
    assert pages > 1 and _text(pdf).count("RELEV\xc9 PER") == pages


def test_ca03_aucune_photo_dans_l_intervalle(employee_client):
    text = _text(employee_client(EMP_A).get(PDF, params={"start": "2020-01-01", "end": "2020-12-31"}).content)

    assert "Aucune photo PER entre ces deux dates." in text


@pytest.mark.parametrize(("start", "end", "message"), [
    ("31/01/2026", "2026-10-29", "Date illisible."),
    ("2026-10-01", "2026-09-01", "La date de début est postérieure à la date de fin."),
])
def test_ca03_dates_refusees(employee_client, start, end, message):
    response = employee_client(EMP_A).get(PDF, params={"start": start, "end": end})

    assert response.status_code == 422  # saisie refusée (InvalidInput)
    assert response.json()["error"]["message"] == message


def test_ca03_seul_le_code_de_la_session_compte(employee_client, container):
    keys = []

    class Spy:
        def read(self, key):
            keys.append(key)
            return None

    container.per_source = Spy()
    employee_client(EMP_A).get(PDF, params={"start": "2026-01-01", "end": "2026-12-31", "code": "AC-1008"})

    assert keys == ["pam/balances/per/AC-1001.json"]


def test_ca03_sans_balance_et_sans_session(employee_client, client):
    assert employee_client(EMP_B).get(PDF, params={"start": "2026-01-01", "end": "2026-12-31"}).status_code == 404
    assert client.get(PDF, params={"start": "2026-01-01", "end": "2026-12-31"}).status_code == 401
