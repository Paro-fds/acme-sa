# Plan de déploiement sur AWS

| | |
|---|---|
| **Version** | 0.1, 2026-10-13 — proposition |
| **Cible** | `architecture-aws.html` (même dossier) ; story US-002 (CA-01 → CA-06) |
| **Choix du 2026-10-13** | 1. Sandbox d'abord (données fictives), production ensuite sur le compte ACME de la DIT. 2. Sandbox construit **à la console** pour apprendre, puis **Terraform** pour la production. 3. Sandbox **minimal** (~50 $ par mois). 4. Mises à jour par **GitHub Actions**, automatiques à chaque push sur `v2` |
| **Point de départ** | Démonstrateur Vercel → Render (`backend/Dockerfile`) → Supabase (PostgreSQL + stockage S3). L'application lit déjà toute sa configuration dans l'environnement : la migration est un changement de configuration, sauf les écarts du §2 |

## 1. Le chemin en six étapes

| Étape | Où | Ce qu'on obtient | Durée indicative |
|---|---|---|---|
| A. Préparer | Votre poste, compte sandbox | Accès sûr au compte, alerte de coût, outils installés | ½ jour |
| B. Construire le sandbox à la console | Sandbox | Le démonstrateur tourne sur AWS, sur données fictives | 2 à 3 jours |
| C. Automatiser les mises à jour | GitHub + sandbox | Un push sur `v2` met AWS à jour, tests compris | 1 jour |
| D. Basculer le démonstrateur | Sandbox | Render, Vercel et Supabase arrêtés | ½ jour, après accord de M. Hilaire |
| E. Réécrire le sandbox en Terraform | Dépôt + sandbox | Le même sandbox, recréé par code et vérifié | 2 à 3 jours |
| F. Production | Compte ACME (DIT) | carriere.acmehaiti.com et la recette, sécurisées (US-002) | Selon les réponses de la DIT |

Une étape se termine par une vérification. On ne passe pas à la suivante tant que la vérification n'est pas réussie.

## 2. Écarts du code à traiter avant ou pendant le déploiement

Ces écarts viennent de la lecture du code du 2026-10-13. Chacun devient une partie de US-002 (ou une story à part) : une story à la fois, tests d'abord.

| # | Écart | Effet sur AWS | Quand |
|---|---|---|---|
| E-1 | Le cookie de session n'est « Secure » que si l'API voit `https` (`auth/api/dependencies.py`, `request.url.scheme`). Dans le sandbox, CloudFront → équilibreur se fait en HTTP, et l'équilibreur écrit `X-Forwarded-Proto: http` | La connexion marche, mais le cookie part **sans** l'attribut Secure | Avant l'étape D : forcer `secure=True` hors `APP_ENV=local` |
| E-2 | `--forwarded-allow-ips='*'` dans le `Dockerfile` : l'API croit n'importe quel `X-Forwarded-For` | L'adresse du visiteur peut être falsifiée ; `RH_ALLOWED_NETWORKS` ne protège donc rien derrière CloudFront | Avant la production : restriction RH au pare-feu WAF (il voit la vraie adresse), adresse du visiteur lue dans `CloudFront-Viewer-Address` |
| E-3 | Les employés viennent d'un CSV lu sur le disque (`ACME_CSV_PATH`). En `demo` ou `recette`, c'est `backend/demo/employes-fictifs.csv`, présent dans l'image | Sandbox : rien à faire. Production : le vrai export n'est pas dans l'image et **ne doit jamais y être** | Avant la production : lire l'export dans un S3 privé dédié, ou par un écran d'import (question 6 à la DIT) |
| E-4 | Antivirus : rien n'empêche aujourd'hui de lire un fichier qui n'a pas encore été analysé | CA-02 non tenu | Production : GuardDuty Malware Protection for S3 étiquette chaque fichier ; l'API refuse la lecture tant que l'étiquette n'est pas `NO_THREATS_FOUND` |
| E-5 | Les emails sont simulés (journaux) | Code par email impossible | Production, si la DIT choisit l'email (D-41) : adaptateur SES derrière le port existant |

## 3. Étape A — Préparer

**Sur le compte sandbox** (à demander à M. Hilaire s'il n'est pas encore créé) :

1. Ne jamais travailler avec l'utilisateur racine. Activer sa double authentification, puis le mettre de côté.
2. Créer votre accès dans **IAM Identity Center**, avec la double authentification et le jeu de permissions `AdministratorAccess`, limité au sandbox. Si le compte fait partie de l'organisation ACME, c'est la DIT qui le crée.
3. **Alerte de coût d'abord** : AWS Budgets → budget mensuel de 60 $, avec des alertes par email à 50 % (réel) et à 100 % (prévu).
4. Choisir la région : **us-east-2** (Ohio), celle de l'architecture, en attendant la confirmation de la DIT. Le sandbox doit être dans la même région que la future production.
5. Vérifier si le compte dispose de crédits de bienvenue AWS (Billing → Credits) : ils peuvent couvrir les premiers mois.

**Sur votre poste :**

- AWS CLI v2, configurée avec `aws configure sso` (profil `acme-sandbox`, sans clé d'accès longue durée).
- Docker Desktop, pour pousser la première image à la main (étape B6). Ensuite, GitHub Actions s'en charge.
- Relever la version de PostgreSQL de Supabase (`SELECT version();` dans l'éditeur SQL). RDS doit avoir **la même version majeure**.

**Vérification :** `aws sts get-caller-identity --profile acme-sandbox` répond avec le compte sandbox, et l'alerte de budget est active.

## 4. Étape B — Construire le sandbox à la console

Convention de nommage : préfixe `acme-sandbox-` partout, avec l'étiquette `Projet=portail-carriere` et `Env=sandbox`. Les étiquettes servent à suivre les coûts dans Cost Explorer.

### Le schéma minimal (sans passerelle NAT)

```
Navigateur ──HTTPS──► CloudFront (dxxxx.cloudfront.net)
                        ├── /*      ──► S3 « site » (privé, OAC) + fonction « retour à index.html »
                        └── /api/*  ──► Équilibreur ALB (HTTP, en-tête secret exigé)
                                          └──► ECS Fargate : 1 conteneur, sous-réseau public, IP publique,
                                               n'accepte que l'ALB
                                                 ├──► RDS PostgreSQL (sous-réseau privé)
                                                 ├──► S3 « certificats » (privé, chiffré, versionné)
                                                 └──► Secrets Manager, CloudWatch Logs, ECR
```

Ce qui diffère de la cible de production : il n'y a pas de passerelle NAT (le conteneur sort par sa propre IP publique), ni de WAF, ni de nom de domaine, et CloudFront parle à l'équilibreur en HTTP. Ces différences sont acceptables avec des données fictives. Le §8 les corrige pour la production.

### B1. Réseau (VPC)

VPC → « Create VPC » → **VPC and more** :

- Nom `acme-sandbox`, plage `10.20.0.0/16`, **2 zones de disponibilité** ;
- 2 sous-réseaux publics, 2 sous-réseaux privés ;
- **NAT gateways : None** (environ 34 $ par mois économisés) ;
- **VPC endpoints : S3 Gateway** (gratuit : le trafic vers S3 ne passe pas par Internet).

### B2. Groupes de sécurité (trois pare-feu en chaîne)

| Nom | Entrée autorisée |
|---|---|
| `acme-sandbox-alb` | Port 80, depuis la liste de préfixes gérée `com.amazonaws.global.cloudfront.origin-facing` (CloudFront seulement) |
| `acme-sandbox-api` | Port 8000, depuis `acme-sandbox-alb` seulement |
| `acme-sandbox-db` | Port 5432, depuis `acme-sandbox-api` seulement |

Laisser toutes les sorties ouvertes : l'API joint Secrets Manager, ECR, CloudWatch et WhatsApp.

### B3. Base de données (RDS PostgreSQL)

RDS → « Create database » → **Standard create** :

- PostgreSQL, **même version majeure que Supabase** ;
- Modèle « Free tier » ou « Dev/Test », **db.t4g.micro**, **Single-AZ** ;
- Stockage gp3 de 20 Go, extension automatique désactivée ;
- Identifiant `acme-sandbox-db`, utilisateur `portail`, mot de passe **saisi par vous** (fort, 32 caractères). Ne cochez pas « Manage in Secrets Manager » : cette option fait tourner le mot de passe, ce qui casserait la `DATABASE_URL` de l'étape B5 ;
- VPC `acme-sandbox`, groupe de sous-réseaux sur les **sous-réseaux privés**, **Public access : No**, groupe de sécurité `acme-sandbox-db` ;
- Nom de la base initiale : `portail` ;
- Chiffrement activé ; sauvegardes automatiques sur 7 jours (30 en production) ; Performance Insights désactivé.

### B4. Stockage S3 (deux compartiments)

**`acme-sandbox-certificats-<n° de compte>`**, pour les certificats et les CV :

- « Block all public access » activé ;
- Chiffrement SSE-S3 ;
- **Versioning activé** (CA-03) ;
- CORS : le navigateur dépose le fichier directement, par une URL signée (US-301). Remplacer l'adresse CloudFront une fois connue (étape B8) :

```json
[{
  "AllowedOrigins": ["https://dxxxxxxxxxxxx.cloudfront.net"],
  "AllowedMethods": ["PUT", "POST", "GET"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3000
}]
```

**`acme-sandbox-site-<n° de compte>`**, pour le site React compilé : privé, sans versioning. Il ne sera lu que par CloudFront (OAC, étape B8).

### B5. Secrets (Secrets Manager)

Un secret « Other type », en **texte brut**, pour chaque valeur :

| Secret | Contenu |
|---|---|
| `acme/sandbox/database-url` | `postgresql://portail:<mot de passe>@<point d'accès RDS>:5432/portail` |
| `acme/sandbox/admin-password-hash` | Le hachage Argon2 du premier administrateur (`python -m app.tools.create_admin` en local, ou le même que sur Render) |
| `acme/sandbox/whatsapp-*` | Seulement si WhatsApp est utilisé dans le sandbox |
| `acme/sandbox/origin-verify` | Une longue valeur aléatoire, que CloudFront envoie à l'équilibreur (étapes B7 et B8) |

Coût : 0,40 $ par secret et par mois.

### B6. Image Docker (ECR)

1. ECR → créer le dépôt privé `acme-portail-api`, avec « Scan on push » activé et une règle de cycle de vie qui garde les 20 dernières images.
2. Pousser l'image construite sur votre poste. C'est la **même** que celle de Render :

```powershell
aws ecr get-login-password --profile acme-sandbox --region us-east-2 | docker login --username AWS --password-stdin <compte>.dkr.ecr.us-east-2.amazonaws.com
docker build --platform linux/amd64 -t <compte>.dkr.ecr.us-east-2.amazonaws.com/acme-portail-api:premiere ./backend
docker push <compte>.dkr.ecr.us-east-2.amazonaws.com/acme-portail-api:premiere
```

### B7. Application (ECS Fargate et équilibreur)

**Rôles IAM :**

- `acme-sandbox-execution` : politique gérée `AmazonECSTaskExecutionRolePolicy`, plus `secretsmanager:GetSecretValue` sur `acme/sandbox/*`. ECS s'en sert pour tirer l'image, écrire les journaux et injecter les secrets.
- `acme-sandbox-api` (rôle de la tâche) : `s3:GetObject`, `s3:PutObject` et `s3:DeleteObject` sur `acme-sandbox-certificats-*/*`, et `s3:ListBucket` sur le compartiment. **Aucune clé d'accès** : sans `S3_ACCESS_KEY_ID`, boto3 utilise ce rôle (déjà prévu dans `remote_file_storage.py`).

**Équilibreur :** EC2 → Load Balancers → **Application Load Balancer** :

- Internet-facing, dans les 2 sous-réseaux publics, groupe de sécurité `acme-sandbox-alb` ;
- Groupe cible `acme-sandbox-api` : type **IP**, port 8000, contrôle de santé `GET /api/health`, délai de désinscription de 30 s ;
- Écouteur HTTP 80 : l'action par défaut renvoie **403** ; une règle « en-tête `X-Origin-Verify` = la valeur du secret » transfère au groupe cible. Ainsi, seul CloudFront peut joindre l'API.

**ECS :**

1. Cluster `acme-sandbox`, Fargate seulement. Activer Container Insights seulement si vous le voulez (payant).
2. Définition de tâche `acme-sandbox-api` :
   - Linux/X86_64, **0,5 vCPU / 1 Go** ;
   - Conteneur `api` avec l'image ECR, port 8000 ;
   - Journaux `awslogs`, groupe `/acme/sandbox/api`, conservés 30 jours ;
   - Variables d'environnement :

| Variable | Valeur |
|---|---|
| `APP_ENV` | `demo` (le jeu fictif est chargé, comme sur Render) |
| `STORAGE_BACKEND` | `s3` |
| `S3_BUCKET` | `acme-sandbox-certificats-<n° de compte>` |
| `S3_REGION` | `us-east-2` |
| `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | **Absentes** (S3 d'AWS, rôle de la tâche) |
| `MFA_METHODS` | `TOTP` (WhatsApp seulement si les secrets sont fournis) |
| `ADMIN_USERNAME` | Le même que sur Render |
| `DATABASE_URL`, `ADMIN_PASSWORD_HASH` | Onglet « Secrets » (ValueFrom = ARN du secret) |

3. Service `api` :
   - Fournisseur de capacité **FARGATE_SPOT** (environ 70 % moins cher ; une interruption de quelques minutes est acceptable dans le sandbox) ;
   - 1 tâche, dans les sous-réseaux **publics**, avec **IP publique activée** et le groupe de sécurité `acme-sandbox-api` ;
   - Rattaché au groupe cible de l'équilibreur, avec un délai de grâce du contrôle de santé de 120 s (les migrations Alembic tournent au démarrage) ;
   - « Deployment circuit breaker » activé, avec retour arrière automatique.

**Vérification :** la tâche passe à `RUNNING`. Le journal montre les migrations Alembic, puis Uvicorn. La cible de l'équilibreur est `healthy`.

### B8. Site et point d'entrée unique (CloudFront)

1. Construire le site : `npm run build` dans `frontend/`. Le site appelle déjà `/api` sur sa propre adresse, donc rien n'est à changer.
2. Déposer les fichiers : les ressources nommées par empreinte se gardent un an, `index.html` jamais.

```powershell
aws s3 sync frontend/dist s3://acme-sandbox-site-<compte> --delete --cache-control "public,max-age=31536000,immutable" --exclude index.html --profile acme-sandbox
aws s3 cp frontend/dist/index.html s3://acme-sandbox-site-<compte>/index.html --cache-control "no-cache" --profile acme-sandbox
```

3. CloudFront → « Create distribution » :
   - **Origine 1** : compartiment `site`, avec **Origin Access Control** (CloudFront propose de mettre à jour la politique du compartiment : accepter) ;
   - **Origine 2** : le nom DNS de l'équilibreur, en HTTP seulement, avec l'en-tête personnalisé `X-Origin-Verify` = la valeur du secret ;
   - **Comportement par défaut** (`*` → site) : rediriger HTTP vers HTTPS, politique de cache `CachingOptimized`, fonction CloudFront « viewer request » (ci-dessous) ;
   - **Comportement `/api/*`** (→ équilibreur) : toutes les méthodes HTTP, `CachingDisabled`, politique de requête `AllViewerExceptHostHeader` (cookies, paramètres et en-têtes transmis) ;
   - **Politique d'en-têtes de réponse** (reprend `vercel.json`) : `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: same-origin`, `Strict-Transport-Security`, et pour le sandbox `X-Robots-Tag: noindex, nofollow` ;
   - Classe de prix « Amérique du Nord et Europe » (le point de présence de Miami sert Haïti).

Fonction « retour à `index.html` ». Elle remplace la règle `/(.*)` → `/index.html` de Vercel. N'utilisez **pas** les « pages d'erreur personnalisées » de CloudFront : elles s'appliquent aussi à `/api/*` et remplaceraient les erreurs JSON de l'API par la page d'accueil.

```js
function handler(event) {
  var uri = event.request.uri;
  if (!uri.startsWith('/api/') && uri.indexOf('.') === -1) {
    event.request.uri = '/index.html';
  }
  return event.request;
}
```

4. Reporter l'adresse `https://dxxxx.cloudfront.net` dans le CORS du compartiment `certificats` (étape B4).

### B9. Vérifier le sandbox

- [ ] Le parcours de démonstration de 5 minutes passe en entier (`9-demonstrateur/plan-demonstrateur.md`), sur téléphone et sur ordinateur.
- [ ] Un certificat se dépose et se relit : URL signée, CORS et rôle de la tâche fonctionnent.
- [ ] Une URL de l'API inconnue renvoie une erreur JSON, pas la page d'accueil.
- [ ] Une adresse du site rechargée (par exemple `/carriere`) affiche bien l'écran.
- [ ] L'équilibreur appelé directement (sans passer par CloudFront) répond 403.
- [ ] **Restauration répétée** (répétition de CA-04) : restaurer la base à un instant passé dans une nouvelle instance, y pointer la tâche, vérifier, puis supprimer l'instance restaurée. Noter le temps total.
- [ ] Le coût du jour dans Cost Explorer correspond à l'estimation du §7.

## 5. Étape C — Automatiser les mises à jour (GitHub Actions)

**Accès sans clé (OIDC) :**

1. IAM → Identity providers → ajouter `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`).
2. Rôle `acme-sandbox-github-deploy`, avec une relation d'approbation limitée au dépôt et à la branche : `repo:Paro-fds/acme-sa:ref:refs/heads/v2`.
3. Droits limités à ce que fait le déploiement : pousser dans le dépôt ECR `acme-portail-api` ; `ecs:RegisterTaskDefinition`, `ecs:UpdateService` et `ecs:Describe*` ; `iam:PassRole` sur les deux rôles de la tâche ; `s3:PutObject`, `s3:DeleteObject` et `s3:ListBucket` sur le compartiment `site` ; `cloudfront:CreateInvalidation` sur la distribution.

**Fichier `.github/workflows/deploy-aws.yml`** (à écrire dans la story, tests d'abord). L'ordre compte :

1. **Tests** : `pytest` (contrats d'architecture compris) et `npm test`. Un échec arrête tout. C'est la règle « ne pousser que des tests verts », désormais garantie par la machine.
2. **API** : construction de l'image `linux/amd64`, étiquetée avec l'empreinte du commit ; envoi dans ECR ; nouvelle révision de la définition de tâche (`aws-actions/amazon-ecs-render-task-definition`) ; déploiement avec attente de la stabilité (`aws-actions/amazon-ecs-deploy-task-definition`, `wait-for-service-stability: true`).
3. **Site**, seulement après l'API (un nouvel écran peut appeler une nouvelle route) : `npm run build`, les deux commandes `aws s3` de l'étape B8, puis l'invalidation de `/index.html`.

Pendant la transition, Render et AWS se mettent à jour au même push. C'est sans risque : chacun a sa base.

**Vérification :** un petit changement de texte poussé sur `v2` apparaît sur l'adresse CloudFront en moins de 10 minutes. Un test volontairement cassé bloque le déploiement.

## 6. Étapes D, E et F en bref

**D. Basculer le démonstrateur** (après l'accord de M. Hilaire, car l'adresse change) :

- Communiquer la nouvelle adresse.
- Supprimer `render.yaml` et la réécriture de `vercel.json`, puis les projets Render, Vercel et Supabase. Il n'y a aucune donnée à reprendre : tout est fictif.
- Mettre à jour `9-demonstrateur/` et `agent.md` §0.

**E. Réécrire le sandbox en Terraform :**

- Un dossier `infra/` dans le dépôt, avec des modules `reseau`, `base`, `stockage`, `application` et `entree` (CloudFront et équilibreur), et un fichier de variables par environnement (`sandbox`, `recette`, `production`).
- L'état Terraform est conservé dans un compartiment S3 versionné, avec le verrou natif (`use_lockfile`).
- **La preuve :** supprimer le sandbox fait à la console, le recréer par `terraform apply`, puis rejouer la vérification B9. Le même code servira à la production ; seules les variables changent.
- GitHub Actions ne lance pas Terraform au début : `terraform plan` et `apply` se lancent depuis votre poste. On pourra l'automatiser plus tard.

**F. Production :** voir le §8.

## 7. Coûts

### Sandbox minimal (us-east-2, prix publics, à vérifier dans AWS Pricing Calculator)

| Poste | Hypothèse | Par mois |
|---|---|---|
| Équilibreur (ALB) | 1, trafic faible | ~18 $ |
| Adresses IPv4 publiques | 2 pour l'équilibreur, 1 pour le conteneur (0,005 $ par heure chacune) | ~11 $ |
| Fargate Spot | 0,5 vCPU / 1 Go, en continu | ~6 $ |
| RDS db.t4g.micro | Single-AZ, 20 Go gp3, sauvegardes de 7 jours | ~14 $ |
| S3, CloudFront | Quelques Go ; l'offre gratuite permanente de CloudFront couvre le trafic | ~1 $ |
| Secrets Manager, CloudWatch, ECR | 4 secrets, journaux de 30 jours, images | ~3 $ |
| **Total** | | **~50 $** |

- Le plancher fixe vient de l'équilibreur et des adresses IPv4 (~29 $).
- Arrêter la base et le conteneur la nuit et le week-end (planification EventBridge) ramène le total vers **~40 $**. C'est à ajouter plus tard, si le budget le demande.
- Les crédits de bienvenue d'un compte neuf peuvent couvrir les premiers mois.

### Production + recette

Environ 135 $ par mois (détail dans `architecture-aws.html` §3), à confirmer selon les réponses de la DIT (Multi-AZ, VPN).

## 8. Production : ce qui change par rapport au sandbox

Tout se fait **par Terraform** (étape E), sur le compte ACME géré par la DIT. Rien n'y entre avant les réponses aux questions de `architecture-aws.html` §6.

| Sujet | Sandbox | Production (US-002) |
|---|---|---|
| Adresse | `dxxxx.cloudfront.net` | `carriere.acmehaiti.com` et `recette-carriere.acmehaiti.com`, certificats ACM (CA-01) |
| CloudFront → équilibreur | HTTP + en-tête secret | **HTTPS** (certificat sur l'équilibreur), ou équilibreur interne par une « VPC origin » CloudFront |
| Conteneur | Sous-réseau public, Spot | Sous-réseau **privé**, à la demande ; sortie par une passerelle NAT (pour WhatsApp) |
| Espace RH | Ouvert | **WAF** : `/admin*` et `/api/admin/*` réservés aux IP des bureaux (question 3 à la DIT) ; corrige E-2 |
| Base | t4g.micro, 7 jours | **t4g.small**, sauvegardes de **30 jours**, restauration à la minute, protection contre la suppression, Multi-AZ si la DIT l'exige (CA-03) |
| Documents | Versionnés | Versionnés + **GuardDuty Malware Protection** + blocage des fichiers non analysés (E-4, CA-02) |
| Employés | CSV fictif dans l'image | Export réel lu hors de l'image (E-3), jamais copié ailleurs |
| Secrets | Secrets Manager | Idem (CA-05) |
| Surveillance | Journaux | Alarmes CloudWatch (erreurs 5xx, cible en mauvaise santé, espace disque de la base), CloudTrail, budget avec un seuil fixé par la DIT (CA-05) |
| Restauration | Une répétition | Testée avant l'ouverture, puis à la fréquence fixée avec la DIT (CA-04), procédure écrite |
| Mises à jour | Push sur `v2` → sandbox | Même pipeline, une cible par environnement. Proposition : la recette se met à jour au push, la production se déploie par une validation dans GitHub (« environment » protégé). À décider avec la DIT |
| `APP_ENV` | `demo` | `recette`, puis `production` |

## 9. Ce qu'il faut obtenir avant chaque étape

| Avant | Il faut | Auprès de |
|---|---|---|
| A | Le compte sandbox et votre accès | M. Hilaire |
| D | L'accord pour changer l'adresse du démonstrateur | M. Hilaire |
| F | Les réponses aux 9 questions de `architecture-aws.html` §6 (région, DNS, IP des bureaux, disponibilité, compte de recette, arrivée de l'export, budget, exploitation, fréquence de restauration) ; le choix du canal pour les codes (D-41) | DIT |
| F | Les corrections E-1 → E-4 faites et testées | Développement (US-002) |
