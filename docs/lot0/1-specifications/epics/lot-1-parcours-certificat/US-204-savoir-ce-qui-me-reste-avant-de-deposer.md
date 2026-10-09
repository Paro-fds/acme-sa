# US-204 — Savoir ce qui me reste avant de déposer

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-207 |
| **Règles** | RG-06, RG-07 |
| **Décisions liées** | D-01 |

## Récit

> En tant qu'**employé**, je veux voir la liste de ce qui manque avant de pouvoir déposer un certificat, avec un lien vers chaque champ, **afin que mon certificat arrive dans un dossier déjà propre**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** Tant que le profil n'est pas complet, le dépôt affiche « Il reste N informations à compléter » et un lien vers chacune.
- **CA-02** À 8 sur 8, le dépôt s'ouvre sans autre action.
- **CA-03** Le profil reste toujours consultable ; aucun message ne ressemble à une sanction.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
