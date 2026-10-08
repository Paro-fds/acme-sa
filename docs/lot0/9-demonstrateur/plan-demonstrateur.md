# Plan du démonstrateur

| | |
|---|---|
| **Version** | 0.1, 2026-10-07 — proposition, à valider par le développeur puis le directeur |
| **Origine** | Demande orale du directeur (2026-10-07) : il a besoin de visuel pour montrer à la direction générale ce que le développeur construit. Aucune date fixée : « le plus tôt possible » |
| **Statut** | ⚠️ Exception à la règle « Rien n'est développé avant ma validation des spécifications et des maquettes » : à faire noter par le directeur (D-40 ci-dessous) |

## 1. Ce que le démonstrateur est, et n'est pas

| Il est | Il n'est pas |
|---|---|
| Une application qui tourne en ligne, que le directeur ouvre sur son téléphone devant la direction générale | La production : il n'est **jamais** ouvert aux employés (ouverture à la fin du lot 3, cahier §11.3) |
| Un parcours qui traverse les lots 1, 2 et 4 | Le découpage en lots : il ne valide ni ne remplace aucun lot |
| Construit sur le modèle de données v0.5 et la même forme technique que la cible AWS : le code sert ensuite | Un prototype jetable |
| Rempli de **données fictives** seulement | Un lieu où entre une seule donnée réelle |

**Règles non négociables** (message de lancement §5 ; registre v1.8) :

- Aucune donnée réelle d'employé, aucun vrai CSV, aucun salaire.
- Un bandeau « Démonstration · données fictives » sur chaque écran.
- Les employés fictifs, agences et directions sont ceux des maquettes (Lucie Exemple EMP-0418, Agence Démo Nord…).

## 2. Décision à faire noter par le directeur

> **D-40 — Démonstrateur.** Le directeur autorise, le 07/10/2026, un démonstrateur en ligne destiné à la direction générale, avant la validation des spécifications et des maquettes. Données fictives uniquement, jamais ouvert aux employés, hébergé sur des plateformes gratuites puis sur le compte AWS sandbox. Les spécifications et les maquettes restent soumises à sa validation ; le démonstrateur s'y adaptera.

Sans cette trace écrite, coder maintenant contredit sa propre règle.

## 3. Étape 0 : montrer ce qui existe déjà (aucun code)

Le directeur n'a pas encore reçu les maquettes. C'est le visuel le plus rapide :

| Quoi | Où | État |
|---|---|---|
| Prototype cliquable de l'espace employé | `2-maquettes/1-espace-employe-prototype-cliquable/`, déjà publié | ✅ prêt |
| 11 écrans de l'espace RH | `2-maquettes/3-espace-rh-ecrans/` | ✅ conformes (revue 4) ; à rassembler dans une page de présentation |
| Schémas, cas d'utilisation, architecture AWS | pages publiées | ✅ |

Le directeur peut les montrer à la direction générale pendant que le démonstrateur se construit. Et ses retours sur les maquettes évitent de coder des écrans qu'il changera.

## 4. Le parcours de démonstration (5 minutes)

Une histoire, de l'employé à la direction. Chaque scène cite les exigences qu'elle illustre.

| # | Scène | Lot | Exigences | Ce que la direction générale voit |
|---|---|---|---|---|
| 1 | Lucie se connecte sur son téléphone, complète son dossier et dépose son diplôme | 1 | EF-101, EF-201 → EF-209, EF-301 → EF-303, EF-307 | Un portail simple, mobile, en français |
| 2 | Un agent RH ouvre la file de validation, voit le diplôme et le valide | 2 | EF-401 → EF-405 | Les RH ne ressaisissent plus ; tout est tracé |
| 3 | Tableau de bord : % de dossiers complets, certificats reçus, par agence et direction | 2 | EF-601 → EF-603 | Le pilotage, ce que la direction n'a pas aujourd'hui |
| 4 | Une lettre de demande scannée est enregistrée dans le registre des demandes | 2 | EF-901 (lettre), EF-902 | Le papier rejoint le numérique |
| 5 | Un poste s'ouvre : Lucie le voit dans « Ma carrière », la direction voit les profils éligibles | 4 | EF-801, EF-803 → EF-806 | L'objectif final : la gestion des carrières |

**Première version montrable : scènes 1 et 2.** Les scènes 3 à 5 s'ajoutent une par une, toujours en ligne.

Simplifications assumées pour la démonstration :

| Simplification | Version réelle |
|---|---|
| Scène 4 : la lettre est déjà « lue » (texte préparé) | OCR Textract sur AWS (lot 2, D-38) |
| Pas d'emails ni de WhatsApp ; un message à l'écran les remplace | SES, WhatsApp (livrable 7) |
| Référentiel des agences fictif | Référentiel validé par Mme Nérius (B-02) |
| Règles d'éligibilité de la scène 5 simplifiées | Grille de classification et mouvements (lot 4) |

## 5. Hébergement : gratuit d'abord, même forme que la cible AWS

> **Détail et procédure de migration :** `deploiement-gratuit-et-migration-aws.md` (Vercel pour le site, Render pour l'API en conteneur, Supabase pour PostgreSQL et les fichiers).

Seuls les fournisseurs changent entre les deux colonnes ; le passage se fait par la configuration (variables d'environnement), sans réécriture.

| Brique | Pont gratuit | Cible AWS (`6-architecture-aws/`) | Ce qui rend le passage simple |
|---|---|---|---|
| Site React | Cloudflare Pages ou Vercel | S3 + CloudFront | Fichiers statiques ; l'adresse de l'API en variable |
| API FastAPI | Render ou Koyeb | ECS Fargate | **Une image Docker** identique |
| Base | Neon ou Supabase (PostgreSQL) | RDS PostgreSQL | **PostgreSQL dès le départ**, migrations Alembic, copie par `pg_dump` / `pg_restore` |
| Documents | Supabase Storage, compartiment privé | S3 | Les deux parlent le protocole S3 : seuls l'adresse et les clés changent |
| Connexion RH | Mot de passe + code à usage unique, dans l'application | Cognito | Derrière un port (Clean Architecture) : on change l'adaptateur |
| Emails | Simulés | SES | Idem |
| Déploiement | Automatique depuis GitHub (branche `demo`) | Idem vers ECR / ECS | Mêmes commandes de build |

**Si le compte AWS sandbox arrive avant que le socle soit prêt, on saute le pont** et on déploie directement sur AWS. ❓ Délai de création du compte : inconnu.

À vérifier au moment du choix : les offres gratuites changent souvent (limites, mise en veille, durée).

## 6. Étapes

| # | Étape | Résultat visible | Dépend de |
|---|---|---|---|
| 0 | Envoyer les maquettes et le prototype ; faire noter D-40 | Le directeur a du visuel tout de suite | — |
| 1 | Socle : partir du code V2 existant (`app-web-v2`), remplacer SQLite par PostgreSQL et le disque par un stockage S3, Docker, variables d'environnement, déploiement automatique, bandeau, jeu de données fictif | Une adresse en ligne avec la connexion | Choix des plateformes |
| 2 | Scène 1 (espace employé) | Le parcours de Lucie, d'après le prototype | Étape 1 |
| 3 | Scène 2 (validation RH) | L'aller-retour employé → RH | Étape 2 ; maquettes A1–A11 |
| 4 | Scène 3 (tableau de bord) | | Étape 3 |
| 5 | Scènes 4 et 5 | Le parcours complet | Étape 3 |
| 6 | Répétition avec le directeur | Un script de 5 minutes et des données prêtes | Étapes 2 à 5 |
| 7 | Passage au compte AWS sandbox | Même application, hébergée chez ACME SA | Compte créé par le directeur |

Méthode : chaque scène devient une story courte avec ses critères d'acceptation et ses tests, comme au MVP. Le MVP en service (`app-web`) n'est pas touché.

## 7. Risques

| Risque | Parade |
|---|---|
| La direction générale prend la démonstration pour un produit fini | Bandeau permanent ; le directeur présente « ce qui arrive », pas « ce qui est prêt » |
| Le directeur change les maquettes après la démonstration | Étape 0 d'abord : ses retours avant le code |
| Une donnée réelle entre dans le démonstrateur | Aucun import de CSV réel possible ; jeu fictif chargé au démarrage |
| L'API gratuite « dort » et met 30 à 60 s à répondre | Ouvrir le lien quelques minutes avant chaque présentation |
| Le démonstrateur avance plus vite que les validations | Les décisions D-01 → D-39 restent ouvertes ; on code la proposition recommandée et on le dit |

## 8. Questions ouvertes

| # | Question | Pour |
|---|---|---|
| 1 | Le directeur accepte-t-il de noter D-40 par écrit ? | Directeur |
| 2 | Le parcours en 5 scènes lui convient-il, ou veut-il voir autre chose ? | Directeur |
| 3 | Dans quel délai le compte AWS sandbox sera-t-il créé ? | Directeur |
| 4 | Le démonstrateur peut-il porter le logo et le nom d'ACME SA, sur une plateforme gratuite ? | Directeur |
