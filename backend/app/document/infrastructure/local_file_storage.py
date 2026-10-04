import os
from pathlib import Path


class LocalFileStorage:
    """Fichiers sur le disque local, dans `ACME_DATA_DIR/documents` (hors OneDrive)."""

    def __init__(self, root: Path) -> None:
        self._root = root.resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        path = (self._root / key).resolve()
        if not key or path == self._root or not path.is_relative_to(self._root):
            raise ValueError(f"Clé de stockage invalide : {key!r}")
        return path

    def save(self, key: str, content: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Écriture dans un fichier temporaire puis renommage : jamais de fichier à moitié écrit.
        temporary = path.with_name(f".{path.name}.tmp")
        temporary.write_bytes(content)
        os.replace(temporary, path)

    def open(self, key: str) -> bytes:
        return self._path(key).read_bytes()

    def delete(self, key: str) -> None:
        self._path(key).unlink(missing_ok=True)
