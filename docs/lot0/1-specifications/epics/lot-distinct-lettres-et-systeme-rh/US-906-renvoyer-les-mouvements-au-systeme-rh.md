# US-906 — Renvoyer les mouvements au système RH

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D9 Demandes et mouvements de carrière |
| **Lot** | Lot distinct |
| **Priorité** | Could (à préciser) |
| **Exigences** | Q5 §6, étape B ; QR-03 |
| **Règles** | — |
| **Décisions liées** | D-20 |

## Récit

> En tant qu'**Administrateur**, je veux exporter les mouvements et corrections validés vers le système RH, **afin que le système RH et le portail disent la même chose**.

## Pourquoi

Critère de réussite n°2 : une demande traitée en quelques jours au lieu de quelques semaines.

## Critères d'acceptation

- **CA-01** L'export ne contient que des données validées, dans un format convenu avec la DIT.
- **CA-02** Chaque export est tracé.

## Notes

Lot distinct : format et fréquence à convenir avec la DIT.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
