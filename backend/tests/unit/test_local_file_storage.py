"""US-13 — Stockage des fichiers sur disque (T-13.2)."""

import pytest

from app.document.infrastructure.local_file_storage import LocalFileStorage


@pytest.fixture
def storage(tmp_path):
    return LocalFileStorage(tmp_path / "documents")


def test_saved_content_is_read_back_identical(storage, tmp_path):
    storage.save("1001/abc.pdf", b"%PDF-contenu")

    assert storage.open("1001/abc.pdf") == b"%PDF-contenu"
    assert (tmp_path / "documents" / "1001" / "abc.pdf").read_bytes() == b"%PDF-contenu"


def test_delete_removes_the_file(storage, tmp_path):
    storage.save("1001/abc.pdf", b"%PDF")

    storage.delete("1001/abc.pdf")

    assert not (tmp_path / "documents" / "1001" / "abc.pdf").exists()


def test_deleting_a_missing_file_is_harmless(storage):
    storage.delete("1001/absent.pdf")


def test_no_temporary_file_is_left_behind(storage, tmp_path):
    storage.save("1001/abc.pdf", b"%PDF")

    assert [p.name for p in (tmp_path / "documents" / "1001").iterdir()] == ["abc.pdf"]


@pytest.mark.parametrize("key", ["../evil.pdf", "1001/../../evil.pdf", "/etc/passwd", "C:/Windows/evil.pdf", ""])
def test_keys_cannot_escape_the_storage_folder(storage, key):
    with pytest.raises(ValueError):
        storage.save(key, b"x")
