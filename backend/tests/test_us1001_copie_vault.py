"""US-1001 — Lire les employés dans la copie Vault sur S3 (lot 5, PAM).

Le client S3 est simulé : mêmes appels que boto3 (`head_object`, `get_object`), aucune connexion réseau.
"""

import csv
import io
import logging
from dataclasses import asdict
from pathlib import Path

import pytest

from app.config import DEMO_CSV, Settings
from app.container import vault_source
from app.employee.infrastructure.csv_employee_repository import CsvEmployeeRepository
from app.employee.infrastructure.vault_source import DEFAULT_VAULT_KEY, LocalVaultFile, S3VaultObject
from tests.conftest import TEST_CSV
from tests.employees import ACTIVE_EMPLOYEES, EMP_A, EMP_I, SECRET_MARKER

BUCKET = "seau-vault-fictif"
PG = "postgresql://u:p@db.exemple.test/portail"


class FakeS3:
    """Client S3 simulé : un seul objet, dont le test change le contenu ou qu'il rend illisible."""

    def __init__(self, content: bytes, etag: str = "v1") -> None:
        self.content, self.etag = content, etag
        self.failing = False
        self.reads = 0
        self.calls: list[tuple[str, str]] = []

    def head_object(self, Bucket: str, Key: str) -> dict:
        self._check(Bucket, Key)
        return {"ETag": f'"{self.etag}"'}

    def get_object(self, Bucket: str, Key: str) -> dict:
        self._check(Bucket, Key)
        self.reads += 1
        return {"Body": io.BytesIO(self.content), "ETag": f'"{self.etag}"'}

    def _check(self, bucket: str, key: str) -> None:
        self.calls.append((bucket, key))
        if self.failing:
            raise ConnectionError("seau injoignable")


class FakeMonotonic:
    def __init__(self) -> None:
        self.value = 1000.0

    def __call__(self) -> float:
        return self.value


def _csv_bytes(*, delimiter: str = ",", active: dict[str, str] | None = None, drop: str | None = None) -> bytes:
    """Le CSV de test, réécrit avec un autre séparateur, d'autres valeurs d'`active` ou sans un employé."""
    with TEST_CSV.open(encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))
    rows = [row for row in rows if row["employee_code"] != drop]
    for row in rows:
        if active and row["employee_code"] in active:
            row["active"] = active[row["employee_code"]]
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=list(rows[0]), delimiter=delimiter)
    writer.writeheader()
    writer.writerows(rows)
    return out.getvalue().encode("utf-8-sig")


def _repository(s3: FakeS3, clock: FakeMonotonic | None = None) -> CsvEmployeeRepository:
    return CsvEmployeeRepository(S3VaultObject(s3, BUCKET, DEFAULT_VAULT_KEY), monotonic=clock or FakeMonotonic())


def _ids(repository: CsvEmployeeRepository) -> set[str]:
    return {employee.id for employee in repository.list_all()}


# CA-01 — Lecture de l'objet S3 avec les règles d'aujourd'hui


def test_ca01_les_employes_viennent_de_l_objet_s3():
    s3 = FakeS3(TEST_CSV.read_bytes())
    repository = _repository(s3)

    assert _ids(repository) == {e.id for e in ACTIVE_EMPLOYEES}
    assert repository.get(EMP_I.id) is None  # inactif
    assert set(s3.calls) == {(BUCKET, "vault/vault-employee-list.csv")}


def test_ca01_memes_regles_que_le_fichier_local():
    from_s3 = _repository(FakeS3(TEST_CSV.read_bytes())).get(EMP_A.id)
    from_file = CsvEmployeeRepository(TEST_CSV).get(EMP_A.id)

    assert from_s3 == from_file
    for employee in _repository(FakeS3(TEST_CSV.read_bytes())).list_all():
        assert SECRET_MARKER not in repr(asdict(employee))


# CA-02 — Quelle source selon l'environnement


def _settings(tmp_path: Path, **values) -> Settings:
    return Settings(_env_file=None, acme_data_dir=tmp_path, acme_csv_path=TEST_CSV, **values)


def test_ca02_sans_seau_le_fichier_local_est_lu(tmp_path):
    source = vault_source(_settings(tmp_path))

    assert isinstance(source, LocalVaultFile) and source.path == TEST_CSV


def test_ca02_avec_un_seau_l_objet_s3_est_lu(tmp_path):
    source = vault_source(_settings(tmp_path, vault_s3_bucket=BUCKET))

    assert isinstance(source, S3VaultObject)
    assert (source.bucket, source.key) == (BUCKET, DEFAULT_VAULT_KEY)
    other = vault_source(_settings(tmp_path, vault_s3_bucket=BUCKET, vault_s3_key="vault/autre.csv"))
    assert other.key == "vault/autre.csv"


@pytest.mark.parametrize("env", ["demo", "recette"])
def test_ca02_hors_production_le_jeu_fictif_reste_impose_meme_avec_un_seau(tmp_path, env):
    source = vault_source(_settings(tmp_path, app_env=env, database_url=PG, vault_s3_bucket=BUCKET))

    assert isinstance(source, LocalVaultFile) and source.path == DEMO_CSV


def test_ca02_en_production_sans_seau_le_portail_refuse_de_demarrer(tmp_path):
    with pytest.raises(ValueError, match="VAULT_S3_BUCKET"):
        vault_source(_settings(tmp_path, app_env="production", database_url=PG))


def test_ca02_en_production_avec_un_seau_l_objet_s3_est_lu(tmp_path):
    source = vault_source(_settings(tmp_path, app_env="production", database_url=PG, vault_s3_bucket=BUCKET))

    assert isinstance(source, S3VaultObject)


# CA-03 — Rechargement quand la copie change, vérifié au plus toutes les 5 minutes


def test_ca03_la_liste_est_rechargee_quand_l_objet_change():
    s3, clock = FakeS3(TEST_CSV.read_bytes()), FakeMonotonic()
    repository = _repository(s3, clock)
    s3.content, s3.etag = _csv_bytes(drop=EMP_A.employee_code), "v2"

    clock.value += 299
    assert repository.get(EMP_A.id) is not None  # pas encore vérifié
    clock.value += 1
    assert repository.get(EMP_A.id) is None
    assert s3.reads == 2


def test_ca03_meme_etag_pas_de_relecture():
    s3, clock = FakeS3(TEST_CSV.read_bytes()), FakeMonotonic()
    repository = _repository(s3, clock)

    for _ in range(3):
        clock.value += 300
        repository.list_all()
    assert s3.reads == 1


def test_ca03_le_fichier_local_est_relu_quand_il_change(tmp_path):
    path = tmp_path / "vault.csv"
    path.write_bytes(TEST_CSV.read_bytes())
    clock = FakeMonotonic()
    repository = CsvEmployeeRepository(LocalVaultFile(path), monotonic=clock)
    path.write_bytes(_csv_bytes(drop=EMP_A.employee_code) + b"\n")  # taille différente : nouvelle version

    clock.value += 300
    assert repository.get(EMP_A.id) is None


# CA-04 — Échec de lecture


def test_ca04_une_relecture_ratee_garde_la_derniere_liste(caplog):
    s3, clock = FakeS3(TEST_CSV.read_bytes()), FakeMonotonic()
    repository = _repository(s3, clock)
    s3.failing = True

    clock.value += 300
    with caplog.at_level(logging.WARNING):
        assert _ids(repository) == {e.id for e in ACTIVE_EMPLOYEES}
    assert "Vault" in caplog.text
    for employee in ACTIVE_EMPLOYEES:
        assert employee.last_name not in caplog.text and employee.employee_code not in caplog.text


def test_ca04_apres_l_echec_la_lecture_reprend():
    s3, clock = FakeS3(TEST_CSV.read_bytes()), FakeMonotonic()
    repository = _repository(s3, clock)
    s3.failing = True
    clock.value += 300
    repository.list_all()

    s3.failing, s3.content, s3.etag = False, _csv_bytes(drop=EMP_A.employee_code), "v2"
    clock.value += 300
    assert repository.get(EMP_A.id) is None


def test_ca04_si_la_premiere_lecture_echoue_le_portail_ne_demarre_pas():
    s3 = FakeS3(TEST_CSV.read_bytes())
    s3.failing = True

    with pytest.raises(ConnectionError):
        _repository(s3)


# CA-05 — Valeurs d'`active` et séparateur, comme Carrières


@pytest.mark.parametrize("value", ["true", "TRUE", "1", "oui", "Vrai", "yes", "y"])
def test_ca05_valeurs_actives_reconnues(value):
    s3 = FakeS3(_csv_bytes(active={EMP_I.employee_code: value}))

    assert _repository(s3).get(EMP_I.id) is not None


@pytest.mark.parametrize("value", ["false", "0", "non", "", "n"])
def test_ca05_autres_valeurs_inactives(value):
    s3 = FakeS3(_csv_bytes(active={EMP_A.employee_code: value}))

    assert _repository(s3).get(EMP_A.id) is None


def test_ca05_le_point_virgule_est_accepte():
    repository = _repository(FakeS3(_csv_bytes(delimiter=";")))

    assert _ids(repository) == {e.id for e in ACTIVE_EMPLOYEES}
    assert repository.get(EMP_A.id) == CsvEmployeeRepository(TEST_CSV).get(EMP_A.id)
