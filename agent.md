# agent.md — Consignes pour les agents qui travaillent sur ce projet

Portail web **mobile-first** de mise à jour des dossiers employés d'**ACME SA** (MVP).
Testé par le directeur et une autre personne, exécuté sur la machine du développeur.
Langue du projet et de l'interface : **français**.

## 0. Où en est le projet ? (à lire en premier)

> **Dernière mise à jour : 2026-10-05.** Cette section est mise à jour à la fin de chaque story (voir §2, étape 8).
> En cas de doute, la source de vérité est la colonne « Statut » de `docs/epics/README.md`.

### Phases (`docs/03-plan-implementation.md`)

| Phase | Statut |
|---|---|
| 0 — Mise en place | **Fait** |
| 1 — Walking Skeleton | **Fait** (parcours employé → admin vérifié par `frontend/e2e/walking-skeleton.spec.js`) |
| 2 — Identification complète | **Fait** (US-01 à US-04) |
| 3 — Consultation et mise à jour | **Fait** (US-05, 06, 08 → 12, US-24) |
| 4 — Documents | **Fait** (US-13, US-14, US-07) |
| 5 — Administration | **Fait** (US-15 → US-23) |
| 6 — Finalisation | **Fait** (test du directeur reporté par l'utilisateur) |

### Epics (`docs/epics/README.md`)

| Epic | Statut |
|---|---|
| E01 Identification | **Fait** (US-01 à US-04) |
| E02 Consultation | **Fait** (US-05, US-06, US-07) |
| E03 Mise à jour | **Fait** (US-08 → US-12, US-24) |
| E04 Documents | **Fait** (US-13, US-14) |
| E05 Administration | **Fait** (US-15 → US-23) |

### Stories

**Fait :** US-01 → US-24 (toutes les stories).

**En cours :** aucune.

**Pas encore :** aucune.

### Prochaine action

**MVP terminé** (phase 6 faite le 2026-10-05 ; `.\run.ps1 -Tunnel` pour un accès Internet). Le test du directeur est **reporté** par l'utilisateur ; le MVP reste en service (dossier `app-web`, branche `main`). Le vrai CSV ne se lit qu'à travers les outils qui n'affichent aucune donnée ; ne jamais le copier.

**V2 — Parcours professionnel :** spécifications dans `docs/v2/` : PRD v1.2 et Solution Design v1.0 validés le 2026-10-05 ; **phase 7 en cours** : 7.1 → 7.6 faites, **US-25 Fait** ; epic E06 en cours ; **V2 en pause depuis le 2026-10-05** : le directeur demande une refonte (verrou du certificat sur un dossier complet, validation RH, rôles…) ; plan validé le 2026-10-06 ; **lot 0 (cadrage : spécifications et maquettes, aucun développement)** en cours, backlog `docs/lot0/backlog-lot0.md`, cycles de 48 h ; le **registre des décisions** `docs/lot0/0-cadrage/registre-des-decisions-v1.8.md` fait foi. **Ne pas reprendre US-26** : la V2 sera refondue dans les nouvelles spécifications ; statuts V2 : `docs/v2/epics/README.md` ; plan `docs/v2/03-plan-implementation.md` (phases 7 → 10) validé le 2026-10-05 ; le MVP **reste en service** pendant le développement V2. Le code V2 se fait dans `ACME SA\app-web-v2` (git worktree, port 8002, `C:\acme-data-v2`). Dans `app-web` tant que le MVP est en service : ni code, ni `npm run build`, ni `npx playwright test` (recompile `dist`), ni changement de branche.

À savoir (V2) :
- Module `career` (`app/career`) : registre `entry_kinds.py` (4 rubriques, `FieldSpec`), `CareerEntry` / `CareerProfile` / `sort_entries` (`career_entry.py`), `Month` (« AAAA-MM »), port `CareerRepository` (chaque écriture met à jour `career_profile` dans la même transaction) ; `SqlCareerRepository` ; cas d'utilisation `GetMyCareer`, `GetCareerFields` ; conteneur : `container.careers`. Ne jamais importer `app.update` depuis `app.career` (contrat import-linter).
- Tests V2 : `tests/career.py` (`make_entry`, valeurs par défaut par rubrique), fixtures `career_entry`, `career_reference` (P-A, P-B, P-I), `frozen_clock` ; `CAREER_NOW` = 2026-10-15.
- Frontend V2 : `features/career/` (`CareerPage`, `CareerSection`, `CareerEntryCard` + `SkillTag`, `careerKinds.js` : `CAREER_KINDS` (slug, icône, message vide) et `describeEntry`) ; `api/career.js` ; `formatMonth` dans `lib/format.js` ; lien « Mon parcours » du menu (`EMPLOYEE_LINKS` d'`AccountMenu`) et carte du profil.

À savoir (MVP) :
- Le menu de l'avatar (« Se déconnecter ») s'active avec la prop `account` de `Page` : `account` pour un écran employé, `account="admin"` pour **tout écran admin** (déconnexion vers `/admin/connexion`, `useLogout('admin')`). Écrans admin : `useLoader(load, { loginPath: '/admin/connexion' })`.
- Tableau de bord : `features/admin/DashboardPage.jsx` (`/admin`) ; ses cartes mènent à `/admin/employes?status=UPDATED|NOT_UPDATED` : **US-19 doit lire ce paramètre**. Calcul : `app/admin/domain/statistics.py`, `GetStatistics`.
- Liste admin : `features/admin/EmployeeListPage.jsx` (page dans l'adresse `?page=`, autres paramètres conservés ; cartes `lg:hidden` + tableau `hidden lg:block`, tous deux dans le DOM : dans les tests, viser `getByRole('list'|'table', { name: 'Employés' })`). `Page wide` pour les écrans admin larges. API : `display_name`, `previous_name`, `page_count` (`ListEmployees`).
- Recherche admin : `features/admin/EmployeeSearch.jsx` (300 ms, `?search=` en `replace`) ; règle `app/admin/domain/search.py`, appliquée dans `ListEmployees` avant la pagination. Filtre de statut : `features/admin/StatusFilter.jsx` (`?status=`, compteurs `counts` de l'API). `useLoader(load, { key })` relance le chargement quand la clé change.
- Dossier admin : `features/admin/EmployeeDetailPage.jsx` (`/admin/employes/:id`, blocs `Block`, retour vers la liste via `state.listSearch`) ; `GetEmployeeFolder` ; sections partagées avec le profil : `features/profile/profileSections.js` (`InfoSection showEditable={false}` côté admin). Documents (US-21) : `features/admin/AdminDocuments.jsx`, chargés avec le dossier ; `ListEmployeeDocuments`, `GetEmployeeDocumentFile` ; bloc titré réutilisable `features/admin/Block.jsx` (prop `aside`). Bloc « Accès » et réinitialisation (US-22) : `features/admin/ResetAccess.jsx`, `ResetAccess` (module `admin`), `POST /api/admin/employees/{id}/reset-access`, seule écriture de l'administration.
- Admin : comptes en base (US-23, table `admin_account`, `app/auth/application/admin_accounts.py`) ; `current_admin` (refuse un mot de passe provisoire : `403 PASSWORD_CHANGE_REQUIRED`) / `current_admin_pending` ; fixture `admin_session(container)` dans `tests/conftest.py` (compte de test importé de la configuration). Écrans `/admin/administrateurs`, `/admin/mot-de-passe` ; liens du menu du compte admin. Le test paramétré `test_us15_admin_auth.py` couvre automatiquement toute nouvelle route `/api/admin/*` (401 sans session, 403 avec session employé) : une route qui prend un `{id}` reçoit `1001`.
- Contrôle d'un CSV (phase 6) : `app/tools/check_csv.py` (chargement, dates, accents, formats de téléphone, doublons, puis recherche des valeurs des colonnes exclues dans toutes les réponses de l'API sur une base temporaire) ; rapport sans aucune donnée du CSV ; testé sur le CSV fictif (`tests/test_check_csv_tool.py`).
- Profil : `features/profile/InfoSection.jsx` (section teintée, « Modifiable » / cadenas par champ, selon `editable_fields` de l'API) ; jeton `--color-section` ; `formatGender` et `initials` dans `lib/format.js`.
- Modifier à nouveau (US-24) : `EmployeeUpdate.submitted_changes` = copie du dernier envoi, lue par l'admin, le profil et l'identification (`current_values`, `has_submission`) ; le brouillon reste dans `changes`. Ne jamais lire `changes` côté admin. Routes `reopen` / `discard` ; carte d'état (`reopened`).
- Carte d'état : `features/profile/UpdateStateCard.jsx` (présentation seule ; les appels API restent dans `ProfilePage.jsx`) ; choix Oui/Non dans `DecisionCard.jsx`. `useLoader` renvoie aussi `reload()`. Variante de bouton `subtle` (fond gris clair).
- Étape 1 : `features/update/InformationsStep.jsx` (+ `FieldCard`, `FormSection`, `fieldRules.js` qui reprend les règles du registre serveur) ; `components/Stepper.jsx` (4 étapes) à réutiliser dans les étapes suivantes. `TextField` accepte `required`, `labelAside`, `footer`.
- Brouillon : `features/update/useAutosave.js` (2 s, champs valides seulement, `flush()` au changement d'étape) ; `formatTime` dans `lib/format.js`.
- Vérification : `features/update/ReviewStep.jsx`, `components/ValueComparison.jsx` ; `formatSize` dans `lib/format.js`.
- Soumission : `features/update/SubmitSection.jsx` (`useSubmission`, verrou anti double clic) ; confirmation : `ConfirmationStep.jsx`.
- Tests E2E : une seule base partagée, un employé fictif par test (liste dans `frontend/e2e/start-server.mjs`).
- Documents (module backend `document`) : `UploadDocument`, `DeleteDocument`, `ListMyDocuments`, `ensure_update_open()`, `LocalFileStorage`, `SqlDocumentRepository` ; frontend `features/documents/` (`DocumentsStep`, `DocumentItem` avec prop `onDelete` (bouton « Supprimer » + confirmation ; sans `onDelete`, aucun bouton), `resizeImage`) ; `upload()` (XHR avec progression) dans `api/client.js`.
- Consultation : `features/documents/MyDocumentsPage.jsx` (`/documents`) ; `DocumentItem` accepte `fileUrl` (« Voir », miniature) et `showDate` ; `components/ImagePreview.jsx` (aperçu plein écran, à réutiliser pour US-21) ; `documentFileUrl()` dans `api/documents.js`.

## 1. Méthode : Spec-Driven Development

Les spécifications font foi. Ordre de lecture avant toute modification :

| Document | Rôle |
|---|---|
| `docs/01-prd.md` | Le quoi et le pourquoi (fonctionnalités F-xx, décisions D-xx) |
| `docs/02-solution-design.md` | Le comment (architecture, modèle de données, API, sécurité) |
| `docs/epics/README.md` | Index des user stories, **statuts**, jeu de données de test, Definition of Done |
| `docs/epics/E0x-*/US-xx-*.md` | Une story : règles, critères d'acceptation (CA-xx), tests (T-xx.y) |
| `docs/03-plan-implementation.md` | Phases, ordre de réalisation, règles de Clean Architecture (§1.1), **avancement** (§2.1) |

Tous ces documents sont **validés** : ne pas changer une règle métier ou une décision sans l'accord de l'utilisateur. Toute nouvelle demande devient une nouvelle story.

## 2. Travailler story par story

**Une seule story à la fois.** Ne pas commencer la suivante avant que la courante soit « Fait » et que l'utilisateur ait validé.

Cycle d'une story :

1. Passer son statut à **En cours** (fichier de la story, index `docs/epics/README.md` et §0 de ce fichier).
2. Relire la story : règles, critères d'acceptation, hors périmètre.
3. Écrire les tests listés dans la story (**avant** le code), nommés d'après la story et le critère (`test_us01_*.py`, `test_ca04_*`).
4. Domaine + cas d'utilisation → tests unitaires verts (ports simulés en mémoire).
5. Infrastructure + route API, câblage dans `backend/app/container.py` → tests API verts.
6. Écran React → tests composant verts ; vérifier à 390 px et 1280 px.
7. Lancer **toute** la suite de tests (voir §5) : tout doit être vert.
8. Cocher la Definition of Done, passer le statut à **Fait** dans **les trois endroits** : le fichier de la story, l'index `docs/epics/README.md` et la section §0 de ce fichier (tableaux, « Prochaine action », date de mise à jour).
   Mettre aussi à jour le **statut de l'epic** (README de l'epic, tableau « Statut des epics » de `docs/epics/README.md`, §0) et celui de la **phase**, ainsi que les statuts du **plan d'implémentation** (`docs/03-plan-implementation.md` : §2, §2.1, tableau de la phase, §10, date « Avancement mis à jour le »).
9. S'arrêter et présenter le résultat à l'utilisateur. **Ne pas commiter : l'utilisateur s'en charge.**
   Le compte rendu indique toujours où en sont l'**epic** et la **phase** de la story ; quand une story termine un epic ou une phase, l'annoncer explicitement (« Epic E0x terminé », « Phase n terminée »).

### Statuts des stories

| Statut | Signification |
|---|---|
| **Pas encore** | Aucun code écrit |
| **En cours** | Commencée (y compris version minimale du Walking Skeleton) |
| **Fait** | Tous les critères d'acceptation couverts par des tests verts, Definition of Done cochée |

Le statut figure dans l'en-tête de chaque story (`| **Statut** | … |`), dans la colonne « Statut » de l'index et dans §0 de ce fichier. Les trois doivent toujours être identiques.

## 3. Architecture (à respecter strictement)

Monolithe modulaire, 3 tiers, **Clean Architecture**. Modules backend : `shared`, `employee`, `auth`, `update`, `document`, `admin`, chacun en 4 couches :

| Couche | Contient | N'importe jamais |
|---|---|---|
| `domain` | Entités, règles métier pures, ports (interfaces), erreurs métier | FastAPI, Pydantic, SQLAlchemy, fichiers, autres couches |
| `application` | Cas d'utilisation (une classe, méthode `execute()`, ports injectés) | FastAPI, SQLAlchemy, `infrastructure`, `api` |
| `infrastructure` | Adaptateurs : CSV, SQLAlchemy, disque, Argon2 | `api` |
| `api` | Routes FastAPI, schémas Pydantic | `infrastructure` |

- `backend/app/container.py` est le **seul** endroit qui instancie l'infrastructure (composition root).
- Les routes obtiennent les cas d'utilisation via `container(request)` (`app/auth/api/dependencies.py`).
- Un module n'utilise un autre que par ses ports ou cas d'utilisation, jamais par son infrastructure.
- Erreurs métier : sous-classes de `app/shared/domain/errors.py`, avec un `code` stable et un `message` en français ; traduites en HTTP à un seul endroit (`app/shared/api/errors.py`). Format : `{"error": {"code", "message", "field"?}}`.
- Les règles sont vérifiées par **import-linter** (`[tool.importlinter]` dans `backend/pyproject.toml`), exécuté par `tests/test_architecture.py`.
- Frontend : les composants n'appellent jamais `fetch` ; tout passe par `frontend/src/api/`. Logique d'écran dans des hooks (`src/lib/`, `src/features/*/`).

## 4. Règles métier et sécurité à ne jamais enfreindre

- Le CSV source est en **lecture seule** ; seuls les employés `active = true` et les colonnes de la liste blanche sont lus (`csv_employee_repository.py`). Dates du CSV : **MM/JJ/AAAA**.
- **Aucune colonne exclue** (bancaire, dettes, licenciement, références, pièce d'identité…) ne doit apparaître dans l'API ou les logs. Le CSV de test contient `FAKE-SECRET-…` dans ces colonnes : les tests le vérifient.
- L'administrateur est en **lecture seule** sur les dossiers (seule exception : réinitialiser l'accès, US-22).
- Côté admin, **deux statuts seulement** : `UPDATED` / `NOT_UPDATED`. Le brouillon n'est jamais visible par l'admin.
- Un employé n'accède à ses données que par `/api/me/*` (jamais par un identifiant dans l'URL).
- Mots de passe : Argon2, jamais renvoyés ni journalisés.

## 5. Commandes

```powershell
# Backend (depuis backend/)
.venv\Scripts\python -m pytest            # tests unitaires, API et contrats d'architecture
.venv\Scripts\lint-imports                # contrats d'architecture seuls

# Frontend (depuis frontend/)
npm test                                  # tests unitaires et composants (Vitest)
npx playwright test                       # tests bout en bout (mobile 390 px, CSV fictif)

# Lancer l'application (depuis la racine)
.\run.ps1                                 # ou -Build (recompiler le frontend), -Tunnel (accès Internet HTTPS)
python -m app.tools.create_admin          # (depuis backend/) premier administrateur (run.ps1 le demande s'il manque)
python -m app.tools.check_csv             # (depuis backend/) contrôle du CSV avant un test (voir docs/guide-demarrage.md)
```

## 6. Données et environnement

- `data/` contient le **vrai** CSV : jamais versionné, jamais utilisé dans les tests.
- Tests : uniquement `backend/tests/fixtures/employees_test.csv` (employés fictifs EMP-A, EMP-H1/H2, EMP-D1/D2, EMP-I, EMP-E, EMP-B, cf. `docs/epics/README.md`) et les fixtures de `backend/tests/conftest.py`.
- Base SQLite et documents : `ACME_DATA_DIR` (par défaut `C:\acme-data`), **hors OneDrive**.
- Configuration : `backend/.env` (non versionné), modèle dans `backend/.env.example`.
- Maquettes de référence : `stitch_portail_dossier_collaborateur_acme/` (design system dans `acme_enterprise_clarity/DESIGN.md`). Les écrans admin n'ont pas de maquette : ils utilisent les composants existants, sans validation visuelle intermédiaire.

## 7. Conventions

- Textes d'interface et messages d'erreur en français, clairs, affichés près de l'élément concerné.
- Mobile-first : zones tactiles ≥ 44 px, texte ≥ 16 px, aucun défilement horizontal, bouton principal dans la barre collée en bas.
- Couleurs et styles uniquement via les jetons Tailwind de `frontend/src/index.css`.
- Ne pas commiter ni pousser : l'utilisateur gère git.
