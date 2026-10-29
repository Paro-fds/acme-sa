"""Tests US-108 : cadre de l'espace RH aligné sur l'écran A02 (nom et rôle dans l'en-tête, compteurs réels du menu)."""

from app.certificate.domain.certificate import CertificateStatus
from app.dossier.domain.hr_information import ReportOrigin
from tests.api.test_us403_error_reports import _add_report
from tests.api.test_us601_dashboard import _add_cert
from tests.employees import EMP_A, EMP_B

MENU_COUNTS_URL = "/api/admin/menu-counts"


def test_ca01_l_en_tete_connait_le_nom_et_le_role_du_compte(admin_client):
    data = admin_client.get("/api/admin/me").json()
    assert data["display_name"]
    assert data["role_label"] == "Administrateur"


def test_ca02_compteurs_a_zero_sans_rien_a_traiter(admin_client):
    res = admin_client.get(MENU_COUNTS_URL)
    assert res.status_code == 200, res.text
    assert res.json() == {"validation": 0, "reports": 0, "to_attach": 0}


def test_ca02_compteurs_reels_du_menu(admin_client, container):
    _add_cert(container, "c-recu", EMP_A.id, CertificateStatus.RECEIVED)
    _add_cert(container, "c-en-cours", EMP_B.id, CertificateStatus.IN_REVIEW)
    _add_cert(container, "c-valide", EMP_B.id, CertificateStatus.VALIDATED)
    _add_report(container, EMP_A.id, "position_confirmed", ReportOrigin.EMPLOYEE, "Caissière", "Chargée de crédit")
    _add_report(container, EMP_B.id, "agency_confirmed", ReportOrigin.EMPLOYEE, "AD", "PV", status="CORRECTED")

    counts = admin_client.get(MENU_COUNTS_URL).json()
    assert counts["validation"] == 2
    assert counts["reports"] == 1


def test_ca02_compteurs_identiques_au_tableau_de_bord(admin_client, container):
    _add_cert(container, "c-recu", EMP_A.id, CertificateStatus.RECEIVED, days_ago=10)
    _add_report(container, EMP_A.id, "position_confirmed", ReportOrigin.EMPLOYEE, "Caissière", None)

    counts = admin_client.get(MENU_COUNTS_URL).json()
    dashboard = admin_client.get("/api/admin/dashboard").json()
    assert counts["validation"] == dashboard["kpi"]["waiting_certificates"]
    assert counts["reports"] == dashboard["to_process"]["error_reports"]
    assert counts["to_attach"] == dashboard["to_process"]["to_attach"]


def test_ca03_a06_liste_des_employes_paginee(admin_client):
    first = admin_client.get("/api/admin/employees/search", params={"page": 1, "page_size": 2}).json()
    assert len(first["items"]) == 2
    assert first["page"] == 1
    assert first["page_size"] == 2
    assert first["page_count"] == -(-first["total"] // 2)
    second = admin_client.get("/api/admin/employees/search", params={"page": 2, "page_size": 2}).json()
    assert {e["id"] for e in first["items"]}.isdisjoint({e["id"] for e in second["items"]})


def test_ca03_a06_statut_du_dossier_et_agence_en_libelle(admin_client):
    item = admin_client.get("/api/admin/employees/search").json()["items"][0]
    assert item["folder_status_label"] in {"Profil incomplet", "Profil complet", "Dossier complet"}
    assert "agency_name" in item


# --- A07 : dossier d'un employé (dossier V2, lecture seule) -------------------------------------


def _dossier_url(employee):
    return f"/api/admin/employees/{employee.id}/dossier"


def test_ca03_a07_dossier_v2_avec_dates_de_confirmation(admin_client, employee_client):
    employee = employee_client(EMP_A)
    assert employee.post("/api/me/dossier/consent", json={"information_notice": True, "whatsapp": False}).status_code == 200
    saved = employee.put(
        "/api/me/dossier/coordinates",
        json={"address": "12 rue Capois, Port-au-Prince"},
    )
    assert saved.status_code == 200, saved.text

    res = admin_client.get(_dossier_url(EMP_A))
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["dossier"]["address"]["value"] == "12 rue Capois, Port-au-Prince"
    assert data["dossier"]["address"]["confirmed_at"]
    assert data["dossier"]["completion"]["total"] == 8
    assert {item["key"] for item in data["dossier"]["hr_information"]} == {
        "agency_confirmed",
        "position_confirmed",
        "hire_date_confirmed",
    }
    assert data["reports"] == []


def test_ca03_a07_signalements_de_l_employe(admin_client, container):
    _add_report(container, EMP_A.id, "position_confirmed", ReportOrigin.EMPLOYEE, "Caissière", "Chargée de crédit")
    _add_report(container, EMP_B.id, "agency_confirmed", ReportOrigin.EMPLOYEE, "AD", "PV")

    reports = admin_client.get(_dossier_url(EMP_A)).json()["reports"]
    assert [(r["field_label"], r["status_label"]) for r in reports] == [("Poste", "Nouveau")]

