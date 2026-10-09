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
- les tests de l'API passent sur PostgreSQL 17 ;
- l'image Docker démarre sur une base vide, crée le schéma et répond ;
- derrière un proxy HTTPS, le cookie de session porte bien `Secure`.

## 1. Supabase : la base et le compartiment de fichiers

Vous avez déjà un compte.

1. Le projet existe déjà, dans la région `us-west-2` (Oregon). L'API sera donc dans la même région chez Render (`render.yaml` : `oregon`). Le mot de passe de la base reste dans votre gestionnaire de mots de passe, jamais dans le dépôt.
2. Récupérez l'adresse de la base : **Connect** → **Session pooler**. Copiez l'URI ; elle commence par `postgresql://postgres.…@aws-0-us-west-2.pooler.supabase.com:5432/postgres`.
   - Prenez le **Session pooler**, pas la connexion directe : Render ne sait pas joindre l'adresse IPv6 de la connexion directe.
   - Le code accepte cette chaîne telle quelle.
3. Créez le compartiment de fichiers : **Storage** → **New bucket** → nom `certificats`, et laissez **Public bucket** décoché.
4. Créez les clés S3 : **Storage** → **S3 Connection** → **New access key**. Vous obtenez un *Access key ID* et un *Secret access key* (affiché une seule fois). Notez aussi l'**Endpoint** (`https://….storage.supabase.co/storage/v1/s3`) et la **Region** (`us-west-2`).
   - Ce ne sont pas les clés `sb_publishable_…` et `sb_secret_…` de **Project Settings** → **API Keys** : l'application n'utilise pas celles-là.
   - Avec ces clés S3, l'API dépose les fichiers dans Supabase avec exactement le même code que dans S3 sur AWS.

> N'envoyez ces valeurs à personne, ni dans le chat ni dans le dépôt. Elles ne vont que dans les variables de Render (étape 3).

À ne pas activer : Supabase Auth, les règles RLS, les fonctions Edge. Le navigateur ne parle jamais à Supabase ; seule l'API le fait.

## 2. GitHub : la branche de démonstration

Render et Vercel déploient automatiquement la branche **`v2`**, qui sert de branche de démonstration (US-001 CA-01 ; choix du développeur, 2026-10-08).

1. Vérifiez qu'aucune vraie donnée n'est suivie par git : le dossier `data/` doit rester ignoré (`.gitignore`).
2. Commitez, puis poussez `v2` sur GitHub.
3. Ensuite, chaque envoi sur `v2` remet le démonstrateur à jour : ne poussez sur `v2` que du travail dont les tests passent.

## 3. Render : l'API

1. Sur render.com, connectez-vous avec GitHub, puis **New** → **Blueprint** → dépôt `acme-sa`. Render lit `render.yaml` et propose le service `acme-portail-api` (offre gratuite, région Oregon).
2. Saisissez les valeurs secrètes qu'il demande :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | L'URI du Session pooler (étape 1.2), avec votre mot de passe |
| `S3_ENDPOINT_URL` | L'Endpoint S3 (étape 1.4) |
| `S3_ACCESS_KEY_ID` | L'Access key ID (étape 1.4) |
| `S3_SECRET_ACCESS_KEY` | Le Secret access key (étape 1.4) |
| `ADMIN_USERNAME` | L'identifiant du premier compte RH, par exemple `rh.demo` |
| `ADMIN_PASSWORD_HASH` | L'empreinte de son mot de passe (voir ci-dessous) |

Pour calculer l'empreinte, sur votre poste, depuis `backend/` : `.venv\Scripts\python -m app.tools.hash_password`, puis saisissez le mot de passe (12 caractères au moins ; il ne s'affiche pas). Copiez la ligne qui commence par `$argon2id$`.

Les autres valeurs sont déjà dans `render.yaml` : `APP_ENV=demo`, `MFA_METHODS=TOTP`, `STORAGE_BACKEND=s3`, `S3_BUCKET=certificats`, `S3_REGION=us-west-2`.

3. Lancez le déploiement. Le premier prend quelques minutes, et le journal doit montrer `Running upgrade -> 0001`, puis `0002`.
4. Vérifiez que `https://acme-sa.onrender.com/api/health` répond `{"status":"ok"}`. Si Render a donné un autre nom au service, notez l'adresse exacte.

> L'offre gratuite endort l'API après environ 15 minutes sans visite ; le réveil prend 30 à 60 secondes. Avant une présentation, ouvrez l'adresse `/api/health` quelques minutes avant.

## 4. Vercel : le site

1. Si l'adresse Render diffère de `acme-sa.onrender.com`, corrigez-la dans `frontend/vercel.json`, puis commitez et poussez sur `v2`.
2. Sur vercel.com, connectez-vous avec GitHub, puis **Add New** → **Project** → dépôt `acme-sa`, et réglez :
   - **Root Directory** : `frontend` ;
   - **Framework** : Vite (détecté automatiquement) ;
   - **Environment Variables** : `VITE_APP_ENV` = `demo` (cette variable affiche le bandeau « Démonstration · données fictives ») ;
   - après le premier déploiement : **Settings** → **Git** → **Production Branch** = `v2`.
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

Le référentiel des unités (US-501) se charge depuis l'écran RH : menu du compte → **Référentiel** → importer `backend/demo/referentiel-fictif.xlsx` (régions, agences et directions « Démo » ; PB et RC restent « À rattacher », comme dans l'export réel). Le vrai référentiel ne va jamais sur le démonstrateur.

## 6. Montrer la double authentification à M. Hilaire

Le démonstrateur ne montre que ce que le projet livrera, sans accessoire de démonstration. Le service d'envoi des codes par WhatsApp et par email reste à choisir avec la DIT (D-41) : en ligne, ces deux méthodes apparaissent donc grisées, avec la mention « Pas encore disponible ». Le réglage `MFA_METHODS` les ouvrira le jour où l'envoi existera, sans changer les écrans.

Le parcours se fait en cinq minutes, avec Microsoft Authenticator installé sur le téléphone :

1. **Première connexion RH.** Après le mot de passe, l'espace RH reste fermé. L'écran « Protégez votre compte » présente les trois méthodes ; seule l'application d'authentification est ouverte pour l'instant.
2. **Application.** Un QR code s'affiche ; on le scanne avec Microsoft Authenticator. Le code à 6 chiffres que donne le téléphone ouvre le tableau de bord.
3. **Connexion suivante.** Après le mot de passe, l'application est demandée. Montrez qu'un code faux est refusé, et que 5 codes faux suspendent le compte 15 minutes.
4. **Téléphone perdu.** Avec un deuxième compte RH, écran « Administrateurs » → « Réinitialiser la double authentification ». À sa connexion suivante, la personne enregistre à nouveau son application.

Les règles à souligner devant lui :
- chaque connexion et chaque changement de méthode sont tracés ;
- l'espace RH peut être limité au réseau des bureaux (`RH_ALLOWED_NETWORKS`) ; cette limite est désactivée sur le démonstrateur ;
- les employés auront aussi une double authentification (US-106, D-41), à faire confirmer par lui.

## 7. Ce qui reste à faire

| Point | Story | Pourquoi ce n'est pas fait |
|---|---|---|
| Dépôt **signé** des fichiers, envoyés directement au stockage | US-301 | Aujourd'hui, les fichiers passent par l'API. Le dépôt signé viendra avec les certificats. |
| Répétition de migration sur le sandbox AWS | US-002 | AWS est pour plus tard ; la répétition a été faite en local sur PostgreSQL 17 |
| Envoi réel des codes par WhatsApp et par email | US-102 | Le service reste à choisir avec la DIT (D-41) ; il suffira d'un adaptateur derrière le port `CodeSender` |
| Double authentification des employés | US-106 | Nouvelle exigence du 2026-10-08 ; méthodes et récupération à confirmer (P-15) |
| Rôles RH (Agent RH, Administrateur, Lecture seule) | US-103 | Aujourd'hui, tout compte RH peut réinitialiser la double authentification d'un autre |
| Journal d'audit consultable dans l'écran RH | D6 | Aujourd'hui, les traces sont écrites dans le journal de la plateforme (logger `acme.security`) |
