# PAM — Déploiement par la console AWS (environnement de développement `pam-dev-`)

Cadre : consignes du directeur du 2026-10-29 (`PAM_ordres_Skin_final.md`, phases A et B). Compte ACME-SA
790561526299, région **us-east-1 uniquement**, console avec MFA, pas d'AWS CLI. **Données de test seulement** :
balances fictives `TEST0001` à `TEST0012`, annuaire fictif ; jamais de données réelles d'employés ou de candidats.
Le code refuse de démarrer sans Vault S3, sans base Carrières ou sans seau PER, et ne se rabat jamais sur les
données fictives du poste.

## Règles, appliquées à PAM

| Règle du directeur | Pour PAM |
|---|---|
| Tout nom commence par `pam-dev-` | `pam-dev-app` (fonction), `pam-dev-api` (API) ; seaux `pam-dev-fichiers`, `pam-dev-balances` (créés par lui) |
| Étiquette `Project=PAM` sur l'API Gateway et toute application Amplify, dès la création | Sans elle, l'accès est refusé ; la mettre aussi sur la fonction |
| Rôle `pam-dev-lambda-role`, déjà créé | L'associer à la fonction ; ne créer ni modifier aucun rôle ni aucune politique |
| Ne toucher à aucune ressource `conges-dispo-*` ni `pam-prod-*` | L'ancien essai `conges-dispo-pam-app` n'est plus utilisé ; ne pas le supprimer soi-même, le signaler |
| Mots de passe et clés dans Secrets Manager sous `pam-dev/`, aucune clé KMS personnalisée | La fonction lit `pam-dev/db-portail`, `pam-dev/db-carrieres` et `pam-dev/otp-hmac` au démarrage (US-1027) : personne ne les saisit |
| Courriels depuis `autorapport@acmehaiti.com` seulement, par le rôle | Aucun identifiant SES à fournir ; le directeur valide le texte du courriel du code avant usage |
| Aucune donnée personnelle dans les journaux ; audit en ajout seulement | PAM n'écrit dans `journal_audit` de Carrières que des ajouts |
| Accès refusé (AccessDenied) | Aucun contournement : envoyer au directeur le message complet, l'action et la ressource |

## Le montage

Comme le module du directeur, **une seule fonction Lambda** sert l'API et l'écran, derrière une **API Gateway
HTTP API**.

```
Employé ─► API pam-dev-api ─► Lambda pam-dev-app ─► PostgreSQL « portail » de PAM      (secret pam-dev/db-portail)
                                            ├► PostgreSQL Carrières, compte pam_app   (secret pam-dev/db-carrieres)
                                            ├► S3 annuaire Vault (lecture)            (seau : à confirmer, § 6)
                                            ├► S3 pam-dev-balances / pam/balances/…   (PER et fiches, lecture)
                                            ├► S3 pam-dev-fichiers                    (fichiers déposés)
                                            ├► Secrets Manager pam-dev/*              (lecture au démarrage)
                                            └► SES autorapport@acmehaiti.com          (codes et avis)
```

## 1. Fabriquer le paquet

Double-cliquer sur `deploy\empaqueter.bat`. Il produit `deploy\out\pam-lambda.zip` (environ 16 Mo) : application,
migrations, écran compilé, modèle de la fiche de paie et logo, bibliothèques pour Linux. Ni secret, ni donnée
fictive.

## 2. La fonction (après le message « prêt » du directeur)

Lambda → **Create function** → **Author from scratch** :

| Champ | Valeur |
|---|---|
| Function name | `pam-dev-app` |
| Runtime | **Python 3.12**, architecture **x86_64** |
| Execution role | **Change default execution role** → **Use an existing role** → `pam-dev-lambda-role` |

Ne jamais laisser AWS créer un rôle. Puis :

1. **Code → Upload from → .zip file** : `deploy\out\pam-lambda.zip`.
2. **Runtime settings → Edit** : Handler `app.lambda_handler.handler`.
3. **Configuration → General configuration** : mémoire **1024 Mo**, délai **30 s**.
4. **Configuration → Tags** : `Project` = `PAM`.
5. **Configuration → VPC** : seulement si le directeur le décide (bases joignables uniquement dans le VPC, § 6).
6. **Configuration → Environment variables** — **aucun mot de passe ici** :

| Variable | Valeur |
|---|---|
| `APP_ENV` | `production` |
| `ACME_DATA_DIR` | `/tmp/pam` |
| `FRONTEND_DIST_DIR` | `/var/task/frontend_dist` |
| `AUTO_CREATE_SCHEMA` | `false` |
| `DATABASE_SECRET_ID` | `pam-dev/db-portail` |
| `DATABASE_HOST` | adresse du serveur de la base `portail` (donnée par le directeur) |
| `CARRIERES_DATABASE_SECRET_ID` | `pam-dev/db-carrieres` |
| `CARRIERES_DATABASE_HOST` | adresse du serveur Carrières (donnée par le directeur) |
| `OTP_HMAC_SECRET_ID` | `pam-dev/otp-hmac` |
| `VAULT_S3_BUCKET` / `VAULT_S3_KEY` | `pam-dev-fichiers` / `vault/vault-employee-list.csv` — à confirmer (§ 6) |
| `PER_S3_BUCKET` | `pam-dev-balances` |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET` | `pam-dev-fichiers` |
| `SES_SENDER` | `autorapport@acmehaiti.com` |
| `SES_REPLY_TO` | `dit@acmehaiti.com` |
| `ADMIN_USERNAME` | identifiant du premier compte de gestion |
| `ADMIN_PASSWORD_HASH` | empreinte Argon2 de son mot de passe (pas le mot de passe), voir ci-dessous |

`DATABASE_HOST` et `CARRIERES_DATABASE_HOST` sont facultatives : sans elles, l'adresse est prise dans le secret
(c'est le point 9 des consignes : « Mets l'adresse du serveur dans une variable de configuration »).

L'empreinte du compte de gestion se fabrique sur le poste, dans `backend\` (le mot de passe est demandé sans
s'afficher) :

```
.venv\Scripts\python -m app.tools.hash_password
```

Au démarrage, la fonction lit les trois secrets. S'il en manque un, ou si le rôle ne peut pas le lire, elle
s'arrête avec « Le secret pam-dev/… est illisible. », sans jamais afficher son contenu (journal CloudWatch).

## 3. L'adresse publique

API Gateway → **Create API** → **HTTP API** → **Build** :

- Integrations : **Lambda** → `pam-dev-app` ;
- API name : `pam-dev-api` ;
- Routes : une seule, **Method** `ANY` et **Resource path** `$default` (deux champs séparés) ;
- Stage : `$default`, auto-deploy ;
- **Tags : `Project` = `PAM`**, dès la création. Sans cette étiquette, l'API devient inaccessible : il faut la
  supprimer et recommencer.

Pas de CORS à régler : l'écran et l'API sont servis par la même adresse.

## 4. Créer les tables (quand les bases sont prêtes)

Lambda `pam-dev-app` → onglet **Test** → nouvel événement `migrer` :

```json
{ "action": "migrate" }
```

**Test** : la réponse doit être `{"migrated": true}`. À refaire après chaque nouveau paquet qui apporte une
migration. Les migrations ne touchent que la base `portail`, jamais Carrières.

## 5. Ce que le rôle `pam-dev-lambda-role` doit permettre

À vérifier avec le directeur (consigne 13 : ne rien contourner) :

| Droit | Ressource |
|---|---|
| `secretsmanager:GetSecretValue` | `pam-dev/db-portail`, `pam-dev/db-carrieres`, `pam-dev/otp-hmac` |
| `s3:GetObject` | l'annuaire Vault (§ 6) ; `pam-dev-balances/pam/balances/per/*` et `…/payslip/*` |
| `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` | `pam-dev-fichiers/*` |
| `ses:SendEmail` | `autorapport@acmehaiti.com` (condition `ses:FromAddress`) |
| réseau (`ec2:CreateNetworkInterface`…) | seulement si la fonction est rattachée au VPC |

Pas de `s3:ListBucket` sur les balances : une balance absente revient en « refusé », que PAM traite comme une
absence (« Aucune balance n'est disponible pour le moment. »), comme le module du directeur.

## 6. Questions ouvertes au directeur

- **Annuaire Vault** : `pam-dev-fichiers/vault/vault-employee-list.csv` (fictif, sa liste « Déjà en place ») ou
  `acme-prospection-data/vault/vault-employee-list.csv` (son point 8) ?
- **VPC** : les bases sont-elles joignables hors du VPC ? Sinon, la fonction y est rattachée, et il faut aussi
  joindre S3, SES et Secrets Manager depuis le VPC (points de terminaison ou NAT).
- **Base Carrières** : copie de test ou vraie base (sa recommandation : une copie de test) ?
- **Courriel du code** : lui faire valider le texte (`backend/app/auth/infrastructure/templates/pam_otp_email.html`).

## 7. Vérifier

1. Ouvrir l'adresse de l'API (`https://….execute-api.us-east-1.amazonaws.com`) : l'accueil de PAM s'affiche.
2. Se connecter avec un code de test (`TEST0001`…) : le code arrive par courriel (bac à sable SES : adresses
   vérifiées seulement).
3. « Mon PER » : balance, relevé et fiche de paie d'un employé de test.
4. CloudWatch → **Log groups** → `/aws/lambda/pam-dev-app` : aucune erreur, aucun mot de passe, aucune donnée
   personnelle.

L'adresse `pam.acmehaiti.com` viendra plus tard (domaine personnalisé de l'API, certificat, enregistrement DNS).

## Mettre à jour

L'écran et le serveur voyagent dans le même zip : une mise à jour de l'un ou de l'autre suit le même chemin.

1. Sur le poste : faire la modification, lancer les tests (`npm test` dans `frontend\`, `pytest` dans `backend\`).
2. Double-cliquer sur `deploy\empaqueter.bat` : il recompile l'écran et refait le zip.
3. Console Lambda → `pam-dev-app` → **Code → Upload from → .zip file** : le nouveau zip.
4. Seulement si la mise à jour apporte une migration : l'événement `migrer` (§ 4).
5. Ouvrir PAM et vérifier le changement.

Les employés voient la nouvelle version à leur prochaine visite, sans vider leur cache : la page est revérifiée à
chaque visite (`Cache-Control: no-cache`), et les fichiers de l'écran changent de nom à chaque compilation
(`/assets/`, gardés un an). Une page déjà ouverte garde l'ancienne version jusqu'au prochain rechargement ; après
5 minutes sans action, la déconnexion la recharge de toute façon.

En cas de problème, **revenir en arrière** : déposer le zip précédent. Garder une copie de chaque zip mis en
service, avec sa date (par exemple `pam-lambda-2026-10-29.zip`), hors du dépôt.

## Ressources créées

À tenir à jour et à partager avec le directeur.

| Ressource | Nom | Étiquette `Project` | Créée le | Par |
|---|---|---|---|---|
| Fonction Lambda | `pam-dev-app` | `PAM` | | |
| API HTTP | `pam-dev-api` | `PAM` | | |

Créés par le directeur : rôle `pam-dev-lambda-role`, seaux `pam-dev-balances` et `pam-dev-fichiers`, secrets
`pam-dev/*`, bases `portail` et Carrières (compte `pam_app`).
