# agent.md — Consignes pour les agents qui travaillent sur ce projet

Portail web **mobile-first** de mise à jour des dossiers employés d'**ACME SA** (MVP).
Testé par le directeur et une autre personne, exécuté sur la machine du développeur.
Langue du projet et de l'interface : **français**.

## 0. Où en est le projet ? (à lire en premier)

> **Dernière mise à jour : 2026-10-04.** Cette section est mise à jour à la fin de chaque story (voir §2, étape 8).
> En cas de doute, la source de vérité est la colonne « Statut » de `docs/epics/README.md`.

### Phases (`docs/03-plan-implementation.md`)

| Phase | Statut |
|---|---|
| 0 — Mise en place | **Fait** |
| 1 — Walking Skeleton | **Fait** (parcours employé → admin vérifié par `frontend/e2e/walking-skeleton.spec.js`) |
| 2 — Identification complète | **En cours** |
| 3 — Consultation et mise à jour | Pas encore |
| 4 — Documents | Pas encore |
| 5 — Administration | Pas encore |
| 6 — Finalisation | Pas encore |

### Stories

**Fait :** US-01, US-02, US-03.

**En cours** (version minimale du Walking Skeleton faite, reste à compléter) :

| Story | Déjà fait | Reste à faire |
|---|---|---|
| US-05 | CA-01, 02, 03, 06 (API) ; écran simple | CA-04, CA-05, sections et rendu fidèles à la maquette, tests composant |
| US-08 | CA-01 (« Oui ») | « Non », changer d'avis, 409 après soumission, tests composant |
| US-09 | Registre des 5 champs, CA-02, 05, 07, 09 (API) ; formulaire simple | Badges « Modifié », ancienne valeur, sections, CA-03, 04, 06, 08, tests composant |
| US-12 | CA-01, 02, 03 | CA-04 (toutes écritures 409), CA-05, CA-06, CA-07, écran fidèle |
| US-15 | CA-01, 02, 04, 05 | Blocage (CA-03), expiration (CA-07), déconnexion admin à l'écran, test paramétré sur toutes les routes admin |
| US-17 | CA-01 (sans pagination à l'écran) | Pagination, cartes/tableau, ancien nom (CA-03), tests composant |

**Pas encore :** US-04, US-06, US-07, US-10, US-11, US-13, US-14, US-16, US-18, US-19, US-20, US-21, US-22.

### Prochaine action

**US-04 — Se déconnecter** (dernière story de la phase 2).

## 1. Méthode : Spec-Driven Development

Les spécifications font foi. Ordre de lecture avant toute modification :

| Document | Rôle |
|---|---|
| `docs/01-prd.md` | Le quoi et le pourquoi (fonctionnalités F-xx, décisions D-xx) |
| `docs/02-solution-design.md` | Le comment (architecture, modèle de données, API, sécurité) |
| `docs/epics/README.md` | Index des user stories, **statuts**, jeu de données de test, Definition of Done |
| `docs/epics/E0x-*/US-xx-*.md` | Une story : règles, critères d'acceptation (CA-xx), tests (T-xx.y) |
| `docs/03-plan-implementation.md` | Phases, ordre de réalisation, règles de Clean Architecture (§1.1) |

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
9. S'arrêter et présenter le résultat à l'utilisateur. **Ne pas commiter : l'utilisateur s'en charge.**

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
.\run.ps1                                 # ou .\run.ps1 -Build pour recompiler le frontend
python -m app.tools.hash_password         # (depuis backend/) hash du mot de passe admin pour .env
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
