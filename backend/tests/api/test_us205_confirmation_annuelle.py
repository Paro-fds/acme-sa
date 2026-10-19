"""US-205 : confirmer ses informations chaque année (EF-210, RG-60 → RG-64).

Choix de l'utilisateur du 2026-10-11 : une information périmée est signalée sans rien bloquer ; le rappel
30 jours avant (CA-01) partira avec US-701 : l'API donne déjà sa date.
"""

from app.certificate.domain.certificate import Certificate, CertificateFile, CertificateStatus
from tests.employees import EMP_A

CONSENT = "/api/me/dossier/consent"
COORDINATES = "/api/me/dossier/coordinates"
CONTACT_AND_EDUCATION = "/api/me/dossier/contact-and-education"
FRESHNESS = "/api/me/dossier/freshness"
STILL_ACCURATE = "/api/me/dossier/still-accurate"
COORDINATES_OK = {"telephone": "3712 3456", "address": "12 rue Capois, Port-au-Prince", "email": "", "no_email": True}
CONTACT_OK = {
    "contact_name": "Jean Baptiste Pierre",
    "contact_relationship": "SIBLING",
    "contact_telephone": "4812 8901",
    "education_level": "LICENCE",
}


def _complete_dossier(employee_client):
    """Profil complet le 04/10/2026 (horloge des tests)."""
    client = employee_client(EMP_A)
    assert client.post(CONSENT, json={"information_notice": True, "whatsapp": False}).status_code == 200
    assert client.put(COORDINATES, json=COORDINATES_OK).status_code == 200
    assert client.put(CONTACT_AND_EDUCATION, json=CONTACT_OK).status_code == 200
    for key in ("agency_confirmed", "position_confirmed", "hire_date_confirmed"):
        assert client.post(f"/api/me/dossier/hr-information/{key}/confirm").status_code == 200


def _states(body):
    return {item["key"]: item["state"] for item in body["items"]}


def test_une_information_juste_confirmee_est_a_jour(employee_client, clock):
    _complete_dossier(employee_client)
    body = employee_client(EMP_A).get(FRESHNESS).json()
    assert set(_states(body).values()) == {"FRESH"}
    assert body["stale_count"] == 0
    telephone = next(item for item in body["items"] if item["key"] == "telephone")
    assert telephone == {
        "key": "telephone",
        "label": "Téléphone",
        "value": "+509 3712 3456",
        "confirmed_at": "2026-10-04T09:00:00Z",
        "expires_on": "2027-10-04",
        "reminder_on": "2027-09-04",
        "state": "FRESH",
    }


def test_ca01_le_rappel_est_du_30_jours_avant(employee_client, clock):
    _complete_dossier(employee_client)
    clock.advance(days=335)  # 04/09/2027
    body = employee_client(EMP_A).get(FRESHNESS).json()
    assert set(_states(body).values()) == {"DUE_SOON"}
    assert body["stale_count"] == 0


def test_ca01_apres_12_mois_l_information_est_perimee_sans_rien_bloquer(employee_client, clock):
    _complete_dossier(employee_client)
    clock.advance(days=365)  # 04/10/2027
    client = employee_client(EMP_A)
    body = client.get(FRESHNESS).json()
    assert body["stale_count"] == 7
    assert set(_states(body).values()) == {"STALE"}
    # Rien n'est bloqué : le profil reste complet (choix du 2026-10-11).
    assert client.get("/api/me/profile").json()["completion"]["percent"] == 100


def test_ca02_oui_met_a_jour_toutes_les_dates_de_confirmation(employee_client, clock):
    _complete_dossier(employee_client)
    clock.advance(days=400)
    client = employee_client(EMP_A)
    response = client.post(STILL_ACCURATE)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["stale_count"] == 0
    assert set(_states(body).values()) == {"FRESH"}
    assert {item["confirmed_at"] for item in body["items"]} == {"2027-11-08T09:00:00Z"}
    # La confirmation garde la valeur : rien n'est modifié.
    dossier = client.get("/api/me/dossier").json()
    assert dossier["telephone"]["value"] == "+509 3712 3456"
    assert dossier["telephone"]["confirmed_at"] == "2027-11-08T09:00:00Z"


def test_ca02_une_information_signalee_aux_rh_attend_leur_reponse(employee_client, clock):
    _complete_dossier(employee_client)
    client = employee_client(EMP_A)
    client.post(
        "/api/me/dossier/hr-information/position_confirmed/report",
        json={"correct_value": "Agent de crédit principal", "comment": ""},
    )
    clock.advance(days=400)
    client = employee_client(EMP_A)
    keys = [item["key"] for item in client.post(STILL_ACCURATE).json()["items"]]
    assert "position_confirmed" not in keys
    position = next(i for i in client.get("/api/me/dossier").json()["hr_information"] if i["key"] == "position_confirmed")
    assert position["status"] == "REPORTED"


def test_ca03_certificats_valides_et_niveau_d_etudes_ne_se_perimment_jamais(employee_client, container, clock):
    _complete_dossier(employee_client)
    container.certificates.add(
        Certificate(
            "cert-205", EMP_A.id, "DIPLOME", "LICENCE", "Licence fictive", "Université fictive", 2015, None,
            "FINANCE", None, CertificateStatus.VALIDATED, clock.now(),
        ),
        CertificateFile("cert-205", "certs/cert-205.pdf", "fictif.pdf", "application/pdf", 1024),
    )
    clock.advance(days=800)
    client = employee_client(EMP_A)
    keys = [item["key"] for item in client.get(FRESHNESS).json()["items"]]
    assert "education_level" not in keys
    assert not any("cert" in key for key in keys)


def test_rg64_une_information_jamais_donnee_n_est_pas_perimee(employee_client, clock):
    client = employee_client(EMP_A)
    client.post(CONSENT, json={"information_notice": True, "whatsapp": False})
    clock.advance(days=800)
    body = employee_client(EMP_A).get(FRESHNESS).json()
    assert body == {"items": [], "stale_count": 0}
