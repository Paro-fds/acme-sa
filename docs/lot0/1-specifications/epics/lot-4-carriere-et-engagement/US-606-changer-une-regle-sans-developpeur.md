# US-606 — Changer une règle sans développeur

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D6 Pilotage |
| **Lot** | 4 |
| **Priorité** | Should |
| **Exigences** | EF-606, ENF-51 |
| **Règles** | Toutes |
| **Décisions liées** | — |

## Récit

> En tant qu'**Administrateur**, je veux modifier les règles et les listes (champs obligatoires, niveaux, motifs) sans toucher au code, **afin que le portail suive l'évolution de l'institution**.

## Pourquoi

Critère de réussite n°1 : une liste de candidats qualifiés en une minute ; décisions traçables.

## Critères d'acceptation

- **CA-01** Une règle modifiée s'applique dès l'enregistrement.
- **CA-02** Chaque modification est tracée avec l'ancienne et la nouvelle valeur.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
