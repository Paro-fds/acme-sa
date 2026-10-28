# PAM — Déploiement par la console AWS

Accès utilisé : **dev-conges**, avec l'accord du directeur (message « Votre accès AWS ACME SA : projet
Conges_disponibilites_acmesa »). Compte 790561526299, région **us-east-1 uniquement**, console seulement (pas
d'AWS CLI). Production avec les **vraies données** : le code refuse de démarrer en production sans Vault S3,
sans base Carrières ou sans seau PER, et ne se rabat jamais sur des données fictives.

## Règles de l'accès, appliquées à PAM

| Règle du directeur | Pour PAM |
|---|---|
| Tout nom commence par `conges-dispo-` | `conges-dispo-pam-app` (fonction), `conges-dispo-pam-api` (API), `conges-dispo-pam-fichiers` (seau) |
| Étiquette `Project` = `Conges_disponibilites_acmesa` | Obligatoire sur l'API Gateway ; à mettre aussi sur la fonction et le seau (suivi des coûts) |
| Rôle imposé `conges-dispo-lambda-role` (journaux seulement) | Les droits S3 et l'envoi de courriels sont à ajouter par un administrateur (§ 6) |
| Interdits : IAM, SES, CloudFront, Cognito | Aucun rôle créé ; les courriels partent avec le rôle de la fonction, une fois le droit ajouté |
| Services ouverts : S3, DynamoDB, Lambda, API Gateway, Amplify | Pas d'Amplify : la fonction sert aussi l'écran (une seule adresse, donc pas de CORS, cookie `SameSite=Strict` intact) |
| Budget d'environ 50 USD par mois | Lambda et API Gateway à l'usage ; un seau S3 ; aucun serveur allumé en permanence |
| Noter ce qui est créé | Tableau « Ressources créées » à la fin de ce document |

## Le montage

Comme le module du directeur, **une seule fonction Lambda** sert l'API et l'écran, derrière une **API Gateway
HTTP API**.

```
Employé ─► API conges-dispo-pam-api ─► Lambda conges-dispo-pam-app ─► PostgreSQL « portail » de PAM (§ 7)
                                                          ├► PostgreSQL Carrières « archivage » (lecture, ajout de pièces)
                                                          ├► S3 acme-prospection-data / vault/… (liste Vault, lecture)
                                                          ├► S3 acme-pam-balances / pam/balances/… (PER, bulletins, lecture)
                                                          ├► S3 conges-dispo-pam-fichiers (CV et autres fichiers)
                                                          └► SES autorapport@acmehaiti.com (codes et avis)
```

## 1. Fabriquer le paquet

Double-cliquer sur `deploy\empaqueter.bat`. Il produit `deploy\out\pam-lambda.zip` (environ 16 Mo) : application,
migrations, écran compilé, bibliothèques pour Linux. Ni secret, ni donnée fictive.

## 2. Le seau des fichiers

S3 → **Create bucket** :

- Nom : `conges-dispo-pam-fichiers` (minuscules, chiffres, tirets seulement) ;
- **Block all public access** : laisser coché ;
- chiffrement SSE-S3 (par défaut) ;
- Tags : `Project` = `Conges_disponibilites_acmesa`.

## 3. La fonction

Lambda → **Create function** → **Author from scratch** :

| Champ | Valeur |
|---|---|
| Function name | `conges-dispo-pam-app` |
| Runtime | **Python 3.12**, architecture **x86_64** |
| Execution role | **Change default execution role** → **Use an existing role** → `conges-dispo-lambda-role` |

Ne jamais laisser AWS créer un rôle : c'est interdit pour cet accès. Puis :

1. **Code → Upload from → .zip file** : `deploy\out\pam-lambda.zip`.
2. **Runtime settings → Edit** : Handler `app.lambda_handler.handler`.
3. **Configuration → General configuration** : mémoire **1024 Mo**, délai **30 s**.
4. **Configuration → Tags** : `Project` = `Conges_disponibilites_acmesa`.
5. **Configuration → Environment variables** :

| Variable | Valeur |
|---|---|
| `APP_ENV` | `production` |
| `ACME_DATA_DIR` | `/tmp/pam` |
| `FRONTEND_DIST_DIR` | `/var/task/frontend_dist` |
| `AUTO_CREATE_SCHEMA` | `false` |
| `DATABASE_URL` | adresse PostgreSQL de PAM (§ 7) |
| `CARRIERES_DATABASE_URL` | adresse PostgreSQL de Carrières, compte lecture et ajout seuls (§ 7) |
| `VAULT_S3_BUCKET` | `acme-prospection-data` |
| `PER_S3_BUCKET` | `acme-pam-balances` |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET` | `conges-dispo-pam-fichiers` |
| `SES_SENDER` | `autorapport@acmehaiti.com` |
| `SES_REPLY_TO` | `dit@acmehaiti.com` |
| `OTP_HMAC_KEY` | 32 octets aléatoires, voir ci-dessous |
| `ADMIN_USERNAME` | identifiant du premier compte de gestion |
| `ADMIN_PASSWORD_HASH` | empreinte Argon2 de son mot de passe, voir ci-dessous |

Les deux secrets se fabriquent sur le poste, dans `backend\` (le mot de passe est demandé sans s'afficher) :

```
.venv\Scripts\python -c "import secrets; print(secrets.token_urlsafe(32))"
.venv\Scripts\python -m app.tools.hash_password
```

Les coller **directement dans la console** : jamais dans un fichier du projet, un dépôt ou un message. La
console chiffre les variables au repos. (Secrets Manager n'est pas ouvert pour cet accès.)

## 4. L'adresse publique

API Gateway → **Create API** → **HTTP API** → **Build** :

- Integrations : **Lambda** → `conges-dispo-pam-app` ;
- API name : `conges-dispo-pam-api` ;
- Routes : une seule, **Method** `ANY` et **Resource path** `$default` (la méthode et le chemin sont deux
  champs séparés ; `$default` reçoit toutes les adresses : `/`, `/api/…`, les pages et les fichiers de l'écran) ;
- Stage : `$default`, auto-deploy ;
- **Tags : `Project` = `Conges_disponibilites_acmesa`**. Sans cette étiquette, l'API devient inaccessible :
  il faut la supprimer et recommencer.

Pas de CORS à régler : l'écran et l'API sont servis par la même adresse.

## 5. Créer les tables (quand les bases sont prêtes)

Lambda `conges-dispo-pam-app` → onglet **Test** → nouvel événement `migrer` :

```json
{ "action": "migrate" }
```

**Test** : la réponse doit être `{"migrated": true}`. À refaire après chaque nouveau paquet qui apporte une
migration.

## 6. Ce qu'un administrateur doit ajouter au rôle `conges-dispo-lambda-role`

L'accès dev-conges ne peut ni créer ni modifier de rôle. Le rôle imposé n'écrit que des journaux. Pour PAM, il
lui faut ces droits (à transmettre au directeur, § 8) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "PamVault", "Effect": "Allow", "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::acme-prospection-data/vault/vault-employee-list.csv" },
    { "Sid": "PamBalances", "Effect": "Allow", "Action": "s3:GetObject",
      "Resource": ["arn:aws:s3:::acme-pam-balances/pam/balances/per/*",
                   "arn:aws:s3:::acme-pam-balances/pam/balances/payslip/*"] },
    { "Sid": "PamFichiers", "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::conges-dispo-pam-fichiers/*" },
    { "Sid": "PamCourriels", "Effect": "Allow", "Action": "ses:SendEmail",
      "Resource": ["arn:aws:ses:us-east-1:790561526299:identity/acmehaiti.com",
                   "arn:aws:ses:us-east-1:790561526299:identity/autorapport@acmehaiti.com"] }
  ]
}
```

Pas de `s3:ListBucket` sur les balances : une balance absente revient en « refusé », que PAM traite comme une
absence (« Aucune balance n'est disponible pour le moment. »), comme le module du directeur.

## 7. Les bases PostgreSQL — à obtenir du directeur

L'accès n'ouvre ni RDS ni réseau privé (VPC). La fonction joint donc les bases par Internet, en connexion
chiffrée (`?sslmode=require` à la fin de l'adresse).

| Base | Ce qu'il faut |
|---|---|
| **Carrières** (`archivage`) | Son adresse et un compte dédié à PAM : lecture, ajout seulement sur `documents`, `fichiers_document`, `journal_audit` ; accepter les connexions de la fonction |
| **PAM** (`portail`) | Une base PostgreSQL à part. Le plus simple : sur le même serveur que Carrières. Sinon, qu'un administrateur ouvre RDS pour ce projet (environ 15 à 30 USD par mois, dans le budget de 50 USD) |

Le stockage de PAM n'est pas fait pour DynamoDB (tables liées, dossier, candidatures) : le réécrire prendrait
des semaines. DynamoDB reste possible plus tard pour la seule connexion, comme le module du directeur.

## 8. Message au directeur (quand vous êtes bloqué)

> Bonjour Monsieur Hilaire,
>
> Je déploie PAM avec l'accès dev-conges, en respectant ses règles (préfixe `conges-dispo-`, étiquette
> `Project`, us-east-1). Il me faut :
>
> 1. **Les droits du rôle `conges-dispo-lambda-role`** : lire la copie Vault et les balances, lire et écrire le
>    seau `conges-dispo-pam-fichiers`, envoyer depuis `autorapport@acmehaiti.com`. La politique JSON est prête
>    (jointe).
> 2. **La base de Carrières** : son adresse et un compte PostgreSQL dédié à PAM, en lecture, avec ajout
>    seulement sur `documents`, `fichiers_document` et `journal_audit`.
> 3. **Une base PostgreSQL pour PAM** : une base `portail` sur le même serveur que Carrières si possible, sinon
>    l'ouverture de RDS pour ce projet.
>
> Les mots de passe peuvent être saisis directement dans la console Lambda ; je n'ai pas besoin de les recevoir.
>
> Merci,

## 9. Vérifier

1. Ouvrir l'adresse de l'API (`https://….execute-api.us-east-1.amazonaws.com`) : l'accueil de PAM s'affiche.
2. Se connecter avec un vrai code employé : le code arrive par courriel.
3. CloudWatch → **Log groups** → `/aws/lambda/conges-dispo-pam-app` : aucune erreur, aucune donnée personnelle.

L'adresse `pam.acmehaiti.com` viendra plus tard (domaine personnalisé de l'API, certificat, enregistrement dans
SiteGround) : CloudFront n'est pas ouvert pour cet accès.

## Mettre à jour

L'écran et le serveur voyagent dans le même zip : une mise à jour de l'un ou de l'autre suit le même chemin.

1. Sur le poste : faire la modification, lancer les tests (`npm test` dans `frontend\`, `pytest` dans `backend\`).
2. Double-cliquer sur `deploy\empaqueter.bat` : il recompile l'écran et refait le zip.
3. Console Lambda → `conges-dispo-pam-app` → **Code → Upload from → .zip file** : le nouveau zip.
4. Seulement si la mise à jour touche le serveur et apporte une migration : l'événement `migrer` (§ 5).
   Une mise à jour de l'écran seul n'en a pas besoin.
5. Ouvrir PAM et vérifier le changement.

Les employés voient la nouvelle version à leur prochaine visite, sans vider leur cache : la page est revérifiée à
chaque visite (`Cache-Control: no-cache`), et les fichiers de l'écran changent de nom à chaque compilation
(`/assets/`, gardés un an). Une page déjà ouverte garde l'ancienne version jusqu'au prochain rechargement ; après
5 minutes sans action, la déconnexion la recharge de toute façon.

En cas de problème, **revenir en arrière** : déposer le zip précédent. Garder une copie de chaque zip mis en
service, avec sa date (par exemple `pam-lambda-2026-10-28.zip`), hors du dépôt.

## Ressources créées

À tenir à jour et à partager avec le directeur, comme il le demande.

| Ressource | Nom | Étiquette `Project` | Créée le | Par |
|---|---|---|---|---|
| Seau S3 | `conges-dispo-pam-fichiers` | | | |
| Fonction Lambda | `conges-dispo-pam-app` | | | |
| API HTTP | `conges-dispo-pam-api` | | | |

Ne pas supprimer : aucune ressource d'ACME SA ; ne pas tenter d'ouvrir les seaux ou les API qui ne commencent pas
par `conges-dispo-`.
