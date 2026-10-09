# US-207 — Aligner l'espace employé sur les écrans validés

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | — |
| **Règles** | RG-07, RG-15 |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**employé**, je veux retrouver dans le portail les écrans que la direction a validés, **afin que le portail soit celui qui a été montré et approuvé**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** Après la connexion, l'employé arrive sur « Accueil » (écran 06) : bonjour, pourcentage, ce qui reste avec un bouton par élément, état du dépôt ; à la première connexion, « Avant de commencer » (écran 05) passe d'abord.
- **CA-02** Chaque écran de l'employé a l'en-tête « Portail Carrière » et la barre du bas Accueil / Mon profil / Mes certificats.
- **CA-03** « Mes coordonnées » montre en lecture seule l'identité connue des RH : nom, prénom, matricule, agence et poste (écran 08).
- **CA-04** « Mes informations RH », « Déposer un certificat », la confirmation d'envoi et « Mes certificats » reprennent la présentation des écrans 07, 11, 12 et 13 ; le niveau d'études validé s'affiche en tête de « Mes certificats ».
- **CA-05** Quand le texte d'un écran contredit une règle du registre (délai, canaux, email obligatoire), la règle l'emporte (D-47).

## Notes

Demande de l'utilisateur du 2026-10-09 : les écrans validés par M. Hilaire sont `2-espace-employe-ecrans/` et `3-espace-rh-ecrans/` (D-47). Les écrans RH (menu latéral, A09 « Valeurs à rattacher ») sont repris au début du lot 2.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
