# US-903 — Contrôler les mouvements lus dans les lettres

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D9 Demandes et mouvements de carrière |
| **Lot** | 2 (ancienneté dans le poste au lot 4) |
| **Priorité** | Should (Must pour l'ancienneté) |
| **Exigences** | EF-906, EF-907 |
| **Règles** | RG-72 |
| **Décisions liées** | D-33, D-38 |

## Récit

> En tant qu'**Agent RH**, je veux contrôler les promotions, transferts et nominations que le portail a lus dans les lettres scannées, **afin de connaître l'ancienneté de chacun dans son poste**.

## Pourquoi

Critère de réussite n°2 : une demande traitée en quelques jours au lieu de quelques semaines.

## Critères d'acceptation

- **CA-01** Je vois la lettre d'un côté, les champs lus de l'autre ; rien n'est enregistré sans ma validation.
- **CA-02** Les salaires et montants ne sont jamais extraits ni stockés.
- **CA-03** Ancienneté dans le poste = aujourd'hui moins la date d'effet du dernier mouvement, ou la date d'embauche.

## Notes

Test préalable sur 20 à 30 lettres (livrable 5).

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
