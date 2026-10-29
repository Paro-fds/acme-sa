# US-1027 — Lire les secrets de PAM dans Secrets Manager

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Consignes du directeur à Skin (`PAM_ordres_Skin_final.md`, points 9, 10 et 12) et `PAM_avant_phase_B.md` (points 1 à 3), 2026-10-29 |
| **Règles** | — |
| **Décisions liées** | D-62 |

## Récit

> En tant qu'**équipe de déploiement**, je veux que la fonction lise ses mots de passe dans Secrets Manager au démarrage, **afin qu'aucun mot de passe ne passe par moi, la console ou un fichier**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Au démarrage, la fonction lit les secrets nommés par `DATABASE_SECRET_ID` (`pam-dev/db-portail`), `CARRIERES_DATABASE_SECRET_ID` (`pam-dev/db-carrieres`) et `OTP_HMAC_SECRET_ID` (`pam-dev/otp-hmac`) ; les deux premiers sont au format JSON `{username, password, host, port, dbname}`, le troisième est une chaîne.
- **CA-02** L'adresse du serveur peut venir d'une variable de configuration (`DATABASE_HOST`, `CARRIERES_DATABASE_HOST`), qui l'emporte sur celle du secret ; une adresse déjà donnée en clair (`DATABASE_URL`…) reste prioritaire, pour le poste local.
- **CA-03** Secret absent, illisible ou incomplet : la fonction ne démarre pas et dit lequel (« Le secret pam-dev/db-portail est illisible. ») sans jamais afficher son contenu ; aucun mot de passe dans les journaux.

## Notes

Phase B du directeur : le rôle `pam-dev-lambda-role` lit `pam-dev/*` (`secretsmanager:GetSecretValue`), pas de clé KMS personnalisée. Le guide `docs/pam/deploiement-console.md` passe aux noms `pam-dev-…`.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
