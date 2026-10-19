# US-802 — Publier un poste

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 4 (poste confidentiel (EF-807, Should) plus tard) |
| **Priorité** | Must (Should pour la confidentialité) |
| **Exigences** | EF-803, EF-804, EF-807 |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux saisir un poste ouvert, que l'Administrateur publie après l'avoir validé, **afin que les postes soient pourvus en priorité en interne**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** Fiche : intitulé et code, unité, grade visé, mission, critères, dates d'ouverture et limite.
- **CA-02** Statuts Brouillon, Publié, Clôturé, Pourvu, avec date et auteur ; un critère modifié après publication est tracé.

## Notes

Choix de l'utilisateur du 2026-10-11 : lot 4 limité aux priorités Must, donc le poste confidentiel (EF-807, Should : « Un Administrateur peut marquer un poste confidentiel, avec un motif ; seules les personnes ciblées le voient ») est reporté ; critères structurés (niveau d'études minimum, domaine, ancienneté dans l'institution et dans le poste, grade minimum, unité), tous facultatifs, pour que US-801 calcule l'éligibilité ; l'Agent RH et l'Administrateur saisissent et modifient, seul l'Administrateur publie, clôture et marque pourvu ; un poste clôturé ou pourvu ne se modifie plus ; chaque étape est inscrite au journal d'audit (US-604). 🟡 Grade : un nombre (8, 10…), comme dans l'export RH ; l'ordre des grades est à confirmer par la DRH.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
