# US-136 — Alléger la page d'accueil

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

> En tant qu'**employé**, je veux voir en arrivant ce que j'ai à faire et où j'en suis, sans tout relire, **afin d'agir tout de suite**.

## Pourquoi

Demande de l'utilisateur du 2026-10-20 : les tuiles de l'accueil (US-123, US-128) « manquent de finesse ». Les tuiles étaient trop étroites (quatre sur une ligne, à côté des dates) et trop bavardes, et la page répétait les postes trois fois (tuile, poste mis en avant, dates à retenir) et les notifications (activité récente et cloche).

## Critères d'acceptation

Dossier complet :

- **CA-01** L'en-tête ne change pas (bonjour, phrase de bienvenue, « Déposer un certificat », bandeau illustré).
- **CA-02** « À faire », seulement s'il y a quelque chose : la confirmation annuelle des informations (US-205) et chaque certificat à corriger (« Certificat à corriger : <intitulé> », bouton « Corriger » vers le dépôt de remplacement, US-130).
- **CA-03** « Vos chiffres » : trois tuiles au plus, sans phrase : Postes pour vous, Mes certificats (« validés sur N »), Ma candidature (« étape sur 7 », s'il y en a une). L'unité est en texte normal ; la tuile « Mon dossier » n'apparaît plus quand le dossier est complet.
- **CA-04** Le poste mis en avant ne change pas.
- **CA-05** « Activité récente » et « Dates à retenir » quittent l'accueil (la cloche et « Ma carrière » les gardent) ; la page prend toute la largeur.

Dossier incomplet :

- **CA-06** Inchangé (le dossier d'abord, certificats et postes après ; « Il reste N informations à compléter »), sans « Activité récente ».

Mon dossier (demande du 2026-10-20) :

- **CA-07** Dossier complet : la carte de progression (anneau, « 8 informations sur 8 saisies ou confirmées… », « Dernière confirmation le … ») disparaît. Elle reste tant que le dossier est incomplet.

## Notes

Choix de l'utilisateur du 2026-10-20 : version « allégée » ; puis retirer la carte de progression de « Mon dossier » (gardée tant que le dossier est incomplet). Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
