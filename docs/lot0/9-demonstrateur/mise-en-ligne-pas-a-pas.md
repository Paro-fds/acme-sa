# Mise en ligne du démonstrateur, pas à pas

| | |
|---|---|
| **Version** | 0.1, 2026-10-08 |
| **Stories** | US-001 (socle déployable), US-102 (double authentification RH) |
| **Principe** | `deploiement-gratuit-et-migration-aws.md` : mêmes fichiers, même image Docker, mêmes variables qu'à terme sur AWS |
| **Durée** | Environ 45 minutes, la première fois |

Ce qui est déjà prêt dans le code :

| Fichier | Rôle |
|---|---|
| `backend/Dockerfile` | Image de l'API. Au démarrage, elle crée ou met à jour le schéma (Alembic), puis lance l'API. |
| `backend/migrations/` | Migrations du schéma : `0001` (schéma du portail), `0002` (double authentification). |
| `render.yaml` | Description du service API pour Render (Blueprint). |
| `frontend/vercel.json` | Site sur Vercel ; les appels `/api/*` sont relayés vers Render. |
| `backend/demo/employes-fictifs.csv` | Le seul jeu d'employés chargé quand `APP_ENV=demo`, quelle que soit la configuration. |

Ce qui a été vérifié sur le poste du développeur le 2026-10-08 :
- les 658 tests de l'API passent sur PostgreSQL 17 ;
- l'image Docker démarre sur une base vide, crée le schéma et répond ;
- derrière un proxy HTTPS, le cookie de session porte bien `Secure`.

## 1. Supabase : la base et le compartiment de fichiers

Vous avez déjà un compte.

1. Créez un projet nommé `acme-portail-demo`, dans la région **East US (North Virginia)**. Choisissez un mot de passe de base de données long et notez-le dans votre gestionnaire de mots de passe, pas dans le dépôt.
2. Récupérez l'adresse de la base : **Connect** → **Session pooler**. Copiez l'URI ; elle commence par `postgresql://postgres.…@aws-0-us-east-1.pooler.supabase.com:5432/postgres`.
   - Prenez le **Session pooler**, pas la connexion directe : Render ne sait pas joindre l'adresse IPv6 de la connexion directe.
   - Le code accepte cette chaîne telle quelle.
3. Créez le compartiment de fichiers : **Storage** → **New bucket** → nom `certificats`, et laissez **Public bucket** décoché.
4. Récupérez **Project Settings** → **API** : l'URL du projet et la clé **service_role** (secrète).

> N'envoyez ces valeurs à personne, ni dans le chat ni dans le dépôt. Elles ne vont que dans les variables de Render (étape 3).

À ne pas activer : Supabase Auth, les règles RLS, les fonctions Edge. Le navigateur ne parle jamais à Supabase ; seule l'API le fait.

## 2. GitHub : la branche de démonstration

Render et Vercel déploient automatiquement la branche `demo` (US-001 CA-01).

1. Vérifiez qu'aucune vraie donnée n'est suivie par git : le dossier `data/` doit rester ignoré (`.gitignore`).
2. Commitez le travail de `v2`, créez la branche `demo` à partir de `v2`, puis poussez-la sur GitHub.
3. Ensuite, chaque envoi sur `demo` remet le démonstrateur à jour.

## 3. Render : l'API

1. Sur render.com, connectez-vous avec GitHub, puis **New** → **Blueprint** → dépôt `acme-sa`. Render lit `render.yaml` et propose le service `acme-portail-api` (offre gratuite, région Virginia).
2. Saisissez les valeurs secrètes qu'il demande :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | L'URI du Session pooler (étape 1.2), avec votre mot de passe |
| `SUPABASE_URL` | L'URL du projet (étape 1.4) |
| `SUPABASE_SERVICE_ROLE_KEY` | La clé service_role (étape 1.4) |
| `ADMIN_USERNAME` | L'identifiant du premier compte RH, par exemple `rh.demo` |
| `ADMIN_PASSWORD_HASH` | L'empreinte de son mot de passe (voir ci-dessous) |

Pour calculer l'empreinte, sur votre poste, depuis `backend/` : `.venv\Scripts\python -m app.tools.hash_password`, puis saisissez le mot de passe (12 caractères au moins ; il ne s'affiche pas). Copiez la ligne qui commence par `$argon2id$`.

Les autres valeurs sont déjà dans `render.yaml` : `APP_ENV=demo`, `STORAGE_BACKEND=supabase`, `S3_BUCKET=certificats`.

3. Lancez le déploiement. Le premier prend quelques minutes, et le journal doit montrer `Running upgrade -> 0001`, puis `0002`.
4. Vérifiez que `https://acme-portail-api.onrender.com/api/health` répond `{"status":"ok"}`. Si Render a donné un autre nom au service, notez l'adresse exacte.

> L'offre gratuite endort l'API après environ 15 minutes sans visite ; le réveil prend 30 à 60 secondes. Avant une présentation, ouvrez l'adresse `/api/health` quelques minutes avant.

## 4. Vercel : le site

1. Si l'adresse Render diffère de `acme-portail-api.onrender.com`, corrigez-la dans `frontend/vercel.json`, puis commitez et poussez sur `demo`.
2. Sur vercel.com, connectez-vous avec GitHub, puis **Add New** → **Project** → dépôt `acme-sa`, et réglez :
   - **Root Directory** : `frontend` ;
   - **Framework** : Vite (détecté automatiquement) ;
   - **Environment Variables** : `VITE_APP_ENV` = `demo` (cette variable affiche le bandeau « Démonstration · données fictives ») ;
   - après le premier déploiement : **Settings** → **Git** → **Production Branch** = `demo`.
3. Ouvrez l'adresse Vercel (`https://….vercel.app`). Le bandeau jaune doit apparaître en haut de chaque écran.

## 5. Contrôles avant de montrer

| Contrôle | Attendu |
|---|---|
| Accueil `/` | Bandeau « Démonstration · données fictives » |
| Connexion employé : JOSEPH Jean, 15/03/1996, « Première connexion ? » | Création du mot de passe, puis le profil |
| Connexion RH `/admin/connexion` avec `rh.demo` | Écran « Protégez votre compte » (voir §6) |
| Déposer une photo dans un dossier employé | Le fichier apparaît dans Supabase → Storage → `certificats` |
| Redéployer l'API sur Render | Les comptes et les fichiers sont toujours là (ils sont dans Supabase, pas dans le conteneur) |

Les employés du démonstrateur sont ceux de `backend/demo/employes-fictifs.csv` : 7 actifs et 1 inactif.

## 6. Montrer la double authentification à M. Hilaire

Il n'y a pas encore de service d'envoi de WhatsApp ni d'email : la technologie reste à choisir avec la DIT (D-41). Sur le démonstrateur, le code « envoyé » s'affiche donc dans une **boîte de démonstration** jaune, à l'endroit où la personne le recevrait. En recette et en production, l'API ne renvoie jamais le code et cette boîte n'existe pas.

Le parcours se fait en cinq minutes, de préférence sur un téléphone :

1. **Première connexion RH.** Après le mot de passe, l'espace RH reste fermé : l'écran « Protégez votre compte » propose WhatsApp, Email ou Application d'authentification.
2. **WhatsApp.** Saisissez un numéro (+509…). Le code apparaît dans la boîte de démonstration ; une fois saisi, il ouvre le tableau de bord.
3. **Connexion suivante.** Le code part tout seul dès le mot de passe. L'écran indique « envoyé par WhatsApp au +509 •••• 1111 », sans montrer le numéro entier. Montrez aussi qu'un code faux est refusé et que « Renvoyer le code » fonctionne.
4. **Application.** Menu du compte → « Ma double authentification » → « Changer de méthode ». Confirmez d'abord avec le code WhatsApp, puis choisissez « Application d'authentification » : un QR code s'affiche. Scannez-le avec **Microsoft Authenticator**. Ce code-là est réel : c'est l'application du téléphone qui le donne.
5. **Téléphone perdu.** Avec un deuxième compte RH, écran « Administrateurs » → « Réinitialiser la double authentification ». À sa connexion suivante, la personne choisit à nouveau sa méthode.

Les règles à souligner devant lui :
- le code vaut 5 minutes et ne sert qu'une fois ;
- 5 codes faux suspendent le compte pendant 15 minutes ;
- chaque connexion et chaque changement de méthode sont tracés ;
- l'espace RH peut être limité au réseau des bureaux (`RH_ALLOWED_NETWORKS`) ; cette limite est désactivée sur le démonstrateur.

## 7. Ce qui reste à faire

| Point | Story | Pourquoi ce n'est pas fait |
|---|---|---|
| Comptes Supabase, Render et Vercel, branche `demo` | US-001 CA-01 | Ces actions sont à faire avec vos accès (§1 à §4) |
| Dépôt **signé** des fichiers, envoyés directement au stockage | US-001 CA-07 | Aujourd'hui, les fichiers passent par l'API, qui les dépose dans le compartiment privé. Le dépôt signé viendra avec les certificats (D3). |
| Envoi réel des codes par WhatsApp et par email | US-102 | Le service reste à choisir avec la DIT (D-41) : SES, Cognito ou WhatsApp Business. Il suffira d'un adaptateur derrière le port `CodeSender`. |
| Rôles RH (Agent RH, Administrateur, Lecture seule) | US-103 | Aujourd'hui, tout compte RH peut réinitialiser la double authentification d'un autre |
| Journal d'audit consultable dans l'écran RH | D6 | Aujourd'hui, les traces sont écrites dans le journal de la plateforme (logger `acme.security`) |
| Répétition de migration vers une autre base PostgreSQL | US-001 CA-08 | Faite en local (PostgreSQL 17 dans Docker). À refaire sur le sandbox AWS quand il sera ouvert. |
