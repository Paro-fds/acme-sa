from dataclasses import dataclass, field
from typing import Protocol

from app.certificate.domain.certificate import Certificate, CertificateFile, Feedback


class CertificateRepository(Protocol):
    def list_for_employee(self, employee_id: str) -> list[Certificate]:
        """Du plus récent au plus ancien."""

    def count_for_employee(self, employee_id: str) -> int: ...

    def add(self, certificate: Certificate, file: CertificateFile) -> None:
        """Enregistre le certificat et son fichier dans une même transaction."""

    def files_of(self, certificate_id: str) -> list[CertificateFile]: ...

    def get(self, certificate_id: str) -> Certificate | None: ...

    def set_feedback(self, feedback: Feedback) -> None:
        """Un avis par certificat : un nouvel avis remplace le précédent."""

    def feedbacks(self) -> list[Feedback]: ...


@dataclass(frozen=True)
class UploadTicket:
    """US-301 CA-06 : de quoi envoyer le fichier directement au stockage privé, sans passer par l'API."""

    method: str
    url: str
    headers: dict[str, str] = field(default_factory=dict)


class CertificateStorage(Protocol):
    def presign_upload(self, key: str, content_type: str) -> UploadTicket:
        """Dépôt signé, valable quelques minutes, pour ce seul fichier."""

    def size(self, key: str) -> int | None:
        """Taille du fichier reçu ; `None` s'il n'est pas arrivé."""

    def head(self, key: str, length: int) -> bytes:
        """Les premiers octets du fichier, pour en reconnaître le type réel."""

    def delete(self, key: str) -> None: ...

    @property
    def receives_uploads(self) -> bool:
        """Vrai pour le stockage local du poste du développeur : il reçoit le dépôt par l'API."""

    def receive(self, key: str, content: bytes) -> None:
        """Stockage local seulement : enregistre le fichier envoyé au dépôt signé."""


class ProfileStatus(Protocol):
    """US-204 : le profil est-il complet (les 8 éléments de RG-01) ? Implémenté par le module `dossier`."""

    def execute(self, employee_id: str) -> bool: ...
