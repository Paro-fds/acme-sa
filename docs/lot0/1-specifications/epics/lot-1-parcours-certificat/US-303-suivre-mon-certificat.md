# US-303 — Suivre mon certificat

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D3 Certificats |
| **Lot** | 1 (« À corriger » et redépôt au lot 2 ; notification avec US-701) |
| **Priorité** | Must |
| **Exigences** | EF-303, EF-304, EF-703 |
| **Règles** | RG-26, RG-50 |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé**, je veux voir toujours où en est mon certificat et être prévenu quand il change, **afin de ne jamais rester sans réponse**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** Statuts : Reçu / En vérification → Validé, ou À corriger.
- **CA-02** À corriger (lot 2) : le motif est formulé poliment, et un bouton permet de redéposer ; le redépôt repasse « En vérification ».
- **CA-03** Chaque changement de statut déclenche une notification, WhatsApp en priorité.

## Notes

CA-03 part avec US-701, reportée le 2026-10-08 (prestataire d'envoi non choisi, D-41, livrable 7).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
