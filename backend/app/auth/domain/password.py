from app.auth.domain.errors import PasswordMismatch, PasswordTooShort

PASSWORD_MIN_LENGTH = 8


def validate_new_password(password: str, confirmation: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise PasswordTooShort(field="password")
    if password != confirmation:
        raise PasswordMismatch(field="password_confirmation")
