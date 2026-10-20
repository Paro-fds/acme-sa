# US-129 — Retrouver « Mon dossier » de la refonte

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

> En tant qu'**employé**, je veux voir d'un coup d'œil où en est mon dossier, partie par partie, et confirmer mes informations RH sans changer de page, **afin de garder mon dossier à jour en quelques secondes**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/MonDossier.dc.html`), dans le cadre d'US-127.

## Critères d'acceptation

- **CA-01** En-tête : « Mon dossier », « Vos informations personnelles et votre situation chez ACME. Vérifiez-les une fois par an : les RH s'en servent pour vous proposer des postes. », et un bandeau bleu clair illustré « Un dossier à jour, ce sont des postes qui vous correspondent. ». Aucun emoji.
- **CA-02** Progression : un anneau rempli selon le pourcentage (barre de progression accessible « Progression du dossier »), sans titre « Votre dossier est complet » ni pourcentage écrit (choix de l'utilisateur du 2026-10-19) ; « N informations sur 8 saisies ou confirmées. » suivi de « Vous pouvez déposer des certificats et postuler. » ou « Complétez-le pour déposer des certificats et postuler. » ; « Dernière confirmation le … · prochaine avant le … » quand des informations ont été confirmées.
- **CA-03** « Mes informations, en 3 parties » : « Partie n sur 3 », titre, contenu et une pastille « Complet » ou « À compléter » pour les parties 1 (coordonnées) et 2 (contact d'urgence et études), chacune menant à sa page.
- **CA-04** Partie 3 « Mes informations RH » directement dans la page : agence, poste actuel, date d'embauche avec leur valeur ; « Confirmé le … » ou « Signalé aux RH le … » ; sinon « C'est exact » et « Signaler une erreur » (même formulaire que la page de la partie 3, qui reste accessible). La progression se met à jour après la réponse.
- **CA-05** À droite sur ordinateur (en haut sur téléphone) : l'identité (photo officielle ou initiales, nom, matricule, date de naissance, sexe) avec « Non modifiable : une erreur ? Signalez-la aux RH. » ; en bas, « Pourquoi nous collectons ces données ? » et « Qui y a accès ? » (« Le service RH seulement. Chaque consultation est enregistrée. »).
- **CA-06** Le détail complet (Identité, Coordonnées, Informations professionnelles, avec « Modifiable » ou le cadenas) reste en bas, replié sous « Voir tout le détail de mon dossier ».
- **CA-07** Sans consentement, la partie 3 montre les valeurs sans boutons, avec un lien vers sa page, qui passe d'abord par « Avant de commencer » (US-202 CA-01) ; la page elle-même reste consultable.

## Hors périmètre

La carte « Mes certificats » sur téléphone est retirée (la rubrique est dans la barre du bas et le menu).

## Notes

Choix de l'utilisateur du 2026-10-19 : ni titre « Votre dossier est complet » ni pourcentage écrit dans l'anneau ; garder le détail complet sous les 3 parties ; confirmer ou signaler la partie 3 directement dans « Mon dossier ». Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
