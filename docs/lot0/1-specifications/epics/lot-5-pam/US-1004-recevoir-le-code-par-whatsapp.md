# US-1004 — Recevoir le code par WhatsApp

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Doc PAM (canal WhatsApp, quota) |
| **Règles** | — |
| **Décisions liées** | D-55, D-56 |

## Récit

> En tant qu'**employé**, je veux recevoir mon code de connexion par WhatsApp, sur le numéro de mon dossier, **afin de me connecter même sans courriel professionnel**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Écran 2 : WhatsApp est proposé avec le numéro de Vault masqué (« +509 •••• 1111 ») et le nombre de messages qui restent ce mois-ci (sur 5). L'employé ne peut saisir aucun autre numéro. Un canal absent du dossier est grisé ; sans courriel ni numéro : « Contactez la DRH ».
- **CA-02** Le numéro de Vault est lu au format international : « +509 3722-7777 » et « 37228888 » deviennent +50937227777 et +50937228888 ; un numéro illisible compte comme absent.
- **CA-03** Quota : 5 messages WhatsApp par employé et par mois civil, renvois compris, comptés côté serveur. Au 6e, WhatsApp est refusé et grisé ; le courriel reste proposé s'il existe, sinon « Contactez la DRH ». Le quota repart à 5 le mois suivant.
- **CA-04** Les règles du code (6 chiffres, 5 minutes, 3 essais, 60 secondes entre deux envois, 3 renvois par 15 minutes) sont celles de US-1003, quel que soit le canal ; un code envoyé par WhatsApp ne vaut pas pour le courriel.
- **CA-05** Les avertissements de connexion et de verrouillage ne partent jamais par WhatsApp (seulement par courriel).
- **CA-06** Envoi par l'API officielle de Meta, avec le modèle « Authentification » (`WHATSAPP_TEMPLATE`). Sur le poste du développeur, rien ne part et le code s'affiche. Ailleurs, sans configuration, WhatsApp est refusé : « La connexion est momentanément impossible ».

## Notes

Doc PAM (G. Hilaire, 2026-10-27). Le mois civil est compté en heure UTC. Restent à fournir par G. Hilaire (Q11 du plan) : le nom du modèle approuvé et le jeton d'utilisateur système.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
