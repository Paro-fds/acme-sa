# US-604 — Rendre compte de chaque action

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D6 Pilotage |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-605, ENF-08 |
| **Règles** | RG-45 |
| **Décisions liées** | D-19 |

## Récit

> En tant qu'**Administrateur**, je veux consulter le journal d'audit, **afin de justifier toute décision et toute consultation**.

## Pourquoi

Critère de réussite n°1 : une liste de candidats qualifiés en une minute ; décisions traçables.

## Critères d'acceptation

- **CA-01** Le journal montre qui a modifié quoi et quand, et qui a consulté quel document.
- **CA-02** Personne ne peut modifier ni supprimer une ligne du journal.
- **CA-03** Il se filtre par personne, employé et période.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
