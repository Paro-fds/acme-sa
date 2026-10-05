from app.shared.domain.errors import Conflict


class AccountNotActivated(Conflict):
    code = "ACCOUNT_NOT_ACTIVATED"
    message = "Cet employé n'a pas encore créé de mot de passe : il n'y a pas d'accès à réinitialiser."
