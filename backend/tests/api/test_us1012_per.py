"""US-1012 — Consulter ma balance PER (lot 5, PAM), sur les balances fictives de `backend/demo/per`."""

import json

import pytest

from app.config import Settings
from app.container import per_source
from app.per.domain.ports import PerSourceUnavailable
from app.per.domain.statement import amount_fr, date_fr, per_key, period_fr
from app.per.infrastructure.sources import LocalPerSource, S3PerSource
from tests.employees import EMP_A, EMP_B

PER = "/api/me/per"


# --- CA-01 : la balance la plus récente et le relevé ------------------------------------------------------


def test_ca01_balance_et_releve(employee_client):
    response = employee_client(EMP_A).get(PER)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["balance"] | {"accounts": None} == {
        "period": "2026-09", "period_label": "septembre 2026", "updated_on": "30/09/2026", "reported_on": "2026-09-30",
        "amount": "121.480,75", "interest": "2.455,10", "accounts": None,
    }
    assert [photo["period_label"] for photo in body["statement"]] == ["septembre 2026", "août 2026"]
    assert body["balance"]["accounts"] == [
        {"number": "PER-FICTIF-01", "opened_on": "15/01/2019", "amount": "121.480,75", "interest": "2.455,10"},
    ]


# --- CA-02 : la clé vient du code de la session, jamais du navigateur ----------------------------------------


def test_ca02_la_cle_vient_du_code_de_la_session(employee_client, container):
    keys = []

    class Spy:
        def read(self, key):
            keys.append(key)
            return None

    container.per_source = Spy()
    employee_client(EMP_A).get(PER, params={"code": EMP_B.employee_code, "key": "pam/balances/per/AC-1008.json"})

    assert keys == ["pam/balances/per/AC-1001.json"]


def test_ca02_un_code_illisible_ne_forme_jamais_de_cle():
    from app.per.domain.statement import NoBalance

    for code in ("../AC-1001", "AC 1001/..", "x", ""):
        with pytest.raises(NoBalance):
            per_key(code)
    assert per_key(" ac-1001 ") == "pam/balances/per/AC-1001.json"


# --- CA-03 : absence et panne ont des messages différents ------------------------------------------------------


def test_ca03_sans_balance_message_clair(employee_client):
    response = employee_client(EMP_B).get(PER)

    assert response.status_code == 404
    assert response.json()["error"] == {"code": "NO_BALANCE", "message": "Aucune balance n'est disponible pour le moment."}


def test_ca03_stockage_en_panne_service_indisponible(employee_client, container):
    class Down:
        def read(self, key):
            raise PerSourceUnavailable("S3")

    container.per_source = Down()
    response = employee_client(EMP_A).get(PER)

    assert response.status_code == 503
    assert response.json()["error"]["message"] == "Service momentanément indisponible."


def test_ca03_s3_une_cle_absente_ou_refusee_est_une_absence():
    from botocore.exceptions import ClientError

    for code in ("NoSuchKey", "AccessDenied"):
        class Client:
            def get_object(self, Bucket, Key, _code=code):
                raise ClientError({"Error": {"Code": _code}}, "GetObject")

        assert S3PerSource(Client(), "acme-pam-balances").read("pam/balances/per/AC-1001.json") is None

    class Broken:
        def get_object(self, Bucket, Key):
            raise ClientError({"Error": {"Code": "InternalError"}}, "GetObject")

    with pytest.raises(PerSourceUnavailable):
        S3PerSource(Broken(), "acme-pam-balances").read("pam/balances/per/AC-1001.json")


def test_ca03_json_illisible_est_une_panne(tmp_path):
    target = tmp_path / "pam/balances/per/AC-1001.json"
    target.parent.mkdir(parents=True)
    target.write_text("{pas du json", encoding="utf-8")

    with pytest.raises(PerSourceUnavailable):
        LocalPerSource(tmp_path).read("pam/balances/per/AC-1001.json")


# --- CA-04 : formats du modèle du directeur ; seau obligatoire en production -------------------------------------


@pytest.mark.parametrize(
    "raw, expected",
    [("1234.5", "1.234,50"), ("-1234567.891", "-1.234.567,89"), ("0", "0,00"), (None, "0,00"), ("12,5", "12,5")],
)
def test_ca04_montants(raw, expected):
    assert amount_fr(raw) == expected


def test_ca04_dates_et_mois():
    assert (date_fr("2026-10-27"), period_fr("2026-08"), period_fr("2026-13")) == ("27/10/2026", "août 2026", "2026-13")


def test_ca04_choix_de_la_source(tmp_path):
    pg = "postgresql://u:p@db.exemple.test/portail"
    assert isinstance(per_source(Settings(_env_file=None, acme_data_dir=tmp_path)), LocalPerSource)
    with pytest.raises(ValueError, match="PER_S3_BUCKET"):
        per_source(Settings(_env_file=None, app_env="production", database_url=pg))


def test_ca04_rien_d_autre_que_la_balance_de_l_employe(employee_client):
    body = json.dumps(employee_client(EMP_A).get(PER).json())

    assert "AC-1001" not in body and "JOSEPH" not in body


def test_reserve_a_l_employe_connecte(client):
    assert client.get(PER).status_code == 401
