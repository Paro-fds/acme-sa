from collections.abc import Iterable

from app.shared.domain.text import normalize


def matches_search(term: str | None, *, names: Iterable[tuple[str, str]], employee_code: str) -> bool:
    """US-18 : le terme normalisé est-il contenu dans le nom, le prénom, « nom prénom »,
    « prénom nom » ou le matricule ?

    `names` : couples (nom, prénom) à comparer — ceux de la référence et, une fois soumis,
    les nouveaux. Un terme vide correspond à tout le monde.
    """
    needle = normalize(term)
    if not needle:
        return True
    haystacks = [employee_code]
    for last_name, first_name in names:
        haystacks += [last_name, first_name, f"{last_name} {first_name}", f"{first_name} {last_name}"]
    return any(needle in normalize(haystack) for haystack in haystacks)
