"""Outil de contrôle du CSV (phase 6, tâches 6.2 et 6.3), vérifié sur le CSV fictif uniquement."""

import csv

from app.tools.check_csv import check_exposure, check_load, find_leaks, phone_format, secret_values
from tests.conftest import TEST_CSV
from tests.employees import ACTIVE_EMPLOYEES, SECRET_MARKER


def test_load_report_on_the_test_csv():
    report = check_load(TEST_CSV)

    assert report.missing_columns == []
    assert (report.active, report.inactive) == (len(ACTIVE_EMPLOYEES), 1)
    assert report.unreadable_dates == []
    assert report.damaged_text == {}
    assert report.names_with_accents >= 1  # ÉTIENNE Rosé
    assert (report.duplicate_identities, report.employees_in_duplicates) == (1, 2)  # EMP-D1 / EMP-D2
    assert sum(report.phone_formats.values()) == len(ACTIVE_EMPLOYEES)
    assert "active" not in report.excluded_columns
    assert "telephone_number" not in report.excluded_columns
    assert report.excluded_columns


def test_phone_format_hides_the_digits():
    assert phone_format("+509 3722-1111") == "+999 9999-9999"
    assert phone_format("  ") == "(vide)"


def test_secret_values_are_the_excluded_columns_only():
    secrets = secret_values(TEST_CSV)

    assert secrets
    assert all(SECRET_MARKER in value for values in secrets.values() for value in values)


def test_find_leaks_reports_the_column_not_the_value():
    secrets = {"bank_account": {"FR76-0000-1111"}, "national_id": {"ID-998877"}}

    assert find_leaks(['{"x": "FR76-0000-1111"}'], secrets) == {"bank_account": 1}
    assert find_leaks(['{"x": "rien"}'], secrets) == {}


def test_find_leaks_ignores_a_value_inside_another_word():
    # Un code de 4 lettres peut se retrouver au milieu d'un prénom : ce n'est pas une fuite.
    secrets = {"position_code": {"ANDR"}}

    assert find_leaks(['{"first_name": "ANDRE"}'], secrets) == {}
    assert find_leaks(['{"x": "ANDR-2"}'], secrets) == {"position_code": 1}


def _rewrite(tmp_path, change):
    with TEST_CSV.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        columns, rows = reader.fieldnames, list(reader)
    change(columns, rows)
    path = tmp_path / "modifie.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)
    return path


def test_generic_yes_no_values_are_not_secrets(tmp_path):
    excluded = check_load(TEST_CSV).excluded_columns[0]

    def set_false(columns, rows):
        for row in rows:
            row[excluded] = "false"

    assert secret_values(_rewrite(tmp_path, set_false)).get(excluded, set()) == set()


def test_exposure_check_passes_on_the_application(tmp_path):
    report = check_exposure(TEST_CSV)

    assert report.responses > 4 * len(ACTIVE_EMPLOYEES)
    assert report.leaks == {}
    assert report.password_in_logs is False
    assert report.session_cookie_flags_ok is True


def test_unreadable_date_is_reported_with_its_line(tmp_path):
    with TEST_CSV.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        columns, rows = reader.fieldnames, list(reader)
    active = next(index for index, row in enumerate(rows) if row["active"].strip().lower() == "true")
    rows[active]["date_of_birth"] = "31/12/1990"
    broken = tmp_path / "casse.csv"
    with broken.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=columns)
        writer.writeheader()
        writer.writerows(rows)

    assert check_load(broken).unreadable_dates == [(active + 2, "date_of_birth")]
