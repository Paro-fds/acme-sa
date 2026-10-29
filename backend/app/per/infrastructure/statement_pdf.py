"""US-1024 : le relevé PER en PDF, comme `rendre_releve_pdf` du directeur (version du 2026-10-29).

PDF 1.4 écrit à la main : polices standard Helvetica, logo JPEG, aucune bibliothèque (rien à ajouter au paquet
Lambda). L'en-tête reprend celui de la fiche de paie et revient sur chaque page : logo, « Direction des Ressources
Humaines », « RELEVÉ PER » et la période à droite, filet indigo `#29166f`. Montants en USD.
"""

import unicodedata
from pathlib import Path

from app.per.domain.statement_period import StatementSheet

LOGO = Path(__file__).resolve().parent / "logo_acme.jpg"

INDIGO = (41 / 255, 22 / 255, 111 / 255)  # #29166f, filet et période (payslip.css --accent)
MUTED = (91 / 255, 101 / 255, 117 / 255)  # #5b6575 (payslip.css --muted)
INK = (31 / 255, 42 / 255, 68 / 255)

LEFT, RIGHT, TOP, BOTTOM = 40.0, 555.0, 800.0, 48.0
LOGO_HEIGHT = 60.0
COLUMNS = (("Compte", 40.0), ("Ouverture", 200.0), ("Balance", 320.0), ("Intérêt", 430.0))

# Largeurs des caractères (1/1000 du corps), métriques Adobe de Helvetica et Helvetica-Bold, de « » à « ~ »
_ASCII = "".join(chr(c) for c in range(32, 127))
_REGULAR = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556,
    556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667,
    556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556,
    556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722,
    500, 500, 500, 334, 260, 334, 584,
]
_BOLD = [
    278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556,
    556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722,
    611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556,
    611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778,
    556, 556, 500, 389, 280, 389, 584,
]
_EXTRA = {"–": 556, "—": 1000, "…": 1000, "\xb7": 278, "\xa0": 278, "’": 278}
WIDTHS = {False: dict(zip(_ASCII, _REGULAR)), True: dict(zip(_ASCII, _BOLD))}


def text_width(value: str, size: float, bold: bool = False) -> float:
    table = WIDTHS[bold]
    total = 0
    for char in value:
        if char in _EXTRA:
            total += _EXTRA[char]
        else:  # une lettre accentuée a la largeur de sa lettre de base (« é » = « e »)
            total += table.get(char, table.get(unicodedata.normalize("NFD", char)[:1], 556))
    return total * size / 1000


def wrap(value: str, size: float, width: float, bold: bool = False) -> list[str]:
    """Coupe un paragraphe en lignes qui tiennent dans la largeur (`_couper_pdf` du directeur)."""
    lines, current = [], ""
    for word in value.split():
        candidate = f"{current} {word}".strip()
        if current and text_width(candidate, size, bold) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    return [*lines, current] if current else lines


def jpeg_size(data: bytes) -> tuple[int, int]:
    """Largeur et hauteur lues dans l'en-tête SOF du JPEG (`_jpeg_dimensions` du directeur)."""
    if data[:2] != b"\xff\xd8":
        raise ValueError("logo")
    index = 2
    while index + 8 < len(data):
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        if marker in {0xC0, 0xC1, 0xC2}:
            return int.from_bytes(data[index + 7 : index + 9], "big"), int.from_bytes(data[index + 5 : index + 7], "big")
        if marker in {0xD8, 0xD9, 0x01} or 0xD0 <= marker <= 0xD7:
            index += 2
            continue
        index += 2 + int.from_bytes(data[index + 2 : index + 4], "big")
    raise ValueError("logo")


def _string(value: str) -> str:
    clean = value.encode("cp1252", errors="replace").decode("cp1252")
    return clean.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _capitalize(text: str) -> str:
    return text[:1].upper() + text[1:]


class _Writer:
    """Pages du relevé : chaque nouvelle page commence par l'en-tête."""

    def __init__(self, logo: bytes | None, period: str) -> None:
        self.logo = logo
        self.period = period
        self.pages: list[list[str]] = []
        self.y = TOP
        self.new_page()

    @property
    def ops(self) -> list[str]:
        return self.pages[-1]

    def text(self, x: float, y: float, value: str, size: float, bold=False, color=INK, right=False) -> None:
        if right:
            x -= text_width(value, size, bold)
        r, g, b = color
        font = "F2" if bold else "F1"
        self.ops.append(f"{r:.3f} {g:.3f} {b:.3f} rg BT /{font} {size} Tf {x:.2f} {y:.2f} Td ({_string(value)}) Tj ET")

    def new_page(self) -> None:
        self.pages.append([])
        service_x = LEFT
        if self.logo:
            width, height = jpeg_size(self.logo)
            logo_width = LOGO_HEIGHT * width / height
            self.ops.append(f"q {logo_width:.2f} 0 0 {LOGO_HEIGHT:.2f} {LEFT:.2f} {TOP - LOGO_HEIGHT:.2f} cm /Im1 Do Q")
            service_x = LEFT + logo_width + 12
        self.text(service_x, TOP - 28, "Direction des Ressources Humaines", 9, color=MUTED)
        self.text(RIGHT, TOP - 22, "RELEVÉ PER", 9, True, MUTED, right=True)
        self.text(RIGHT, TOP - 42, self.period, 12, True, INDIGO, right=True)
        rule = TOP - LOGO_HEIGHT - 8
        self.ops.append(f"q {INDIGO[0]:.3f} {INDIGO[1]:.3f} {INDIGO[2]:.3f} RG 4 w {LEFT} {rule:.1f} m {RIGHT} {rule:.1f} l S Q")
        self.y = rule - 22

    def ensure(self, room: float) -> None:
        if self.y - room < BOTTOM:
            self.new_page()

    def paragraph(self, value: str, size: float = 11, bold: bool = False) -> None:
        for line in wrap(value, size, RIGHT - LEFT, bold):
            self.ensure(size + 4)
            self.text(LEFT, self.y, line, size, bold)
            self.y -= size + 4

    def row(self, values: tuple[str, ...], bold: bool = False) -> None:
        self.ensure(14)
        for (_, x), value in zip(COLUMNS, values, strict=True):
            self.text(x, self.y, value, 10, bold)
        self.y -= 14


class PdfStatementRenderer:
    """Adaptateur du port `StatementRenderer`."""

    def __init__(self, logo: bytes | None) -> None:
        self._logo = logo

    @classmethod
    def with_acme_logo(cls) -> "PdfStatementRenderer":
        return cls(LOGO.read_bytes() if LOGO.is_file() else None)

    def render(self, sheet: StatementSheet) -> bytes:
        page = _Writer(self._logo, sheet.period_label)
        page.paragraph(f"{sheet.name} · {sheet.employee_code}" if sheet.name else sheet.employee_code)
        page.paragraph(f"{sheet.period_label}.")
        page.paragraph("Montants en USD.")
        if not sheet.photos:
            page.paragraph("Aucune photo PER entre ces deux dates.")
        for photo in sheet.photos:
            page.y -= 6  # un mois ne colle pas au tableau du mois précédent
            page.ensure(36)
            page.paragraph(_capitalize(photo.period_label or photo.period), 13, True)
            page.paragraph(f"Au {photo.updated_on} · balance {photo.amount} USD · intérêt cumulé {photo.interest} USD")
            if photo.accounts:
                page.row(tuple(label for label, _ in COLUMNS), bold=True)
                for account in photo.accounts:
                    page.row((account.number, account.opened_on, account.amount, account.interest))
        page.y -= 8
        page.paragraph("Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines.")
        return self._pdf(["\n".join(ops).encode("cp1252", errors="replace") for ops in page.pages])

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
            number = len(objects) + 1
            kids.append(f"{number} 0 R")
            objects.append(
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents {number + 1} 0 R "
                f"/Resources << {resources} >> >>".encode("ascii")
            )
            objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode("ascii") + stream + b"\nendstream")
        objects[1] = f"<< /Type /Pages /Count {len(kids)} /Kids [{' '.join(kids)}] >>".encode("ascii")
        out = bytearray(b"%PDF-1.4\n")
        offsets = []
        for index, body in enumerate(objects, start=1):
            offsets.append(len(out))
            out.extend(f"{index} 0 obj\n".encode("ascii") + body + b"\nendobj\n")
        xref = len(out)
        out.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
        for offset in offsets:
            out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
        out.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii"))
        return bytes(out)
