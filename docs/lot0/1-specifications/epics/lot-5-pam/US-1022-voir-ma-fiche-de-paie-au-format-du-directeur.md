# US-1022 — Voir ma fiche de paie au format du directeur

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Version du directeur du 2026-10-29 (`PAM_pour_Skin`) : `payslip.html`, `payslip.css`, `noyau.py` (`rendre_bulletin_html`, `salaire_net`, `_mention_bonus`), `pam.js` (`montrerBulletin`, « Enregistrer en PDF »), `modele_authentification.md` (« Facilités du service ») |
| **Règles** | — |
| **Décisions liées** | D-61 |

## Récit

> En tant qu'**employé**, je veux voir ma fiche de paie au format officiel de la DRH et l'enregistrer en PDF, **afin de de présenter un document complet et reconnaissable**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Mon PER » affiche la fiche du mois le plus récent, au format du directeur (`payslip.html` et `payslip.css`, logo compris), dans un cadre ; « Enregistrer en PDF » ouvre l'impression du navigateur, qui permet d'enregistrer la fiche (aucun fichier produit par le serveur).
- **CA-02** Toutes les rubriques du format, lues par leur code d'export (AA … BB), « 0,00 » si absentes ; montants « 70 384,00 » ; matricule = code de la session ; nom du bulletin ; Poste et Affectation « — ». Net à payer = total de l'export moins le bonus accumulé (AF) ; si ce bonus est positif : « Total des gains − bonus accumulé − total des retenues » et la phrase « Le montant … HTG est hors du salaire net et est payé en décembre de l'année en cours. »
- **CA-03** Les autres mois sont des lignes sous la fiche : un clic remplace la fiche et la ligne du mois affiché est surlignée. Seule la période AAAA-MM vient du navigateur ; période inconnue ou mal écrite : « Aucune fiche de paie n'est disponible pour cette période. » ; sans fiche : « Aucune fiche de paie n'est disponible pour le moment. » ; page jamais mise en cache, affichable seulement dans PAM.

## Notes

Demandes du 2026-10-28 (« le format du fiche de paie », « c'est le format du directeur ») et version du directeur du 2026-10-29. Remplace le fichier PDF de US-1021 et le détail de US-1020 : chez le directeur, seul le relevé PER produit un fichier (US-1024). Répond à Q20 : les charges patronales figurent, « (information) ».

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
