from app.shared.domain.errors import Conflict


class AccountNotActivated(Conflict):
    code = "ACCOUNT_NOT_ACTIVATED"
    message = "Cet employé n'a pas encore créé de mot de passe : il n'y a pas d'accès à réinitialiser."


class NoContactHold(Conflict):
    """US-1026 : rien à lever (messages de `main_levee` du directeur)."""

    code = "NO_CONTACT_HOLD"
    message = "Aucun gel en cours pour ce code."

    def __init__(self, without_email: bool = False) -> None:
        super().__init__(
            "Aucun gel en cours, et ce dossier n'a pas d'adresse de courriel utilisable." if without_email else None
        )
