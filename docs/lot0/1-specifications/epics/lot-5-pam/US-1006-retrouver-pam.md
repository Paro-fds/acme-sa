# US-1006 — Retrouver PAM

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Doc PAM (nom de l'application) |
| **Règles** | — |
| **Décisions liées** | D-48 |

## Récit

> En tant qu'**employé ou RH**, je veux voir le nom PAM partout où je vois l'application, **afin de de reconnaître la plateforme dont parlent ACME et les courriels**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Portail Carrière » est remplacé par « PAM » dans les en-têtes de l'accueil, de la connexion, de l'espace employé et de l'espace de gestion ; le nom complet « Plateforme ACME Multifonction » est donné à côté ou en info-bulle.
- **CA-02** Le titre de l'onglet est « PAM — ACME SA » ; les textes qui disaient « le portail » disent « PAM ».
- **CA-03** On garde notre design : seuls les noms changent.

## Notes

Plan PAM (D-48). Les textes de l'accueil et de la connexion (dossier et diplômes) restent ; ils seront revus quand le PER et les postes arriveront.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
