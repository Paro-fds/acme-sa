"""Tests de l'export Shivam vers le magasin des balances.

Aucun appel AWS. Les montants des scénarios sont fictifs. Si les deux rapports
d'octobre 2026 sont présents dans ``docs/Mes comptes``, un dernier test vérifie
qu'ils se lisent et que chaque total de bulletin se reconstitue, sans afficher
de montant.

Lancer depuis la racine du dépôt ::

    python pam/test_export_shivam.py
"""

from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import export_shivam as mod

RACINE = Path(__file__).resolve().parents[1]
PER_REEL = RACINE / "docs" / "Mes comptes" / "20261027Employee_PER_Accounts (10).xls"
PAIE_REEL = RACINE / "docs" / "Mes comptes" / "20261027Emp_Salary__Pay_HeadDetails (31).xls"


def html_per(date_impression: str, lignes: list[tuple[str, str, str, str, str, str]]) -> str:
    corps = "\n".join(
        "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>".format(*ligne)
        for ligne in lignes
    )
    return f"""<html><body>
<table><tr><td>Imprimé le -  {date_impression} 13:00</td></tr></table>
<table>
<tr><td>No. Compte PER</td><td>Code Empl</td><td>Nom Employee</td><td>Date Overture</td>
<td>Balance</td><td>Interet Cummule</td></tr>
{corps}
</table>
<table><tr><td>Page 1 Of 2</td></tr></table>
</body></html>
"""


def html_paie(lignes: list[list[str]], rubriques: list[str] | None = None) -> str:
    rubriques = rubriques or [
        "AA (SALAIRE)",
        "AS (CREDIT ISR)",
        "AG (ONA From Employee)",
        "AK (TMS of Employer)",
    ]
    entete = "".join(f"<td>{nom}</td>" for nom in ["Date", "Employee Id", "Employee Name", *rubriques, "Total"])
    corps = "\n".join(
        "<tr>" + "".join(f"<td>{cellule}</td>" for cellule in ligne) + "</tr>" for ligne in lignes
    )
    return f"""<html><body>
<table><tr><td>ACME S.A.</td></tr><tr><td>PaySheet Details</td></tr></table>
<table><tr>{entete}</tr>
{corps}
<tr><td>TOTAL</td><td>999.999,00</td><td></td><td>1,00</td><td>0,00</td><td>0,00</td><td>0,00</td><td>1,00</td></tr>
</table>
</body></html>
"""


class FauxS3:
    def __init__(self):
        self.objets: dict[str, bytes] = {}
        self.mises: list[dict] = []

    def get_object(self, Bucket, Key):
        if Key not in self.objets:
            raise mod._Introuvable(Key)
        return {"Body": io.BytesIO(self.objets[Key])}

    def put_object(self, Bucket, Key, Body, **kwargs):
        self.mises.append({"Bucket": Bucket, "Key": Key, **kwargs})
        self.objets[Key] = Body if isinstance(Body, bytes) else bytes(Body)

    def delete_object(self, Bucket, Key):
        self.objets.pop(Key, None)

    def list_objects_v2(self, Bucket, Prefix, ContinuationToken=None):
        cles = sorted(cle for cle in self.objets if cle.startswith(Prefix))
        return {"Contents": [{"Key": cle} for cle in cles], "IsTruncated": False}


class TestsMontants(unittest.TestCase):
    def test_montants_shivam(self):
        self.assertEqual(mod.parse_montant("1.234,50"), Decimal("1234.50"))
        self.assertEqual(mod.parse_montant(",00"), Decimal("0.00"))
        self.assertEqual(mod.parse_montant("000"), Decimal("0.00"))
        self.assertEqual(mod.parse_montant("3.935"), Decimal("3935.00"))
        self.assertEqual(mod.normaliser_code(" aaAa0001 "), "AAAA0001")
        self.assertEqual(mod.normaliser_code("D`JO0818"), "DJO0818")

    def test_code_invalide(self):
        with self.assertRaises(mod.ErreurExport):
            mod.normaliser_code("../AAAA")


class TestsRapports(unittest.TestCase):
    def test_per_additionne_les_comptes_et_ignore_la_page(self):
        texte = html_per(
            "27/10/2026",
            [
                ("10161MP1000001", "aaaa0001", "Zora   Dupont", "22-11-2022", "1.000,00", ",25"),
                ("10161MP1000002", "AAAA0001", "Zora Dupont", "01-01-2024", "10,50", "0,00"),
                ("10161MP1000001", "AAAA0001", "Zora Dupont", "22-11-2022", "1.000,00", "0,25"),
                ("10161MP1000003", "BBBB0002", "Lucien Marcel", "15-07-2024", ",00", "1,02"),
                ("Totaux", "9.999,00", "", "", "", ""),
                ("10161MP1000004", "D`JO0818", "D`HAITIEN Jocelyn", "22-11-2022", "3,00", "0,00"),
            ],
        )
        with tempfile.TemporaryDirectory() as dossier:
            chemin = Path(dossier) / "20261027Employee_PER_Accounts (1).xls"
            chemin.write_bytes(texte.encode("cp1252"))
            analyse = mod.analyser(chemin)
        self.assertEqual(analyse.famille, "per")
        self.assertEqual(len(analyse.morceaux), 3)
        self.assertIn("DJO0818", {morceau.code for morceau in analyse.morceaux})
        zora = analyse.morceaux[0]
        self.assertEqual(zora.code, "AAAA0001")
        self.assertEqual(zora.contenu["balance"], "1010.50")
        self.assertEqual(zora.contenu["interet_cumule"], "0.25")
        self.assertEqual(len(zora.contenu["comptes"]), 2)
        self.assertEqual(zora.contenu["nom"], "Zora Dupont")
        self.assertEqual(zora.date, "2026-10-27")

    def test_comptes_contradictoires(self):
        texte = html_per(
            "27/10/2026",
            [
                ("10161MP1000001", "AAAA0001", "Zora Dupont", "22-11-2022", "10,00", "0,00"),
                ("10161MP1000001", "AAAA0001", "Zora Dupont", "22-11-2022", "12,00", "0,00"),
            ],
        )
        with tempfile.TemporaryDirectory() as dossier:
            chemin = Path(dossier) / "Employee_PER_Accounts.xls"
            chemin.write_text(texte, encoding="utf-8")
            with self.assertRaises(mod.ErreurExport):
                mod.analyser(chemin)

    def test_bulletin_credit_isr_et_ligne_total(self):
        texte = html_paie(
            [
                ["31/10/2026", "zora0001", "Zora Dupont", "100,00", "40,00", "10,00", "5,00", "130,00"],
                ["31/10/2026", "LUCI0002", "Lucien Marcel", "0,00", "0,00", "0,00", "0,00", "0,00"],
            ]
        )
        with tempfile.TemporaryDirectory() as dossier:
            chemin = Path(dossier) / "20261031Emp_Salary__Pay_HeadDetails.xls"
            chemin.write_text(texte, encoding="utf-8")
            analyse = mod.analyser(chemin)
        self.assertEqual(len(analyse.morceaux), 2)
        zora = next(morceau for morceau in analyse.morceaux if morceau.code == "ZORA0001")
        self.assertEqual(zora.contenu["gains"], "140.00")
        self.assertEqual(zora.contenu["retenues"], "10.00")
        self.assertEqual(zora.contenu["charges_employeur"], "5.00")
        self.assertEqual(zora.contenu["total"], "130.00")
        self.assertEqual(zora.contenu["lignes"][3]["nature"], "employeur")

    def test_total_incoherent_et_rubrique_inconnue(self):
        mauvais = html_paie(
            [["31/10/2026", "ZORA0001", "Zora Dupont", "100,00", "0,00", "10,00", "5,00", "1,00"]]
        )
        inconnue = html_paie(
            [["31/10/2026", "ZORA0001", "Zora Dupont", "100,00", "100,00"]],
            ["AA (SALAIRE)", "CC (INCONNUE)"],
        )
        with tempfile.TemporaryDirectory() as dossier:
            paie = Path(dossier) / "Emp_Salary__Pay_HeadDetails.xls"
            paie.write_text(mauvais, encoding="utf-8")
            with self.assertRaises(mod.ErreurExport):
                mod.analyser(paie)
            paie.write_text(inconnue, encoding="utf-8")
            with self.assertRaises(mod.ErreurExport) as contexte:
                mod.analyser(paie)
        self.assertIn("CC", str(contexte.exception))

    def test_bulletin_en_double(self):
        texte = html_paie(
            [
                ["31/10/2026", "ZORA0001", "Zora Dupont", "100,00", "0,00", "0,00", "0,00", "100,00"],
                ["31/10/2026", "ZORA0001", "Zora Dupont", "100,00", "0,00", "0,00", "0,00", "100,00"],
            ]
        )
        with tempfile.TemporaryDirectory() as dossier:
            chemin = Path(dossier) / "Emp_Salary__Pay_HeadDetails.xls"
            chemin.write_text(texte, encoding="utf-8")
            with self.assertRaises(mod.ErreurExport):
                mod.analyser(chemin)


class TestsHistorique(unittest.TestCase):
    def setUp(self):
        self.dossier = tempfile.TemporaryDirectory()
        self.racine = Path(self.dossier.name)
        self.octobre = self.racine / "oct.xls"
        self.novembre = self.racine / "nov.xls"
        self.paie_oct = self.racine / "paie-oct.xls"
        self.paie_nov = self.racine / "paie-nov.xls"
        self.octobre.write_text(
            html_per("27/10/2026", [("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "10,00", "0,00")]),
            encoding="utf-8",
        )
        self.novembre.write_text(
            html_per("30/11/2026", [("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "25,00", "1,00")]),
            encoding="utf-8",
        )
        self.paie_oct.write_text(
            html_paie([["31/10/2026", "ZORA0001", "Zora Dupont", "100,00", "0,00", "0,00", "0,00", "100,00"]]),
            encoding="utf-8",
        )
        self.paie_nov.write_text(
            html_paie([["30/11/2026", "ZORA0001", "Zora Dupont", "80,00", "0,00", "0,00", "0,00", "80,00"]]),
            encoding="utf-8",
        )

    def tearDown(self):
        self.dossier.cleanup()

    def test_derniere_photo_et_releve(self):
        magasin = mod.MagasinLocal(self.racine / "base")
        mod.exporter([self.novembre, self.octobre, self.paie_oct, self.paie_nov], magasin)
        courant = mod.consulter(magasin, "per", "zora0001")
        self.assertEqual(courant["mode"], "courante")
        self.assertEqual(courant["periode"], "2026-11")
        self.assertEqual(courant["balance"], "25.00")
        self.assertNotIn("source", courant)
        releve = mod.consulter(magasin, "per", "ZORA0001", debut="2026-10", fin="2026-10")
        self.assertEqual(releve["mode"], "releve")
        self.assertEqual([item["periode"] for item in releve["periodes"]], ["2026-10"])
        self.assertEqual(releve["periodes"][0]["balance"], "10.00")
        bulletin = mod.consulter(magasin, "payslip", "ZORA0001")
        self.assertEqual(bulletin["total"], "80.00")
        self.assertEqual(bulletin["date_paie"], "2026-11-30")
        passe = mod.consulter(magasin, "payslip", "ZORA0001", debut="2026-10", fin="2026-10")
        self.assertEqual(passe["periodes"][0]["total"], "100.00")
        self.assertIsNone(mod.consulter(magasin, "per", "LUCI0002"))
        vide = mod.consulter(magasin, "per", "ZORA0001", debut="2020-01", fin="2020-06")
        self.assertEqual(vide["periodes"], [])
        self.assertNotIn("LUCI0002", (self.racine / "base" / "per" / "ZORA0001.json").read_text(encoding="utf-8"))

    def test_le_rapport_le_plus_recent_du_mois_remplace(self):
        correction = self.racine / "oct-bis.xls"
        correction.write_text(
            html_per("28/10/2026", [("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "11,00", "0,00")]),
            encoding="utf-8",
        )
        magasin = mod.MagasinLocal(self.racine / "base")
        mod.exporter([correction, self.octobre], magasin)
        self.assertEqual(mod.consulter(magasin, "per", "ZORA0001")["balance"], "11.00")
        ancien = self.racine / "oct-ancien.xls"
        ancien.write_text(
            html_per("01/10/2026", [("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "1,00", "0,00")]),
            encoding="utf-8",
        )
        mod.exporter([ancien], magasin)
        self.assertEqual(mod.consulter(magasin, "per", "ZORA0001")["balance"], "11.00")

    def test_republication_identique(self):
        magasin = mod.MagasinLocal(self.racine / "base")
        mod.exporter([self.octobre], magasin)
        avant = (self.racine / "base" / "per" / "ZORA0001.json").read_bytes()
        mod.exporter([self.octobre], magasin)
        self.assertEqual((self.racine / "base" / "per" / "ZORA0001.json").read_bytes(), avant)
        meta = json.loads((self.racine / "base" / "meta" / "imports.json").read_text(encoding="utf-8"))
        self.assertEqual(len(meta["imports"]), 1)
        self.assertEqual(meta["imports"][0]["employes"], 1)
        self.assertNotIn("ZORA0001", json.dumps(meta))
        self.assertNotIn("Zora", json.dumps(meta))

    def test_complet_retire_un_absent_et_refuse_un_fichier_trop_court(self):
        autre = self.racine / "deux.xls"
        autre.write_text(
            html_per(
                "27/10/2026",
                [
                    ("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "10,00", "0,00"),
                    ("C2", "LUCI0002", "Lucien Marcel", "22-11-2022", "5,00", "0,00"),
                    ("C3", "NORA0003", "Nora Petit", "22-11-2022", "5,00", "0,00"),
                    ("C4", "PAUL0004", "Paul Petit", "22-11-2022", "5,00", "0,00"),
                ],
            ),
            encoding="utf-8",
        )
        magasin = mod.MagasinLocal(self.racine / "base")
        mod.exporter([autre], magasin)
        with self.assertRaises(mod.ErreurExport):
            mod.exporter([self.octobre], magasin, complet=True)
        self.assertIsNotNone(mod.consulter(magasin, "per", "LUCI0002"))
        mod.exporter([self.octobre], magasin, complet=True, forcer=True)
        self.assertIsNone(mod.consulter(magasin, "per", "LUCI0002"))
        self.assertEqual(mod.consulter(magasin, "per", "ZORA0001")["balance"], "10.00")
        mod.exporter([autre], magasin)
        mod.exporter([self.octobre], magasin, complet=False)
        self.assertEqual(mod.consulter(magasin, "per", "LUCI0002")["balance"], "5.00")
        self.assertEqual(mod.consulter(magasin, "per", "ZORA0001")["balance"], "10.00")

    def test_un_mois_retire_laisse_l_historique(self):
        magasin = mod.MagasinLocal(self.racine / "base")
        mod.exporter([self.octobre, self.novembre], magasin)
        seul_oct = self.racine / "sans-zora-nov.xls"
        seul_oct.write_text(
            html_per("30/11/2026", [("C9", "LUCI0002", "Lucien Marcel", "22-11-2022", "3,00", "0,00")]),
            encoding="utf-8",
        )
        mod.exporter([seul_oct], magasin, complet=True, forcer=True)
        courant = mod.consulter(magasin, "per", "ZORA0001")
        self.assertEqual(courant["periode"], "2026-10")
        self.assertEqual(courant["balance"], "10.00")


class TestsMagasinS3(unittest.TestCase):
    def test_cle_chiffrement_et_consultation(self):
        faux = FauxS3()
        magasin = mod.MagasinS3("bucket-test", "pam/balances", sse="AES256", client=faux)
        with tempfile.TemporaryDirectory() as dossier:
            chemin = Path(dossier) / "Employee_PER_Accounts.xls"
            chemin.write_text(
                html_per(
                    "27/10/2026",
                    [
                        ("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "10,00", "0,00"),
                        ("C2", "LUCI0002", "Lucien Marcel", "22-11-2022", "4,00", "0,00"),
                    ],
                ),
                encoding="utf-8",
            )
            mod.exporter([chemin], magasin)
        self.assertIn("pam/balances/per/ZORA0001.json", faux.objets)
        self.assertNotIn("LUCI0002", faux.objets["pam/balances/per/ZORA0001.json"].decode("utf-8"))
        mise = next(appel for appel in faux.mises if appel["Key"].endswith("ZORA0001.json"))
        self.assertEqual(mise["ServerSideEncryption"], "AES256")
        self.assertEqual(mise["ContentType"], "application/json; charset=utf-8")
        vue = mod.consulter(magasin, "per", "ZORA0001")
        self.assertEqual(vue["balance"], "10.00")
        self.assertNotIn("Zora", faux.objets["pam/balances/meta/imports.json"].decode("utf-8"))


class TestsCommande(unittest.TestCase):
    def test_dry_run_n_ecrit_pas_et_trouve_le_partage(self):
        with tempfile.TemporaryDirectory() as dossier:
            racine = Path(dossier)
            (racine / "sous").mkdir()
            (racine / "sous" / "20261027Employee_PER_Accounts.xls").write_text(
                html_per("27/10/2026", [("C1", "ZORA0001", "Zora Dupont", "22-11-2022", "10,00", "0,00")]),
                encoding="utf-8",
            )
            (racine / "note.txt").write_text("Zora Dupont 10,00", encoding="utf-8")
            sortie = racine / "sortie"
            code = mod.main(
                ["exporter", "--partage", str(racine), "--sortie", str(sortie), "--dry-run"]
            )
            self.assertEqual(code, 0)
            self.assertFalse(sortie.exists())

    def test_consulter_en_ligne_de_commande(self):
        with tempfile.TemporaryDirectory() as dossier:
            racine = Path(dossier)
            source = racine / "Emp_Salary__Pay_HeadDetails.xls"
            source.write_text(
                html_paie([["31/10/2026", "ZORA0001", "Zora Dupont", "100,00", "0,00", "0,00", "0,00", "100,00"]]),
                encoding="utf-8",
            )
            sortie = racine / "base"
            self.assertEqual(mod.main(["exporter", "--fichier", str(source), "--sortie", str(sortie)]), 0)
            tampon = io.StringIO()
            ancien = sys.stdout
            try:
                sys.stdout = tampon
                code = mod.main(
                    ["consulter", "--sortie", str(sortie), "--code", "zora0001", "--famille", "payslip", "--debut", "2026-01", "--fin", "2026-10"]
                )
            finally:
                sys.stdout = ancien
            self.assertEqual(code, 0)
            vue = json.loads(tampon.getvalue())
            self.assertEqual(vue["mode"], "releve")
            self.assertEqual(vue["periodes"][0]["total"], "100.00")
            self.assertEqual(
                mod.main(["consulter", "--sortie", str(sortie), "--code", "ABSENT1", "--famille", "payslip"]),
                2,
            )

    def test_periode_inversee(self):
        with self.assertRaises(mod.ErreurExport):
            mod.valider_periode("2026-13")
        with tempfile.TemporaryDirectory() as dossier:
            magasin = mod.MagasinLocal(Path(dossier))
            with self.assertRaises(mod.ErreurExport):
                mod.consulter(magasin, "per", "ZORA0001", debut="2026-12", fin="2026-01")


class TestsRapportsReels(unittest.TestCase):
    def test_octobre_2026_si_les_fichiers_sont_la(self):
        if not PER_REEL.is_file() or not PAIE_REEL.is_file():
            self.skipTest("rapports Shivam absents")
        per = mod.analyser(PER_REEL)
        paie = mod.analyser(PAIE_REEL)
        self.assertEqual(per.famille, "per")
        self.assertEqual(paie.famille, "payslip")
        self.assertGreater(len(per.morceaux), 100)
        self.assertGreater(len(paie.morceaux), 100)
        self.assertTrue(all(morceau.date == "2026-10-27" for morceau in per.morceaux))
        self.assertTrue(all(morceau.contenu["date_paie"] == "2026-10-31" for morceau in paie.morceaux))
        self.assertTrue(any(len(morceau.contenu["comptes"]) > 1 for morceau in per.morceaux))
        for morceau in per.morceaux:
            comptes = morceau.contenu["comptes"]
            self.assertEqual(
                sum((Decimal(compte["balance"]) for compte in comptes), Decimal("0")),
                Decimal(morceau.contenu["balance"]),
            )
            self.assertEqual(
                sum((Decimal(compte["interet_cumule"]) for compte in comptes), Decimal("0")),
                Decimal(morceau.contenu["interet_cumule"]),
            )
        for morceau in paie.morceaux:
            self.assertEqual(
                Decimal(morceau.contenu["gains"]) - Decimal(morceau.contenu["retenues"]),
                Decimal(morceau.contenu["total"]),
            )
            self.assertTrue(
                all(ligne["nature"] in {"gain", "retenue", "employeur"} for ligne in morceau.contenu["lignes"])
            )
        with tempfile.TemporaryDirectory() as dossier:
            magasin = mod.MagasinLocal(Path(dossier))
            mod.exporter([PER_REEL, PAIE_REEL], magasin)
            code = per.morceaux[0].code
            avant = (Path(dossier) / "per" / f"{code}.json").read_bytes()
            vue = mod.consulter(magasin, "per", code)
            self.assertEqual(vue["mode"], "courante")
            self.assertEqual(vue["periode"], "2026-10")
            self.assertEqual(mod.consulter(magasin, "per", code, debut="2020-01", fin="2020-02")["periodes"], [])
            self.assertIsNone(mod.consulter(magasin, "payslip", "ZZZZ9999"))
            mod.exporter([PER_REEL, PAIE_REEL], magasin)
            self.assertEqual((Path(dossier) / "per" / f"{code}.json").read_bytes(), avant)


if __name__ == "__main__":
    unittest.main()
