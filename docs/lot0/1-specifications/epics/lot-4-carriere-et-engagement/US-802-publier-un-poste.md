# US-802 — Publier un poste

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D8 Carrière et postes |
| **Lot** | 4 |
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
- **CA-03** Un Administrateur peut marquer un poste confidentiel, avec un motif ; seules les personnes ciblées le voient.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
