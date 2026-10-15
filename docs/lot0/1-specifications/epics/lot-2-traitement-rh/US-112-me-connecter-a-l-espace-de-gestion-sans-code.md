# US-112 — Me connecter à l'espace de gestion sans code

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-104 |
| **Règles** | RG-80 |
| **Décisions liées** |  |

## Récit

> En tant que **personne des RH, administrateur ou membre de la direction**, je veux me connecter avec mon identifiant et mon mot de passe seulement, **afin d'entrer dans l'outil sans étape supplémentaire tant que la double authentification n'est pas mise en service**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** Un réglage du serveur (ADMIN_MFA_REQUIRED) décide si le code à 6 chiffres est demandé ; il est coupé par défaut, pour tous les rôles.
- **CA-02** Réglage coupé : le bon mot de passe ouvre directement l'espace de gestion ; le blocage après 5 erreurs et le mot de passe provisoire (US-23) restent.
- **CA-03** Réglage coupé : l'écran de connexion n'annonce ni étape ni code ; « Ma double authentification » disparaît du menu du compte, et la méthode et sa réinitialisation de l'écran des comptes.
- **CA-04** Réglage allumé (true dans Render ou backend/.env) : la double authentification de US-102 revient telle quelle, sans changement de code.

## Notes

Demande de l'utilisateur du 2026-10-12 : « faisons une connexion directe pour l'admin mais vous pouvez laisser cela dans le code ». La double authentification (US-102) reste écrite et testée ; à confirmer par M. Hilaire avant la mise en production.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
