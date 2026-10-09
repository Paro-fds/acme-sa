# US-603 — Exporter une liste

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D6 Pilotage |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-604 |
| **Règles** | — |
| **Décisions liées** | D-18 |

## Récit

> En tant qu'**Administrateur**, je veux exporter la liste filtrée en Excel ou CSV, **afin de la travailler hors du portail**.

## Pourquoi

Critère de réussite n°1 : une liste de candidats qualifiés en une minute ; décisions traçables.

## Critères d'acceptation

- **CA-01** L'export reprend exactement les filtres affichés.
- **CA-02** Il ne contient jamais le contact d'urgence ; chaque export est tracé (qui, quand, quels filtres).

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
