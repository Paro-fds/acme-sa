# US-904 — Reprendre l'historique des demandes

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D9 Demandes et mouvements de carrière |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-905 |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux importer l'historique des demandes depuis un fichier Excel, **afin que le registre parte avec le passé**.

## Pourquoi

Critère de réussite n°2 : une demande traitée en quelques jours au lieu de quelques semaines.

## Critères d'acceptation

- **CA-01** L'import refuse une ligne incomplète et dit pourquoi, sans bloquer les autres.
- **CA-02** Les demandes importées sont marquées comme telles.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
