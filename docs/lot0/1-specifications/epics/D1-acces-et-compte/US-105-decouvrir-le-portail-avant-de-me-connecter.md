# US-105 — Découvrir le portail avant de me connecter

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | Demande 1.1 (accueil, 3 bénéfices) ; Q9 (mascotte) |
| **Règles** | — |
| **Décisions liées** | D-08 |

## Récit

> En tant qu'**employé**, je veux voir, avant de me connecter, à quoi sert le portail et ce que j'y gagne, **afin d'avoir envie de compléter mon dossier**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** La page d'accueil s'affiche à l'adresse du portail, sans connexion.
- **CA-02** Elle présente les 3 bénéfices : promotion, postes vacants, carrière ; avec des icônes et un texte court.
- **CA-03** La mascotte « La Penseuse » accueille l'employé (emplacement réservé tant que l'image n'est pas reçue).
- **CA-04** Le pourcentage du dossier n'y figure pas : il apparaît après la connexion (D-08).
- **CA-05** « Se connecter » mène à l'écran de connexion ; « Une question ? Adressez-vous au service RH de votre agence » est visible.
- **CA-06** Aucun chiffre ni lieu non confirmé (nombre d'agences, d'employés).

## Notes

Comparaison avec le code actuel : `ecarts-accueil-et-connexion.md`.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
