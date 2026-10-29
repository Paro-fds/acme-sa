# US-1005 — Bloquer un contact récemment changé

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Doc PAM (changement de coordonnées par la DRH) |
| **Règles** | — |
| **Décisions liées** | D-56 |

## Récit

> En tant qu'**employé**, je veux qu'un courriel ou un numéro nouvellement enregistré ne reçoive pas de code pendant 72 heures, **afin que personne ne prenne mon accès en faisant changer mes coordonnées à son profit**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** PAM retient, pour chaque employé et chaque canal, le dernier contact vu dans Vault et la date de son changement. Le premier contact vu n'est pas bloqué.
- **CA-02** Quand le courriel ou le numéro de Vault change, le nouveau contact ne reçoit aucun code pendant 72 heures : à l'écran 2, il est grisé avec « Ce contact a été modifié il y a moins de 72 heures. Contactez la DRH. », et une demande de code est refusée.
- **CA-03** Au moment où le changement est vu, un courriel prévient l'ancienne adresse si le courriel a changé, ou l'adresse actuelle si c'est le numéro ; jamais par WhatsApp. Il ne contient ni lien, ni code employé, ni nom complet.
- **CA-04** Après 72 heures, le contact est proposé normalement. Un autre canal qui n'a pas changé reste utilisable pendant ce temps.

## Notes

Doc PAM (G. Hilaire, 2026-10-27). Le changement est vu à la première identification qui suit la nouvelle copie de Vault : les 72 heures partent de ce moment, donc au plus tôt quand quelqu'un essaie de s'en servir.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
