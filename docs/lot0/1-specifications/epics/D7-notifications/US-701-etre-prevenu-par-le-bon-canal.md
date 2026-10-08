# US-701 — Être prévenu par le bon canal

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D7 Notifications |
| **Lot** | 1 |
| **Priorité** | Must (Should pour l'ordre des canaux) |
| **Exigences** | EF-701, EF-702, EF-703 |
| **Règles** | RG-50 |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé**, je veux choisir d'être prévenu par WhatsApp et consentir aux messages, **afin de suivre mes démarches sans ouvrir le portail tous les jours**.

## Pourquoi

Un quart des employés n'ont pas d'email ; WhatsApp touche presque tout le monde (Q7).

## Critères d'acceptation

- **CA-01** Le consentement WhatsApp se donne et se retire dans le profil.
- **CA-02** Ordre des canaux : WhatsApp, puis email institutionnel, puis email personnel avec consentement.
- **CA-03** WhatsApp passe uniquement par l'API officielle de Meta, avec des modèles approuvés.

## Notes

Prestataire et budget WhatsApp : livrable 7.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
