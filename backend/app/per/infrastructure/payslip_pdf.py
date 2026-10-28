"""US-1021 : la fiche de paie en PDF, reprise de `pam/pam/plateforme/fiche_paie.py` (module du directeur), à nos couleurs.

PDF 1.4 écrit à la main : polices standard (Helvetica), logo JPEG embarqué, aucune bibliothèque (rien à ajouter au
paquet Lambda). Format A4 ; une fiche trop longue continue sur une page « (suite) ».
"""

from pathlib import Path

from app.per.domain.payslip_sheet import PayslipSheet

LOGO = Path(__file__).resolve().parent / "logo_acme.jpg"

# Jetons de frontend/src/index.css
PRIMARY = (30 / 255, 30 / 255, 130 / 255)  # --color-primary #1e1e82
PRIMARY_ACTIVE = (6 / 255, 0, 104 / 255)  # --color-primary-active #060068
HELP = (70 / 255, 70 / 255, 82 / 255)  # --color-help #464652
HEADING = (17 / 255, 28 / 255, 45 / 255)  # --color-heading #111c2d
INFO_BG = (231 / 255, 238 / 255, 1)  # --color-info-bg #e7eeff
WHITE = (1, 1, 1)

LEFT, RIGHT, AMOUNT_X, BOTTOM = 40.0, 555.0, 460.0, 56.0


def jpeg_size(data: bytes) -> tuple[int, int]:
    """Largeur et hauteur lues dans l'en-tête SOF du JPEG (`taille_jpeg` du directeur)."""
    if data[:2] != b"\xff\xd8":
        raise ValueError("logo")
    index = 2
    while index + 8 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        if marker in {0xC0, 0xC1, 0xC2}:
            height = int.from_bytes(data[index + 5 : index + 7], "big")
            width = int.from_bytes(data[index + 7 : index + 9], "big")
            return width, height
        if marker in {0xD8, 0xD9, 0x01} or 0xD0 <= marker <= 0xD7:
            index += 2
            continue
        index += 2 + int.from_bytes(data[index + 2 : index + 4], "big")
    raise ValueError("logo")


def _string(value: str) -> str:
    clean = value.encode("cp1252", errors="replace").decode("cp1252")
    return clean.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


class _Page:
    def __init__(self) -> None:
        self.ops: list[str] = []

    def rect(self, x: float, y: float, w: float, h: float, color: tuple[float, float, float]) -> None:
        r, g, b = color
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg {x:.2f} {y:.2f} {w:.2f} {h:.2f} re f")

    def line(self, x1: float, y: float, x2: float) -> None:
        self.ops.append(f"0.85 G {x1:.2f} {y:.2f} m {x2:.2f} {y:.2f} l S")

    def text(self, x: float, y: float, value: str, size: int = 10, bold: bool = False, color=HEADING) -> None:
        r, g, b = color
        font = "F2" if bold else "F1"
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg BT /{font} {size} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({_string(value)}) Tj ET")

    def image(self, x: float, y: float, w: float, h: float) -> None:
        self.ops.append(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm /Im1 Do Q")

    def stream(self) -> bytes:
        # cp1252 = WinAnsiEncoding des polices : « é », « à », « — » s'affichent tels quels
        return "\n".join(self.ops).encode("cp1252", errors="replace")


def _assemble(objects: list[bytes]) -> bytes:
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{number} 0 obj\n".encode("ascii") + body + b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets:
        out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    out.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii"))
    return bytes(out)


class PdfPayslipRenderer:
    """Adaptateur du port `PayslipRenderer`."""

    def __init__(self, logo: bytes | None) -> None:
        self._logo = logo

    @classmethod
    def with_acme_logo(cls) -> "PdfPayslipRenderer":
        return cls(LOGO.read_bytes() if LOGO.is_file() else None)

    def render(self, sheet: PayslipSheet) -> bytes:
        pages = [_Page()]
        y = 800.0

        def page() -> _Page:
            return pages[-1]

        def ensure(height: float) -> None:
            nonlocal y
            if y - height < BOTTOM:
                pages.append(_Page())
                page().text(LEFT, 810, "ACME SA — Fiche de paie (suite)", 9, True, PRIMARY)
                y = 786.0

        title_x = LEFT
        if self._logo:
            width, height = jpeg_size(self._logo)
            logo_height = 58.0
            logo_width = logo_height * width / height
            page().image(LEFT, 748, logo_width, logo_height)
            title_x = LEFT + logo_width + 16
        page().text(title_x, 786, "ACME SA", 16, True, PRIMARY_ACTIVE)
        page().text(title_x, 766, "Fiche de paie", 13, True, PRIMARY)
        y = 730.0
        page().line(LEFT, y, RIGHT)
        y -= 22
        for label, value in (
            ("Nom", sheet.name),
            ("Code employé", sheet.employee_code),
            ("Période", sheet.period_label),
            ("Date de paie", sheet.paid_on),
        ):
            page().text(LEFT, y, label, 10, True, HELP)
            page().text(160, y, value, 11, True)
            y -= 16
        y -= 8

        def section(title: str) -> None:
            nonlocal y
            ensure(28)
            page().rect(LEFT, y - 4, RIGHT - LEFT, 18, INFO_BG)
            page().text(LEFT + 6, y, title, 10, True, PRIMARY)
            y -= 22

        def amount_line(label: str, amount: str, bold: bool = False) -> None:
            nonlocal y
            ensure(16)
            page().text(LEFT + 6, y, label, 10, bold)
            page().text(AMOUNT_X, y, amount, 10, bold)
            y -= 15

        for title, lines in (("Gains", sheet.earnings), ("Retenues", sheet.deductions)):
            if lines:
                section(title)
                for line in lines:
                    amount_line(line.label, line.amount)
                y -= 6  # la dernière ligne ne touche pas le bandeau suivant
        y -= 6
        ensure(36)
        page().rect(LEFT, y - 6, RIGHT - LEFT, 22, PRIMARY)
        page().text(LEFT + 6, y, "Net à payer", 12, True, WHITE)
        page().text(AMOUNT_X, y, sheet.net, 12, True, WHITE)
        y -= 32
        if sheet.employer:
            section("Charges employeur — pour information")
            for line in sheet.employer:
                amount_line(line.label, line.amount)
            amount_line("Total des charges employeur", sheet.employer_total, True)
        for each in pages:
            each.text(LEFT, 36, "Document personnel. ACME SA. Ne le transmettez pas.", 8, False, HELP)
        return self._pdf([each.stream() for each in pages])

    def _pdf(self, streams: list[bytes]) -> bytes:
        # 1 catalogue, 2 pages, 3 et 4 polices, 5 logo éventuel, puis une page et son contenu par feuille
        objects: list[bytes] = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        ]
        resources = "/Font << /F1 3 0 R /F2 4 0 R >>"
        if self._logo:
            width, height = jpeg_size(self._logo)
            objects.append(
                f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceRGB "
                f"/BitsPerComponent 8 /Filter /DCTDecode /Length {len(self._logo)} >>\nstream\n".encode("ascii")
                + self._logo
                + b"\nendstream"
            )
            resources += " /XObject << /Im1 5 0 R >>"
        kids = []
        for stream in streams:
            page_number = len(objects) + 1
            kids.append(f"{page_number} 0 R")
            objects.append(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents {page_number + 1} 0 R "
                f"/Resources << {resources} >> >>".encode("ascii")
            )
            objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode("ascii") + stream + b"\nendstream")
        objects[1] = f"<< /Type /Pages /Count {len(kids)} /Kids [{' '.join(kids)}] >>".encode("ascii")
        return _assemble(objects)
