# US-201 — Voir mon dossier et ma progression

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-201, EF-206 |
| **Règles** | RG-01, RG-05, RG-17 |
| **Décisions liées** | D-03 |

## Récit

> En tant qu'**employé**, je veux voir mes informations RH et « Votre dossier est complet à X % », **afin de savoir en un coup d'œil ce qui me reste à faire**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** L'agence, la région et la direction s'affichent avec leur libellé officiel, jamais la valeur brute de l'export.
- **CA-02** Le pourcentage = éléments complets ÷ 8, arrondi à l'entier ; il change dès qu'une information est enregistrée.
- **CA-03** Une agence inconnue du référentiel s'affiche « Unité à confirmer », sans bloquer l'employé.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
