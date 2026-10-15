import hashlib
import secrets
from datetime import timedelta

from app.auth.domain.errors import AdminOnly, MfaRequired, NotAuthenticated, SessionExpired
from app.auth.domain.model import Session, SubjectType
from app.auth.domain.ports import SessionRepository
from app.shared.domain.clock import Clock


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class SessionService:
    """Ouvre, vérifie (avec expiration glissante) et ferme les sessions."""

    def __init__(self, sessions: SessionRepository, clock: Clock, durations: dict[SubjectType, timedelta]) -> None:
        self._sessions = sessions
        self._clock = clock
        self._durations = durations

    def open(self, subject_type: SubjectType, subject_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = self._clock.now()
        self._sessions.save(
            Session(
                token_hash=hash_token(token),
                subject_type=subject_type,
                subject_id=subject_id,
                created_at=now,
                last_seen_at=now,
                expires_at=now + self._durations[subject_type],
            )
        )
        return token

    def authenticate(self, token: str | None, expected: SubjectType) -> str:
        session = self._sessions.get(hash_token(token)) if token else None
        if session is None:
            raise NotAuthenticated()
        if session.subject_type != expected:
            # US-102 : mot de passe RH vérifié, code pas encore saisi.
            if session.subject_type == SubjectType.ADMIN_MFA and expected == SubjectType.ADMIN:
                raise MfaRequired()
            # Un employé connecté qui appelle une route admin : accès refusé (403).
            if session.subject_type == SubjectType.EMPLOYEE and expected != SubjectType.EMPLOYEE:
                raise AdminOnly()
            raise NotAuthenticated()

        now = self._clock.now()
        if now >= session.expires_at:
            self._sessions.delete(session.token_hash)
            raise SessionExpired()

        session.last_seen_at = now
        session.expires_at = now + self._durations[expected]
        self._sessions.save(session)
        return session.subject_id

    def close(self, token: str | None) -> None:
        if token:
            self._sessions.delete(hash_token(token))

    def close_all_for(self, subject_type: SubjectType, subject_id: str) -> None:
        self._sessions.delete_for_subject(subject_type, subject_id)
        if subject_type == SubjectType.ADMIN:
            # US-102 : une connexion RH en attente de son code se ferme avec les autres.
            self._sessions.delete_for_subject(SubjectType.ADMIN_MFA, subject_id)
