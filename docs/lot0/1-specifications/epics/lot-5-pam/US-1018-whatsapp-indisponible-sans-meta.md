# US-1018 — WhatsApp indisponible sans Meta

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | pam/pam/modele_authentification.md (écran 2, porte 2) |
| **Règles** | — |
| **Décisions liées** | D-60 |

## Récit

> En tant qu'**employé**, je veux voir que WhatsApp n'est pas encore ouvert, sans erreur au clic, **afin de de choisir tout de suite le courriel**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Tant que le modèle Meta et le jeton ne sont pas configurés, WhatsApp est affiché grisé avec « Indisponible » ; son numéro reste affiché, masqué ; le courriel reste proposé.
- **CA-02** Une demande de code par WhatsApp répond « WhatsApp est indisponible. » et n'envoie ni ne compte aucun message.
- **CA-03** Dès que le modèle et le jeton sont configurés, WhatsApp est proposé comme dans US-1004.

## Notes

Modèle d'authentification du directeur (2026-10-28) : « Tant qu'aucun modèle et aucun jeton réels ne sont fournis, ce bouton ne part pas ».

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
