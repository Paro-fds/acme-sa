# US-118 — Voir le fichier de mon certificat

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D3 Certificats |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-303 |
| **Règles** | RG-26 |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé**, je veux ouvrir le fichier que j'ai déposé pour chacun de mes certificats, **afin de vérifier ce que les RH examinent et retrouver ma preuve**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** Chaque certificat de « Mes certificats » a un bouton « Voir le fichier » qui ouvre le fichier déposé (PDF ou photo) dans un nouvel onglet.
- **CA-02** L'employé ne voit que ses propres fichiers : le certificat d'un autre employé répond « introuvable », comme un certificat qui n'existe pas.
- **CA-03** Un certificat archivé (remplacé) garde son fichier consultable : il reste une preuve.
- **CA-04** Si le fichier manque dans le stockage, un message clair le dit au lieu d'une erreur serveur.

## Notes

Demande de l'utilisateur du 2026-10-13 : « quand un employé upload son fichier il puisse aussi le voir ». Jusque-là seul l'espace de gestion lisait le fichier (US-401).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
