# US-1017 — Session du modèle

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | pam/pam/modele_authentification.md (porte 3) |
| **Règles** | — |
| **Décisions liées** | D-60 |

## Récit

> En tant qu'**employé**, je veux que ma session se ferme vite si je laisse mon téléphone ou mon poste sans surveillance, **afin que personne ne consulte mon dossier ou mon PER à ma place**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Sans action pendant 5 minutes, l'écran ferme la session et revient à la connexion avec « Session fermée après 5 minutes sans action. ».
- **CA-02** Le serveur borne la session employé à 15 minutes depuis la connexion, même si la personne clique ; le cookie a la même durée (Max-Age=900), HttpOnly, SameSite=Strict, Secure en HTTPS.
- **CA-03** Chaque réponse porte X-Content-Type-Options: nosniff, X-Frame-Options: DENY, une politique de contenu « default-src 'self' », Cache-Control: no-store pour l'API et HSTS un an en HTTPS.

## Notes

Modèle d'authentification du directeur, appliqué à toute l'application (choix du 2026-10-28 : « fais comme il a fait », Q14). L'espace de gestion garde 15 minutes d'inactivité. La politique de contenu admet les images blob:/data: (aperçu des scans) et les styles en ligne de React.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
