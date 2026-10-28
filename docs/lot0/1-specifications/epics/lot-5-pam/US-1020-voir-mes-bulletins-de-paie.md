# US-1020 — Voir mes bulletins de paie

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Module du directeur (onglet « Bulletin », bulletins_employe) ; export_shivam.py (payslip/) |
| **Règles** | — |
| **Décisions liées** | D-61 |

## Récit

> En tant qu'**employé**, je veux voir mes bulletins de paie dans « Mon PER », **afin de de retrouver ce que j'ai été payé chaque mois sans le demander à la DRH**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Mon PER » montre « Mes bulletins de paie » : un bouton par mois (« septembre 2026 — net 38.880,00 »), le plus récent ouvert.
- **CA-02** Le détail montre la date de paie, les rubriques (gains et retenues), puis gains, retenues et net à payer ; ni les lignes à zéro, ni les charges de l'employeur.
- **CA-03** La clé `pam/balances/payslip/{CODE}.json` vient du code de la session ; sans bulletin : « Aucun bulletin n'est disponible pour le moment. » ; stockage en panne : « Service momentanément indisponible. »

## Notes

Comme le module du directeur (choix du 2026-10-28). Le PDF de la fiche de paie (`fiche_paie.py`) n'est pas repris ici : story à part si besoin.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
