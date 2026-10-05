# Solution Design — Portail de mise à jour des dossiers employés (MVP)

| | |
|---|---|
| **Version** | 1.0 — validé le 2026-10-04 |
| **Date** | 2026-10-04 |
| **Entrée** | `01-prd.md` v1.0 |
| **Sortie** | Base des user stories (`epics/`) et du plan d'implémentation |

---

## 1. Décisions d'architecture

| ID | Décision | Justification |
|---|---|---|
| AD-01 | **Monolithe modulaire** : un seul processus FastAPI sert l'API (`/api/*`) et le frontend compilé (`/`) | Une seule commande, une seule URL, pas de CORS |
| AD-02 | **Exécution sur la machine du développeur**, écoute sur `0.0.0.0:8000` | Décision MVP : pas de déploiement cloud |
| AD-03 | **Données de référence lues depuis le CSV au démarrage**, gardées en mémoire, jamais copiées en base | RM-01/RM-12 : remplacer le CSV = redémarrer ; aucune migration de données |
| AD-04 | **SQLite** pour les données générées par l'application (comptes, mises à jour, changements, documents, sessions) | Un fichier, zéro installation, largement suffisant pour 364 employés |
| AD-05 | **Fichiers sur disque local** dans un dossier de données hors OneDrive | ENF-08 ; derrière l'interface `FileStorage` |
| AD-06 | **Clean Architecture** par module : `domain` → `application` → `infrastructure` / `api` | ENF-10 ; l'infrastructure (CSV, SQLite, disque) est remplaçable |
| AD-07 | **Sessions côté serveur** dans un cookie `HttpOnly` (pas de JWT) | Révocation immédiate (déconnexion, réinitialisation d'accès), rien de sensible dans le navigateur |
| AD-08 | **Liste blanche de colonnes** : seules les colonnes autorisées (PRD 7.2) sont lues du CSV | ENF-07 : les données sensibles n'entrent jamais en mémoire |
| AD-09 | **Champs modifiables déclarés dans un registre** (code unique, libellé, validation) | Ajouter/retirer un champ sans toucher la logique métier |

## 2. Stack technique

| Couche | Choix |
|---|---|
| Frontend | React 19, Vite, JavaScript (JSX), React Router, Tailwind CSS 4 |
| Backend | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Uvicorn |
| Base de données | SQLite (fichier) |
| Mots de passe | Argon2 (`argon2-cffi`) |
| Tests backend | pytest, `httpx` / `TestClient` FastAPI |
| Tests frontend | Vitest, React Testing Library |
| Tests bout en bout | Playwright (quelques parcours critiques, viewport mobile 390 × 844) |

**Tailwind** est retenu parce que le code exporté de Stitch est déjà écrit en Tailwind : les maquettes se transposent presque directement en composants React. Les jetons du design system (`DESIGN.md`) sont reportés dans la configuration Tailwind.

## 3. Vue d'ensemble

```text
 Téléphone / PC (navigateur)
          |
          |  HTTP  http://<ip-machine>:8000
          v
+--------------------------------------------------------------+
|                  Machine serveur (Windows)                   |
|                                                              |
|  Uvicorn / FastAPI                                           |
|  ├── /            → frontend React compilé (fichiers statiques)
|  └── /api/*       → API REST                                 |
|        |                                                     |
|        ├── CsvEmployeeRepository → data/vault-employee-...csv |  (lecture seule)
|        ├── SQLite                → C:\acme-data\portail.db    |
|        └── LocalFileStorage      → C:\acme-data\documents\    |
+--------------------------------------------------------------+
```

En développement : Vite tourne sur `:5173` et redirige `/api` vers FastAPI sur `:8000` (proxy Vite).

## 4. Structure du dépôt

```text
app-web/
├── backend/
│   ├── app/
│   │   ├── main.py                  # création de l'app, routes, fichiers statiques
│   │   ├── config.py                # paramètres (variables d'environnement)
│   │   ├── shared/                  # base SQLAlchemy, erreurs, normalisation texte, horloge
│   │   ├── employee/                # référence employés (CSV)
│   │   │   ├── domain/              # Employee, EmployeeRepository (interface)
│   │   │   ├── application/         # GetEmployeeProfile
│   │   │   ├── infrastructure/      # CsvEmployeeRepository
│   │   │   └── api/                 # routes /api/me/profile
│   │   ├── auth/                    # comptes, mots de passe, sessions
│   │   ├── update/                  # mise à jour, brouillon, changements, soumission
│   │   ├── document/                # documents, FileStorage
│   │   └── admin/                   # statistiques, liste, recherche, consultation
│   ├── tests/
│   │   ├── fixtures/employees_test.csv
│   │   ├── unit/
│   │   └── api/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/                     # client HTTP
│   │   ├── components/              # en-tête, stepper, badges, cartes, champs
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── update/
│   │   │   ├── documents/
│   │   │   └── admin/
│   │   └── routes.jsx
│   ├── e2e/                         # tests Playwright
│   └── package.json
├── data/                            # CSV réel (hors git)
├── docs/
├── stitch_portail_dossier_collaborateur_acme/   # maquettes (référence visuelle)
└── run.ps1                          # lancement en une commande
```

Chaque module backend suit la même organisation en 4 couches :

| Couche | Contenu | Dépend de |
|---|---|---|
| `domain` | Entités, règles métier, interfaces (repositories, storage) | rien |
| `application` | Cas d'utilisation (une classe/fonction par cas) | `domain` |
| `infrastructure` | Implémentations : CSV, SQLAlchemy, disque | `domain` |
| `api` | Routes FastAPI, schémas Pydantic d'entrée/sortie | `application` |

## 5. Données de référence (CSV)

### 5.1 Lecture

`CsvEmployeeRepository` lit le fichier au démarrage :

- encodage `utf-8-sig` (le fichier commence par un BOM), séparateur virgule ;
- **seules les colonnes de la liste blanche** sont conservées ; les autres sont ignorées dès la lecture ;
- **seuls les employés `active = true`** sont chargés (D-01) ;
- `date_of_birth` et `date_of_hire` parsées au format **`MM/JJ/AAAA`** ;
- chemin du fichier fourni par la configuration (`ACME_CSV_PATH`).

### 5.2 Entité `Employee` (lecture seule)

| Champ | Colonne CSV | Remarque |
|---|---|---|
| `id` | `id` | Clé technique unique |
| `employee_code` | `employee_code` | Matricule, non unique, affichage seulement |
| `last_name`, `first_name` | idem | Modifiables via une mise à jour |
| `birth_date` | `date_of_birth` | Identification |
| `gender` | `gender` | |
| `agency_code` | `agency_code` | |
| `department` | `department` | Affiché tel quel (accents corrompus de la source) |
| `position`, `grade`, `level` | idem | |
| `contract_nature` | `contract_nature` | |
| `hire_date` | `date_of_hire` | |
| `telephone_number`, `email_address`, `address_line_1` | idem | Modifiables |

### 5.3 Interface

```python
class EmployeeRepository(Protocol):
    def get(self, employee_id: str) -> Employee | None: ...
    def find_by_identity(self, last_name: str, first_name: str, birth_date: date) -> list[Employee]: ...
    def list_all(self) -> list[Employee]: ...
```

En V2, une implémentation `AcmeDatabaseEmployeeRepository` remplacera la version CSV sans changer les cas d'utilisation.

### 5.4 Normalisation du texte

Une fonction unique `normalize(text)` est utilisée pour l'identification et la recherche : minuscules, suppression des accents, espaces multiples réduits, espaces en début/fin supprimés. Ex. `"  Jean-Joseph  ÉTIENNE"` → `"jean-joseph etienne"`.

## 6. Modèle de données (SQLite)

L'identifiant employé (`employee_id`) est l'`id` du CSV, sans clé étrangère (la référence n'est pas en base).

```text
employee_account                      session
-----------------                     -------
employee_id      PK                   token_hash     PK   (SHA-256 du jeton)
password_hash                         subject_type        EMPLOYEE | ADMIN
failed_attempts  int                  subject_id          employee_id ou id admin
locked_until     datetime | null      created_at
created_at                            last_seen_at
updated_at                            expires_at

employee_update                       employee_change
---------------                       ---------------
id               PK                   id             PK
employee_id      UNIQUE               update_id      FK → employee_update.id
status           DRAFT | SUBMITTED    field_name          code du registre (§7)
accepted         bool                 old_value           valeur de référence (CSV)
created_at                            new_value
updated_at                            changed_at
submitted_at     datetime | null      UNIQUE(update_id, field_name)

admin_account (US-23)
---------------------
id               PK (UUID)
username         unique (comparaison sans majuscules)
password_hash
must_change_password bool          mot de passe provisoire
failed_attempts  int
locked_until     datetime | null
created_at
created_by       id admin | null   (null : premier compte ou migration)
last_login_at    datetime | null

document
--------
id               PK (UUID)
employee_id
document_type    DIPLOME | CERTIFICAT | ATTESTATION | AUTRE
original_name                         nom du fichier envoyé (affichage)
stored_name                           UUID + extension (nom sur disque)
content_type
size_bytes
uploaded_at
```

### 6.1 Statut de la mise à jour

Pour l'administration, il n'existe que **deux statuts** :

| Statut | Code | Condition |
|---|---|---|
| Mise à jour effectuée | `UPDATED` | `employee_update.status = SUBMITTED` |
| Mise à jour non effectuée | `NOT_UPDATED` | tout le reste : aucune ligne, réponse « Non », brouillon en cours |

Le brouillon reste un état **interne au parcours de l'employé** (F-14) : il lui permet de reprendre sa démarche (« Vous avez une mise à jour en cours »), mais il n'apparaît ni dans les statistiques, ni dans les filtres admin.

Un employé ayant répondu « Non » peut revenir et répondre « Oui » plus tard.

### 6.2 Règles d'écriture des changements

- `old_value` = valeur du CSV au moment de la modification ; `new_value` = valeur saisie.
- Un champ remis à sa valeur d'origine est **supprimé** de `employee_change` (pas de faux changement).
- Après `SUBMITTED`, plus aucune écriture n'est acceptée **tant que l'employé n'a pas rouvert** sa mise à jour (D-04 révisée, US-24).
- **Dernier envoi (US-24)** : chaque envoi copie les changements dans `employee_submitted_change` (même structure que `employee_change`) ; `submitted_at` = date du dernier envoi. « Modifier à nouveau » repasse le statut à `DRAFT` en gardant cette copie ; l'administration, l'identification et le profil lisent la copie, le brouillon reste dans `employee_change`. « Annuler les modifications » remet le brouillon à la copie et le statut à `SUBMITTED`. Statut admin `UPDATED` = au moins un envoi.

## 7. Registre des champs modifiables

Déclaré dans `update/domain/editable_fields.py` :

| Code | Libellé | Section | Obligatoire | Validation |
|---|---|---|---|---|
| `last_name` | Nom | Identité | oui | 1–60 caractères, lettres, espaces, `-` et `'` |
| `first_name` | Prénom | Identité | oui | idem |
| `telephone_number` | Téléphone | Coordonnées | oui | 8 à 15 chiffres après suppression des espaces, `-`, `+` en tête autorisé |
| `email_address` | Email | Coordonnées | non | format email valide, 254 caractères max |
| `address_line_1` | Adresse | Coordonnées | non | 5–200 caractères |

Valeurs enregistrées « nettoyées » (espaces en début/fin supprimés). L'API retourne ce registre (`GET /api/me/update/fields`) pour que le formulaire frontend soit généré sans dupliquer les règles.

## 8. Authentification

### 8.1 Employé

```text
POST /api/auth/identify   {last_name, first_name, birth_date}
   ├── 0 correspondance              → 401  IDENTITY_NOT_RECOGNIZED
   ├── > 1 correspondance            → 409  IDENTITY_AMBIGUOUS
   ├── compte sans mot de passe      → 200  {next_step: "CREATE_PASSWORD"}
   └── compte avec mot de passe      → 200  {next_step: "ENTER_PASSWORD"}

POST /api/auth/register   {last_name, first_name, birth_date, password, password_confirmation}
POST /api/auth/login      {last_name, first_name, birth_date, password}
   → 200 + cookie de session
```

- **Correspondance d'identité** : `normalize(nom)`, `normalize(prénom)` et date de naissance comparés aux valeurs du CSV **ou** aux nouvelles valeurs nom/prénom **soumises** par l'employé (D-03).
- `register` refuse si un mot de passe existe déjà (409) ; ré-applique la vérification d'identité.
- **Blocage** : 5 échecs consécutifs → `locked_until = maintenant + 15 min` (423 `ACCOUNT_LOCKED`) ; remise à zéro après un succès.
- **Messages** : 401 renvoie toujours le même texte « Informations non reconnues », que la personne soit inconnue ou inactive (F-04).

### 8.2 Administrateur

- Comptes enregistrés dans la table `admin_account` (US-23, F-30) : identifiant unique (sans tenir compte des majuscules), hash Argon2, blocage **par compte**, mot de passe provisoire à changer à la première connexion (`403 PASSWORD_CHANGE_REQUIRED` sur les autres routes tant qu'il n'est pas changé).
- Premier compte : demandé par `run.ps1` dans la console (`python -m app.tools.create_admin --if-missing`) ; aucune route web ne crée de compte sans session admin. Migration : si la table est vide, `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` de la configuration sont importés au démarrage.
- `POST /api/admin/auth/login {username, password}` → cookie de session `ADMIN` (`subject_id` = identifiant du compte admin). Identifiant inconnu : même message qu'un mauvais mot de passe.
- Même mécanisme de blocage que les employés.

### 8.3 Sessions

| Paramètre | Valeur |
|---|---|
| Jeton | 32 octets aléatoires, stocké **haché** en base |
| Cookie | `acme_session`, `HttpOnly`, `SameSite=Strict`, `Path=/` (`Secure` si HTTPS via tunnel) |
| Expiration employé | 30 min d'inactivité |
| Expiration admin | 2 h d'inactivité |
| Déconnexion | suppression de la session en base + du cookie |
| Réinitialisation d'accès (F-29) | efface `password_hash`, remet le blocage à zéro et **supprime les sessions** de l'employé |

Deux dépendances FastAPI protègent les routes : `current_employee` (routes `/api/me/*`) et `current_admin` (routes `/api/admin/*`). Un employé n'accède **jamais** à une ressource par un identifiant passé dans l'URL : tout passe par `/api/me`, ce qui rend impossible la consultation du dossier d'un autre.

## 9. Documents

| Règle | Implémentation |
|---|---|
| Types acceptés | PDF, JPG, PNG — vérifiés par l'extension **et** la signature binaire du fichier |
| Taille max | 5 Mo par fichier (`MAX_UPLOAD_MB`) → 413 `FILE_TOO_LARGE` |
| Nombre max | 10 par employé → 409 `DOCUMENT_LIMIT_REACHED` |
| Nom sur disque | `UUID.ext` ; le nom d'origine n'est conservé qu'en base |
| Emplacement | `ACME_DATA_DIR/documents/<employee_id>/` |
| Suppression | Autorisée tant que la mise à jour n'est pas soumise |
| Téléchargement | Uniquement via l'API, après contrôle de session (propriétaire ou admin), avec `Content-Disposition` |
| Compression photo | Côté navigateur, avant envoi : JPG/PNG > 1600 px redimensionnés |

```python
class FileStorage(Protocol):
    def save(self, key: str, content: BinaryIO) -> None: ...
    def open(self, key: str) -> BinaryIO: ...
    def delete(self, key: str) -> None: ...
```

Implémentation MVP : `LocalFileStorage`. Plus tard : S3, R2, Supabase…

## 10. API REST

Format d'erreur commun : `{"error": {"code": "IDENTITY_NOT_RECOGNIZED", "message": "Informations non reconnues"}}` — messages en français, affichables tels quels.

### 10.1 Authentification

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/api/auth/identify` | public | Étape 1 de connexion |
| POST | `/api/auth/register` | public | Création du mot de passe |
| POST | `/api/auth/login` | public | Connexion employé |
| POST | `/api/auth/logout` | employé | Déconnexion |
| POST | `/api/admin/auth/login` | public | Connexion admin |
| POST | `/api/admin/auth/logout` | admin | Déconnexion admin |

### 10.2 Espace employé

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/me/profile` | Profil (valeurs actuelles + statut de la mise à jour) |
| GET | `/api/me/update` | Mise à jour en cours : statut, changements, dates |
| GET | `/api/me/update/fields` | Registre des champs modifiables |
| POST | `/api/me/update/decision` | `{accepted: true\|false}` — choix Oui/Non |
| PUT | `/api/me/update/changes` | `{changes: {field: value, ...}}` — enregistre le brouillon |
| POST | `/api/me/update/submit` | `{confirmed: true}` — envoi (remplace le précédent, US-24) |
| POST | `/api/me/update/reopen` | « Modifier à nouveau » après un envoi (US-24) |
| POST | `/api/me/update/discard` | « Annuler les modifications » : retour au dernier envoi (US-24) |
| GET | `/api/me/documents` | Liste des documents |
| POST | `/api/me/documents` | Envoi (multipart : `file`, `document_type`) |
| DELETE | `/api/me/documents/{id}` | Suppression (si non soumis) |
| GET | `/api/me/documents/{id}/file` | Téléchargement / aperçu |

### 10.3 Espace administrateur (lecture seule, sauf F-29)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/admin/statistics` | Total, effectuées, non effectuées, % d'avancement |
| GET | `/api/admin/employees?search=&status=&page=&page_size=` | Liste paginée (20 par page), recherche + filtre |
| GET | `/api/admin/employees/{id}` | Dossier : référence, changements, statut, compte activé ou non |
| GET | `/api/admin/employees/{id}/documents` | Documents de l'employé |
| GET | `/api/admin/documents/{id}/file` | Téléchargement / aperçu |
| POST | `/api/admin/employees/{id}/reset-access` | Réinitialisation de l'accès (F-29) |

### 10.4 Recherche (F-25)

- Effectuée en mémoire sur les 364 employés actifs (suffisant, < 10 ms).
- Terme normalisé (§5.4), comparé par « contient » à : nom, prénom, `nom prénom`, `prénom nom`, matricule, et nouveaux nom/prénom **soumis**.
- Combinable avec `status` (`UPDATED`, `NOT_UPDATED`).
- Tri : nom puis prénom. Terme vide → liste complète.

## 11. Frontend

### 11.1 Routes

| Route | Écran | Source maquette |
|---|---|---|
| `/` | Identification | `identification_collaborateur` |
| `/connexion/homonyme` | Plusieurs dossiers : contacter l'administration | `v_rification_d_identit_homonyme` (adapté) |
| `/connexion/mot-de-passe` | Saisie ou création du mot de passe | à créer, même style |
| `/profil` | Mon profil + choix Oui/Non | `mon_profil_collaborateur` |
| `/mise-a-jour/informations` | Étape 1 | `mise_jour_informations` |
| `/mise-a-jour/documents` | Étape 2 | `mise_jour_documents` |
| `/mise-a-jour/verification` | Étape 3 | `mise_jour_r_capitulatif` |
| `/mise-a-jour/confirmation` | Étape 4 | `confirmation_de_soumission` |
| `/documents` | Mes documents | `mes_documents_professionnels` |
| `/admin/connexion` | Connexion admin | à créer |
| `/admin` | Tableau de bord | à créer |
| `/admin/employes` | Liste + barre de recherche + filtres | à créer |
| `/admin/employes/:id` | Dossier en lecture seule + documents | à créer |

Les écrans admin sont conçus directement en code, avec les composants et jetons du design system.

### 11.2 Principes

- **Composants partagés** issus des maquettes : `AppHeader`, `Stepper`, `StatusBadge`, `FieldCard`, `ValueComparison`, `StickyActionBar`, `DocumentItem`, `EmptyState`.
- Garde de route : redirection vers `/` (ou `/admin/connexion`) si l'API répond 401.
- Après soumission, les routes `/mise-a-jour/*` redirigent vers `/profil` (sauf après « Modifier à nouveau », US-24).
- Images et polices servies localement (pas de dépendance aux URL Google des maquettes).

## 12. Configuration

Fichier `.env` (hors git), avec un `.env.example` versionné :

| Variable | Exemple | Rôle |
|---|---|---|
| `ACME_CSV_PATH` | `data/vault-employee-list_20261001-1400.csv` | Source de référence |
| `ACME_DATA_DIR` | `C:\acme-data` | Base SQLite + documents (hors OneDrive) |
| `ADMIN_USERNAME` | `admin` | Facultatif (migration) : compte importé si aucun administrateur n'existe en base (US-23) |
| `ADMIN_PASSWORD_HASH` | `$argon2id$...` | Facultatif (migration), avec `ADMIN_USERNAME` |
| `EMPLOYEE_SESSION_MINUTES` | `30` | |
| `ADMIN_SESSION_MINUTES` | `120` | |
| `MAX_UPLOAD_MB` | `5` | |
| `MAX_DOCUMENTS_PER_EMPLOYEE` | `10` | |

## 13. Lancement

`run.ps1` :

1. compile le frontend (`npm run build`) si nécessaire ;
2. crée `ACME_DATA_DIR` et la base SQLite si absentes ;
3. lance `uvicorn app.main:app --host 0.0.0.0 --port 8000` ;
4. affiche l'adresse à ouvrir sur le téléphone (`http://<ip-locale>:8000`).

Prérequis ponctuels : règle de pare-feu Windows pour le port 8000 ; mise en veille désactivée pendant le test. Accès hors réseau local : tunnel (Cloudflare Tunnel ou ngrok) vers le port 8000.

## 14. Sécurité et confidentialité

| Exigence PRD | Mesure |
|---|---|
| ENF-06 | `/api/me/*` limité à l'employé de la session ; documents servis uniquement via l'API |
| ENF-07 | Liste blanche des colonnes CSV ; schémas Pydantic de sortie explicites ; pas de corps de requête dans les logs |
| ENF-08 | `data/` dans `.gitignore` ; base et documents dans `ACME_DATA_DIR` |
| ENF-11 | Argon2 ; mot de passe ≥ 8 caractères ; jamais renvoyé ni journalisé |
| ENF-12 | Sessions expirantes, cookie `HttpOnly` + `SameSite=Strict` |
| RM-10 | Aucune route admin d'écriture sur le dossier (seule exception : F-29, qui touche le compte) |

## 15. Stratégie de tests

| Niveau | Outil | Cible | Exemples |
|---|---|---|---|
| Unitaire | pytest | Domaine et cas d'utilisation, sans base ni fichier | normalisation, registre de champs, calcul du statut, règles de blocage |
| API | pytest + TestClient | Chaque route, avec SQLite temporaire et CSV de test | codes HTTP, format d'erreur, contrôle d'accès |
| Composant | Vitest + RTL | Écrans et composants React, API simulée | affichage des erreurs, stepper, barre de recherche |
| Bout en bout | Playwright (390 × 844) | Parcours critiques complets | connexion → mise à jour → soumission → visible côté admin |

**Données de test** : `backend/tests/fixtures/employees_test.csv`, **fictif**, mêmes colonnes que le vrai fichier, avec les cas utiles : employé simple, homonymes (nom + prénom identiques, dates différentes), doublon complet (nom + prénom + date identiques), employé inactif, email vide, accents. Aucun test n'utilise le CSV réel.

**Indépendance des stories** : chaque test crée son propre état (base vide + CSV de test) via des fixtures pytest ; aucun test ne dépend de l'ordre d'exécution.

**Convention de nommage** : `tests/api/test_us01_*.py`, `e2e/us01-*.spec.js` — chaque test référence la story et le critère (`CA-01`…) qu'il vérifie.

## 16. Traçabilité PRD → modules

| Fonctionnalités | Epic | Module backend | Écrans |
|---|---|---|---|
| F-01 → F-08 | E01 Identification | `auth`, `employee` | `/`, `/connexion/*` |
| F-09 → F-11 | E02 Consultation | `employee`, `update`, `document` | `/profil`, `/documents` |
| F-12 → F-18 | E03 Mise à jour | `update` | `/mise-a-jour/*` |
| F-19 → F-21 | E04 Documents | `document` | `/mise-a-jour/documents` |
| F-22 → F-29 | E05 Administration | `admin`, `auth` | `/admin/*` |

## 17. Points tranchés

| ID | Question | Proposition |
|---|---|---|
| SD-01 | Statuts côté administration | ✅ **Validé** : deux statuts seulement, « effectuée » / « non effectuée » (§6.1) |
| SD-02 | Les documents ajoutés sont-ils liés à la mise à jour ou au profil ? | ✅ **Validé** : au profil (`employee_id`) : ils restent visibles dans « Mes documents » |
| SD-03 | Le nouveau nom/prénom soumis s'affiche-t-il dans la liste admin ? | ✅ **Validé** : oui, le nouveau nom en principal, l'ancien en dessous en gris |
