"""Fiche de paie PDF, polices standard, logo JPEG embarqué. Aucune dépendance native."""

from __future__ import annotations

from pathlib import Path

NAVY = (9 / 255, 36 / 255, 95 / 255)
BLEU = (11 / 255, 86 / 255, 183 / 255)
GRIS = (71 / 255, 85 / 255, 105 / 255)
ENCRE = (31 / 255, 42 / 255, 68 / 255)
FOND = (238 / 255, 243 / 255, 251 / 255)


def chemin_logo() -> Path | None:
    ici = Path(__file__).resolve().parent
    for chemin in (ici / "logo_acme.jpg", ici.parent / "logo_acme.jpg"):
        if chemin.is_file():
            return chemin
    return None


def taille_jpeg(donnees: bytes) -> tuple[int, int]:
    if donnees[:2] != b"\xff\xd8":
        raise ValueError("logo")
    index = 2
    while index + 8 < len(donnees):
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
    raise ValueError("logo")


def _chaine(valeur: str) -> str:
    propre = valeur.encode("cp1252", errors="replace").decode("cp1252")
    return propre.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class _Page:
    def __init__(self) -> None:
        self.ops: list[str] = []

    def rect(self, x: float, y: float, w: float, h: float, couleur: tuple[float, float, float]) -> None:
        r, g, b = couleur
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re f")

    def ligne(self, x1: float, y: float, x2: float) -> None:
        self.ops.append(f"0.85 G {x1:.2f} {y:.2f} m {x2:.2f} {y:.2f} l S")

    def texte(self, x: float, y: float, valeur: str, taille: int = 10, gras: bool = False, couleur: tuple[float, float, float] = ENCRE) -> None:
        r, g, b = couleur
        police = "F2" if gras else "F1"
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg BT /{police} {taille} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({_chaine(valeur)}) Tj ET")

    def image(self, x: float, y: float, w: float, h: float) -> None:
        self.ops.append(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm /Im1 Do Q")

    def flux(self) -> bytes:
        return "\n".join(self.ops).encode("latin-1", errors="replace")


def _assembler(objets: list[bytes]) -> bytes:
    sortie = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for numero, corps in enumerate(objets, start=1):
        offsets.append(len(sortie))
        sortie.extend(f"{numero} 0 obj\n".encode("ascii"))
        sortie.extend(corps)
        sortie.extend(b"\nendobj\n")
    xref = len(sortie)
    sortie.extend(f"xref\n0 {len(objets) + 1}\n".encode("ascii"))
    sortie.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        sortie.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    sortie.extend(
        f"trailer << /Size {len(objets) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii")
    )
    return bytes(sortie)


def construire(bulletin: dict, logo: bytes | None = None) -> bytes:
    """PDF d'une fiche. Le bulletin est déjà limité à l'employé de la session."""
    pages: list[_Page] = []
    page = _Page()
    pages.append(page)
    y = 800.0

    def suite() -> None:
        nonlocal page, y
        page = _Page()
        pages.append(page)
        page.texte(40, 810, "ACME SA — Fiche de paie (suite)", 9, True, NAVY)
        y = 786.0

    def assurer(hauteur: float) -> None:
        nonlocal y
        if y - hauteur < 56:
            suite()

    if logo:
        largeur, hauteur = taille_jpeg(logo)
        haut = 58.0
        large = haut * largeur / hauteur
        page.image(40, 748, large, haut)
        page.texte(40 + large + 16, 786, "ACME SA", 16, True, NAVY)
        page.texte(40 + large + 16, 766, "Fiche de paie", 13, True, BLEU)
    else:
        page.texte(40, 790, "ACME SA", 16, True, NAVY)
        page.texte(40, 770, "Fiche de paie", 13, True, BLEU)
    y = 730.0
    page.ligne(40, y, 555)
    y -= 22
    for libelle, valeur in (
        ("Nom", bulletin.get("nom") or ""),
        ("Code employé", bulletin.get("code_employe") or ""),
        ("Période", bulletin.get("periode_fr") or bulletin.get("periode") or ""),
        ("Date de paie", bulletin.get("date_paie") or ""),
    ):
        page.texte(40, y, libelle, 10, True, GRIS)
        page.texte(160, y, str(valeur), 11, True)
        y -= 16
    y -= 8

    def titre(texte: str) -> None:
        nonlocal y
        assurer(28)
        page.rect(40, y - 4, 515, 18, FOND)
        page.texte(46, y, texte, 10, True, NAVY)
        y -= 22

    def ligne_montant(libelle: str, montant: str, gras: bool = False) -> None:
        nonlocal y
        assurer(16)
        page.texte(46, y, libelle, 10, gras)
        page.texte(460, y, montant, 10, gras)
        y -= 15

    for nature, titre_nature in (("gain", "Gains"), ("retenue", "Retenues")):
        lignes = [ligne for ligne in bulletin.get("lignes") or [] if ligne.get("nature") == nature]
        if not lignes:
            continue
        titre(titre_nature)
        for ligne in lignes:
            ligne_montant(str(ligne.get("libelle") or ligne.get("code") or ""), str(ligne.get("montant") or ""))
    y -= 6
    assurer(36)
    page.rect(40, y - 6, 515, 22, NAVY)
    page.texte(46, y, "Net à payer", 12, True, (1, 1, 1))
    page.texte(460, y, str(bulletin.get("total") or ""), 12, True, (1, 1, 1))
    y -= 32
    employeur = [ligne for ligne in bulletin.get("lignes") or [] if ligne.get("nature") == "employeur"]
    if employeur:
        titre("Charges employeur — pour information")
        for ligne in employeur:
            ligne_montant(str(ligne.get("libelle") or ""), str(ligne.get("montant") or ""))
        ligne_montant("Total des charges employeur", str(bulletin.get("charges_employeur") or ""), True)
    for morceau in pages:
        morceau.texte(40, 36, "Document personnel. ACME SA. Ne le transmettez pas.", 8, False, GRIS)

    logo_obj = b""
    if logo:
        largeur, hauteur = taille_jpeg(logo)
        logo_obj = (
            f"<< /Type /XObject /Subtype /Image /Width {largeur} /Height {hauteur} "
            f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {len(logo)} >>\nstream\n".encode("ascii")
            + logo
            + b"\nendstream"
        )
    polices = [
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ]
    contenus = [page.flux() for page in pages]
    # 1 catalog, 2 pages, 3 F1, 4 F2, puis image éventuelle, puis page/contenu par feuille
    numero_image = 5 if logo else 0
    premier_page = 6 if logo else 5
    enfants = []
    objets: list[bytes] = [b"", b"", polices[0], polices[1]]
    if logo:
        objets.append(logo_obj)
    for index, flux in enumerate(contenus):
        numero_page = premier_page + index * 2
        numero_flux = numero_page + 1
        enfants.append(f"{numero_page} 0 R")
        xobject = f"/XObject << /Im1 {numero_image} 0 R >>" if logo else ""
        objets.append(
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents {numero_flux} 0 R "
                f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> {xobject} >> >>"
            ).encode("ascii")
        )
        objets.append(f"<< /Length {len(flux)} >>\nstream\n".encode("ascii") + flux + b"\nendstream")
    objets[1] = f"<< /Type /Pages /Count {len(pages)} /Kids [{' '.join(enfants)}] >>".encode("ascii")
    objets[0] = b"<< /Type /Catalog /Pages 2 0 R >>"
    return _assembler(objets)
