# US-501 — Tenir le référentiel officiel

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D5 Référentiel des unités |
| **Lot** | 1 (interface de gestion au lot 4) |
| **Priorité** | Must (Should pour l'interface) |
| **Exigences** | EF-501, EF-502, EF-503, EF-505 |
| **Règles** | RG-70, RG-71 |
| **Décisions liées** | D-26, D-27 |

## Récit

> En tant que **responsable du référentiel**, je veux tenir la liste officielle des agences, régions et directions, et son lien avec l'export RH, **afin que chaque employé soit rattaché à la bonne unité et que les tableaux de bord soient justes**.

## Pourquoi

Sans libellés officiels, les recherches et tableaux de bord par région sont faux (critère n°1).

## Critères d'acceptation

- **CA-01** Au lot 1, le référentiel est un fichier Excel importé par un Administrateur ; l'import refuse un fichier incohérent (code en double, agence sans région).
- **CA-02** Chaque unité a un code stable qui ne change jamais ; un renommage garde l'ancien libellé.
- **CA-03** Une agence a une seule région à la fois, avec dates de début et de fin.

## Notes

Fait au lot 1 (2026-10-08) : import d'un classeur Excel à deux onglets (« Unités », « Correspondances ») depuis l'écran RH « Référentiel ». Le critère « au lot 4, une interface remplace le fichier » est passé à US-503.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
