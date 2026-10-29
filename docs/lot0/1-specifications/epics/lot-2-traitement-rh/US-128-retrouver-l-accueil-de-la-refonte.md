# US-128 — Retrouver l'accueil de la refonte

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | — |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**employé**, je veux un accueil clair et accueillant qui me montre mes chiffres, le poste ouvert pour moi et ce qui s'est passé récemment, **afin de savoir en un coup d'œil où j'en suis et quoi faire**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/Main.dc.html` et `Telephone.dc.html`), dans le cadre d'US-127.

## Critères d'acceptation

- **CA-01** En-tête : « Bonjour » et le prénom, puis « Bienvenue sur votre espace carrière. Ici, vous pouvez suivre vos dossiers, consulter les opportunités et gérer vos documents. » ; « Déposer un certificat » quand le dossier est complet ; un bandeau bleu clair avec l'illustration de l'escalier et « Votre engagement d'aujourd'hui construit votre avenir chez ACME SA. ». Ni la date ni le poste (déjà dans la barre du haut), aucun emoji.
- **CA-02** Les tuiles d'US-123 (postes, certificats, candidature en cours, dossier ; dossier incomplet d'abord) prennent le style de la maquette : fond blanc, icône dans un rond de couleur, chiffre, une phrase, lien de couleur en bas.
- **CA-03** « Poste ouvert pour vous » met en avant le poste dont la date limite est la plus proche : intitulé, « Vous remplissez les N critères » (ou « Ouvert à tous »), unité, date limite et jours restants, début de la mission, « Voir le poste et postuler » ; « Voir les N postes » s'il y en a plusieurs ; sinon une phrase le dit.
- **CA-04** « Activité récente » montre les 3 dernières notifications de l'employé (titre, détail, pastille, date) et « Toutes mes notifications » ; sans notification, une phrase le dit.
- **CA-05** Retirés de l'accueil : « Nouveau pour vous » (remplacé par « Activité récente »), « Vos diplômes travaillent pour vous », « Mon parcours en chiffres » ; le parcours reste dans « Ma carrière ».
- **CA-06** Inchangés : « À ne pas manquer » (à droite sur ordinateur), la demande de confirmation annuelle en tête quand elle s'applique, la liste de ce qui reste quand le dossier est incomplet, le passage par « Avant de commencer » à la première connexion.

## Notes

Choix de l'utilisateur du 2026-10-19 : phrase de bienvenue de la maquette (et non un fait du jour) ; « Nouveau pour vous » retiré (écart avec US-120 CA-04) ; « Vos diplômes travaillent pour vous » et « Mon parcours en chiffres » retirés (écart avec US-123 CA-05). Illustration : image fournie par l'utilisateur (`frontend/src/assets/illustration-escalier.png`, 156 × 113 px), à remplacer par le fichier d'origine en plus grand s'il arrive. Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
