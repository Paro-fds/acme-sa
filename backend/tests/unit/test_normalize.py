import pytest

from app.shared.domain.text import normalize


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("JOSEPH", "joseph"),
        ("  Jean   ", "jean"),
        ("ÉTIENNE", "etienne"),
        ("Rosé", "rose"),
        ("Jean-Joseph   Étienne", "jean-joseph etienne"),
        ("", ""),
        (None, ""),
    ],
)
def test_normalize(raw, expected):
    assert normalize(raw) == expected
