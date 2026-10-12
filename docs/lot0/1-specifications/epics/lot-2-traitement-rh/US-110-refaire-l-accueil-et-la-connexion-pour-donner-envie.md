# US-110 — Refaire l'accueil et la connexion pour donner envie

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | Demande 1.1 (accueil) |
| **Règles** | — |
| **Décisions liées** | D-08, D-47 |

## Récit

> En tant qu'**employé**, je veux trouver un accueil et une connexion simples, avec de vrais collègues, **afin d'avoir envie d'utiliser le portail dès le premier écran**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** L'accueil montre la photo d'une équipe d'ACME SA, le titre « Votre carrière commence par un dossier complet », « Ce que vous y gagnez » (3 bénéfices) et « Trois étapes » ; ni mascotte, ni chiffre (agences, collaborateurs), ni pastille décorative.
- **CA-02** « Compléter mon dossier » et « Se connecter » mènent à la connexion ; « Une question ? Adressez-vous au service RH de votre agence » reste visible.
- **CA-03** La connexion propose d'abord « C'est votre première fois ? » avec « Créer mon mot de passe », puis le formulaire ; « Mot de passe oublié ? » donne sa réponse sans clic.
- **CA-04** La date de naissance se saisit en trois cases Jour / Mois / Année, au clavier numérique, à la connexion comme à la création du mot de passe.
- **CA-05** Sur ordinateur, la photo est à côté du texte (accueil) ou du formulaire (connexion) ; sur téléphone, au-dessus.

## Notes

Choix de l'utilisateur du 2026-10-11 d'après les maquettes « Après 3 » (canvas « Accueil et connexion — avant / après ») : le directeur trouvait les pages trop « IA » et veut que les employés aient envie d'utiliser le portail. Remplace la mascotte de US-105 (CA-03) sur ces deux écrans ; à confirmer par M. Hilaire, ainsi que l'accord des personnes de la photo (droit à l'image).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
