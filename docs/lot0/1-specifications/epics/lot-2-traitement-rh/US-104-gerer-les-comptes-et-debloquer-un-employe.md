# US-104 — Gérer les comptes et débloquer un employé

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-105 |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**Administrateur**, je veux créer et désactiver les comptes RH, et réinitialiser l'accès d'un employé qui a oublié son mot de passe, **afin qu'aucun employé ne reste bloqué hors de son dossier**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** Après réinitialisation, l'employé choisit un nouveau mot de passe à sa prochaine connexion ; ses données sont intactes.
- **CA-02** Un compte RH désactivé ne peut plus se connecter ; son historique de décisions reste visible.
- **CA-03** Chaque action est tracée.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
