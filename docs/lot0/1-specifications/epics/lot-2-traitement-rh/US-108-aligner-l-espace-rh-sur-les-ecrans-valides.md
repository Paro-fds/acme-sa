# US-108 — Aligner l'espace RH sur les écrans validés

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | — |
| **Règles** | RG-80 |
| **Décisions liées** | D-47 |

## Récit

> En tant que **personne des RH**, je veux retrouver dans l'espace RH les écrans que la direction a validés, **afin que l'espace RH soit celui qui a été montré et approuvé**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** Chaque écran RH a le cadre de l'écran A02 : en-tête bleu marine avec le logo et « Portail RH », à droite « Nom · Rôle » et « Se déconnecter » ; à gauche le menu des écrans validés (Tableau de bord, File de validation, Employés, Signalements, À rattacher, Comptes et rôles, Journal d'audit), plus « Postes ouverts » (lot 4) ; le titre de la page en tête du contenu.
- **CA-02** Les compteurs du menu sont réels : certificats en attente (File de validation), signalements à traiter (Signalements), valeurs à rattacher (À rattacher) ; aucun compteur quand il vaut 0.
- **CA-03** Les écrans A02 à A11 reprennent la présentation de leur maquette (`code.html` fait foi) ; quand le texte d'un écran contredit une règle du registre, la règle l'emporte (D-47).
- **CA-04** À 1280 px, le menu reste visible et n'est jamais écrasé par le contenu ; à 390 px, il s'ouvre par un bouton et rien ne défile horizontalement.
- **CA-05** Couleurs et styles passent par les jetons du portail, jamais par des valeurs écrites dans les écrans.

## Notes

Demande de l'utilisateur du 2026-10-11 (« les pages RH et Admin ne sont pas encore alignées ») : cadre et écrans A02 → A11 dans une seule story, au lot 2. US-207 prévoyait de reprendre les écrans RH au début du lot 2. Choix du 2026-10-11 pour A06 : suivre la maquette (statut du dossier, niveau validé, domaine, dernière mise à jour, liste paginée) ; le statut « Mise à jour effectuée / non effectuée » et ses puces (ancien parcours, US-206) disparaissent. A07 lit le dossier V2 (`GET /api/admin/employees/{id}/dossier`) avec la date de chaque confirmation ; ce qui a été envoyé avec l'ancien portail reste lisible. A09 : le rattachement se fait par l'import du fichier (D-27) présenté à côté du tableau ; la saisie à l'écran viendra avec US-503. Compteurs du menu : `GET /api/admin/menu-counts`.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
