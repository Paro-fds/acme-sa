from app.shared.domain.errors import Conflict, DomainError, InvalidInput, NotFound


class UnsupportedFileType(DomainError):
    code = "UNSUPPORTED_FILE_TYPE"
    message = "Format non accepté. Utilisez un PDF, JPG ou PNG."
    http_status = 415


class FileTooLarge(DomainError):
    code = "FILE_TOO_LARGE"
    message = "Fichier trop volumineux (5 Mo maximum)."
    http_status = 413


class DocumentLimitReached(Conflict):
    code = "DOCUMENT_LIMIT_REACHED"
    message = "Nombre maximum de documents atteint (10)."


class InvalidDocumentType(InvalidInput):
    code = "INVALID_DOCUMENT_TYPE"
    message = "Choisissez le type de document."


class DocumentNotFound(NotFound):
    code = "DOCUMENT_NOT_FOUND"
    message = "Document introuvable."
