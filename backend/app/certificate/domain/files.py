"""US-301 CA-01 : PDF, JPG ou PNG, reconnus sur le contenu réel du fichier (RG-20), jamais sur son nom."""

from app.certificate.domain.errors import UnsupportedCertificateFile

SIGNATURES = {
    "application/pdf": (b"%PDF-",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
}
ACCEPTED_TYPES = tuple(SIGNATURES)
SIGNATURE_LENGTH = 8
"""Octets lus en tête du fichier pour reconnaître sa signature."""

EXTENSIONS = {"application/pdf": ".pdf", "image/jpeg": ".jpg", "image/png": ".png"}


def detect_kind(head: bytes) -> str:
    """Type réel du fichier ; UnsupportedCertificateFile si ce n'est ni un PDF, ni un JPG, ni un PNG."""
    for content_type, signatures in SIGNATURES.items():
        if any(head.startswith(signature) for signature in signatures):
            return content_type
    raise UnsupportedCertificateFile()


def check_announced_type(content_type: str) -> None:
    """Avant l'envoi : seul un type accepté peut recevoir un dépôt signé."""
    if content_type not in SIGNATURES:
        raise UnsupportedCertificateFile()


def clean_original_name(name: str) -> str:
    """Nom d'origine affiché aux RH : sans chemin, 120 caractères au plus. Jamais utilisé pour stocker (CA-05)."""
    base = (name or "").replace("\\", "/").rsplit("/", 1)[-1].strip()
    return base[:120] or "certificat"
