"""US-113 — Photo officielle de l'employé : le champ existe partout où la personne s'affiche, vide tant que la source
des photos (système RH du directeur) n'est pas branchée ; l'écran affiche alors les initiales."""

from tests.employees import EMP_A


def test_ca01_mon_profil_expose_une_photo_vide(employee_client):
    profile = employee_client(EMP_A).get("/api/me/profile").json()

    assert "photo_url" in profile
    assert profile["photo_url"] is None


def test_ca01_la_liste_des_employes_expose_une_photo_vide(admin_client):
    item = admin_client.get("/api/admin/employees/search").json()["items"][0]

    assert item["photo_url"] is None


def test_ca01_la_fiche_d_un_employe_expose_une_photo_vide(admin_client):
    folder = admin_client.get(f"/api/admin/employees/{EMP_A.id}").json()

    assert folder["photo_url"] is None
