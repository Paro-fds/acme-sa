"""Classeurs du référentiel fabriqués pour les tests (US-501), au format importé par l'administrateur."""

import io

from openpyxl import Workbook

UNIT_HEADER = ["Code", "Libellé officiel", "Type", "Rattachée à", "Rattachée depuis", "Anciens libellés"]
MAPPING_HEADER = ["Colonne de l'export", "Valeur dans l'export", "Code de l'unité"]

UNITS = [
    ["M1", "Métropole 1", "Région", "", "", ""],
    ["GS2", "Grand Sud 2", "Région", "", "", ""],
    ["PV", "Pétion-Ville", "Agence", "M1", "01/01/2026", ""],
    ["AD", "Agence Démo", "Agence", "M1", "01/01/2026", ""],
    ["DM", "Delmas", "Agence", "M1", "01/01/2026", ""],
    ["DOP", "Direction des Opérations", "Direction", "", "", ""],
    ["DCR", "Direction du Crédit", "Direction", "", "", ""],
    ["SADM", "Service Administration", "Service", "DOP", "", ""],
]
MAPPINGS = [
    ["agency_code", "PV", "PV"],
    ["agency_code", "AD", "AD"],
    ["agency_code", "DM", "DM"],
    ["agency_code", "PB", ""],
    ["department", "Direction Opération", "DOP"],
    ["department", "Direction Crédit", "DCR"],
    ["department", "Service Administration", "SADM"],
]


def workbook(units=UNITS, mappings=MAPPINGS, unit_header=UNIT_HEADER, mapping_header=MAPPING_HEADER) -> bytes:
    book = Workbook()
    sheet = book.active
    sheet.title = "Unités"
    sheet.append(unit_header)
    for row in units:
        sheet.append(row)
    mapping_sheet = book.create_sheet("Correspondances")
    mapping_sheet.append(mapping_header)
    for row in mappings:
        mapping_sheet.append(row)
    buffer = io.BytesIO()
    book.save(buffer)
    return buffer.getvalue()
