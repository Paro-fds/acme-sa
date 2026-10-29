# US-132 — Retrouver le tableau de bord RH de la refonte

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D6 Pilotage |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | — |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**agent RH**, je veux voir en ouvrant l'espace de gestion ce qui m'attend, où en sont les dossiers par agence et si les employés reviennent, **afin de savoir par quoi commencer**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/RhTableauDeBord.dc.html`), dans le cadre d'US-127.

## Critères d'acceptation

- **CA-01** En-tête : « Bonjour » et le prénom du compte RH ; « N certificats attendent une décision, dont K en retard. Commencez par le plus ancien. » (ou « Aucun certificat n'attend de décision. ») ; « Prendre le suivant » (prend le plus ancien et ouvre son examen) pour l'administrateur et l'agent RH seulement ; un bandeau illustré « Des dossiers fiables, des postes pourvus en interne. ». Aucun emoji.
- **CA-02** Quatre tuiles : « Employés actifs » (et le nombre d'agences), « Dossiers complets » (pourcentage, « X sur Y · objectif 90 % »), « Certificats à décider » (et « K en retard »), « Signalements à traiter » ; chacune mène à sa page quand le rôle y a accès.
- **CA-03** « Dossiers complets par agence » : une barre par agence, de la plus avancée à la moins avancée, avec son pourcentage et la ligne de l'objectif ; lisible par un lecteur d'écran.
- **CA-04** « À faire » : les certificats en retard, les signalements à traiter, « N candidatures en cours sur M postes », et les valeurs à rattacher au référentiel pour qui gère le référentiel ; chaque ligne mène à sa page ; rien à faire : une phrase le dit.
- **CA-05** « Engagement des employés » : le nombre d'employés différents connectés ces 7 derniers jours, l'écart avec les 7 jours d'avant, et une petite courbe des 8 dernières semaines (périodes de 7 jours) ; aucun nom.
- **CA-06** En bas, le tableau « Par unité » (agence, région, direction) reste inchangé ; la barre « Répartition des dossiers » et la carte « Rejetés ce mois » sont retirées.

## Notes

Choix de l'utilisateur du 2026-10-19 : garder le tableau « Par unité » en bas. Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
