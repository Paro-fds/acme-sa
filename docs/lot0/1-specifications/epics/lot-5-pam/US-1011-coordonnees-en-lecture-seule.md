# US-1011 — Coordonnées en lecture seule

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Doc PAM (contacts lus dans le profil RH, modifiés par la DRH) |
| **Règles** | RG-01 |
| **Décisions liées** | D-56 |

## Récit

> En tant qu'**employé**, je veux voir mon courriel et mon téléphone tels que la DRH les a enregistrés, sans pouvoir les changer, **afin que personne ne détourne mon code de connexion en changeant mes coordonnées dans PAM**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Mes coordonnées » montre le téléphone et le courriel de Vault avec un cadenas et « Pour les changer, adressez-vous à la DRH. » ; seule l'adresse se modifie.
- **CA-02** Un téléphone ou un courriel envoyé à l'enregistrement est refusé ; rien n'est changé.
- **CA-03** Le téléphone et le courriel comptent comme complets dans le dossier (RG-01 revue) : l'employé n'a rien à y faire ; sans courriel dans Vault, « pas d'adresse email ».
- **CA-04** La confirmation annuelle (US-205) ne les demande plus.

## Notes

Plan PAM (US-1011). « Je n'ai pas d'adresse email » disparaît de l'écran. Au départ, le dossier est à 25 % (2 éléments sur 8).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
