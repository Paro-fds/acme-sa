# US-502 — Rattacher les valeurs inconnues

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D5 Référentiel des unités |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-504 |
| **Règles** | RG-17 |
| **Décisions liées** | — |

## Récit

> En tant qu'**Administrateur**, je veux voir les valeurs de l'export qui n'ont pas de correspondance, **afin qu'aucune ne soit ignorée**.

## Pourquoi

Sans libellés officiels, les recherches et tableaux de bord par région sont faux (critère n°1).

## Critères d'acceptation

- **CA-01** Une valeur inconnue va dans la liste « À rattacher », avec le nombre d'employés concernés.
- **CA-02** Ces employés sont « Unité à confirmer », sans être bloqués.
- **CA-03** Une fois rattachée, la valeur disparaît de la liste et les employés prennent le libellé officiel.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
