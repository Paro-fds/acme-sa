# US-1008 — Suivre mes pièces

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Plan PAM §3 (étape D) ; dictionnaire de Carrières (statuts, nomenclature des formations) |
| **Règles** | RG-07 |
| **Décisions liées** | D-50, D-54 |

## Récit

> En tant qu'**employé**, je veux voir dans « Mes certificats » toutes mes formations de Carrières et l'état de chaque pièce, **afin de de savoir ce que la DRH a déjà recueilli, validé ou refusé, sans avoir à le lui demander**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Mes certificats » liste les formations du dossier Carrières, y compris celles recueillies par la DRH, et les pièces déposées pas encore qualifiées ; ni les lettres (US-1009) ni les pièces des autres.
- **CA-02** Chaque pièce montre son intitulé, son type (« Type à préciser par la DRH » tant qu'elle est à compléter) et son statut : À compléter, En attente, Approuvée, Refusée avec le motif.
- **CA-03** « Déposer une pièce » : photo ou fichier (PDF, JPG, PNG, 4 Mo au plus) et intitulé facultatif ; la pièce apparaît aussitôt « À compléter » ; un refus du serveur s'affiche près du fichier.
- **CA-04** « Voir le scan » ouvre son propre scan, lu dans Carrières, jamais celui d'un autre. Le dépôt reste fermé tant que le dossier n'est pas complet (US-204), avec la liste de ce qui reste.

## Notes

Plan PAM (US-1008). Q7 : une pièce refusée l'est définitivement dans Carrières ; l'employé en dépose une nouvelle. L'ancien dépôt de PAM et sa file de validation seront retirés avec US-1010 ; leurs écrans ne sont plus routés.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
