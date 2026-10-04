"""US-13 — Détection du type de fichier par l'extension et la signature binaire (T-13.1)."""

import pytest

from app.document.domain.errors import UnsupportedFileType
from app.document.domain.files import FileKind, detect_file_kind

PDF = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj"
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00"
PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
DOCX = b"PK\x03\x04\x14\x00\x06\x00"  # archive ZIP (format Office)
EXE = b"MZ\x90\x00\x03\x00\x00\x00"


@pytest.mark.parametrize(
    ("filename", "head", "kind"),
    [
        ("diplome.pdf", PDF, FileKind.PDF),
        ("DIPLOME.PDF", PDF, FileKind.PDF),
        ("photo.jpg", JPEG, FileKind.JPEG),
        ("photo.jpeg", JPEG, FileKind.JPEG),
        ("photo.JPG", JPEG, FileKind.JPEG),
        ("scan.png", PNG, FileKind.PNG),
    ],
)
def test_accepted_files(filename, head, kind):
    assert detect_file_kind(filename, head) == kind


def test_kinds_have_their_content_type_and_extension():
    assert (FileKind.PDF.content_type, FileKind.PDF.extension) == ("application/pdf", ".pdf")
    assert (FileKind.JPEG.content_type, FileKind.JPEG.extension) == ("image/jpeg", ".jpg")
    assert (FileKind.PNG.content_type, FileKind.PNG.extension) == ("image/png", ".png")


@pytest.mark.parametrize(
    ("filename", "head"),
    [
        ("cv.docx", DOCX),  # format refusé
        ("virus.pdf", EXE),  # .exe renommé en .pdf
        ("faux.pdf", DOCX),
        ("photo.png", JPEG),  # extension et contenu incohérents
        ("photo.jpg", PNG),
        ("sans-extension", PDF),
        ("vide.pdf", b""),
        ("archive.pdf.exe", PDF),
    ],
)
def test_refused_files(filename, head):
    with pytest.raises(UnsupportedFileType) as error:
        detect_file_kind(filename, head)
    assert error.value.code == "UNSUPPORTED_FILE_TYPE"
    assert error.value.message == "Format non accepté. Utilisez un PDF, JPG ou PNG."
