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
import unicodedata
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
MESSAGE_BULLETIN = "Aucune fiche de paie n'est disponible pour cette période."
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


def _jour_iso(valeur: str) -> str:
    morceaux = str(valeur or "").strip().split("-")
    if len(morceaux) != 3 or not all(morceau.isdigit() for morceau in morceaux):
        raise ErreurPam("Date illisible.")
    iso = _date_iso(int(morceaux[0]), int(morceaux[1]), int(morceaux[2]))
    if not iso:
        raise ErreurPam("Date illisible.")
    return iso


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


def _decimal_montant(valeur: str):
    from decimal import Decimal

    brut = str(valeur or "0").strip().replace("\u00a0", "").replace(" ", "")
    if "," in brut and "." in brut:
        brut = brut.replace(".", "").replace(",", ".")
    elif "," in brut:
        brut = brut.replace(",", ".")
    return Decimal(brut)


def bonus_accumule(item: dict):
    """Bonus AF : il figure sur la fiche, mais il n'est pas payé avec le salaire du mois."""
    from decimal import Decimal

    for ligne in item.get("lignes") or []:
        if str(ligne.get("code") or "").upper() == "AF":
            return _decimal_montant(str(ligne.get("montant") or "0"))
    return Decimal("0")


def salaire_net(item: dict):
    """Salaire net du mois : total Shivam moins le bonus accumulé."""
    from decimal import Decimal

    bonus = bonus_accumule(item)
    net = (_decimal_montant(str(item.get("total") or "0")) - bonus).quantize(Decimal("0.01"))
    return bonus.quantize(Decimal("0.01")), net


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
        date_iso = str(photo.get("date_rapport") or "")
        if len(date_iso.split("-")) != 3:
            date_iso = ""
        lignes.append(
            {
                "periode": photo.get("periode", ""),
                "periode_fr": periode_fr(str(photo.get("periode") or "")),
                "date_iso": date_iso,
                "date_mise_a_jour": date_fr(date_iso),
                "montant": montant_fr(str(photo.get("balance") or "0")),
                "interet_cumule": montant_fr(str(photo.get("interet_cumule") or "0")),
                "nom": str(photo.get("nom") or ""),
                "comptes": comptes,
            }
        )
    return lignes


def filtrer_releve(lignes: list[dict], debut: str, fin: str) -> list[dict]:
    """Photos dont la date du rapport est comprise entre les deux jours, du plus ancien au plus récent."""
    if debut > fin:
        raise ErreurPam("La date de début est postérieure à la date de fin.")
    choisis = [ligne for ligne in lignes if ligne.get("date_iso") and debut <= ligne["date_iso"] <= fin]
    choisis.sort(key=lambda ligne: (ligne.get("date_iso", ""), ligne.get("periode", "")))
    return choisis


def rendre_releve_html(lignes: list[dict], code: str, debut: str, fin: str) -> str:
    """Relevé PER imprimable pour l'intervalle demandé."""
    logo = _logo_bulletin()
    image = f'<img src="{logo}" alt="ACME SA" style="height:64px">' if logo else ""
    blocs = []
    for ligne in lignes:
        lignes_compte = "".join(
            "<tr>"
            f"<td>{escape(compte['numero'])}</td>"
            f"<td>{escape(compte['date_ouverture'])}</td>"
            f"<td style=\"text-align:right\">{escape(compte['montant'])}</td>"
            f"<td style=\"text-align:right\">{escape(compte['interet_cumule'])}</td>"
            "</tr>"
            for compte in ligne.get("comptes") or []
        )
        tableau = ""
        if lignes_compte:
            tableau = (
                "<table style=\"width:100%;border-collapse:collapse;margin-top:8px\">"
                "<tr><th>Compte</th><th>Ouverture</th><th style=\"text-align:right\">Balance</th>"
                "<th style=\"text-align:right\">Intérêt</th></tr>"
                f"{lignes_compte}</table>"
            )
        blocs.append(
            "<section style=\"margin-top:18px\">"
            f"<h2 style=\"margin:0;color:#09245f\">{escape(ligne.get('periode_fr') or ligne.get('periode') or '')}</h2>"
            f"<p>Au {escape(ligne.get('date_mise_a_jour') or '')} · balance {escape(ligne.get('montant') or '')}"
            f" · intérêt cumulé {escape(ligne.get('interet_cumule') or '')}</p>"
            f"{tableau}</section>"
        )
    if not blocs:
        blocs.append("<p>Aucune photo PER entre ces deux dates.</p>")
    nom = next((ligne.get("nom") or "" for ligne in lignes if ligne.get("nom")), "")
    identite = f"<p>{escape(nom)} · {escape(code)}</p>" if nom else f"<p>{escape(code)}</p>"
    return (
        "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\">"
        "<title>Relevé PER – ACME SA</title>"
        "<style>body{font-family:Calibri,sans-serif;color:#1f2a44;margin:24px}"
        "th,td{padding:4px 6px;border-bottom:1px solid #e3e7ed;text-align:left}"
        "@media print{body{margin:12mm}}</style></head><body>"
        f"{image}<h1 style=\"color:#09245f\">Relevé PER</h1>"
        f"{identite}"
        f"<p>Du {escape(date_fr(debut))} au {escape(date_fr(fin))}.</p>"
        + "".join(blocs)
        + "<p style=\"margin-top:24px\">Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines.</p>"
        "</body></html>"
    )


def _pdf_literal(texte: str) -> str:
    """Chaîne PDF en WinAnsi, les accents en échappement octal."""
    sortie = []
    for octet in str(texte).encode("latin-1", "replace"):
        caractere = chr(octet)
        if caractere in "()\\":
            sortie.append("\\" + caractere)
        elif octet < 32 or octet > 126:
            sortie.append(f"\\{octet:03o}")
        else:
            sortie.append(caractere)
    return "".join(sortie)


def _jpeg_dimensions(donnees: bytes) -> tuple[int, int]:
    index = 2
    while index + 9 < len(donnees):
        if donnees[index] != 0xFF:
            index += 1
            continue
        marqueur = donnees[index + 1]
        if marqueur in {0xC0, 0xC1, 0xC2}:
            hauteur = int.from_bytes(donnees[index + 5 : index + 7], "big")
            largeur = int.from_bytes(donnees[index + 7 : index + 9], "big")
            return largeur, hauteur
        if marqueur in {0xD8, 0xD9, 0x01} or 0xD0 <= marqueur <= 0xD7:
            index += 2
            continue
        longueur = int.from_bytes(donnees[index + 2 : index + 4], "big")
        index += 2 + longueur
    return 0, 0


def _logo_jpeg() -> tuple[bytes, int, int] | None:
    ici = Path(__file__).resolve().parent
    for chemin in (ici / "logo_acme.jpg", ici / "logo-acme.jpg", ici.parent / "logo_acme.jpg"):
        if chemin.is_file():
            donnees = chemin.read_bytes()
            largeur, hauteur = _jpeg_dimensions(donnees)
            if largeur and hauteur:
                return donnees, largeur, hauteur
    return None


def _couper_pdf(texte: str, taille: int, largeur: float) -> list[str]:
    mots = str(texte).split()
    if not mots:
        return [""]
    lignes: list[str] = []
    courante = ""
    for mot in mots:
        essai = f"{courante} {mot}".strip()
        if courante and len(essai) * taille * 0.52 > largeur:
            lignes.append(courante)
            courante = mot
        else:
            courante = essai
    if courante:
        lignes.append(courante)
    return lignes


def _assembler_pdf(pages: list[str], jpeg: tuple[bytes, int, int] | None) -> bytes:
    """Assemble un PDF 1.4 : une police, un logo JPEG facultatif, des pages déjà dessinées."""
    objets: list[bytes] = [b""]
    def ajouter(corps: bytes) -> int:
        objets.append(corps)
        return len(objets) - 1

    ajouter(b"<< /Type /Catalog /Pages 2 0 R >>")
    nombre = len(pages)
    base = 5 if jpeg else 4
    pages_id = [base + 1 + i * 2 for i in range(nombre)]
    contenus_id = [identifiant + 1 for identifiant in pages_id]
    enfants = " ".join(f"{identifiant} 0 R" for identifiant in pages_id)
    ajouter(f"<< /Type /Pages /Kids [{enfants}] /Count {nombre} >>".encode("ascii"))
    ajouter(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    ajouter(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    if jpeg:
        donnees, largeur, hauteur = jpeg
        flux_image = donnees + b"\n"
        entete = (
            f"<< /Type /XObject /Subtype /Image /Width {largeur} /Height {hauteur} "
            f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(flux_image)} >>\n"
            f"stream\n"
        ).encode("ascii") + flux_image + b"endstream"
        ajouter(entete)
    ressources = "<< /Font << /F1 3 0 R /F2 4 0 R >>"
    if jpeg:
        ressources += " /XObject << /Im1 5 0 R >>"
    ressources += " >>"
    for identifiant, contenu in zip(pages_id, pages, strict=True):
        flux = contenu.encode("ascii") + b"\n"
        ajouter(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources {ressources} "
            f"/Contents {identifiant + 1} 0 R >>".encode("ascii")
        )
        ajouter(f"<< /Length {len(flux)} >>\nstream\n".encode("ascii") + flux + b"endstream")
    if len(objets) != contenus_id[-1] + 1:
        raise ErreurPam("Le relevé PDF n'a pas pu être créé.")
    morceaux = [b"%PDF-1.4\n"]
    offsets = [0]
    for numero, corps in enumerate(objets[1:], start=1):
        offsets.append(sum(len(morceau) for morceau in morceaux))
        morceaux.append(f"{numero} 0 obj\n".encode("ascii") + corps + b"\nendobj\n")
    debut_xref = sum(len(morceau) for morceau in morceaux)
    xref = [f"xref\n0 {len(objets)}\n".encode("ascii"), b"0000000000 65535 f \n"]
    xref.extend(f"{offset:010d} 00000 n \n".encode("ascii") for offset in offsets[1:])
    xref.append(
        f"trailer << /Size {len(objets)} /Root 1 0 R >>\nstartxref\n{debut_xref}\n%%EOF\n".encode("ascii")
    )
    return b"".join(morceaux + xref)


def _largeur_pdf(texte: str, taille: int) -> float:
    return len(texte) * taille * 0.52


def rendre_releve_pdf(lignes: list[dict], code: str, debut: str, fin: str) -> bytes:
    """Relevé PER en PDF. L'en-tête reprend celui de la fiche de paie : logo, service, filet indigo."""
    logo = _logo_jpeg()
    operations: list[str] = []
    pages: list[str] = []
    y = 800.0
    periode_pdf = f"Du {date_fr(debut)} au {date_fr(fin)}"

    def entete() -> None:
        nonlocal y
        haut = 800.0
        hauteur_logo = 60.0
        if logo:
            _donnees, largeur, hauteur = logo
            largeur_logo = hauteur_logo * largeur / hauteur
            operations.append(
                f"q {largeur_logo:.2f} 0 0 {hauteur_logo:.2f} 40 {haut - hauteur_logo:.2f} cm /Im1 Do Q"
            )
            x_service = 40 + largeur_logo + 12
        else:
            x_service = 40
        operations.append("0.357 0.396 0.459 rg")
        operations.append(
            f"BT /F1 9 Tf {x_service:.1f} {haut - 28:.1f} Td ({_pdf_literal('Direction des Ressources Humaines')}) Tj ET"
        )
        titre = "RELEVÉ PER"
        operations.append(
            f"BT /F2 9 Tf {555 - _largeur_pdf(titre, 9):.1f} {haut - 22:.1f} Td ({_pdf_literal(titre)}) Tj ET"
        )
        operations.append("0.161 0.086 0.435 rg")
        operations.append(
            f"BT /F2 12 Tf {555 - _largeur_pdf(periode_pdf, 12):.1f} {haut - 42:.1f} Td ({_pdf_literal(periode_pdf)}) Tj ET"
        )
        trait = haut - hauteur_logo - 8
        operations.append(f"q 0.161 0.086 0.435 RG 4 w 40 {trait:.1f} m 555 {trait:.1f} l S Q")
        operations.append("0 0 0 rg")
        y = trait - 22

    def page() -> None:
        nonlocal y
        if operations:
            pages.append("\n".join(operations))
            operations.clear()
        y = 800.0
        entete()

    def assurer(espace: float) -> None:
        nonlocal y
        if y - espace < 48:
            page()

    def texte(x: float, taille: int, contenu: str, gras: bool = False) -> None:
        nonlocal y
        police = "F2" if gras else "F1"
        operations.append(f"BT /{police} {taille} Tf {x:.1f} {y:.1f} Td ({_pdf_literal(contenu)}) Tj ET")

    def paragraphe(contenu: str, taille: int = 11, gras: bool = False) -> None:
        nonlocal y
        for ligne in _couper_pdf(contenu, taille, 515):
            assurer(taille + 4)
            texte(40, taille, ligne, gras)
            y -= taille + 4

    page()
    nom = next((ligne.get("nom") or "" for ligne in lignes if ligne.get("nom")), "")
    paragraphe(f"{nom} · {code}" if nom else code, 11)
    paragraphe(f"Du {date_fr(debut)} au {date_fr(fin)}.")
    paragraphe("Montants en USD.")
    if not lignes:
        paragraphe("Aucune photo PER entre ces deux dates.")
    for ligne in lignes:
        assurer(36)
        paragraphe(str(ligne.get("periode_fr") or ligne.get("periode") or ""), 13, True)
        paragraphe(
            f"Au {ligne.get('date_mise_a_jour') or ''} · balance {ligne.get('montant') or ''} USD"
            f" · intérêt cumulé {ligne.get('interet_cumule') or ''} USD"
        )
        comptes = ligne.get("comptes") or []
        if comptes:
            assurer(16)
            texte(40, 10, "Compte", True)
            operations.append(f"BT /F2 10 Tf 200 {y:.1f} Td ({_pdf_literal('Ouverture')}) Tj ET")
            operations.append(f"BT /F2 10 Tf 320 {y:.1f} Td ({_pdf_literal('Balance')}) Tj ET")
            operations.append(f"BT /F2 10 Tf 430 {y:.1f} Td ({_pdf_literal('Intérêt')}) Tj ET")
            y -= 14
            for compte in comptes:
                assurer(14)
                operations.append(f"BT /F1 10 Tf 40 {y:.1f} Td ({_pdf_literal(str(compte.get('numero') or ''))}) Tj ET")
                operations.append(f"BT /F1 10 Tf 200 {y:.1f} Td ({_pdf_literal(str(compte.get('date_ouverture') or ''))}) Tj ET")
                operations.append(f"BT /F1 10 Tf 320 {y:.1f} Td ({_pdf_literal(str(compte.get('montant') or ''))}) Tj ET")
                operations.append(f"BT /F1 10 Tf 430 {y:.1f} Td ({_pdf_literal(str(compte.get('interet_cumule') or ''))}) Tj ET")
                y -= 14
    y -= 8
    paragraphe("Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines.")
    if operations:
        pages.append("\n".join(operations))
    if not pages:
        pages.append("BT /F1 11 Tf 40 800 Td (Releve PER) Tj ET")
    return _assembler_pdf(pages, logo)


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
        "bonus_accumule": montant_fr(f"{salaire_net(item)[0]:f}"),
        "net": montant_fr(f"{salaire_net(item)[1]:f}"),
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
    poste: str = ""


def salutation(prenom: str) -> str:
    """Prénom affichable. Un nom entièrement en capitales est remis en casse de titre."""
    propre = " ".join(prenom.split())
    if propre.isupper():
        return propre.title()
    return propre


_MODELE_OTP: str | None = None
_MODELE_BULLETIN: str | None = None
_STYLE_BULLETIN: str | None = None
_LOGO_BULLETIN: str | None = None
CODES_BULLETIN = (
    "AA", "AR", "AB", "AC", "AE", "AX", "AF", "AZ", "AS",
    "AJ", "AG", "AH", "AN", "AO", "AI", "AT", "AU", "AW",
    "AP", "AQ", "AY", "BB", "BA", "AK", "AL", "AM", "AV",
)


def _lire_fichier_modele(nom: str) -> str:
    ici = Path(__file__).resolve().parent
    for chemin in (ici / nom, ici.parent / nom):
        if chemin.is_file():
            return chemin.read_text(encoding="utf-8")
    return ""


def _lire_modele_otp() -> str:
    global _MODELE_OTP
    if _MODELE_OTP is not None:
        return _MODELE_OTP
    texte = _lire_fichier_modele("pam_otp_email.html")
    if not texte:
        raise ErreurPam("Le courriel n'a pas pu être envoyé. Contactez la DIT.")
    _MODELE_OTP = texte
    return _MODELE_OTP


def montant_bulletin(valeur: str) -> str:
    """Montant du modèle de bulletin : espace insécable pour les milliers."""
    return escape(montant_fr(valeur).replace(".", "\u00a0"))


def _style_bulletin() -> str:
    global _STYLE_BULLETIN
    if _STYLE_BULLETIN is None:
        lignes = [
            ligne
            for ligne in _lire_fichier_modele("payslip.css").splitlines()
            if "fonts.googleapis.com" not in ligne and not ligne.strip().startswith("@import")
        ]
        _STYLE_BULLETIN = "\n".join(lignes)
    return _STYLE_BULLETIN


def _logo_bulletin() -> str:
    global _LOGO_BULLETIN
    if _LOGO_BULLETIN is not None:
        return _LOGO_BULLETIN
    import base64

    ici = Path(__file__).resolve().parent
    for chemin in (ici / "logo_acme.jpg", ici / "logo-acme.jpg", ici.parent / "logo_acme.jpg"):
        if chemin.is_file():
            _LOGO_BULLETIN = "data:image/jpeg;base64," + base64.b64encode(chemin.read_bytes()).decode("ascii")
            return _LOGO_BULLETIN
    _LOGO_BULLETIN = ""
    return _LOGO_BULLETIN


def _formule_net(bulletin: dict) -> str:
    if bonus_accumule(bulletin) > 0:
        return "Total des gains − bonus accumulé − total des retenues"
    return "Total des gains − total des retenues"


def _mention_bonus(bulletin: dict) -> str:
    bonus, _net = salaire_net(bulletin)
    if bonus <= 0:
        return ""
    montant = montant_bulletin(f"{bonus:f}")
    return f"Le montant {montant} HTG est hors du salaire net et est payé en décembre de l'année en cours."


def rendre_bulletin_html(bulletin: dict, code: str) -> str:
    """Bulletin rempli à partir de payslip.html et payslip.css."""
    global _MODELE_BULLETIN
    if _MODELE_BULLETIN is None:
        _MODELE_BULLETIN = _lire_fichier_modele("payslip.html")
    if not _MODELE_BULLETIN or not _style_bulletin():
        raise ErreurPam(MESSAGE_BULLETIN)
    montants = {
        str(ligne.get("code") or ""): str(ligne.get("montant") or "0")
        for ligne in bulletin.get("lignes") or []
    }
    periode = periode_fr(str(bulletin.get("periode") or ""))
    valeurs = {
        "PERIODE": escape(periode[:1].upper() + periode[1:] if periode else ""),
        "MATRICULE": escape(code),
        "NOM_COMPLET": escape(str(bulletin.get("nom") or "")),
        "DATE_PAIE": escape(date_fr(str(bulletin.get("date_paie") or ""))),
        "POSTE": "—",
        "AFFECTATION": "—",
        "TOTAL_GAINS": montant_bulletin(str(bulletin.get("gains") or "0")),
        "TOTAL_RETENUES": montant_bulletin(str(bulletin.get("retenues") or "0")),
        "NET_A_PAYER": montant_bulletin(f"{salaire_net(bulletin)[1]:f}"),
        "NET_FORMULE": escape(_formule_net(bulletin)),
        "MENTION_BONUS": _mention_bonus(bulletin),
    }
    for rubrique in CODES_BULLETIN:
        valeurs[rubrique] = montant_bulletin(montants.get(rubrique, "0"))
    html = re.sub(r"<!--.*?-->", "", _MODELE_BULLETIN, count=1, flags=re.DOTALL)
    html = html.replace(
        '<link rel="stylesheet" href="payslip.css">',
        "<style>\n" + _style_bulletin() + "\n</style>",
        1,
    )
    logo = _logo_bulletin()
    if logo:
        html = html.replace('src="logo-acme.jpg"', f'src="{logo}"', 1)
    for cle, valeur in valeurs.items():
        html = html.replace("{{" + cle + "}}", valeur)
    return html


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
            poste=(ligne.get("position") or "").strip(),
        )
    return profils


class Courriel(Protocol):
    def envoyer(self, destinataire: str, sujet: str, corps: str, html: str = "") -> None: ...


def rendre_courriel_alerte(prenom: str, message: str, annee: int) -> tuple[str, str]:
    """Texte brut et HTML d'un avis, dans la même présentation que le courriel du code."""
    nom = salutation(prenom)
    appel = f"Bonjour {nom}," if nom else "Bonjour,"
    appel_html = f"Bonjour {escape(nom)}," if nom else "Bonjour,"
    propre = " ".join(message.split())
    modele = _lire_fichier_modele("pam_alerte_email.html")
    html = ""
    if modele:
        html = (
            modele.replace("{{SALUTATION}}", appel_html)
            .replace("{{MESSAGE}}", escape(propre))
            .replace("{{APERCU}}", escape(propre))
            .replace("{{ANNEE}}", str(annee))
        )
    return f"{appel}\n\n{propre}\n", html


def alerter(courriel: Courriel, destinataire: str, corps: str, prenom: str = "", annee: int = 0) -> None:
    """Avertissement. Un échec d'envoi ne change pas la réponse montrée à l'employé."""
    try:
        texte, html = rendre_courriel_alerte(prenom, corps, annee or datetime.now().year)
        courriel.envoyer(destinataire, "ACME SA — PAM", texte, html)
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
                alerter(
                    self.courriel,
                    suivi.courriel,
                    "Votre adresse du profil RH a changé. Le nouveau contact ne recevra pas de code pendant 72 heures. "
                    "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH.",
                    profil.prenom,
                    maintenant.year,
                )
            suivi.empreinte_courriel = empreinte_courriel
            suivi.courriel = profil.courriel
            suivi.gele_courriel = maintenant + DUREE_GEL
        if suivi.empreinte_telephone != empreinte_telephone:
            if _EMAIL.match(suivi.courriel):
                alerter(
                    self.courriel,
                    suivi.courriel,
                    "Votre numéro du profil RH a changé. L'ancien numéro ne sert plus à recevoir de code. "
                    "Si vous n'êtes pas à l'origine de ce changement, contactez la DRH.",
                    profil.prenom,
                    maintenant.year,
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
    drh: bool = False
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
        drh: set[str] | None = None,
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
        self.drh = {adresse.strip().lower() for adresse in (drh or set()) if adresse.strip()}

    def _noter(self, resultat: str, canal: str, ip: str, qui: str, cible: str = "") -> None:
        ligne = {
            "quand": self.maintenant().isoformat(timespec="seconds"),
            "qui": empreinte(qui, self.secret)[:16],
            "canal": canal,
            "resultat": resultat,
            "ip": ip,
        }
        if cible:
            ligne["cible"] = empreinte(cible, self.secret)[:16]
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
            alerter(
                self.courriel,
                profil.courriel,
                "Des essais de consultation ont été refusés. Si vous n'êtes pas à l'origine de ces essais, contactez la DRH.",
                profil.prenom,
                instant.year,
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
                profil.prenom,
                self.maintenant().year,
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
        drh = self._est_drh(session.code)
        if balance is None and not releve and not bulletins:
            return Demande(etape="balance", message=MESSAGE_ABSENTE, balance=None, drh=drh)
        self._noter("lecture", "", "", session.code)
        return Demande(etape="balance", balance=balance, releve=releve, bulletins=bulletins, drh=drh)

    def _est_drh(self, code: str) -> bool:
        profil = self.profils.get(code)
        if profil is None or not profil.actif:
            return False
        if profil.courriel.strip().lower() in self.drh:
            return True
        poste = "".join(
            caractere for caractere in unicodedata.normalize("NFD", profil.poste) if unicodedata.category(caractere) != "Mn"
        ).lower()
        return "drh" in poste or ("ressource" in poste and "humain" in poste)

    def main_levee(self, jeton: str, code_cible: str, ip: str) -> Demande:
        """Lève le gel de 72 heures d'un employé. Réservé à une session DRH."""
        self._charger_session(jeton)
        session = self.sessions.get(jeton)
        if session is None or self.maintenant() > session.expire:
            raise ErreurPam(MESSAGE_INCORRECT)
        if not self._est_drh(session.code):
            self._noter("main_levee_refusee", "", ip, session.code)
            raise ErreurPam("Cette action est réservée à la DRH.")
        code = normaliser_code(code_cible)
        if not _CODE.fullmatch(code):
            raise ErreurPam("Code employé illisible.")
        profil = self.profils.get(code)
        if profil is None or not profil.actif:
            raise ErreurPam("Aucun employé actif pour ce code.")
        self._charger_contact(code)
        suivi = self.contacts._suivis.get(code)
        gele_courriel = bool(suivi and suivi.gele_courriel and suivi.gele_courriel > self.maintenant())
        gele_telephone = bool(suivi and suivi.gele_telephone and suivi.gele_telephone > self.maintenant())
        if not gele_courriel and not gele_telephone:
            if not _EMAIL.match(profil.courriel):
                raise ErreurPam("Aucun gel en cours, et ce dossier n'a pas d'adresse de courriel utilisable.")
            raise ErreurPam("Aucun gel en cours pour ce code.")
        assert suivi is not None
        suivi.gele_courriel = None
        suivi.gele_telephone = None
        self._sauver_contact(code)
        self._noter("main_levee", "drh", ip, session.code, code)
        if _EMAIL.match(profil.courriel):
            alerter(
                self.courriel,
                profil.courriel,
                "La DRH a levé le gel de votre accès à PAM. Vous pouvez demander un code de vérification.",
                profil.prenom,
                self.maintenant().year,
            )
            return Demande(etape="main-levee", message="Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier.")
        return Demande(
            etape="main-levee",
            message="Gel levé. Ce dossier n'a toujours pas d'adresse de courriel utilisable.",
        )

    def fiche(self, jeton: str, periode: str) -> str:
        """Bulletin HTML du modèle standard, limité à la session."""
        self._charger_session(jeton)
        session = self.sessions.get(jeton)
        if session is None or self.maintenant() > session.expire:
            raise ErreurPam(MESSAGE_INCORRECT)
        if not re.fullmatch(r"\d{4}-\d{2}", periode or ""):
            raise ErreurPam(MESSAGE_BULLETIN)
        document = self.bulletins.get(session.code) or {}
        choisi = next(
            (item for item in document.get("bulletins") or [] if item.get("periode") == periode),
            None,
        )
        if choisi is None:
            raise ErreurPam(MESSAGE_BULLETIN)
        self._noter("fiche", "", "", session.code)
        return rendre_bulletin_html(choisi, session.code)

    def releve_html(self, jeton: str, debut: str, fin: str) -> str:
        """Relevé PER imprimable, limité aux photos de la session dans l'intervalle."""
        self._charger_session(jeton)
        session = self.sessions.get(jeton)
        if session is None or self.maintenant() > session.expire:
            raise ErreurPam(MESSAGE_INCORRECT)
        debut_iso = _jour_iso(debut)
        fin_iso = _jour_iso(fin)
        lignes = filtrer_releve(releve_per(self.balances.get(session.code)), debut_iso, fin_iso)
        self._noter("releve", "", "", session.code)
        return rendre_releve_html(lignes, session.code, debut_iso, fin_iso)

    def releve_pdf(self, jeton: str, debut: str, fin: str) -> bytes:
        """Même relevé, en fichier PDF."""
        self._charger_session(jeton)
        session = self.sessions.get(jeton)
        if session is None or self.maintenant() > session.expire:
            raise ErreurPam(MESSAGE_INCORRECT)
        debut_iso = _jour_iso(debut)
        fin_iso = _jour_iso(fin)
        lignes = filtrer_releve(releve_per(self.balances.get(session.code)), debut_iso, fin_iso)
        self._noter("releve", "", "", session.code)
        return rendre_releve_pdf(lignes, session.code, debut_iso, fin_iso)

    def sortir(self, jeton: str) -> None:
        self.sessions.pop(jeton, None)
        if self.depot is not None:
            self.depot.effacer_session(jeton)
