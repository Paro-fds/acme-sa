"""US-116 : notifications de l'espace de gestion — retard, conservation, ses propres dossiers, lu et non lu."""

from datetime import UTC, datetime, timedelta

from app.admin.domain.notifications import Notification, NotificationKind, ReadState, late_at, visible
from app.certificate.application.validation_queue import count_business_days

NOW = datetime(2026, 10, 14, 12, 0, tzinfo=UTC)


def notification(key, at, subject="1001", kind=NotificationKind.CERTIFICATE_SUBMITTED):
    return Notification(key, kind, "Titre", "Détail", at, "/admin/validation/x", subject)


# --- CA-02 : le retard, une seule fois, au passage des 5 jours ouvrables ----------------------


def test_ca02_le_retard_commence_au_sixieme_jour_ouvrable():
    monday = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)
    assert late_at(monday) == datetime(2026, 10, 13, 9, 0, tzinfo=UTC)
    friday = datetime(2026, 10, 9, 16, 30, tzinfo=UTC)
    assert late_at(friday) == datetime(2026, 10, 19, 16, 30, tzinfo=UTC)


def test_ca02_meme_regle_que_le_tableau_de_bord():
    submitted = datetime(2026, 10, 5, 9, 0, tzinfo=UTC)
    moment = late_at(submitted)
    assert count_business_days(submitted, moment) > 5
    assert count_business_days(submitted, moment - timedelta(days=1)) <= 5


def test_ca02_les_libelles_des_quatre_notifications():
    assert [kind.label for kind in NotificationKind] == ["Certificat", "Retard", "Signalement", "Candidature"]


# --- CA-03 : jamais ses propres dossiers ------------------------------------------------------


def test_ca03_ses_propres_dossiers_ne_sont_pas_notifies():
    items = [notification("a", NOW - timedelta(hours=1), subject="1001"), notification("b", NOW, subject="1007")]
    assert [n.key for n in visible(items, own_employee_id="1001", now=NOW)] == ["b"]
    assert [n.key for n in visible(items, own_employee_id=None, now=NOW)] == ["b", "a"]


# --- CA-05 : 90 jours -------------------------------------------------------------------------


def test_ca05_une_notification_disparait_apres_90_jours():
    items = [
        notification("recente", NOW - timedelta(days=89)),
        notification("limite", NOW - timedelta(days=90)),
        notification("ancienne", NOW - timedelta(days=90, seconds=1)),
        notification("future", NOW + timedelta(days=1)),
    ]
    assert [n.key for n in visible(items, None, NOW)] == ["recente", "limite"]


# --- CA-04 : lu et non lu ---------------------------------------------------------------------


def test_ca04_lue_une_a_une_ou_toutes_jusqu_a_un_moment():
    old = notification("old", NOW - timedelta(days=2))
    new = notification("new", NOW - timedelta(hours=1))
    one = notification("one", NOW - timedelta(minutes=5))
    state = ReadState(keys=frozenset({"one"}), all_before=NOW - timedelta(days=1))
    assert [state.is_read(n) for n in (old, new, one)] == [True, False, True]
    assert ReadState(frozenset(), None).is_read(new) is False
