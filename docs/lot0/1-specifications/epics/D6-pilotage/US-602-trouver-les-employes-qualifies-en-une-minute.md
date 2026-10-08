# US-602 — Trouver les employés qualifiés en une minute

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D6 Pilotage |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-602, EF-603 |
| **Règles** | RG-30, RG-31 |
| **Décisions liées** | D-22 |

## Récit

> En tant qu'**Agent RH**, je veux chercher les employés par niveau validé, domaine et unité, **afin de proposer des candidats pour une promotion ou un poste (critère de réussite n°1)**.

## Pourquoi

Critère de réussite n°1 : une liste de candidats qualifiés en une minute ; décisions traçables.

## Critères d'acceptation

- **CA-01** « Au moins Licence » + « Comptabilité » + « Région Sud » donne la liste en quelques secondes.
- **CA-02** Seuls les certificats validés comptent.
- **CA-03** La liste se filtre aussi par agence, statut du dossier et niveau d'études.
- **CA-04** Chaque consultation d'un dossier depuis la liste est tracée.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
