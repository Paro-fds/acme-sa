"""US-119, US-121 : construit le catalogue des postes (fichier JSON en lecture seule).

Usage (depuis backend/) :
    .venv\\Scripts\\python -m app.tools.import_job_profiles                         # réglages par défaut
    .venv\\Scripts\\python -m app.tools.import_job_profiles matrice.sqlite dossier sortie.json

- Source de vérité (US-121) : la matrice des postes du directeur, base SQLite `matrice_competences.sqlite` (tables
  `poste` et `competence_poste`), lue sans être modifiée. Un poste par ligne : code, intitulé, département, service,
  compétences.
- Complément (US-119) : une page HTML par description de poste (dossier `postes/postes`). Une description complète le
  poste de même intitulé (sans accents, mots de liaison ni pluriel) ; une description sans poste n'entre pas.
- Les deux mises en page des descriptions sont ramenées aux rubriques de SECTION_TITLES ; le paragraphe de conclusion
  qui suit une liste rejoint la description ; le lien « Retour à l'accueil » est ignoré.
- Une page « …-html.html » qui double une page du même nom est ignorée ; seule, elle est lue sous le nom sans « -html ».
- Le rapport ne donne que des comptes.
"""

import json
import re
import sqlite3
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

from app.config import PROJECT_DIR, Settings
from app.job.domain.catalogue import SECTION_TITLES, describe_level

SOURCE = (
    "Matrice des postes du directeur (matrice_competences.sqlite, 2026-10-15, US-121), complétée par les descriptions "
    "de poste ACME transmises par l'utilisateur le 2026-10-14 (US-119)"
)

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


def _pages(folder: Path) -> dict[str, Path]:
    """Code de la fiche → page ; la version « -html » ne sert que si elle est seule."""
    pages = {}
    for path in sorted(folder.glob("*.html")):
        code = path.stem.removesuffix("-html")
        if code not in pages or not path.stem.endswith("-html"):
            pages[code] = path
    return pages


def read_fiches(folder: Path) -> dict[str, dict]:
    """Code de la page → description de poste (intitulé, description, rubriques, niveau demandé)."""
    fiches = {}
    for code, path in _pages(folder).items() if folder.is_dir() else ():
        fiche = parse_fiche(path.read_text(encoding="utf-8"))
        qualifications = next((s["lines"] for s in fiche["sections"] if s["title"] == "Qualifications"), [])
        fiches[code] = fiche | {"level_text": describe_level(qualifications)}
    return fiches


def _slug(title: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", _plain(title)).strip("-")


def read_matrix(database: Path) -> list[dict]:
    """Postes de la matrice du directeur, dans l'ordre de la base, avec leurs compétences (base ouverte en lecture seule)."""
    with sqlite3.connect(f"file:{database.as_posix()}?mode=ro", uri=True) as db:
        competences: dict[int, list[str]] = {}
        for poste_id, label in db.execute("SELECT poste_id, libelle FROM competence_poste ORDER BY id"):
            if label.strip():
                competences.setdefault(poste_id, []).append(label.strip())
        rows = db.execute("SELECT id, code, intitule, departement, service FROM poste ORDER BY id").fetchall()
    return [
        {
            "code": code.strip() or _slug(title),
            "position_code": code.strip(),
            "title": title.strip(),
            "department": department.strip() or None,
            "service": service.strip() or None,
            "competences": competences.get(poste_id, []),
        }
        for poste_id, code, title, department, service in rows
    ]


def build_catalogue(database: Path, folder: Path) -> dict:
    fiches = {_key(fiche["title"]): fiche for fiche in read_fiches(folder).values()}
    profiles = []
    for poste in read_matrix(database):
        fiche = fiches.get(_key(poste["title"]), {})
        profiles.append(
            poste
            | {
                "level_text": fiche.get("level_text"),
                "description": fiche.get("description", ""),
                "sections": fiche.get("sections", []),
            }
        )
    return {"source": SOURCE, "profiles": profiles}


def main(argv: list[str]) -> int:
    database = Path(argv[0]) if argv else PROJECT_DIR / "matrice_competences.sqlite"
    folder = Path(argv[1]) if len(argv) > 1 else PROJECT_DIR / "postes" / "postes"
    output = Path(argv[2]) if len(argv) > 2 else Settings().job_profiles_path
    catalogue = build_catalogue(database, folder)
    output.write_text(json.dumps(catalogue, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    profiles = catalogue["profiles"]
    print(f"{len(profiles)} postes écrits dans {output}")
    print(f"  sans code : {sum(1 for p in profiles if not p['position_code'])}")
    print(f"  avec une description détaillée : {sum(1 for p in profiles if p['sections'])}")
    print(f"  sans niveau demandé : {sum(1 for p in profiles if not p['level_text'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
