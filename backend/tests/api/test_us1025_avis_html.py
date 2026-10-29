"""US-1025 — Recevoir les avis de sécurité en HTML, comme le directeur (`pam_alerte_email.html`, version du 2026-10-29)."""

from datetime import UTC, datetime

import pytest

from app.auth.application.employee_login import (
    CONSULTATION_NOTICE,
    EMAIL_CHANGED_NOTICE,
    PHONE_CHANGED_NOTICE,
    REFUSED_NOTICE,
    LoginMessages,
)
from app.auth.domain.login_code import LoginChannel
from app.auth.domain.ports import MessageNotSent
from app.auth.infrastructure.email import LocalEmailSender, load_alert_template, load_otp_template
from tests.conftest import employee_login
from tests.employees import EMP_A

AT = datetime(2026, 10, 29, 9, 0, tzinfo=UTC)


def _messages(sender=None) -> LoginMessages:
    return LoginMessages(sender or LocalEmailSender(), load_otp_template(), load_alert_template())


def test_ca01_avis_en_html_avec_partie_texte(client, container):
    employee_login(client, EMP_A)

    notice = container.email_sender.outbox[-1]
    assert notice.subject == "ACME SA — PAM"
    assert notice.body == f"Bonjour Jean,\n\n{CONSULTATION_NOTICE}\n"
    html = notice.html
    assert "Bonjour Jean," in html and CONSULTATION_NOTICE.replace("'", "&#x27;") in html
    assert "Sécurité :</strong> si vous n'êtes pas à l'origine de cette action, contactez la DRH." in html
    assert "&copy; 2026 ACME SA" in html and "{{" not in html
    assert "#1e1e82" in html and "#1f4e8c" not in html  # à nos couleurs


def test_ca01_sans_prenom_bonjour_tout_court():
    text, html = _messages().notice("", REFUSED_NOTICE, 2026)

    assert text.startswith("Bonjour,\n\n") and ">Bonjour,<" in html


def test_ca01_prenom_en_capitales_remis_en_casse_de_titre():
    text, _ = _messages().notice("MARIE  ROSE", REFUSED_NOTICE, 2026)

    assert text.startswith("Bonjour Marie Rose,")


@pytest.mark.parametrize(
    ("send", "expected"),
    [
        (lambda m, sender: m.login_succeeded("a@exemple.test", "Jean", AT),
         "Une consultation de vos documents de paie vient d'avoir lieu. Si vous n'êtes pas à l'origine de cette "
         "connexion, contactez la DRH."),
        (lambda m, sender: m.attempts_refused("a@exemple.test", "Jean", AT),
         "Des essais de consultation ont été refusés. Si vous n'êtes pas à l'origine de ces essais, contactez la DRH."),
        (lambda m, sender: m.contact_changed("a@exemple.test", "Jean", LoginChannel.EMAIL, AT),
         "Votre adresse du profil RH a changé. Le nouveau contact ne recevra pas de code pendant 72 heures. "
         "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH."),
        (lambda m, sender: m.contact_changed("a@exemple.test", "Jean", LoginChannel.WHATSAPP, AT),
         "Votre numéro du profil RH a changé. L'ancien numéro ne sert plus à recevoir de code. "
         "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH."),
    ],
)
def test_ca02_les_textes_du_directeur(send, expected):
    sender = LocalEmailSender()
    send(_messages(sender), sender)

    (notice,) = sender.outbox
    assert notice.body == f"Bonjour Jean,\n\n{expected}\n"
    assert expected in {CONSULTATION_NOTICE, REFUSED_NOTICE, EMAIL_CHANGED_NOTICE, PHONE_CHANGED_NOTICE}


def test_ca03_valeurs_echappees_et_discretion():
    _, html = _messages().notice("<script>x</script>", REFUSED_NOTICE, 2026)

    assert "<script>" not in html and "&lt;script&gt;" in html
    assert "http" not in html.split("<body", 1)[1].split("</body>")[0].replace("http://www.w3.org", "")


def test_ca03_un_envoi_rate_ne_change_rien():
    class Broken:
        def send(self, *args, **kwargs):
            raise MessageNotSent()

    _messages(Broken()).attempts_refused("a@exemple.test", "Jean", AT)  # aucune exception


def test_ca03_sans_adresse_rien_ne_part():
    sender = LocalEmailSender()

    _messages(sender).login_succeeded(None, "Jean", AT)

    assert sender.outbox == []
