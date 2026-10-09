from app.shared.domain.errors import Conflict, Forbidden, InvalidInput, NotFound


class ProfileIncomplete(Forbidden):
    """US-204 : le dépôt s'ouvre avec le profil complet ; le message invite, il ne sanctionne pas (RG-07)."""

    code = "PROFILE_INCOMPLETE"
    message = "Complétez votre profil pour déposer votre certificat : il ne reste que quelques informations."


class TooManyCertificates(Conflict):
    code = "TOO_MANY_CERTIFICATES"
    message = "Vous avez déposé le nombre maximum de certificats."


class InvalidCertificateField(InvalidInput):
    code = "INVALID_FIELD"


class UnsupportedCertificateFile(InvalidInput):
    code = "UNSUPPORTED_CERTIFICATE_FILE"
    message = "Ce fichier n'est pas un PDF, un JPG ou un PNG : prenez une photo du certificat ou envoyez son PDF."

    def __init__(self) -> None:
        super().__init__(field="file")


class CertificateFileTooLarge(InvalidInput):
    code = "CERTIFICATE_FILE_TOO_LARGE"
    message = "Le fichier dépasse 5 Mo : envoyez une photo ou un PDF plus léger."

    def __init__(self) -> None:
        super().__init__(field="file")


class UploadNotFound(InvalidInput):
    code = "UPLOAD_NOT_FOUND"
    message = "Le fichier n'est pas arrivé : choisissez-le à nouveau et renvoyez-le."

    def __init__(self) -> None:
        super().__init__(field="file")


class LocalUploadsUnavailable(NotFound):
    """Le dépôt par l'API n'existe que sur le poste du développeur ; en ligne, le fichier va directement au stockage."""

    code = "NOT_FOUND"
    message = "Adresse inconnue."


class CertificateNotFound(NotFound):
    code = "CERTIFICATE_NOT_FOUND"
    message = "Ce certificat n'existe pas."


class InvalidRating(InvalidInput):
    code = "INVALID_RATING"
    message = "Choisissez une des réponses proposées."

    def __init__(self) -> None:
        super().__init__(field="rating")
