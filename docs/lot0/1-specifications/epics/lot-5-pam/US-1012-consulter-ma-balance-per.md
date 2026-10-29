# US-1012 — Consulter ma balance PER

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Doc PAM ; module du directeur (pam/pam/plateforme, export_shivam.py) |
| **Règles** | — |
| **Décisions liées** | D-52, D-61 |

## Récit

> En tant qu'**employé**, je veux consulter ma balance PER et son relevé dans PAM, sans nouvelle connexion, **afin de de suivre mon épargne retraite moi-même**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Mon PER » (menu) montre la balance la plus récente, sa date de mise à jour, ses intérêts cumulés et ses comptes, puis le relevé de chaque mois, du plus récent au plus ancien.
- **CA-02** La clé `pam/balances/per/{CODE}.json` est calculée depuis le code de la session ; aucun paramètre du navigateur n'y entre ; un code illisible ne forme jamais de clé.
- **CA-03** Objet absent (ou refusé faute de droit de liste) : « Aucune balance n'est disponible pour le moment. » ; stockage en panne ou JSON illisible : « Service momentanément indisponible. »
- **CA-04** Montants « 1.234,56 », dates JJ/MM/AAAA, mois en toutes lettres (règles du directeur) ; lecture seule ; seau obligatoire en production (PER_S3_BUCKET), balances fictives ailleurs (`backend/demo/per`).

## Notes

Plan PAM (US-1012, revue le 2026-10-28 : le PER est un module de PAM, D-61 à confirmer). Pas de devise affichée : le module du directeur n'en montre pas (question au directeur). Les délais de 5 et 15 minutes du PER attendent Q14 (US-1017). Les bulletins de paie (`payslip/`) ne sont pas affichés (question ouverte du directeur).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
