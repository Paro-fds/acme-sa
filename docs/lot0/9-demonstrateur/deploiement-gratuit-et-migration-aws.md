# Déploiement gratuit, puis migration vers AWS

| | |
|---|---|
| **Version** | 0.1, 2026-10-07 — proposition |
| **Demande** | Déployer d'abord sur des services gratuits (par exemple Vercel et Supabase), puis passer sur le compte AWS sandbox promis par M. Hilaire, sans réécrire l'application |
| **Cible AWS** | `../6-architecture-aws/architecture-aws.html` |
| **Story** | US-001 (socle déployable), puis US-002 (production AWS) |

## 1. Le principe en une phrase

Sur les services gratuits, l'application a **déjà la forme qu'elle aura sur AWS** : un site statique, une API en conteneur, une base PostgreSQL et un stockage compatible S3. La migration ne change que la configuration (adresses, clés), pas le code.

Et parce que le démonstrateur ne contient **que des données fictives**, il n'y a **aucune donnée à migrer** : sur AWS, on recrée la base avec les migrations et on recharge le jeu fictif. C'est la règle la plus simplificatrice de tout le plan.

## 2. Qui fait quoi

| Brique | Gratuit | AWS | Ce qui ne change pas |
|---|---|---|---|
| Site React (Vite) | **Vercel** | S3 + CloudFront | Les mêmes fichiers statiques, construits par `npm run build` |
| Appels `/api/*` | Réécriture Vercel vers l'API (`vercel.json`) | Comportement CloudFront `/api/*` vers l'équilibreur | Le site appelle toujours `/api` sur sa propre adresse : cookies de session et sécurité inchangés |
| API FastAPI | **Render** ou Koyeb, en conteneur Docker (voir §4) | ECS Fargate | **La même image Docker** |
| Base | **Supabase**, utilisé seulement comme PostgreSQL | RDS PostgreSQL | Même version majeure ; schéma créé par les migrations Alembic |
| Fichiers (certificats) | **Supabase Storage**, compartiment privé, par son interface compatible S3 (voir §5 bis) | S3 privé | Le même adaptateur `S3FileStorage` (boto3) derrière le port `FileStorage` : seuls l'adresse et les clés changent |
| Double authentification | TOTP, codes email et WhatsApp gérés par l'application, derrière un port | Même chose, ou Cognito pour email et TOTP (D-41) | Les écrans et les règles (RG-82) |
| Emails | Simulés (affichés dans les journaux) | SES | Un port `EmailSender`, deux adaptateurs |
| Secrets | Variables d'environnement de Vercel et Render | Secrets Manager | Le code lit des variables d'environnement, jamais un fichier |

## 3. Ce qu'on s'interdit chez Supabase et Vercel

Ce sont les fonctions qui créeraient une dépendance et rendraient la migration coûteuse.

| Interdit | Pourquoi | À la place |
|---|---|---|
| Supabase Auth | Les comptes et mots de passe resteraient chez Supabase | L'authentification de l'application (Argon2, déjà dans le MVP) |
| Accès direct du navigateur à la base (client Supabase, règles RLS) | Toute la sécurité passerait dans Supabase ; sur RDS, elle disparaîtrait | Le navigateur ne parle qu'à l'API ; l'API est la seule porte |
| Fonctions Edge, Realtime, webhooks Supabase | Pas d'équivalent direct sur la cible | Code dans l'API |
| Fonctions propres à Vercel (middleware, KV, Blob, Postgres Vercel) | Idem | Vercel ne sert que des fichiers statiques et la réécriture `/api` |
| Transformations d'images de Supabase Storage, client Storage de Supabase dans le navigateur | S3 n'a pas d'équivalent : les écrans casseraient | L'API fabrique les liens ; une réduction d'image se fait avant l'envoi, dans le navigateur (déjà le cas dans le MVP) |
| Compartiment public | Un certificat serait lisible par toute personne ayant le lien, sans fin | Compartiment privé, liens signés à courte durée |
| Extensions PostgreSQL absentes de RDS | La base ne se recréerait pas | Vérifier chaque extension contre la liste RDS avant de l'utiliser |

## 4. Où tourne l'API : deux options

| | A. Render (ou Koyeb), conteneur Docker | B. Fonctions Python de Vercel |
|---|---|---|
| Proximité avec AWS | **Même image que Fargate** | Une autre façon de lancer l'API |
| Limites | S'endort après ~15 min sans visite : 30 à 60 s au réveil | Corps de requête limité à ~4,5 Mo ; pas de tâche longue ni de tâche de fond |
| Coût | Gratuit | Gratuit |

**Recommandation : A.** Ce qui tourne sur Render est exactement ce qui tournera sur Fargate. Il faut réveiller l'API quelques minutes avant chaque présentation.

## 5. Préparer le code (story US-001)

Le MVP a été conçu pour le poste du développeur. Quatre changements, tous dans la couche `infrastructure` et la configuration ; le domaine et les écrans ne bougent pas (Clean Architecture).

| Aujourd'hui | À faire | Fichier concerné |
|---|---|---|
| SQLite écrit en dur (`database_url`) | `DATABASE_URL` lue dans l'environnement ; moteur PostgreSQL (`psycopg`) ; SQLite reste pour les tests | `backend/app/config.py`, `shared/infrastructure/database.py` |
| Schéma créé par `create_all` | Migrations **Alembic**, versionnées, jouées au démarrage du déploiement | nouveau dossier `backend/migrations/` |
| Fichiers sur le disque (`LocalFileStorage`) | Port `FileStorage` (déposer, lien de lecture temporaire, supprimer) ; adaptateur `S3FileStorage` (boto3, `S3_ENDPOINT_URL` vers Supabase maintenant, vide sur AWS) ; dépôt **signé** directement vers le stockage | `document/domain/` (port), `document/infrastructure/` (adaptateurs) |
| API et site sur la même machine | `Dockerfile` de l'API ; `vercel.json` (réécriture `/api/*`, retour à `index.html` pour les routes React) | racine du projet |

Pourquoi le dépôt signé : un certificat peut faire 5 Mo (RG-21). Avec une signature délivrée par l'API, le navigateur envoie le fichier directement au stockage, sans passer par Vercel ni par l'API. C'est l'« URL signée » (presigned URL) de S3, que Supabase Storage accepte aussi : le même code sert des deux côtés.

## 5 bis. Supabase Storage pour les fichiers

Les certificats sont des documents personnels sensibles (cahier §8). Même avec des données fictives, le démonstrateur doit montrer qu'on les traite correctement.

| Règle | Comment |
|---|---|
| Jamais public | Compartiment **privé** ; chaque lecture passe par un lien signé de quelques minutes, demandé à l'API |
| Dépôt signé | L'API signe le dépôt (clé, type, taille) ; le navigateur envoie directement au stockage |
| Nom aléatoire | Clé aléatoire, jamais le nom ni le matricule de l'employé (EF-308) |
| Par l'interface S3 seulement | Le backend parle à Supabase Storage avec boto3, comme il parlera à S3 ; pas de client Supabase |
| Clés | Clés S3 de Supabase dans les variables d'environnement de Render, jamais dans le dépôt |

**Si l'accès S3 de Supabase n'est pas disponible** (constaté le 2026-10-07 : pas encore d'accès sur le compte du développeur) : un adaptateur `SupabaseFileStorage` appelle l'API de stockage de Supabase (compartiment privé, URL signées de dépôt et de lecture) avec la clé `service_role`, côté serveur uniquement. Une variable `STORAGE_BACKEND` (`supabase` ou `s3`) choisit l'adaptateur ; le port `FileStorage`, les écrans et le parcours restent les mêmes. En développement et dans les tests : stockage local ou en mémoire.

À la migration, on vide `S3_ENDPOINT_URL` et on change le compartiment : le code est le même. Comme les fichiers sont fictifs, aucun n'est copié ; on recharge le jeu de démonstration.

Variables d'environnement (les mêmes noms partout) :

| Variable | Gratuit | AWS |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion Supabase (pooler) | Point d'accès RDS, lu dans Secrets Manager |
| `STORAGE_BACKEND` | `s3` (accès S3 de Supabase) ou `supabase` (API de stockage, solution de secours) | `s3` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Seulement avec `STORAGE_BACKEND=supabase` | — |
| `S3_ENDPOINT_URL` | Adresse S3 de Supabase Storage | Vide (S3 d'AWS par défaut) |
| `S3_BUCKET` | Compartiment privé Supabase | Compartiment S3 |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Clés S3 de Supabase | Aucune : rôle de la tâche Fargate |
| `APP_ENV` | `demo` (bandeau, jeu fictif) | `recette`, puis `production` |
| `ALLOWED_ORIGIN` | Adresse Vercel | carriere.acmehaiti.com |

## 6. Le jour de la migration vers AWS

Aucune donnée réelle n'est sur les services gratuits : la migration est un redéploiement.

1. Créer sur AWS ce que décrit l'architecture : RDS PostgreSQL de la même version majeure que Supabase, compartiment S3, ECR, ECS Fargate, CloudFront.
2. Pousser la même image Docker dans ECR ; la lancer sur Fargate avec les variables AWS.
3. Jouer les migrations Alembic sur RDS ; charger le jeu de données fictif.
4. Construire le site, le déposer sur S3 ; régler CloudFront (`/api/*` vers l'équilibreur, retour à `index.html`).
5. Rejouer le parcours de démonstration de bout en bout.
6. Pointer l'adresse de démonstration vers CloudFront ; supprimer les projets Vercel, Render et Supabase.

Si un jour des données doivent vraiment être reprises (ce qui ne doit pas arriver avec des données fictives) : `pg_dump` puis `pg_restore` pour la base ; `rclone` ou `aws s3 sync` pour les fichiers, puisque les deux côtés parlent S3.

## 7. Règles non négociables sur les services gratuits

- **Données fictives uniquement.** Ces services sont hors du contrôle d'ACME SA : une seule vraie fiche employé y serait une faute (message de lancement §5). Aucun import de vrai CSV n'est possible quand `APP_ENV=demo`.
- Bandeau « Démonstration · données fictives » sur chaque écran.
- Région la plus proche d'Haïti (côte est des États-Unis) pour Supabase et Render.
- Les clés de service ne vont jamais dans le dépôt Git.

## 8. À vérifier avant de choisir

Les offres gratuites changent souvent ; ces points sont à relire sur les sites des fournisseurs au moment de créer les comptes.

| Point | Pourquoi |
|---|---|
| Conditions de l'offre gratuite de Vercel (Hobby) : elle est réservée à un usage personnel et non commercial | Un démonstrateur pour une entreprise peut ne pas y entrer ; sinon Cloudflare Pages ou Netlify, qui servent les mêmes fichiers |
| Supabase gratuit : mise en pause après une période sans activité, taille de base et de stockage | Penser à ouvrir le démonstrateur régulièrement |
| Supabase Storage : URL signées de dépôt et de lecture par l'interface S3, taille maximale d'un fichier sur l'offre gratuite | Sinon, utiliser les URL signées propres à Supabase derrière le même port |
| Version de PostgreSQL de Supabase disponible sur RDS | Même version majeure des deux côtés |
| Limite de taille des réécritures Vercel vers une API externe | Sans objet si les fichiers passent par URL signée |
