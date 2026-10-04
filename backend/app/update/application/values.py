from app.employee.domain.employee import Employee
from app.update.domain.editable_fields import EDITABLE_FIELDS
from app.update.domain.update import EmployeeUpdate


def reference_values(employee: Employee) -> dict[str, str]:
    """Valeurs de la source de référence pour les champs modifiables."""
    return {code: getattr(employee, code) for code in EDITABLE_FIELDS}


def current_values(employee: Employee, update: EmployeeUpdate | None) -> dict[str, str]:
    """Valeurs à afficher : la référence, remplacée par les nouvelles valeurs une fois soumises (D-05).

    Un brouillon n'est jamais considéré comme une valeur actuelle.
    """
    values = reference_values(employee)
    if update is not None and update.is_submitted:
        values.update({code: change.new_value for code, change in update.changes.items()})
    return values
