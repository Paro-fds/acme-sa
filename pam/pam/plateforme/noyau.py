"""Cœur de PAM : identification, OTP par courriel, lecture de sa seule balance.

WhatsApp est annoncé puis refusé : le modèle Cloud API n'est pas encore branché.
Aucune coordonnée n'est modifiable ici. Le profil vient du CSV Vault.
"""

from __future__ import annotations

import csv
import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from html import escape
from pathlib import Path
from typing import Callable, Protocol

MESSAGE_INCORRECT = "Informations incorrectes"
MESSAGE_DRH = "Contactez la DRH"
MESSAGE_WHATSAPP = "WhatsApp est indisponible."
MESSAGE_PATIENTEZ = "Veuillez patienter avant un nouvel envoi."
MESSAGE_RENVOIS = "Le nombre de renvois est atteint. Réessayez plus tard."
MESSAGE_OTP = "Code incorrect ou expiré."
MESSAGE_ABSENTE = "Aucune balance n'est disponible pour le moment."
MESSAGE_BULLETIN = "Aucun bulletin n'est disponible pour cette période."
MOIS_FR = (
    "",
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
)
SUJET_OTP = "ACME SA — Code de vérification PAM"
PREFIXE = "pam/balances"
DUREE_OTP = timedelta(minutes=5)
DUREE_SESSION = timedelta(minutes=15)
DUREE_RENVOI = timedelta(minutes=15)
DUREE_GEL = timedelta(hours=72)
ESSAIS_OTP = 3
RENVOIS_MAX = 3
PAUSE_ENVOI = timedelta(seconds=60)
ECHEC_CAPTCHA = 3
ECHEC_VERROU = 5
QUOTA_WHATSAPP = 5

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_CODE = re.compile(r"^[A-Z0-9]{4,16}$")


class ErreurPam(Exception):
    """Refus métier. Le message peut être montré à l'employé."""


def empreinte(valeur: str, secret: bytes) -> str:
    return hmac.new(secret, valeur.encode("utf-8"), hashlib.sha256).hexdigest()


def egal(gauche: str, droite: str) -> bool:
    return hmac.compare_digest(empreinte(gauche, b"cmp"), empreinte(droite, b"cmp"))


def normaliser_code(valeur: str) -> str:
    return "".join(str(valeur or "").split()).upper().replace("'", "").replace("`", "")


def _date_iso(annee: int, mois: int, jour: int) -> str:
    try:
        return datetime(annee, mois, jour).date().isoformat()
    except ValueError:
        return ""


def naissance_vault(valeur: str) -> str:
    """Date Vault : MM/JJ/AAAA, comme le CSV des employés."""
    texte = " ".join(str(valeur or "").split())
    morceaux = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", texte)
    if not morceaux:
        return naissance_ecran(texte) if re.fullmatch(r"\d{4}-\d{2}-\d{2}", texte) else ""
    mois, jour, annee = (int(partie) for partie in morceaux.groups())
    return _date_iso(annee, mois, jour)


def naissance_ecran(valeur: str) -> str:
    """Date saisie : JJMMAAAA. Les séparateurs sont ignorés ; il faut huit chiffres."""
    texte = " ".join(str(valeur or "").split())
    iso = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", texte)
    if iso:
        annee, mois, jour = (int(partie) for partie in iso.groups())
        return _date_iso(annee, mois, jour)
    chiffres = "".join(caractere for caractere in texte if caractere.isdigit())
    if len(chiffres) != 8:
        return ""
    jour, mois, annee = int(chiffres[0:2]), int(chiffres[2:4]), int(chiffres[4:8])
    return _date_iso(annee, mois, jour)


def masquer_courriel(adresse: str) -> str:
    if "@" not in adresse:
        return ""
    local, domaine = adresse.split("@", 1)
    premiere = local[:1] or "*"
    return f"{premiere}***@{domaine}"


def masquer_telephone(numero: str) -> str:
    chiffres = "".join(caractere for caractere in numero if caractere.isdigit())
    if len(chiffres) < 4:
        return ""
    return f"+{chiffres[:3]} •• •• ••{chiffres[-2:]}"


def cle_balance(code: str) -> str:
    propre = normaliser_code(code)
    if not _CODE.fullmatch(propre):
        raise ErreurPam("Accès refusé.")
    return f"{PREFIXE}/per/{propre}.json"


def autoriser_cle(cle: str, code: str) -> None:
    """Refuse toute clé qui n'est pas l'objet PER de cet employé."""
    attendue = cle_balance(code)
    if not egal(cle, attendue) or not cle.startswith(f"{PREFIXE}/per/"):
        raise ErreurPam("Accès refusé.")


def montant_fr(valeur: str) -> str:
    brut = str(valeur or "0").strip()
    negatif = brut.startswith("-")
    brut = brut.lstrip("-")
    if "," in brut and "." not in brut:
        return ("-" if negatif else "") + brut
    try:
        nombre = f"{float(brut.replace(',', '.')):.2f}"
    except ValueError:
        return valeur
    entier, decimales = nombre.split(".")
    groupes: list[str] = []
    while entier:
        groupes.append(entier[-3:])
        entier = entier[:-3]
    return ("-" if negatif else "") + ".".join(reversed(groupes)) + "," + decimales


def date_fr(valeur: str) -> str:
    morceaux = str(valeur or "").split("-")
    if len(morceaux) == 3 and all(morceau.isdigit() for morceau in morceaux):
        annee, mois, jour = morceaux
        return f"{int(jour):02d}/{int(mois):02d}/{annee}"
    return str(valeur or "")


def periode_fr(valeur: str) -> str:
    annee, _, mois = str(valeur or "").partition("-")
    if annee.isdigit() and mois.isdigit() and 1 <= int(mois) <= 12:
        return f"{MOIS_FR[int(mois)]} {annee}"
    return str(valeur or "")


def montant_nul(valeur: str) -> bool:
    brut = str(valeur or "0").replace(" ", "").replace(".", "").replace(",", "")
    return set(brut.strip("-")) <= {"0"}


def releve_per(document: dict | None) -> list[dict]:
    """Toutes les photos PER, de la plus récente à la plus ancienne, sans la source."""
    if not document:
        return []
    photos = list(document.get("snapshots") or [])
    photos.sort(key=lambda item: (item.get("periode", ""), item.get("date_rapport", "")), reverse=True)
    lignes = []
    for photo in photos:
        comptes = []
        for compte in photo.get("comptes") or []:
            comptes.append(
                {
                    "numero": str(compte.get("numero") or ""),
                    "date_ouverture": date_fr(str(compte.get("date_ouverture") or "")),
                    "montant": montant_fr(str(compte.get("balance") or "0")),
                    "interet_cumule": montant_fr(str(compte.get("interet_cumule") or "0")),
                }
            )
        lignes.append(
            {
                "periode": photo.get("periode", ""),
                "periode_fr": periode_fr(str(photo.get("periode") or "")),
                "date_mise_a_jour": date_fr(str(photo.get("date_rapport") or "")),
                "montant": montant_fr(str(photo.get("balance") or "0")),
                "interet_cumule": montant_fr(str(photo.get("interet_cumule") or "0")),
                "comptes": comptes,
            }
        )
    return lignes


def bulletins_employe(document: dict | None) -> list[dict]:
    """Bulletins de cet employé, du plus récent au plus ancien. Les lignes à zéro sont omises."""
    if not document:
        return []
    items = list(document.get("bulletins") or [])
    items.sort(key=lambda item: (item.get("periode", ""), item.get("date_paie", "")), reverse=True)
    return [_bulletin(item) for item in items]


def _bulletin(item: dict) -> dict:
    lignes = []
    for ligne in item.get("lignes") or []:
        if montant_nul(str(ligne.get("montant") or "0")):
            continue
        lignes.append(
            {
                "code": str(ligne.get("code") or ""),
                "libelle": str(ligne.get("libelle") or ""),
                "nature": str(ligne.get("nature") or ""),
                "montant": montant_fr(str(ligne.get("montant") or "0")),
            }
        )
    return {
        "periode": item.get("periode", ""),
        "periode_fr": periode_fr(str(item.get("periode") or "")),
        "date_paie": date_fr(str(item.get("date_paie") or "")),
        "nom": str(item.get("nom") or ""),
        "gains": montant_fr(str(item.get("gains") or "0")),
        "retenues": montant_fr(str(item.get("retenues") or "0")),
        "charges_employeur": montant_fr(str(item.get("charges_employeur") or "0")),
        "total": montant_fr(str(item.get("total") or "0")),
        "lignes": lignes,
    }


def derniere_balance(document: dict | None) -> dict | None:
    if not document:
        return None
    photos = list(document.get("snapshots") or [])
    if not photos:
        return None
    photo = max(photos, key=lambda item: (item.get("periode", ""), item.get("date_rapport", "")))
    return {
        "montant": montant_fr(str(photo.get("balance", ""))),
        "date_mise_a_jour": date_fr(str(photo.get("date_rapport") or "")),
        "periode": photo.get("periode", ""),
        "periode_fr": periode_fr(str(photo.get("periode") or "")),
    }


@dataclass(frozen=True)
class Profil:
    code: str
    naissance: str
    courriel: str
    telephone: str
    actif: bool
    prenom: str = ""


def salutation(prenom: str) -> str:
    """Prénom affichable. Un nom entièrement en capitales est remis en casse de titre."""
    propre = " ".join(prenom.split())
    if propre.isupper():
        return propre.title()
    return propre


_MODELE_OTP: str | None = None


def _lire_modele_otp() -> str:
    global _MODELE_OTP
    if _MODELE_OTP is not None:
        return _MODELE_OTP
    ici = Path(__file__).resolve().parent
    for chemin in (ici / "pam_otp_email.html", ici.parent / "pam_otp_email.html"):
        if chemin.is_file():
            _MODELE_OTP = chemin.read_text(encoding="utf-8")
            return _MODELE_OTP
    raise ErreurPam("Le courriel n'a pas pu être envoyé. Contactez la DIT.")


def rendre_courriel_otp(prenom: str, code: str, validite: int, annee: int) -> tuple[str, str]:
    """Texte brut et HTML du code, à partir de pam_otp_email.html."""
    nom = salutation(prenom)
    appel = f"Bonjour {nom}," if nom else "Bonjour,"
    appel_html = f"Bonjour {escape(nom)}," if nom else "Bonjour,"
    html = (
        _lire_modele_otp()
        .replace("Bonjour {{PRENOM}},", appel_html)
        .replace("{{PRENOM}}", escape(nom))
        .replace("{{CODE}}", code)
        .replace("{{VALIDITE}}", str(validite))
        .replace("{{ANNEE}}", str(annee))
    )
    texte = (
        f"{appel}\n\n"
        "Voici votre code de vérification pour consulter votre balance PER sur la plateforme PAM :\n\n"
        f"{code}\n\n"
        f"Ce code est valable {validite} minutes et ne peut être utilisé qu'une seule fois.\n\n"
        "1. Retournez sur la page de connexion de PAM.\n"
        "2. Saisissez le code ci-dessus dans le champ prévu.\n"
        "3. Validez pour accéder à votre balance.\n\n"
        "Ne communiquez jamais ce code, à personne, y compris à un collègue ou à un membre de la DIT. "
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et contactez la DRH.\n\n"
        "Ceci est un message automatique, merci de ne pas y répondre.\n"
        "Pour toute assistance, contactez la Direction des Ressources Humaines.\n"
        f"© {annee} ACME SA — Tous droits réservés.\n"
    )
    return texte, html


def lire_profils(contenu: str) -> dict[str, Profil]:
    profils: dict[str, Profil] = {}
    for ligne in csv.DictReader(contenu.splitlines()):
        code = normaliser_code(ligne.get("employee_code") or "")
        if not _CODE.fullmatch(code):
            continue
        actif = str(ligne.get("active") or "").strip().lower() in {"true", "vrai", "oui", "1"}
        profils[code] = Profil(
            code=code,
            naissance=naissance_vault(ligne.get("date_of_birth") or ""),
            courriel=(ligne.get("email_address") or "").strip(),
            telephone="".join(caractere for caractere in (ligne.get("telephone_number") or "") if caractere.isdigit()),
            actif=actif,
            prenom=salutation(ligne.get("first_name") or ""),
        )
    return profils


class Courriel(Protocol):
    def envoyer(self, destinataire: str, sujet: str, corps: str, html: str = "") -> None: ...


def alerter(courriel: Courriel, destinataire: str, corps: str) -> None:
    """Avertissement. Un échec d'envoi ne change pas la réponse montrée à l'employé."""
    try:
        courriel.envoyer(destinataire, "ACME SA — PAM", corps)
    except Exception:
        return


class Boite:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str, str, str]] = []

    def envoyer(self, destinataire: str, sujet: str, corps: str, html: str = "") -> None:
        self.messages.append((destinataire, sujet, corps, html))


@dataclass
class SuiviContact:
    empreinte_courriel: str
    empreinte_telephone: str
    courriel: str
    telephone: str
    gele_courriel: datetime | None = None
    gele_telephone: datetime | None = None


class Contacts:
    """Repère un changement d'empreinte. Le premier passage ne gèle personne."""

    def __init__(self, secret: bytes, courriel: Courriel) -> None:
        self.secret = secret
        self.courriel = courriel
        self._suivis: dict[str, SuiviContact] = {}

    def observer(self, profil: Profil, maintenant: datetime) -> SuiviContact:
        suivi = self._suivis.get(profil.code)
        empreinte_courriel = empreinte(profil.courriel.lower(), self.secret)
        empreinte_telephone = empreinte(profil.telephone, self.secret)
        if suivi is None:
            suivi = SuiviContact(empreinte_courriel, empreinte_telephone, profil.courriel, profil.telephone)
            self._suivis[profil.code] = suivi
            return suivi
        if suivi.empreinte_courriel != empreinte_courriel:
            if _EMAIL.match(suivi.courriel):
                alerter(self.courriel,
                    suivi.courriel,
                    "Votre adresse du profil RH a changé. Le nouveau contact ne recevra pas de code pendant 72 heures. "
                    "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH.",
                )
            suivi.empreinte_courriel = empreinte_courriel
            suivi.courriel = profil.courriel
            suivi.gele_courriel = maintenant + DUREE_GEL
        if suivi.empreinte_telephone != empreinte_telephone:
            if _EMAIL.match(suivi.courriel):
                alerter(self.courriel,
                    suivi.courriel,
                    "Votre numéro du profil RH a changé. L'ancien numéro ne sert plus à recevoir de code. "
                    "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH.",
                )
            suivi.empreinte_telephone = empreinte_telephone
            suivi.telephone = profil.telephone
            suivi.gele_telephone = maintenant + DUREE_GEL
        return suivi

    def courriel_gele(self, code: str, maintenant: datetime) -> bool:
        suivi = self._suivis.get(code)
        return bool(suivi and suivi.gele_courriel and suivi.gele_courriel > maintenant)


class QuotaWhatsApp:
    def __init__(self) -> None:
        self._comptes: dict[tuple[str, str], int] = {}

    def consommer(self, code: str, mois: str) -> int:
        cle = (code, mois)
        actuel = self._comptes.get(cle, 0)
        if actuel >= QUOTA_WHATSAPP:
            raise ErreurPam(MESSAGE_DRH)
        self._comptes[cle] = actuel + 1
        return QUOTA_WHATSAPP - self._comptes[cle]


@dataclass
class Defi:
    identifiant: str
    code: str
    hmac_otp: str
    expire: datetime
    essais: int = 0
    renvois: int = 0
    dernier_envoi: datetime | None = None
    fenetre_renvoi: datetime | None = None
    consomme: bool = False


@dataclass
class Session:
    jeton: str
    code: str
    expire: datetime


@dataclass
class Verrou:
    echecs: int = 0
    jusqua: datetime | None = None


def duree_verrou(echecs: int) -> timedelta | None:
    if echecs < ECHEC_VERROU:
        return None
    if echecs < 10:
        return timedelta(minutes=1)
    if echecs < 15:
        return timedelta(minutes=15)
    return timedelta(hours=1)


@dataclass
class Demande:
    etape: str
    message: str = ""
    defi: str = ""
    canaux: list[dict] = field(default_factory=list)
    captcha: str = ""
    session: str = ""
    balance: dict | None = None
    releve: list = field(default_factory=list)
    bulletins: list = field(default_factory=list)


class Application:
    def __init__(
        self,
        profils: dict[str, Profil],
        balances: dict[str, dict],
        courriel: Courriel,
        *,
        secret: bytes,
        maintenant: Callable[[], datetime],
        captcha_reponses: dict[str, str] | None = None,
        depot: object | None = None,
        bulletins: dict | None = None,
    ) -> None:
        self.profils = profils
        self.balances = balances
        self.bulletins = bulletins if bulletins is not None else {}
        self.courriel = courriel
        self.secret = secret
        self.maintenant = maintenant
        self.depot = depot
        self.contacts = Contacts(secret, courriel)
        self.quota = QuotaWhatsApp()
        self.defis: dict[str, Defi] = {}
        self.sessions: dict[str, Session] = {}
        self.verrous_code: dict[str, Verrou] = {}
        self.verrous_ip: dict[str, Verrou] = {}
        self.captchas: dict[str, str] = captcha_reponses if captcha_reponses is not None else {}
        self.audit: list[dict] = []
        self.questions: dict[str, str] = {}
        self.attentes = 0

    def _noter(self, resultat: str, canal: str, ip: str, qui: str) -> None:
        ligne = {
            "quand": self.maintenant().isoformat(timespec="seconds"),
            "qui": empreinte(qui, self.secret)[:16],
            "canal": canal,
            "resultat": resultat,
            "ip": ip,
        }
        self.audit.append(ligne)
        if self.depot is not None:
            self.depot.ajouter_audit(ligne)

    def _charger_acces(self, code: str, ip: str) -> None:
        if self.depot is None:
            return
        self.verrous_code[code] = self.depot.lire_verrou("code", code)
        self.verrous_ip[ip] = self.depot.lire_verrou("ip", ip)
        question, reponse = self.depot.lire_captcha(f"{ip}|{code}")
        if question:
            self.questions[f"{ip}|{code}"] = question
            self.captchas[f"{ip}|{code}"] = reponse

    def _sauver_acces(self, code: str, ip: str) -> None:
        if self.depot is None:
            return
        self.depot.ecrire_verrou("code", code, self.verrous_code.get(code, Verrou()))
        self.depot.ecrire_verrou("ip", ip, self.verrous_ip.get(ip, Verrou()))
        cle = f"{ip}|{code}"
        if cle in self.questions:
            self.depot.ecrire_captcha(cle, self.questions[cle], self.captchas.get(cle, ""))

    def _charger_contact(self, code: str) -> None:
        if self.depot is None or not code:
            return
        suivi = self.depot.lire_contact(code)
        if suivi is not None:
            self.contacts._suivis[code] = suivi

    def _sauver_contact(self, code: str) -> None:
        if self.depot is None or code not in self.contacts._suivis:
            return
        self.depot.ecrire_contact(code, self.contacts._suivis[code])

    def _charger_defi(self, identifiant: str) -> None:
        if self.depot is None or not identifiant:
            return
        defi = self.depot.lire_defi(identifiant)
        if defi is not None:
            self.defis[identifiant] = defi

    def _sauver_defi(self, identifiant: str) -> None:
        if self.depot is None or identifiant not in self.defis:
            return
        self.depot.ecrire_defi(self.defis[identifiant])

    def _charger_session(self, jeton: str) -> None:
        if self.depot is None or not jeton:
            return
        session = self.depot.lire_session(jeton)
        if session is not None:
            self.sessions[jeton] = session

    def _verrou(self, table: dict[str, Verrou], cle: str) -> Verrou:
        return table.setdefault(cle, Verrou())

    def _bloque(self, code: str, ip: str) -> bool:
        instant = self.maintenant()
        for verrou in (self._verrou(self.verrous_code, code), self._verrou(self.verrous_ip, ip)):
            if verrou.jusqua and verrou.jusqua > instant:
                return True
        return False

    def _echec(self, code: str, ip: str, profil: Profil | None) -> None:
        instant = self.maintenant()
        for table, cle in ((self.verrous_code, code), (self.verrous_ip, ip)):
            verrou = self._verrou(table, cle)
            verrou.echecs += 1
            duree = duree_verrou(verrou.echecs)
            if duree is not None:
                verrou.jusqua = instant + duree
        if profil and _EMAIL.match(profil.courriel) and duree_verrou(self.verrous_code[code].echecs):
            alerter(self.courriel,
                profil.courriel,
                "Des essais de consultation ont été refusés. Si vous n'êtes pas à l'origine de ces essais, contactez la DRH.",
            )
        self._noter("echec", "", ip, code)

    def _question(self, code: str, ip: str) -> str:
        cle = f"{ip}|{code}"
        if cle in self.questions:
            return self.questions[cle]
        gauche = secrets.randbelow(8) + 2
        droite = secrets.randbelow(8) + 2
        self.captchas[cle] = str(gauche + droite)
        question = f"Combien font {gauche} + {droite} ?"
        self.questions[cle] = question
        return question

    def _captcha_requis(self, code: str, ip: str) -> bool:
        return (
            self._verrou(self.verrous_code, code).echecs >= ECHEC_CAPTCHA
            or self._verrou(self.verrous_ip, ip).echecs >= ECHEC_CAPTCHA
        )

    def _captcha_valide(self, code: str, ip: str, reponse: str) -> bool:
        if not self._captcha_requis(code, ip):
            return True
        cle = f"{ip}|{code}"
        attendu = self.captchas.get(cle, "")
        return bool(attendu) and egal(reponse.strip(), attendu)

    def identifier(self, code_saisi: str, naissance_saisie: str, ip: str, captcha: str = "") -> Demande:
        self.attentes += 1
        code = normaliser_code(code_saisi)
        if not _CODE.fullmatch(code):
            code = "INCONNU"
        naissance = naissance_ecran(naissance_saisie)
        profil = self.profils.get(code) if code != "INCONNU" else None
        if profil is not None and not profil.actif:
            profil = None
        stockee = profil.naissance if profil else ""
        correspond = bool(profil) and bool(stockee) and bool(naissance) and egal(stockee, naissance)
        self._charger_acces(code, ip)
        self._charger_contact(code if profil else "")
        try:
            return self._identifier_charge(code, ip, profil, correspond, captcha)
        finally:
            self._sauver_acces(code, ip)
            if profil is not None:
                self._sauver_contact(profil.code)

    def _identifier_charge(self, code: str, ip: str, profil: Profil | None, correspond: bool, captcha: str) -> Demande:
        if self._bloque(code, ip):
            question = self._question(code, ip) if self._captcha_requis(code, ip) else ""
            return Demande(etape="identification", message=MESSAGE_INCORRECT, captcha=question)
        if not correspond or not self._captcha_valide(code, ip, captcha):
            self._echec(code, ip, profil)
            question = self._question(code, ip) if self._captcha_requis(code, ip) else ""
            return Demande(etape="identification", message=MESSAGE_INCORRECT, captcha=question)
        for table, cle in ((self.verrous_code, code), (self.verrous_ip, ip)):
            self._verrou(table, cle).echecs = 0
            self._verrou(table, cle).jusqua = None
        assert profil is not None
        suivi = self.contacts.observer(profil, self.maintenant())
        gele = bool(suivi.gele_courriel and suivi.gele_courriel > self.maintenant())
        courriel_ok = bool(_EMAIL.match(profil.courriel)) and not gele
        canaux = [
            {
                "canal": "email",
                "masque": masquer_courriel(profil.courriel) if profil.courriel else "",
                "disponible": courriel_ok,
                "motif": "" if courriel_ok else MESSAGE_DRH,
            },
            {
                "canal": "whatsapp",
                "masque": masquer_telephone(profil.telephone) if profil.telephone else "",
                "disponible": False,
                "motif": "Indisponible",
                "reste": None,
            },
        ]
        identifiant = secrets.token_urlsafe(16)
        self.defis[identifiant] = Defi(
            identifiant=identifiant,
            code=profil.code,
            hmac_otp="",
            expire=self.maintenant(),
        )
        self._noter("identifie", "", ip, profil.code)
        self._sauver_defi(identifiant)
        return Demande(etape="canal", defi=identifiant, canaux=canaux)

    def envoyer(self, defi_id: str, canal: str, ip: str) -> Demande:
        self._charger_defi(defi_id)
        try:
            return self._envoyer_charge(defi_id, canal, ip)
        finally:
            self._sauver_defi(defi_id)

    def _envoyer_charge(self, defi_id: str, canal: str, ip: str) -> Demande:
        defi = self.defis.get(defi_id)
        if defi is None:
            self._noter("defi_inconnu", canal, ip, "")
            return Demande(etape="canal", message=MESSAGE_INCORRECT)
        self._charger_contact(defi.code)
        if canal != "email":
            self._noter("canal_refuse", canal or "whatsapp", ip, defi.code)
            raise ErreurPam(MESSAGE_WHATSAPP)
        profil = self.profils.get(defi.code)
        if profil is None or not _EMAIL.match(profil.courriel) or self.contacts.courriel_gele(defi.code, self.maintenant()):
            self._noter("contact_refuse", "email", ip, defi.code)
            raise ErreurPam(MESSAGE_DRH)
        instant = self.maintenant()
        if defi.dernier_envoi and instant - defi.dernier_envoi < PAUSE_ENVOI:
            raise ErreurPam(MESSAGE_PATIENTEZ)
        renvois = defi.renvois
        fenetre = defi.fenetre_renvoi
        if fenetre and instant - fenetre > DUREE_RENVOI:
            renvois = 0
            fenetre = None
        if defi.dernier_envoi is not None:
            if renvois >= RENVOIS_MAX:
                raise ErreurPam(MESSAGE_RENVOIS)
            renvois += 1
        otp = f"{secrets.randbelow(1_000_000):06d}"
        texte, html = rendre_courriel_otp(
            profil.prenom,
            otp,
            int(DUREE_OTP.total_seconds() // 60),
            instant.year,
        )
        self.courriel.envoyer(profil.courriel, SUJET_OTP, texte, html)
        defi.hmac_otp = empreinte(otp, self.secret)
        defi.expire = instant + DUREE_OTP
        defi.essais = 0
        defi.consomme = False
        defi.dernier_envoi = instant
        defi.renvois = renvois
        defi.fenetre_renvoi = fenetre or instant
        self._noter("otp_envoye", "email", ip, defi.code)
        return Demande(etape="otp", defi=defi.identifiant, message="Le code a été envoyé.")

    def verifier(self, defi_id: str, otp: str, ip: str) -> Demande:
        self._charger_defi(defi_id)
        try:
            return self._verifier_charge(defi_id, otp, ip)
        finally:
            self._sauver_defi(defi_id)

    def _verifier_charge(self, defi_id: str, otp: str, ip: str) -> Demande:
        defi = self.defis.get(defi_id)
        if defi is None or not defi.hmac_otp:
            self._noter("otp_refuse", "email", ip, defi.code if defi else "")
            raise ErreurPam(MESSAGE_OTP)
        if defi.consomme or self.maintenant() > defi.expire or defi.essais >= ESSAIS_OTP:
            self._noter("otp_refuse", "email", ip, defi.code)
            raise ErreurPam(MESSAGE_OTP)
        if not egal(empreinte(otp.strip(), self.secret), defi.hmac_otp):
            defi.essais += 1
            self._noter("otp_refuse", "email", ip, defi.code)
            raise ErreurPam(MESSAGE_OTP)
        defi.consomme = True
        jeton = secrets.token_urlsafe(32)
        self.sessions[jeton] = Session(jeton, defi.code, self.maintenant() + DUREE_SESSION)
        if self.depot is not None:
            self.depot.ecrire_session(self.sessions[jeton])
        profil = self.profils[defi.code]
        if _EMAIL.match(profil.courriel):
            alerter(
                self.courriel,
                profil.courriel,
                "Une consultation de vos documents de paie vient d'avoir lieu. Si vous n'êtes pas à l'origine de cette connexion, contactez la DRH.",
            )
        self._noter("session", "email", ip, defi.code)
        return Demande(etape="balance", session=jeton, message="Consultation ouverte.")

    def lire(self, jeton: str, code_demande: str = "") -> Demande:
        self._charger_session(jeton)
        session = self.sessions.get(jeton)
        if session is None or self.maintenant() > session.expire:
            raise ErreurPam(MESSAGE_INCORRECT)
        if code_demande and not egal(normaliser_code(code_demande), session.code):
            self._noter("objet_refuse", "", "", session.code)
            raise ErreurPam("Accès refusé.")
        cle = cle_balance(session.code)
        autoriser_cle(cle, session.code)
        balance = derniere_balance(self.balances.get(session.code))
        releve = releve_per(self.balances.get(session.code))
        bulletins = bulletins_employe(self.bulletins.get(session.code))
        if balance is None and not releve and not bulletins:
            return Demande(etape="balance", message=MESSAGE_ABSENTE, balance=None)
        self._noter("lecture", "", "", session.code)
        return Demande(etape="balance", balance=balance, releve=releve, bulletins=bulletins)

    def fiche(self, jeton: str, periode: str) -> tuple[bytes, str]:
        """PDF du bulletin de la session, pour la période demandée."""
        import fiche_paie

        self._charger_session(jeton)
        session = self.sessions.get(jeton)
        if session is None or self.maintenant() > session.expire:
            raise ErreurPam(MESSAGE_INCORRECT)
        if not re.fullmatch(r"\d{4}-\d{2}", periode or ""):
            raise ErreurPam(MESSAGE_BULLETIN)
        document = self.bulletins.get(session.code)
        choisi = next((item for item in bulletins_employe(document) if item.get("periode") == periode), None)
        if choisi is None:
            raise ErreurPam(MESSAGE_BULLETIN)
        choisi = dict(choisi)
        choisi["code_employe"] = session.code
        logo = None
        chemin = fiche_paie.chemin_logo()
        if chemin is not None:
            logo = chemin.read_bytes()
        self._noter("fiche", "", "", session.code)
        return fiche_paie.construire(choisi, logo), f"fiche-paie-{periode}.pdf"

    def sortir(self, jeton: str) -> None:
        self.sessions.pop(jeton, None)
        if self.depot is not None:
            self.depot.effacer_session(jeton)
