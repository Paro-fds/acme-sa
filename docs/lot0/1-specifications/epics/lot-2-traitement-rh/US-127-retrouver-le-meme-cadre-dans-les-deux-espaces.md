# US-127 — Retrouver le même cadre dans les deux espaces

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | ENF-44 |
| **Règles** | — |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**employé ou compte de l'espace de gestion**, je veux un menu toujours visible et une barre du haut qui me dit qui je suis, **afin de savoir à tout moment où je suis et où je peux aller**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/`) : toutes les pages suivantes (US-128 → US-135) s'appuient sur ce cadre.

## Critères d'acceptation

- **CA-01** Sur ordinateur, dans les deux espaces, le menu est un panneau bleu de la charte à gauche : logo et « ACME SA », sous-titre (« Microfinance, un avenir ensemble » côté employé, « Espace de gestion » côté gestion), rubriques avec leur icône (et leurs compteurs côté gestion), « Se déconnecter », puis en bas des montagnes dessinées et « Grandir ensemble pour un impact durable ».
- **CA-02** Le menu reste en place quand la page défile ; s'il est plus haut que l'écran, il défile seul.
- **CA-03** Une barre du haut blanche montre la date du jour, la cloche des notifications et le compte : nom et poste (employé), nom et rôle (gestion), avec le menu du compte.
- **CA-04** Sur téléphone, rien ne change côté employé (en-tête, bouton ☰, barre du bas) ; côté gestion, le bouton ☰ de la barre du haut ouvre le même panneau bleu.
- **CA-05** Couleurs uniquement par les jetons de `index.css` ; aucun emoji ; zones tactiles de 44 px au moins.

## Notes

Demande et validation de l'utilisateur du 2026-10-19 (« la partie menu doit être fixe, elle ne doit pas défiler comme le reste de la page » ; « feu vert d'implémenter ces pages suivant notre charte graphique »). Remplace l'en-tête bleu de l'espace de gestion (US-108, US-111) et le menu blanc de l'espace employé (US-113). Écart avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
