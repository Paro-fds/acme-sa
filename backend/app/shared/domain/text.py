import re
import unicodedata


def normalize(text: str | None) -> str:
    """Forme comparable d'un texte : sans accents, en minuscules, espaces réduits.

    >>> normalize("  Jean-Joseph   ÉTIENNE ")
    'jean-joseph etienne'
    """
    decomposed = unicodedata.normalize("NFKD", text or "")
    without_accents = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", without_accents).strip().casefold()
