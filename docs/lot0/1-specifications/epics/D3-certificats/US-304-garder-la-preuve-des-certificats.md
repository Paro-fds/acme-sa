# US-304 — Garder la preuve des certificats

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D3 Certificats |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-305 |
| **Règles** | RG-27 |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux retrouver tout certificat validé, même remplacé, **afin qu'une qualification prouvée ne se perde jamais**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** Un certificat validé ne peut pas être supprimé.
- **CA-02** Remplacé, l'ancien reste archivé avec son historique de décisions.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
