# US-134 — Retrouver la liste des employés de la refonte

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D6 Pilotage |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | RG-30 |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**agent RH**, je veux trouver les employés qualifiés par nom, niveau validé, domaine ou agence, et voir d'un coup d'œil leur poste, leur niveau et l'état de leur dossier, **afin de proposer les bonnes personnes**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/RhEmployes.dc.html`), dans le cadre d'US-127. Reprend l'écran A06 (US-602, US-603).

## Critères d'acceptation

- **CA-01** En-tête : « Employés », « Trouvez les employés qualifiés : par nom, niveau validé, domaine ou agence. », bouton « Exporter la liste » qui télécharge le fichier Excel de la liste filtrée. Aucun emoji.
- **CA-02** « Rechercher un employé » (libellé visible), « Nom, prénom ou matricule ».
- **CA-03** Quatre filtres, dans cet ordre : Niveau validé minimum (Baccalauréat, Bac + 2, Licence, Master), Domaine, Agence, Statut du dossier (Profil incomplet, Profil complet, Dossier complet). Région et Direction sont retirés de l'écran (le serveur et l'export les gardent).
- **CA-04** « Filtres actifs : » avec une pastille par filtre (« Licence et plus », la valeur sinon) et « Retirer le filtre … » ; « N employés sur M » (M = tous les employés actifs).
- **CA-05** Le tableau : Employé (nom en lien vers le dossier, matricule), Poste et agence, Niveau validé (« Licence · Comptabilité »), Embauche (année), Dossier (les trois états), Mis à jour (« 8 oct. 2026 »). Sur téléphone, des cartes.
- **CA-06** « 1 à 20 sur N », « Précédent » et « Suivant » ; sous la liste : « Chaque export est enregistré dans le journal d'audit. »

## Notes

Choix de l'utilisateur du 2026-10-20 : la colonne « Dossier » garde les trois états (pas de pourcentage) ; les 4 filtres de la maquette ; « Exporter la liste » télécharge l'Excel (le CSV reste disponible par l'API). Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
