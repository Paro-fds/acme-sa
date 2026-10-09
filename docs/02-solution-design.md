# Solution Design — Portail carrière ACME SA (refonte)

| | |
|---|---|
| **Version** | 2.1, 2026-10-09 : lot 1 (dossier complet, certificats, référentiel « À rattacher », engagement) |
| **Rôle** | Le comment : architecture, modules, données, API, sécurité, tests. Décrit le code tel qu'il est ; mis à jour quand une story change l'architecture. |
| **Entrées** | `01-prd.md` v2.0 ; modèle de données du lot 0 (`lot0/3-modele-de-donnees/modele-de-donnees.md`) ; architecture AWS cible (`lot0/6-architecture-aws/`) |
| **Remplace** | Les Solution Design du MVP (v1.0) et de la V2 (v1.0), retirés de la branche `v2` le 2026-10-08 |

## 1. Décisions d'architecture

| N° | Décision | Pourquoi |
|---|---|---|
| A-01 | **Monolithe modulaire** en 3 tiers : SPA React, API FastAPI, base relationnelle | Une seule application à déployer et à faire évoluer par une petite équipe |
| A-02 | **Clean Architecture** vérifiée automatiquement (§3) | Les règles métier restent testables sans base ni HTTP ; changer un adaptateur (CSV → base RH, disque → S3) ne touche pas au métier |
| A-03 | **L'export RH reste en lecture seule** : le portail le lit, ne l'écrit jamais ; seuls les employés actifs et les colonnes autorisées sont lus | Cahier §3.2 ; aucune colonne exclue (banque, dettes, licenciement, pièce d'identité…) ne doit sortir |
| A-04 | **Ce que l'employé saisit vit dans la base du portail**, jamais dans l'export (module `dossier`) | Modèle de données §4 ; l'export est la référence, le dossier ce que l'employé confirme |
| A-05 | **Les mêmes images en local, au démonstrateur et sur AWS** : PostgreSQL et stockage compatible S3 en ligne ; SQLite et disque local sur le poste du développeur | Migration vers AWS sans changement de code (`lot0/9-demonstrateur/deploiement-gratuit-et-migration-aws.md`) |
| A-06 | **Schéma de base versionné par Alembic**, appliqué au démarrage du conteneur | Chaque push sur `v2` met la base du démonstrateur à jour sans geste manuel |

## 2. Stack

| Couche | Choix |
|---|---|
| Frontend | React 19, React Router 8, Vite 8, Tailwind CSS 4 (jetons dans `frontend/src/index.css`) |
| Backend | Python 3.13, FastAPI, Pydantic, SQLAlchemy 2, Alembic |
| Base | PostgreSQL (en ligne, `psycopg`) ; SQLite (poste du développeur, tests) |
| Fichiers | Disque local ou stockage S3 (`boto3`, adressage par chemin) |
| Sécurité | Argon2 (mots de passe), TOTP (`pyotp`, QR code `segno`) |
| Imports Excel | `openpyxl` (référentiel des unités) |
| Tests | pytest, Vitest + Testing Library, Playwright, import-linter |

## 3. Règles de Clean Architecture

Chaque module backend est découpé en 4 couches ; les dépendances vont uniquement vers l'intérieur.

```text
        api  ──────────┐
                       v
infrastructure ──> application ──> domain
```

| Couche | Contient | N'importe jamais |
|---|---|---|
| `domain` | Entités, règles métier pures, ports (interfaces), erreurs métier | FastAPI, Pydantic, SQLAlchemy, fichiers, autres couches |
| `application` | Cas d'utilisation : une classe, une méthode `execute()`, ports reçus par le constructeur | FastAPI, SQLAlchemy, `infrastructure`, `api` |
| `infrastructure` | Adaptateurs des ports : CSV, SQLAlchemy, disque, S3, Argon2, TOTP, Excel | `api` |
| `api` | Routes FastAPI, schémas Pydantic | `infrastructure` |

- **Composition root unique** : `backend/app/container.py` est le seul endroit qui instancie l'infrastructure ; les routes obtiennent les cas d'utilisation par `container(request)`.
- **Entre modules** : un module n'utilise un autre que par ses ports ou ses cas d'utilisation. Exemple : le profil (`employee`) lit le dossier par le port `DossierReader`, que le module `dossier` implémente avec `GetDossierSummary`.
- **Erreurs métier** : sous-classes de `app/shared/domain/errors.py`, avec un `code` stable et un `message` en français, traduites en HTTP à un seul endroit (`app/shared/api/errors.py`). Format : `{"error": {"code", "message", "field"?}}`.
- **Tests du domaine et de l'application** sans infrastructure : ports simulés en mémoire, horloge simulée (`tests/fake_clock.py`).
- **Frontend** : les composants n'appellent jamais `fetch` ; tout passe par `frontend/src/api/`. La logique d'écran vit dans des hooks.

**Vérification automatique** : 4 contrats import-linter (`[tool.importlinter]` de `backend/pyproject.toml`), exécutés par `tests/test_architecture.py`.

| Contrat | Vérifie |
|---|---|
| Couches | `api` et `infrastructure` → `application` → `domain`, dans chaque module |
| Domaine et application sans framework | ni `fastapi`, ni `starlette`, ni `pydantic`, ni `sqlalchemy` |
| Infrastructure isolée | seul `app.container` importe une `infrastructure` |
| Parcours indépendant de la campagne | `career` n'importe jamais `update` (hérité de la V2) |

## 4. Modules

| Module | Rôle | Stories | Tables |
|---|---|---|---|
| `shared` | Erreurs, horloge, base de données (`Database`, `UtcDateTime`), échelle des niveaux (`levels.py`, §7.4 du tableau des règles) | — | — |
| `auth` | Connexion employé, sessions, journal des connexions, comptes RH, double authentification RH (TOTP, codes, blocage), réseau du bureau | US-101, US-102, US-605 | `employee_account`, `session`, `employee_login`, `admin_account` |
| `employee` | Lecture de l'export RH ; profil de l'employé, affectation en libellés officiels, « Votre dossier est complet à X % » | US-201 | — (export CSV) |
| `dossier` | Consentement, coordonnées, contact d'urgence, niveau d'études ; confirmer ou signaler agence, poste, date d'embauche ; historique des confirmations ; profil complet (`IsProfileComplete`) | US-202, US-203, US-204 | `dossier`, `emergency_contact`, `dossier_confirmation`, `error_report`, `consent` |
| `certificate` | Dépôt signé direct dans le stockage privé, contrôle du contenu réel, certificats et leurs fichiers, statut, avis en un clic | US-301, US-302, US-303, US-605 | `certificate`, `certificate_file`, `certificate_feedback` |
| `referential` | Référentiel des unités : import Excel, codes stables, anciens libellés, rattachements datés, correspondances avec l'export, liste « À rattacher » | US-501, US-502 | `unit`, `unit_former_label`, `unit_attachment`, `export_mapping` |
| `update` | **Hérité du MVP**, sans route employé depuis US-206 : les envois déjà faits restent lus par les écrans RH du MVP ; fournit `GetCurrentContact` (coordonnées actuelles proposées au dossier) | — (PRD §7) | `employee_update`, `employee_change`, `employee_submitted_change` |
| `document` | **Hérité du MVP**, sans route employé depuis US-206 : documents déjà joints, lus par les RH | — (PRD §7) | `document` |
| `admin` | Écrans RH du MVP (tableau de bord, liste, recherche, dossier, réinitialisation d'accès) ; engagement des employés (US-605) | US-605 ; le reste PRD §7 | — |
| `career` | **Hérité de la V2** : « Mon parcours » | — (D-44) | `career_entry`, `career_profile` |

Outils en ligne de commande (`app/tools/`) : `create_admin` (premier compte RH), `hash_password`, `check_csv` (contrôle d'un export sans afficher aucune donnée).

## 5. Données

### 5.1 Export RH

Fichier CSV en lecture seule (`ACME_CSV_PATH`) : dates au format MM/JJ/AAAA, employés `active = true` seulement, colonnes de la liste blanche seulement (`app/employee/infrastructure/csv_employee_repository.py`). Le démonstrateur et la recette lisent toujours le CSV fictif (`backend/demo/`).

### 5.2 Base du portail

Le modèle logique fait foi : `lot0/3-modele-de-donnees/modele-de-donnees.md`. Les tables de §4 en sont l'implémentation, story par story. Ce qui se calcule ne se stocke pas : pourcentage du dossier, date de dernière confirmation, information complète.

Migrations Alembic (`backend/migrations/versions/`) :

| N° | Contenu | Story |
|---|---|---|
| 0001 | Schéma initial (comptes, sessions, mise à jour, documents, parcours) | Héritage MVP et V2 |
| 0002 | Double authentification des comptes RH | US-102 |
| 0003 | Référentiel des unités | US-501 |
| 0004 | Dossier de l'employé | US-202 |
| 0005 | Signalements d'erreur | US-203 |
| 0006 | Certificats, fichiers, avis | US-301, US-302 |
| 0007 | Journal des connexions | US-605 |

## 6. API REST

Toutes les routes sont sous `/api`. Un employé n'accède à ses données que par `/api/me/*`, jamais par un identifiant dans l'adresse. Les routes `/api/admin/*` exigent une session RH complète (mot de passe et second facteur).

| Domaine | Routes |
|---|---|
| Santé | `GET /health` |
| Connexion employé | `POST /auth/register`, `/auth/login`, `/auth/logout` |
| Connexion RH (US-102) | `POST /admin/auth/login` (202 : second facteur attendu), `/admin/auth/logout` ; `GET /admin/auth/mfa`, `POST /admin/auth/mfa/setup`, `/setup/confirm`, `/code`, `/verify` |
| Compte RH | `GET /admin/me`, `POST /admin/me/password` ; `GET /admin/me/mfa`, `POST /admin/me/mfa/setup`, `/setup/confirm`, `/code`, `/confirm` ; `GET`/`POST /admin/admins`, `DELETE /admin/admins/{id}`, `POST /admin/admins/{id}/reset-mfa` |
| Profil (US-201) | `GET /me/profile` |
| Dossier (US-202, US-203) | `GET /me/dossier` ; `POST /me/dossier/consent` ; `PUT /me/dossier/coordinates`, `/me/dossier/contact-and-education` ; `POST /me/dossier/hr-information/{clé}/confirm`, `/report` |
| Certificats (US-301 → US-303) | `GET /me/certificates`, `/me/certificates/form` ; `POST /me/certificates/uploads` (dépôt signé) ; `PUT /me/certificates/uploads/{id}` (stockage local seulement) ; `POST /me/certificates` ; `POST /me/certificates/{id}/feedback` |
| Engagement (US-605) | `GET /admin/engagement` |
| Référentiel (US-501, US-502) | `GET /admin/referential` (dont `to_attach`), `POST /admin/referential/import` |
| Hérité du MVP | `/admin/statistics`, `/admin/employees/*`, `/admin/documents/{id}/file` (les routes employé `/me/update/*` et `/me/documents/*` ont été retirées par US-206) |
| Hérité de la V2 | `GET /me/career`, `/me/career/fields` |

## 7. Frontend

SPA mobile d'abord (390 px), vérifiée aussi à 1280 px. Dossiers `frontend/src/` :

| Dossier | Contenu |
|---|---|
| `api/` | Client HTTP (`client.js`, `ApiError`) et une fonction par route |
| `components/` | Composants du design system (`Page`, `Button`, `TextField`, `StatusBadge`, `Mascot`, `DemoBanner`…) |
| `lib/` | Hooks et formats communs (`useLoader`, `format.js`, `env.js`) |
| `features/home`, `auth` | Accueil public (US-105), connexion (US-101) |
| `features/dashboard` | « Accueil » de l'employé après la connexion (US-207, écran validé 06) |
| `features/profile` | « Mon profil », pourcentage (US-201) |
| `features/dossier` | « Avant de commencer », sections 1/3, 2/3 (US-202) et 3/3 « Mes informations RH » (US-203) |
| `features/certificates` | « Mes certificats » : liste de ce qui reste (US-204), dépôt (US-301), remerciement et avis (US-302), suivi (US-303) |
| `features/admin` | Écrans RH : double authentification (`mfa/`), référentiel et « À rattacher » (`referential/`), engagement (`EngagementCard`) ; écrans hérités du MVP |
| `features/career` | « Mon parcours », hérité de la V2 (D-44) |

Les écrans suivent ceux que M. Hilaire a validés (D-47) : `lot0/2-maquettes/2-espace-employe-ecrans/` et `lot0/2-maquettes/3-espace-rh-ecrans/` ; une règle du registre l'emporte sur un texte d'écran qui la contredit. Chaque écran employé (`Page account`) a l'en-tête « Portail Carrière », le lien de retour dans la page et la barre du bas Accueil / Mon profil / Mes certificats (`components/BottomNav.jsx`).

## 8. Sécurité et confidentialité

- **Données** : aucune donnée réelle hors de la production sécurisée (US-002) ; le démonstrateur et la recette n'ont que des données fictives. Aucune colonne exclue de l'export dans l'API ni dans les journaux : le CSV de test met `FAKE-SECRET-…` dans ces colonnes et les tests le cherchent.
- **Mots de passe** : Argon2, jamais renvoyés ni journalisés.
- **Sessions** : jeton dans un cookie `HttpOnly`, `SameSite=Strict` ; 30 minutes pour l'employé, 120 pour les RH.
- **Comptes RH** : double authentification obligatoire, sans réglage pour la désactiver ; méthodes ouvertes selon `MFA_METHODS` ; 5 codes faux → blocage 15 minutes ; journal de sécurité (`acme.security`).
- **Espace RH réservé au réseau des bureaux** : toute route `/api/admin/*`, connexion comprise, refuse une adresse hors de `RH_ALLOWED_NETWORKS` (vide = aucune restriction, poste du développeur et démonstrateur).
- **Consentement** : aucune saisie dans le dossier avant l'accord à la mention d'information ; accord daté, avec la version du texte (US-202, D-09).
- **Codes affichés à l'écran** : seulement avec `APP_ENV=local`, jamais en ligne.
- **Certificats** (US-301) : le navigateur envoie le fichier directement au compartiment privé avec une adresse signée de 10 minutes ; l'API contrôle ensuite le contenu réel (PDF, JPG, PNG), la taille (5 Mo) et supprime un fichier refusé. Nom de stockage aléatoire, rangé sous `certificates/<employé>/` : un employé ne peut désigner que ses propres dépôts. Le dépôt n'est possible qu'avec le profil complet (US-204). En ligne, le compartiment doit accepter les envois du site (règle CORS) : à vérifier sur le démonstrateur.

## 9. Configuration

Variables d'environnement (`backend/app/config.py`, modèle dans `backend/.env.example`, sans aucun secret) :

| Variable | Rôle |
|---|---|
| `APP_ENV` | `local`, `demo`, `recette` ou `production`. Hors `local`, `DATABASE_URL` est obligatoire ; `demo` et `recette` lisent toujours le CSV fictif |
| `DATABASE_URL` | PostgreSQL en ligne ; vide en local (SQLite dans `ACME_DATA_DIR`) |
| `ACME_CSV_PATH`, `ACME_DATA_DIR` | Export RH ; dossier des données locales, hors OneDrive (`C:\acme-data-v2`) |
| `STORAGE_BACKEND`, `S3_*` | `local` ou `s3` ; seau, région, adresse, clés |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | Premier compte RH, importé en base au démarrage |
| `MFA_METHODS`, `RH_ALLOWED_NETWORKS` | Méthodes de double authentification ouvertes ; réseaux du bureau |
| `EMPLOYEE_SESSION_MINUTES`, `ADMIN_SESSION_MINUTES` | Durée des sessions |
| `MAX_UPLOAD_MB`, `MAX_CERTIFICATES_PER_EMPLOYEE` | 5 Mo par fichier, 20 certificats par employé (D-07) |
| `MAX_DOCUMENTS_PER_EMPLOYEE`, `MAX_CAREER_ENTRIES_PER_KIND` | Limites héritées |

Les secrets ne vivent que dans `backend/.env` (non versionné) ou dans les réglages de l'hébergeur.

## 10. Environnements

| Environnement | Site | API | Base et fichiers |
|---|---|---|---|
| Poste du développeur | Vite ou `frontend/dist` | uvicorn | SQLite, disque (`C:\acme-data-v2`) |
| Démonstrateur (en ligne, branche `v2`) | Vercel | Render (image Docker `backend/Dockerfile`, `render.yaml`) | Supabase : PostgreSQL et stockage S3 |
| Recette et production (lot 3) | AWS, architecture `lot0/6-architecture-aws/` | AWS | AWS |

Mise en ligne pas à pas : `lot0/9-demonstrateur/mise-en-ligne-pas-a-pas.md`.

## 11. Tests

| Niveau | Outil | Où |
|---|---|---|
| Domaine, application | pytest, ports en mémoire | `backend/tests/unit/` |
| API | pytest + `TestClient`, base temporaire | `backend/tests/api/` |
| Architecture | import-linter | `backend/tests/test_architecture.py` |
| Écrans | Vitest + Testing Library | `frontend/src/**/*.test.jsx` |
| Bout en bout | Playwright, mobile 390 px, CSV fictif | `frontend/e2e/` |

`TEST_POSTGRES_URL` fait tourner toute la suite backend sur PostgreSQL. Le jeu de test commun et les fixtures sont décrits dans `03-plan-implementation.md` §4.
