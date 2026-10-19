"""US-202 — Compléter mes coordonnées (EF-202, EF-205, EF-208, EF-209 ; RG-02, RG-10 → RG-15 ; D-05, D-06, D-09)."""

import pytest

from tests.employees import EMP_A, EMP_E, SECRET_MARKER

DOSSIER = "/api/me/dossier"
CONSENT = "/api/me/dossier/consent"
COORDINATES = "/api/me/dossier/coordinates"
CONTACT_AND_EDUCATION = "/api/me/dossier/contact-and-education"

COORDINATES_OK = {
    "telephone": "3712 3456",
    "address": "12 rue Capois, Port-au-Prince",
    "email": "jean.joseph@exemple.test",
    "no_email": False,
}
CONTACT_OK = {
    "contact_name": "Jean Baptiste Pierre",
    "contact_relationship": "SIBLING",
    "contact_telephone": "4812 8901",
    "education_level": "LICENCE",
}


@pytest.fixture
def consented(employee_client):
    """Client d'un employé qui a déjà donné son consentement (CA-01)."""

    def connect(employee, whatsapp=False):
        client = employee_client(employee)
        assert client.post(CONSENT, json={"information_notice": True, "whatsapp": whatsapp}).status_code == 200
        return client

    return connect


def _iso(moment) -> str:
    return moment.isoformat().replace("+00:00", "Z")


def _percent(client) -> int:
    return client.get("/api/me/profile").json()["completion"]["percent"]


# --- CA-01 : mention d'information et consentement, une seule fois ----------------------------------


def test_ca01_sans_consentement_le_dossier_le_demande(employee_client):
    dossier = employee_client(EMP_A).get(DOSSIER).json()

    assert dossier["consent"] == {"information_notice_at": None, "whatsapp": None}


def test_ca01_aucune_saisie_avant_le_consentement(employee_client):
    client = employee_client(EMP_A)

    coordinates = client.put(COORDINATES, json=COORDINATES_OK)
    contact = client.put(CONTACT_AND_EDUCATION, json=CONTACT_OK)

    assert (coordinates.status_code, contact.status_code) == (403, 403)
    assert coordinates.json()["error"]["code"] == "CONSENT_REQUIRED"
    assert client.get(DOSSIER).json()["telephone"]["complete"] is False


def test_ca01_la_case_de_la_mention_est_obligatoire(employee_client):
    response = employee_client(EMP_A).post(CONSENT, json={"information_notice": False, "whatsapp": True})

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "information_notice"


def test_ca01_consentement_date_et_choix_whatsapp(employee_client, clock):
    client = employee_client(EMP_A)

    response = client.post(CONSENT, json={"information_notice": True, "whatsapp": True})

    assert response.status_code == 200
    assert client.get(DOSSIER).json()["consent"] == {
        "information_notice_at": _iso(clock.now()),
        "whatsapp": True,
    }


def test_ca01_une_seule_fois_la_date_du_premier_consentement_reste(employee_client, clock):
    client = employee_client(EMP_A)
    client.post(CONSENT, json={"information_notice": True, "whatsapp": False})
    first = client.get(DOSSIER).json()["consent"]["information_notice_at"]
    clock.advance(minutes=5)

    client.post(CONSENT, json={"information_notice": True, "whatsapp": True})

    consent = client.get(DOSSIER).json()["consent"]
    assert (consent["information_notice_at"], consent["whatsapp"]) == (first, True)


# --- Pré-remplissage : l'export propose, l'employé confirme ------------------------------------------


def test_les_valeurs_de_l_export_sont_proposees_mais_pas_encore_completes(consented):
    dossier = consented(EMP_A).get(DOSSIER).json()

    assert dossier["telephone"] == {"value": "+509 3722 1111", "complete": False, "confirmed_at": None}
    assert dossier["address"]["value"] == "12 rue Capois, Port-au-Prince"
    assert dossier["email"]["value"] == "jean.joseph@exemple.test"
    assert dossier["email"]["no_email"] is False
    assert dossier["emergency_contact"]["complete"] is False
    assert dossier["education_level"] == {"value": None, "complete": False, "confirmed_at": None}
    assert SECRET_MARKER not in str(dossier)


def test_au_depart_rien_n_est_complet(consented):
    assert _percent(consented(EMP_A)) == 0


# --- Enregistrer les coordonnées ------------------------------------------------------------------


def test_enregistrer_les_coordonnees_les_rend_completes(consented):
    client = consented(EMP_A)

    response = client.put(COORDINATES, json=COORDINATES_OK)

    assert response.status_code == 200
    dossier = response.json()
    assert dossier["telephone"]["value"] == "+509 3712 3456"
    assert [dossier[key]["complete"] for key in ("telephone", "address", "email")] == [True, True, True]
    assert dossier["completion"]["percent"] == 37
    assert _percent(client) == 37


def test_un_champ_vide_reste_a_completer_sans_bloquer_les_autres(consented):
    client = consented(EMP_A)

    response = client.put(COORDINATES, json=COORDINATES_OK | {"address": "", "email": ""})

    assert response.status_code == 200
    dossier = response.json()
    assert [dossier[key]["complete"] for key in ("telephone", "address", "email")] == [True, False, False]


def test_le_profil_affiche_les_coordonnees_du_dossier(consented):
    client = consented(EMP_A)
    client.put(COORDINATES, json=COORDINATES_OK)

    assert client.get("/api/me/profile").json()["telephone_number"] == "+509 3712 3456"


# --- CA-02 : format invalide → message près du champ, rien n'est enregistré ---------------------------


@pytest.mark.parametrize(
    ("changes", "field", "message"),
    [
        ({"telephone": "3712"}, "telephone", "Le numéro doit contenir 8 chiffres, par exemple +509 3712 3456."),
        ({"email": "jean@exemple"}, "email", "Saisissez une adresse email complète, par exemple prenom.nom@exemple.com."),
        ({"address": "Rue"}, "address", "Ajoutez votre adresse complète : au moins 5 caractères."),
    ],
)
def test_ca02_un_format_invalide_dit_quoi_faire_et_rien_n_est_enregistre(consented, changes, field, message):
    client = consented(EMP_A)

    response = client.put(COORDINATES, json=COORDINATES_OK | changes)

    assert response.status_code == 422
    assert response.json()["error"] == {"code": "INVALID_FIELD", "message": message, "field": field}
    assert client.get(DOSSIER).json()["telephone"]["complete"] is False


def test_ca02_contact_incomplet_dit_ce_qui_manque(consented):
    response = consented(EMP_A).put(CONTACT_AND_EDUCATION, json=CONTACT_OK | {"contact_telephone": ""})

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "contact_telephone"
    assert response.json()["error"]["message"] == "Ajoutez le numéro de téléphone de cette personne."


# --- CA-03 : « Je n'ai pas d'adresse email » --------------------------------------------------------


def test_ca03_pas_d_adresse_email_rend_l_email_complet(consented):
    client = consented(EMP_E)

    dossier = client.put(COORDINATES, json=COORDINATES_OK | {"email": "", "no_email": True}).json()

    assert dossier["email"] == {"value": None, "no_email": True, "complete": True, "confirmed_at": dossier["email"]["confirmed_at"]}
    assert dossier["email"]["confirmed_at"] is not None


def test_ca03_la_case_cochee_efface_une_adresse_saisie(consented):
    client = consented(EMP_A)

    dossier = client.put(COORDINATES, json=COORDINATES_OK | {"no_email": True}).json()

    assert (dossier["email"]["value"], dossier["email"]["complete"]) == (None, True)


# --- CA-04 : contact d'urgence et niveau d'études --------------------------------------------------


def test_ca04_les_listes_de_choix_sont_fournies(consented):
    dossier = consented(EMP_A).get(DOSSIER).json()

    assert [item["value"] for item in dossier["relationships"]] == ["SPOUSE", "PARENT", "CHILD", "SIBLING", "OTHER"]
    assert [item["label"] for item in dossier["education_levels"]][:2] == ["Primaire / Fondamental", "Secondaire"]
    assert "rank" not in dossier["education_levels"][0]


def test_ca04_contact_d_urgence_et_niveau_d_etudes_enregistres(consented):
    client = consented(EMP_A)
    client.put(COORDINATES, json=COORDINATES_OK)

    response = client.put(CONTACT_AND_EDUCATION, json=CONTACT_OK)

    assert response.status_code == 200
    dossier = response.json()
    assert dossier["emergency_contact"] | {"confirmed_at": None} == {
        "name": "Jean Baptiste Pierre",
        "relationship": "SIBLING",
        "telephone": "+509 4812 8901",
        "complete": True,
        "confirmed_at": None,
    }
    assert dossier["education_level"]["value"] == "LICENCE"
    assert dossier["completion"]["percent"] == 62


def test_ca04_un_lien_hors_liste_est_refuse(consented):
    response = consented(EMP_A).put(CONTACT_AND_EDUCATION, json=CONTACT_OK | {"contact_relationship": "Cousin"})

    assert response.status_code == 422
    assert response.json()["error"]["field"] == "contact_relationship"


def test_ca04_le_niveau_seul_peut_etre_enregistre(consented):
    empty_contact = {"contact_name": "", "contact_relationship": "", "contact_telephone": ""}

    dossier = consented(EMP_A).put(CONTACT_AND_EDUCATION, json=CONTACT_OK | empty_contact).json()

    assert (dossier["emergency_contact"]["complete"], dossier["education_level"]["complete"]) == (False, True)


# --- CA-05 : date de confirmation de chaque information ---------------------------------------------


def test_ca05_chaque_information_garde_sa_date_de_confirmation(consented, clock):
    client = consented(EMP_A)
    client.put(COORDINATES, json=COORDINATES_OK)
    first = clock.now()
    clock.advance(minutes=5)

    dossier = client.put(CONTACT_AND_EDUCATION, json=CONTACT_OK).json()

    assert dossier["telephone"]["confirmed_at"] == _iso(first)
    assert dossier["emergency_contact"]["confirmed_at"] == _iso(clock.now())
    assert dossier["education_level"]["confirmed_at"] == _iso(clock.now())


def test_ca05_confirmer_sans_changement_met_la_date_a_jour_et_garde_l_historique(consented, clock, container):
    client = consented(EMP_A)
    client.put(COORDINATES, json=COORDINATES_OK)
    clock.advance(minutes=10)

    dossier = client.put(COORDINATES, json=COORDINATES_OK).json()

    assert dossier["telephone"]["confirmed_at"] == _iso(clock.now())
    history = [(c.information, c.gesture) for c in container.dossiers.confirmations(EMP_A.id) if c.information == "telephone"]
    assert history == [("telephone", "CHANGE"), ("telephone", "CONFIRMATION")]


def test_ca05_une_valeur_de_l_export_gardee_telle_quelle_est_une_confirmation(consented, container):
    client = consented(EMP_A)

    client.put(COORDINATES, json=COORDINATES_OK | {"telephone": "+509 3722 1111"})

    gestures = {c.information: c.gesture for c in container.dossiers.confirmations(EMP_A.id)}
    assert gestures == {"telephone": "CONFIRMATION", "address": "CONFIRMATION", "email": "CONFIRMATION"}


def test_ca05_une_premiere_saisie_est_une_saisie(consented, container):
    consented(EMP_A).put(CONTACT_AND_EDUCATION, json=CONTACT_OK)

    gestures = {c.information: c.gesture for c in container.dossiers.confirmations(EMP_A.id)}
    assert gestures == {"emergency_contact": "ENTRY", "education_level": "ENTRY"}


# --- Sécurité ---------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path"),
    [("get", DOSSIER), ("post", CONSENT), ("put", COORDINATES), ("put", CONTACT_AND_EDUCATION)],
)
def test_reserve_a_l_employe_connecte(client, method, path):
    assert getattr(client, method)(path, **({} if method == "get" else {"json": {}})).status_code == 401
