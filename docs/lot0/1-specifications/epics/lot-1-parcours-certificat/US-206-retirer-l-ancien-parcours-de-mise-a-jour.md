# US-206 — Retirer l'ancien parcours de mise à jour

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | — |
| **Règles** | RG-07 |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé**, je veux n'avoir qu'une seule façon de compléter mon dossier et de déposer mes documents, **afin de ne jamais hésiter entre deux parcours**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** L'espace employé n'affiche plus l'ancien parcours du MVP : ni la question Oui / Non, ni le brouillon, la vérification et l'envoi, ni « Mes documents ».
- **CA-02** Les anciennes adresses (/mise-a-jour/…, /documents) ramènent à « Mon profil ».
- **CA-03** Les routes employé de l'ancien parcours (/api/me/update/…, /api/me/documents/…) n'existent plus ; ce qui a déjà été envoyé reste lisible par les RH jusqu'au lot 2.

## Notes

Demande de l'utilisateur du 2026-10-08 (PRD §7) : US-202 et US-301 remplacent l'ancien parcours.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
