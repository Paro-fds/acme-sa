# US-503 — Gérer le référentiel à l'écran

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D5 Référentiel des unités |
| **Lot** | 4 |
| **Priorité** | Should |
| **Exigences** | EF-505 |
| **Règles** | RG-70, RG-71 |
| **Décisions liées** | D-27 |

## Récit

> En tant que **responsable du référentiel**, je veux créer, renommer et rattacher les unités directement dans le portail, **afin de ne plus passer par un fichier Excel et un Administrateur pour chaque changement**.

## Pourquoi

Sans libellés officiels, les recherches et tableaux de bord par région sont faux (critère n°1).

## Critères d'acceptation

- **CA-01** Au lot 4, une interface remplace le fichier : la responsable, son assistante et les Administrateurs modifient le référentiel à l'écran (EF-505).
- **CA-02** Les règles de l'import restent vraies : code stable, ancien libellé gardé au renommage, une seule région à la fois avec dates.
- **CA-03** Chaque modification est tracée.

## Notes

Venue de US-501 (critère CA-04), le 2026-10-08.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
