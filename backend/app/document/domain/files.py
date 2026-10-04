"""Formats de fichiers acceptés : contrôlés par l'extension **et** la signature binaire (Solution Design §9)."""

from enum import Enum

from app.document.domain.errors import UnsupportedFileType


class FileKind(Enum):
    PDF = ("application/pdf", ".pdf", (b"%PDF-",))
    JPEG = ("image/jpeg", ".jpg", (b"\xff\xd8\xff",))
    PNG = ("image/png", ".png", (b"\x89PNG\r\n\x1a\n",))

    def __init__(self, content_type: str, extension: str, signatures: tuple[bytes, ...]) -> None:
        self.content_type = content_type
        self.extension = extension
        self.signatures = signatures


_EXTENSIONS = {".pdf": FileKind.PDF, ".jpg": FileKind.JPEG, ".jpeg": FileKind.JPEG, ".png": FileKind.PNG}

# Nombre d'octets à lire en tête de fichier pour reconnaître sa signature.
SIGNATURE_LENGTH = 8


def detect_file_kind(filename: str, head: bytes) -> FileKind:
    """Type du fichier, si son extension et son contenu concordent ; sinon UnsupportedFileType."""
    dot = filename.rfind(".")
    kind = _EXTENSIONS.get(filename[dot:].lower()) if dot >= 0 else None
    if kind is None or not any(head.startswith(signature) for signature in kind.signatures):
        raise UnsupportedFileType(field="file")
    return kind
