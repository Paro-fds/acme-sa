from app.employee.domain.employee import Employee
from app.update.domain.editable_fields import EDITABLE_FIELDS
from app.update.domain.update import EmployeeUpdate


def reference_values(employee: Employee) -> dict[str, str]:
    """Valeurs de la source de référence pour les champs modifiables."""
    return {code: getattr(employee, code) for code in EDITABLE_FIELDS}


def current_values(employee: Employee, update: EmployeeUpdate | None) -> dict[str, str]:
    """Valeurs à afficher : la référence, remplacée par les valeurs du **dernier envoi** (D-05, US-24).

    Un brouillon, y compris celui d'une nouvelle modification, n'est jamais considéré comme une valeur actuelle.
    """
    values = reference_values(employee)
    if update is not None and update.has_submission:
        values.update({code: change.new_value for code, change in update.submitted_changes.items()})
    return values
