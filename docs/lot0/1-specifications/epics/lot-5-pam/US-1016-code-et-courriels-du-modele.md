# US-1016 — Code et courriels du modèle

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | pam/pam/modele_authentification.md (porte 2) |
| **Règles** | — |
| **Décisions liées** | D-60 |

## Récit

> En tant qu'**employé**, je veux recevoir mon code et les avis de sécurité comme le prévoit le modèle de PAM, **afin de de reconnaître les messages d'ACME et de comprendre ce que je dois faire**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Un code faux, expiré, déjà utilisé ou brûlé après 3 erreurs donne toujours « Code incorrect ou expiré. », sans le nombre d'essais restants.
- **CA-02** 60 secondes entre deux envois (« Veuillez patienter avant un nouvel envoi. »), au plus 3 renvois par fenêtre de 15 minutes (« Le nombre de renvois est atteint. Réessayez plus tard. »). Un envoi refusé ne consomme ni l'attente ni un renvoi : « Le courriel n'a pas pu être envoyé. Contactez la DIT. ».
- **CA-03** Le code part en HTML (modèle du directeur, sujet « ACME SA — Code de vérification PAM ») avec une partie texte ; prénom en casse de titre s'il est en capitales, échappé, « Bonjour, » s'il manque. Les avis (connexion, essais refusés, contact changé) restent en texte, sujet « ACME SA — PAM ».
- **CA-04** Expéditeur et adresse de réponse réglables (SES_SENDER, SES_REPLY_TO : autorapport@ et dit@acmehaiti.com en production). L'identification ouvre l'envoi du code pendant 20 minutes.

## Notes

Modèle d'authentification du directeur (2026-10-28). Le texte du modèle « pour consulter votre balance PER » devient « pour vous connecter à la plateforme PAM », la connexion servant à toute l'application. On garde notre design : écrans avec nos composants, courriel du code aux couleurs de nos jetons (index.css).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
