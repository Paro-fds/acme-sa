"""US-119 : importe les descriptions de poste d'ACME dans le catalogue des postes (fichier JSON en lecture seule).

Usage (depuis backend/) :
    .venv\\Scripts\\python -m app.tools.import_job_profiles                      # ../postes → fichier des réglages
    .venv\\Scripts\\python -m app.tools.import_job_profiles dossier tableau.md sortie.json

- Source : une page HTML par poste (dossier `postes/postes`) et le tableau poste → domaine (`postes_et_domaines.md`),
  transmis par l'utilisateur le 2026-10-14. À remplacer par la base SQLite du directeur quand elle sera fournie.
- Les deux mises en page des fiches sont ramenées aux rubriques de SECTION_TITLES ; le paragraphe de conclusion qui
  suit une liste rejoint la description ; le lien « Retour à l'accueil » est ignoré.
- Une page « …-html.html » qui double une page du même nom est ignorée ; seule, elle est lue sous le nom sans « -html ».
- Le rapport ne donne que des comptes : fiches lues, fiches sans domaine, fiches sans niveau.
"""

import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

from app.config import PROJECT_DIR, Settings
from app.job.domain.catalogue import SECTION_TITLES, describe_level

SOURCE = "Descriptions de poste ACME et tableau poste → domaine, transmis par l'utilisateur le 2026-10-14 (US-119)"

_HEADINGS = {
    "description du poste": "description",
    "missions et attributions": "Missions",
    "principales responsabilites": "Missions",
    "qualifications requises": "Qualifications",
    "qualifications et competences requises": "Qualifications",
    "experience et competences": "Expérience",
    "experience requise": "Expérience",
    "conditions d'exercice": "Conditions d'exercice",
    "conditions d'exercices": "Conditions d'exercice",
    "deplacements requis": "Conditions d'exercice",
    "autres habiletes": "Qualités attendues",
    "qualites personnelles": "Qualités attendues",
    "autres specifications": "Qualités attendues",
}
_CONCLUSION_MIN_LENGTH = 180
_IGNORED = {"retour a l'accueil"}


def _plain(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", text.replace("’", "'")).strip()


_LINK_WORDS = {"a", "au", "aux", "d", "de", "des", "du", "en", "et", "l", "la", "le", "les"}


def _key(title: str) -> str:
    """Clé de comparaison d'un intitulé : sans accents, ponctuation, mots de liaison ni pluriel en « s »."""
    words = re.sub(r"[^a-z0-9]+", " ", _plain(title)).split()
    return " ".join(word.removesuffix("s") if len(word) > 3 else word for word in words if word not in _LINK_WORDS)


class _FicheParser(HTMLParser):
    """Suite des éléments utiles de la page : (balise, texte) pour h1, h2, h3, p et li."""

    def __init__(self) -> None:
        super().__init__()
        self.items: list[tuple[str, str]] = []
        self._tag: str | None = None
        self._text: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("h1", "h2", "h3", "p", "li"):
            self._tag, self._text = tag, []

    def handle_endtag(self, tag):
        if tag == self._tag:
            text = re.sub(r"\s+", " ", "".join(self._text)).strip()
            if text and _plain(text) not in _IGNORED:
                self.items.append((tag, text))
            self._tag = None

    def handle_data(self, data):
        if self._tag:
            self._text.append(data)


def parse_fiche(html: str) -> dict:
    """Intitulé, description et rubriques d'une page de description de poste."""
    parser = _FicheParser()
    parser.feed(html)
    title, description, sections = "", [], {name: [] for name in SECTION_TITLES}
    current, after_list = None, False
    for tag, text in parser.items:
        if tag == "h1":
            title = text
        elif tag in ("h2", "h3"):
            current, after_list = _HEADINGS.get(_plain(text).rstrip(" :"), current), False
        elif current == "description":
            description.append(text)
        elif current:
            if tag == "p" and after_list and len(text) >= _CONCLUSION_MIN_LENGTH:
                description.append(text)
                continue
            sections[current].append(text)
            after_list = after_list or tag == "li"
    return {
        "title": title,
        "description": "\n\n".join(description),
        "sections": [{"title": name, "lines": lines} for name, lines in sections.items() if lines],
    }


def read_domains(table: Path) -> dict[str, tuple[str, str]]:
    """Tableau Markdown « | Poste | Domaine | » → clé du titre : (titre, domaine) ; « & » devient « et »."""
    rows = {}
    for line in table.read_text(encoding="utf-8").splitlines():
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 2 or cells[0] in ("Poste", "") or set(cells[0]) <= set(":- "):
            continue
        domain = re.sub(r"\s*&\s*", " et ", cells[1])
        rows[_key(cells[0])] = (cells[0], domain[:1].upper() + domain[1:].lower())
    return rows


def _pages(folder: Path) -> dict[str, Path]:
    """Code de la fiche → page ; la version « -html » ne sert que si elle est seule."""
    pages = {}
    for path in sorted(folder.glob("*.html")):
        code = path.stem.removesuffix("-html")
        if code not in pages or not path.stem.endswith("-html"):
            pages[code] = path
    return pages


def build_catalogue(folder: Path, table: Path) -> dict:
    domains = read_domains(table)
    profiles = []
    for code, path in _pages(folder).items():
        fiche = parse_fiche(path.read_text(encoding="utf-8"))
        title, domain = domains.get(_key(fiche["title"]), (fiche["title"], None))
        qualifications = next((s["lines"] for s in fiche["sections"] if s["title"] == "Qualifications"), [])
        profiles.append(
            {
                "code": code,
                "title": title,
                "domain": domain,
                "level_text": describe_level(qualifications),
                "description": fiche["description"],
                "sections": fiche["sections"],
            }
        )
    return {"source": SOURCE, "profiles": profiles}


def main(argv: list[str]) -> int:
    folder = Path(argv[0]) if argv else PROJECT_DIR / "postes" / "postes"
    table = Path(argv[1]) if len(argv) > 1 else folder.parent / "postes_et_domaines.md"
    output = Path(argv[2]) if len(argv) > 2 else Settings().job_profiles_path
    catalogue = build_catalogue(folder, table)
    output.write_text(json.dumps(catalogue, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    profiles = catalogue["profiles"]
    print(f"{len(profiles)} fiches écrites dans {output}")
    print(f"  sans domaine : {sum(1 for p in profiles if not p['domain'])}")
    print(f"  sans niveau demandé : {sum(1 for p in profiles if not p['level_text'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
