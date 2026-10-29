"""US-1016 — Code et courriels du modèle d'authentification du directeur."""

from app.auth.application.employee_login import LoginMessages, greeting_name
from app.auth.domain.ports import EmailNotSent
from app.auth.infrastructure.email import LocalEmailSender, load_otp_template
from tests.employees import EMP_A

IDENTIFY, CODE = "/api/auth/identify", "/api/auth/code"


def _identify(client):
    client.post(IDENTIFY, json={"employee_code": EMP_A.employee_code, "birth_date": EMP_A.typed_birth_date})


def _send(client):
    return client.post(CODE, json={"channel": "EMAIL"})


# --- CA-01 : messages des renvois -------------------------------------------------------------------


def test_ca01_patienter_avant_un_nouvel_envoi(client):
    _identify(client)
    _send(client)

    error = _send(client).json()["error"]
    assert error["message"] == "Veuillez patienter avant un nouvel envoi." and error["retry_after"] == 60


def test_ca01_trois_renvois_au_plus_par_15_minutes(client, clock):
    _identify(client)
    for _ in range(4):  # le premier envoi et 3 renvois
        assert _send(client).status_code == 200
        clock.advance(seconds=60)

    assert _send(client).json()["error"]["message"] == "Le nombre de renvois est atteint. Réessayez plus tard."
    clock.advance(minutes=15)
    assert _send(client).status_code == 200  # la fenêtre rouverte remet le compteur à zéro


# --- CA-02 : un envoi refusé ne consomme ni l'attente ni un renvoi ---------------------------------------


def test_ca02_envoi_en_echec_message_et_reessai_possible(client, container):
    class Broken(LocalEmailSender):
        def send(self, to, subject, body, html=None):
            raise EmailNotSent("panne")

    real = container.email_sender
    _identify(client)
    container.email_sender = Broken()

    refused = _send(client)
    assert refused.status_code == 503
    assert refused.json()["error"]["message"] == "Le courriel n'a pas pu être envoyé. Contactez la DIT."

    container.email_sender = real
    assert _send(client).status_code == 200  # pas d'attente de 60 secondes


# --- CA-03 : courriel du code en HTML, avec sa partie texte ; salutation -----------------------------------


def test_ca03_le_modele_html_est_rempli():
    subject, text, html = LoginMessages(LocalEmailSender(), load_otp_template()).code_email("JEAN", "042424", 2026)

    assert subject == "ACME SA — Code de vérification PAM"
    assert "042424" in html and "Bonjour Jean," in html and "5 minutes" in html and "2026" in html
    assert "{{" not in html and "balance" not in html
    assert text.startswith("Bonjour Jean,") and "042424" in text and "<" not in text


def test_ca03_salutation():
    assert greeting_name("MARIE  ROSE") == "Marie Rose"
    assert greeting_name("Marie") == "Marie"
    assert LoginMessages(LocalEmailSender(), "Bonjour {{PRENOM}},").code_email("", "1", 2026)[2] == "Bonjour,"
    html = LoginMessages(LocalEmailSender(), "Bonjour {{PRENOM}},").code_email("<b>x</b>", "1", 2026)[2]
    assert "<b>" not in html and "&lt;b&gt;" in html


def test_ca03_avis_sujet_acme_sa_pam(client, container):
    from tests.conftest import employee_login

    employee_login(client, EMP_A)
    notice = container.email_sender.outbox[-1]
    assert notice.subject == "ACME SA — PAM" and notice.html  # US-1025 : les avis partent aussi en HTML
