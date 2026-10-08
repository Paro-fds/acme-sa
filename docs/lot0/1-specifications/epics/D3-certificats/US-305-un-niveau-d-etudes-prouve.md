# US-305 — Un niveau d'études prouvé

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D3 Certificats |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-306 |
| **Règles** | RG-18, RG-30 |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux voir le niveau d'études calculé sur le plus haut certificat validé, **afin de comparer les employés sur des preuves**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** Le niveau du profil = rang le plus élevé parmi les certificats validés ; à défaut, le niveau déclaré.
- **CA-02** Un niveau déclaré supérieur au niveau validé est signalé aux RH.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
