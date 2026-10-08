# US-601 — Voir l'état des dossiers d'un coup d'œil

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D6 Pilotage |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-601 |
| **Règles** | RG-06 |
| **Décisions liées** | D-17, D-22 |

## Récit

> En tant qu'**Administrateur ou Lecture seule**, je veux voir un tableau de bord, **afin de savoir où en est l'institution et où relancer**.

## Pourquoi

Critère de réussite n°1 : une liste de candidats qualifiés en une minute ; décisions traçables.

## Critères d'acceptation

- **CA-01** Nombre d'employés, % de dossiers complets, certificats reçus, en attente et rejetés.
- **CA-02** Répartition par agence, région et direction, avec les libellés officiels.
- **CA-03** Les chiffres correspondent à ceux de la liste filtrée (US-602).

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
