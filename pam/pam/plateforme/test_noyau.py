"""Parcours PAM sans réseau, sans SES et sans S3."""

from __future__ import annotations

import json
import re
import unittest
from datetime import datetime, timedelta

import depot
import noyau as pam

SECRET = b"secret-test"
INSTANT = datetime(2026, 10, 27, 12, 0, 0)
CSV = """employee_code,active,date_of_birth,email_address,telephone_number,first_name
ZORA0001,True,10/27/1990,zora@acmehaiti.com,50912345678,ZORA
LUCI0002,True,01/15/1985,luci@acmehaiti.com,50900000042,Lucien
SANS0003,True,03/04/1980,,50911111111,
MORT0004,False,05/06/1970,mort@acmehaiti.com,50922222222,
"""
BALANCE = {
    "schema": 1,
    "snapshots": [
        {"periode": "2026-09", "date_rapport": "2026-09-30", "balance": "1.00", "nom": "Zora"},
        {
            "periode": "2026-10",
            "date_rapport": "2026-10-27",
            "balance": "10.50",
            "interet_cumule": "1.25",
            "nom": "Zora",
            "comptes": [
                {"numero": "C1", "date_ouverture": "2022-11-22", "balance": "10.50", "interet_cumule": "1.25"},
            ],
        },
    ],
}
BULLETIN = {
    "schema": 1,
    "nom": "Zora Dupont",
    "bulletins": [
        {
            "periode": "2026-10",
            "date_paie": "2026-10-31",
            "nom": "Zora Dupont",
            "gains": "100.00",
            "retenues": "20.00",
            "charges_employeur": "12.00",
            "total": "80.00",
            "lignes": [
                {"code": "AA", "libelle": "Salaire de base", "nature": "gain", "montant": "100.00"},
                {"code": "AG", "libelle": "IRI", "nature": "retenue", "montant": "20.00"},
                {"code": "AK", "libelle": "ONA employeur", "nature": "employeur", "montant": "12.00"},
                {"code": "AB", "libelle": "Prime vide", "nature": "gain", "montant": "0.00"},
            ],
        }
    ],
}
BULLETIN_AUTRE = {
    "schema": 1,
    "bulletins": [
        {
            "periode": "2026-10",
            "date_paie": "2026-10-31",
            "nom": "Lucien Marcel",
            "gains": "50.00",
            "retenues": "0.00",
            "charges_employeur": "0.00",
            "total": "50.00",
            "lignes": [{"code": "AA", "libelle": "Salaire de base", "nature": "gain", "montant": "50.00"}],
        }
    ],
}


class TestsPam(unittest.TestCase):
    def setUp(self) -> None:
        self.instant = INSTANT
        self.boite = pam.Boite()
        self.app = pam.Application(
            pam.lire_profils(CSV),
            {"ZORA0001": BALANCE, "LUCI0002": {"snapshots": [{"periode": "2026-10", "date_rapport": "2026-10-27", "balance": "99.00"}]}},
            self.boite,
            secret=SECRET,
            maintenant=lambda: self.instant,
            bulletins={"ZORA0001": BULLETIN, "LUCI0002": BULLETIN_AUTRE},
        )

    def _avancer(self, **delta) -> None:
        self.instant += timedelta(**delta)

    def _entrer(self, code: str = "ZORA0001", naissance: str = "27101990", ip: str = "10.0.0.1", captcha: str = ""):
        return self.app.identifier(code, naissance, ip, captcha)

    def _code_recu(self, boite: pam.Boite | None = None) -> str:
        message = (boite or self.boite).messages[-1]
        for morceau in (message[-1], message[2]):
            trouve = re.search(r"(?<!\d)(\d{6})(?!\d)", morceau)
            if trouve:
                return trouve.group(1)
        self.fail("code absent du courriel")

    def test_cle_absente_n_est_pas_une_panne(self) -> None:
        from botocore.exceptions import ClientError

        import serveur

        class FauxS3:
            def get_object(self, **kwargs):
                raise ClientError({"Error": {"Code": "AccessDenied", "Message": "absent"}}, "GetObject")

        self.assertIsNone(serveur.LecturesS3(FauxS3(), "acme-pam-balances", "pam/balances").get("ZORA0001"))

    def test_modele_courriel_otp(self) -> None:
        texte, html = pam.rendre_courriel_otp("ZORA", "123456", 5, 2026)
        self.assertIn("Bonjour Zora,", texte)
        self.assertIn("123456", html)
        self.assertIn("valable 5 minutes", html)
        self.assertIn("2026", html)
        self.assertNotIn("{{", html)
        _, sans_prenom = pam.rendre_courriel_otp("", "654321", 5, 2026)
        self.assertIn("Bonjour,", sans_prenom)
        self.assertNotIn("Bonjour ,", sans_prenom)
        _, injecte = pam.rendre_courriel_otp("<b>A</b>", "111111", 5, 2026)
        self.assertNotIn("<b>", injecte)
        self.assertIn("&lt;b&gt;", injecte)

    def test_releve_bulletin_et_fiche(self) -> None:
        demande = self._entrer()
        self.app.envoyer(demande.defi, "email", "10.0.0.1")
        session = self.app.verifier(demande.defi, self._code_recu(), "10.0.0.1")
        lecture = self.app.lire(session.session)
        self.assertEqual(lecture.balance["montant"], "10,50")
        self.assertEqual(lecture.balance["date_mise_a_jour"], "27/10/2026")
        self.assertEqual([ligne["periode"] for ligne in lecture.releve], ["2026-10", "2026-09"])
        self.assertEqual(lecture.releve[0]["comptes"][0]["numero"], "C1")
        self.assertEqual(lecture.releve[0]["montant"], "10,50")
        self.assertEqual(lecture.bulletins[0]["total"], "80,00")
        self.assertNotIn("Prime vide", [ligne["libelle"] for ligne in lecture.bulletins[0]["lignes"]])
        contenu, nom = self.app.fiche(session.session, "2026-10")
        self.assertEqual(nom, "fiche-paie-2026-10.pdf")
        self.assertTrue(contenu.startswith(b"%PDF"))
        self.assertIn("Zora Dupont".encode("cp1252"), contenu)
        self.assertIn("Net à payer".encode("cp1252"), contenu)
        self.assertIn(b"80,00", contenu)
        self.assertNotIn(b"Lucien", contenu)
        self.assertNotIn(b"50,00", contenu)
        with self.assertRaises(pam.ErreurPam):
            self.app.fiche(session.session, "2026-01")
        page = Path(__file__).resolve().parent.joinpath("statique", "index.html").read_text(encoding="utf-8")
        self.assertIn("Relevé PER", page)
        self.assertIn("Bulletin", page)
        self.assertIn("fiche.pdf", Path(__file__).resolve().parent.joinpath("statique", "pam.js").read_text(encoding="utf-8"))

    def test_date_jjmmaaaa(self) -> None:
        self.assertEqual(pam.naissance_ecran("27101990"), "1990-10-27")
        self.assertEqual(pam.naissance_ecran("27/10/1990"), "1990-10-27")
        self.assertEqual(pam.naissance_vault("10/27/1990"), "1990-10-27")
        self.assertEqual(pam.naissance_ecran("2710199"), "")
        self.assertEqual(pam.naissance_ecran("32101990"), "")
        self.assertEqual(self._entrer(naissance="27101990").etape, "canal")

    def test_parcours_courriel_et_lecture(self) -> None:
        demande = self._entrer()
        self.assertEqual(demande.etape, "canal")
        courriel = next(canal for canal in demande.canaux if canal["canal"] == "email")
        whatsapp = next(canal for canal in demande.canaux if canal["canal"] == "whatsapp")
        self.assertTrue(courriel["disponible"])
        self.assertEqual(courriel["masque"], "z***@acmehaiti.com")
        self.assertFalse(whatsapp["disponible"])
        self.assertEqual(whatsapp["motif"], "Indisponible")
        self.app.envoyer(demande.defi, "email", "10.0.0.1")
        otp = self._code_recu()
        destinataire, sujet, texte, html = self.boite.messages[-1]
        self.assertEqual(destinataire, "zora@acmehaiti.com")
        self.assertEqual(sujet, pam.SUJET_OTP)
        self.assertIn("Bonjour Zora,", html)
        self.assertIn(otp, html)
        self.assertIn("5 minutes", html)
        self.assertNotIn("{{", html)
        self.assertIn(otp, texte)
        self.assertNotIn("<html", texte)
        session = self.app.verifier(demande.defi, otp, "10.0.0.1")
        with self.assertRaises(pam.ErreurPam):
            self.app.lire(session.session, "LUCI0002")
        lecture = self.app.lire(session.session)
        self.assertEqual(lecture.balance["montant"], "10,50")
        self.assertEqual(lecture.balance["date_mise_a_jour"], "2026-10-27")
        self.assertNotIn("Zora", json.dumps(lecture.balance))
        journal = json.dumps(self.app.audit)
        self.assertNotIn("zora@", journal)
        self.assertNotIn(otp, journal)
        self.assertNotIn("ZORA0001", journal)

    def test_whatsapp_refuse_sans_envoi(self) -> None:
        demande = self._entrer()
        with self.assertRaises(pam.ErreurPam) as contexte:
            self.app.envoyer(demande.defi, "whatsapp", "10.0.0.1")
        self.assertEqual(str(contexte.exception), pam.MESSAGE_WHATSAPP)
        self.assertEqual(self.boite.messages, [])

    def test_quota_whatsapp_sixieme_puis_mois_suivant(self) -> None:
        for _ in range(5):
            self.app.quota.consommer("ZORA0001", "2026-10")
        with self.assertRaises(pam.ErreurPam):
            self.app.quota.consommer("ZORA0001", "2026-10")
        self.assertEqual(self.app.quota.consommer("ZORA0001", "2026-11"), 4)

    def test_otp_mauvais_expire_reutilise_et_trop_dessais(self) -> None:
        demande = self._entrer()
        self.app.envoyer(demande.defi, "email", "10.0.0.1")
        otp = self._code_recu()
        with self.assertRaises(pam.ErreurPam):
            self.app.verifier(demande.defi, "000000", "10.0.0.1")
        self._avancer(minutes=6)
        with self.assertRaises(pam.ErreurPam):
            self.app.verifier(demande.defi, otp, "10.0.0.1")
        self.instant = INSTANT
        demande = self._entrer()
        self.app.envoyer(demande.defi, "email", "10.0.0.1")
        otp = self._code_recu()
        self.app.verifier(demande.defi, otp, "10.0.0.1")
        with self.assertRaises(pam.ErreurPam):
            self.app.verifier(demande.defi, otp, "10.0.0.1")
        self.instant = INSTANT
        demande = self._entrer(ip="10.0.0.8")
        self.app.envoyer(demande.defi, "email", "10.0.0.8")
        for _ in range(3):
            with self.assertRaises(pam.ErreurPam):
                self.app.verifier(demande.defi, "111111", "10.0.0.8")
        with self.assertRaises(pam.ErreurPam):
            self.app.verifier(demande.defi, self._code_recu(), "10.0.0.8")

    def test_enumeration_meme_reponse(self) -> None:
        inconnu = self._entrer("ABCD9999", "01012000", "10.1.0.1")
        mauvais = self._entrer("ZORA0001", "01012000", "10.1.0.2")
        self.assertEqual(inconnu.etape, mauvais.etape)
        self.assertEqual(inconnu.message, mauvais.message)
        self.assertEqual(inconnu.message, pam.MESSAGE_INCORRECT)
        self.assertEqual(set(inconnu.__dict__), set(mauvais.__dict__))
        self.assertEqual(self.app.attentes, 2)

    def test_autre_employe_et_prefixe_et_absence(self) -> None:
        sans = self._entrer("SANS0003", "04031980", "10.0.0.3")
        courriel_absent = next(canal for canal in sans.canaux if canal["canal"] == "email")
        self.assertFalse(courriel_absent["disponible"])
        self.assertEqual(courriel_absent["motif"], pam.MESSAGE_DRH)
        demande = self._entrer("LUCI0002", "15011985", "10.0.0.4")
        self.app.envoyer(demande.defi, "email", "10.0.0.4")
        session = self.app.verifier(demande.defi, self._code_recu(), "10.0.0.4")
        with self.assertRaises(pam.ErreurPam):
            self.app.lire(session.session, "ZORA0001")
        propre = self.app.lire(session.session)
        self.assertEqual(propre.balance["montant"], "99,00")
        with self.assertRaises(pam.ErreurPam):
            pam.autoriser_cle("pam/balances/vault/secret.json", "LUCI0002")
        self.app.balances.pop("LUCI0002")
        absent = self.app.lire(session.session)
        self.assertEqual(absent.message, pam.MESSAGE_ABSENTE)
        self.assertIsNone(absent.balance)

    def test_contact_gele_ou_absent(self) -> None:
        self._entrer()
        self.app.profils["ZORA0001"] = pam.Profil("ZORA0001", "1990-10-27", "neuf@acmehaiti.com", "50912345678", True)
        demande = self._entrer()
        courriel = next(canal for canal in demande.canaux if canal["canal"] == "email")
        self.assertFalse(courriel["disponible"])
        self.assertEqual(courriel["motif"], pam.MESSAGE_DRH)
        self.assertEqual(self.boite.messages[-1][0], "zora@acmehaiti.com")
        with self.assertRaises(pam.ErreurPam):
            self.app.envoyer(demande.defi, "email", "10.0.0.1")
        whatsapp = next(canal for canal in demande.canaux if canal["canal"] == "whatsapp")
        self.assertFalse(whatsapp["disponible"])
        demande = self._entrer("SANS0003", "04031980", "10.2.0.1")
        self.assertEqual(demande.etape, "canal")
        self.assertFalse(next(canal for canal in demande.canaux if canal["canal"] == "email")["disponible"])

    def test_pause_et_renvois(self) -> None:
        demande = self._entrer()
        self.app.envoyer(demande.defi, "email", "10.0.0.1")
        with self.assertRaises(pam.ErreurPam):
            self.app.envoyer(demande.defi, "email", "10.0.0.1")
        for _ in range(3):
            self._avancer(seconds=61)
            self.app.envoyer(demande.defi, "email", "10.0.0.1")
        self._avancer(seconds=61)
        with self.assertRaises(pam.ErreurPam):
            self.app.envoyer(demande.defi, "email", "10.0.0.1")

    def test_ecran_mobile_et_whatsapp_grise(self) -> None:
        page = (pam.__file__).replace("noyau.py", "statique\\index.html")
        from pathlib import Path

        texte = Path(__file__).resolve().parent.joinpath("statique", "index.html").read_text(encoding="utf-8")
        self.assertIn("viewport", texte)
        self.assertIn('type="password"', texte)
        self.assertIn("JJMMAAAA", texte)
        self.assertNotIn("JJ/MM/AAAA", texte)
        self.assertIn("disabled", texte)
        self.assertIn("WhatsApp", texte)
        self.assertIn("Indisponible", texte)
        script = Path(__file__).resolve().parent.joinpath("statique", "pam.js").read_text(encoding="utf-8")
        self.assertIn("300000", script)
        self.assertNotIn("localStorage", script)

    def test_deux_invocations_partagent_le_depot(self) -> None:
        memoire = Memoire()
        premiere = pam.Application(pam.lire_profils(CSV), {"ZORA0001": BALANCE}, self.boite, secret=SECRET, maintenant=lambda: self.instant, depot=memoire)
        demande = premiere.identifier("ZORA0001", "27101990", "10.9.0.1")
        seconde_boite = pam.Boite()
        seconde = pam.Application(pam.lire_profils(CSV), {"ZORA0001": BALANCE}, seconde_boite, secret=SECRET, maintenant=lambda: self.instant, depot=memoire)
        seconde.envoyer(demande.defi, "email", "10.9.0.1")
        self.assertEqual(len(seconde_boite.messages), 1)
        session = seconde.verifier(demande.defi, self._code_recu(seconde_boite), "10.9.0.1")
        troisieme = pam.Application(pam.lire_profils(CSV), {"ZORA0001": BALANCE}, pam.Boite(), secret=SECRET, maintenant=lambda: self.instant, depot=memoire)
        lecture = troisieme.lire(session.session)
        self.assertEqual(lecture.balance["montant"], "10,50")
        copie = depot.decoder_defi(depot.coder_defi(memoire.defis[demande.defi]))
        self.assertTrue(copie.consomme)
        self.assertNotIn("ZORA0001", json.dumps(memoire.lignes))

    def test_envoi_refuse_reste_reessayable(self) -> None:
        class CourrielCasse:
            def envoyer(self, destinataire: str, sujet: str, corps: str, html: str = "") -> None:
                raise pam.ErreurPam("Le courriel n'a pas pu être envoyé. Contactez la DIT.")

        application = pam.Application(
            pam.lire_profils(CSV),
            {},
            CourrielCasse(),
            secret=SECRET,
            maintenant=lambda: self.instant,
        )
        demande = application.identifier("ZORA0001", "27101990", "10.7.0.1")
        with self.assertRaises(pam.ErreurPam):
            application.envoyer(demande.defi, "email", "10.7.0.1")
        defi = application.defis[demande.defi]
        self.assertIsNone(defi.dernier_envoi)
        self.assertEqual(defi.hmac_otp, "")
        self.assertEqual(defi.renvois, 0)

    def test_alerte_en_echec_laisse_le_message_habituel(self) -> None:
        class CourrielCasse:
            def envoyer(self, destinataire: str, sujet: str, corps: str, html: str = "") -> None:
                raise RuntimeError("ses")

        application = pam.Application(
            pam.lire_profils(CSV),
            {},
            CourrielCasse(),
            secret=SECRET,
            maintenant=lambda: self.instant,
        )
        demande = None
        for numero in range(5):
            demande = application.identifier("ZORA0001", "01011900", f"10.8.0.{numero}")
        self.assertIsNotNone(demande)
        self.assertEqual(demande.message, pam.MESSAGE_INCORRECT)


class Memoire:
    def __init__(self) -> None:
        self.defis: dict[str, pam.Defi] = {}
        self.sessions: dict[str, pam.Session] = {}
        self.verrous: dict[tuple[str, str], pam.Verrou] = {}
        self.captchas: dict[str, tuple[str, str]] = {}
        self.contacts: dict[str, pam.SuiviContact] = {}
        self.lignes: list[dict] = []

    def lire_defi(self, identifiant: str) -> pam.Defi | None:
        defi = self.defis.get(identifiant)
        return depot.decoder_defi(depot.coder_defi(defi)) if defi else None

    def ecrire_defi(self, defi: pam.Defi) -> None:
        self.defis[defi.identifiant] = depot.decoder_defi(depot.coder_defi(defi))

    def lire_session(self, jeton: str) -> pam.Session | None:
        session = self.sessions.get(jeton)
        return depot.decoder_session(depot.coder_session(session)) if session else None

    def ecrire_session(self, session: pam.Session) -> None:
        self.sessions[session.jeton] = depot.decoder_session(depot.coder_session(session))

    def effacer_session(self, jeton: str) -> None:
        self.sessions.pop(jeton, None)

    def lire_verrou(self, genre: str, cle: str) -> pam.Verrou:
        verrou = self.verrous.get((genre, cle))
        return depot.decoder_verrou(depot.coder_verrou(verrou)) if verrou else pam.Verrou()

    def ecrire_verrou(self, genre: str, cle: str, verrou: pam.Verrou) -> None:
        self.verrous[(genre, cle)] = depot.decoder_verrou(depot.coder_verrou(verrou))

    def lire_captcha(self, cle: str) -> tuple[str, str]:
        return self.captchas.get(cle, ("", ""))

    def ecrire_captcha(self, cle: str, question: str, reponse: str) -> None:
        self.captchas[cle] = (question, reponse)

    def lire_contact(self, code: str) -> pam.SuiviContact | None:
        suivi = self.contacts.get(code)
        return depot.decoder_contact(depot.coder_contact(suivi)) if suivi else None

    def ecrire_contact(self, code: str, suivi: pam.SuiviContact) -> None:
        self.contacts[code] = depot.decoder_contact(depot.coder_contact(suivi))

    def ajouter_audit(self, ligne: dict) -> None:
        self.lignes.append(dict(ligne))


if __name__ == "__main__":
    unittest.main()
