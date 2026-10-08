# US-103 — Donner un rôle à chaque compte RH

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-103 |
| **Règles** | RG-41 |
| **Décisions liées** | D-15 → D-19 |

## Récit

> En tant qu'**Administrateur**, je veux donner à chaque compte RH un rôle : Administrateur, Agent RH ou Lecture seule, **afin que chacun ne voie et ne fasse que ce qui relève de sa fonction**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** Un compte Lecture seule consulte dossiers et tableaux de bord, sans bouton Valider ni Rejeter, et le portail refuse l'action si elle est tentée.
- **CA-02** Un employé sans rôle RH n'accède jamais à l'espace RH.
- **CA-03** Chaque changement de rôle est tracé (qui, quand, ancien et nouveau rôle).

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
