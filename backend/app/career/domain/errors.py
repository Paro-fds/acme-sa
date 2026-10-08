from app.shared.domain.errors import InvalidInput


class InvalidCareerField(InvalidInput):
    code = "INVALID_CAREER_FIELD"
