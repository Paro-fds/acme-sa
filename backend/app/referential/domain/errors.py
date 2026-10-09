from app.referential.domain.units import Problem
from app.shared.domain.errors import InvalidInput


class UnreadableReferentialFile(InvalidInput):
    code = "UNREADABLE_FILE"
    message = "Ce fichier n'est pas un classeur Excel (.xlsx) lisible avec les onglets « Unités » et « Correspondances »."


class ReferentialRejected(InvalidInput):
    """CA-01 : fichier incohérent ; rien n'est importé. Chaque problème est donné avec son onglet et sa ligne."""

    code = "REFERENTIAL_REJECTED"
    message = "Le fichier n'a pas été importé : corrigez ces points puis importez-le à nouveau."

    def __init__(self, problems: list[Problem]) -> None:
        super().__init__()
        self.extra = {
            "problems": [{"sheet": p.sheet, "line": p.line, "message": p.message} for p in problems],
        }
