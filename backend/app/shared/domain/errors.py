"""Erreurs métier communes.

Chaque erreur porte un code stable (utilisé par le frontend et les tests) et un message
en français affichable tel quel. La traduction en statut HTTP se fait dans la couche api.
"""


class DomainError(Exception):
    code: str = "DOMAIN_ERROR"
    message: str = "Une erreur est survenue."

    def __init__(self, message: str | None = None, *, field: str | None = None) -> None:
        if message is not None:
            self.message = message
        self.field = field
        super().__init__(self.message)


class NotFound(DomainError):
    code = "NOT_FOUND"
    message = "Élément introuvable."


class Conflict(DomainError):
    code = "CONFLICT"
    message = "Cette action n'est pas possible dans l'état actuel."


class Unauthorized(DomainError):
    code = "UNAUTHORIZED"
    message = "Vous devez être connecté."


class Forbidden(DomainError):
    code = "FORBIDDEN"
    message = "Accès refusé."


class InvalidInput(DomainError):
    code = "INVALID_INPUT"
    message = "Les informations saisies ne sont pas valides."
