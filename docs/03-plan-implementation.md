# Plan d'implémentation — Portail de mise à jour des dossiers employés (MVP)

| | |
|---|---|
| **Version** | 1.1 — validé le 2026-10-04 ; suivi d'avancement ajouté (statuts des phases, epics et stories) |
| **Date** | 2026-10-04 |
| **Entrées** | `01-prd.md` v1.0, `02-solution-design.md` v1.0, `epics/` (22 user stories) |
| **Avancement mis à jour le** | 2026-10-04 (après US-15) |

---

## 1. Principes

1. **Walking Skeleton d'abord** : un parcours complet, très fin, qui traverse toutes les couches (CSV → API → base → écran employé → écran admin) avant d'enrichir quoi que ce soit.
2. **Tranches verticales** : chaque story est livrée de bout en bout (domaine, API, écran, tests), jamais « tout le backend puis tout le frontend ».
3. **Tests d'abord** : les tests de la story sont écrits à partir de ses critères d'acceptation **avant** le code. Une story est terminée quand ses tests passent et que la Definition of Done est cochée.
4. **Un incrément démontrable par phase** : à la fin de chaque phase, l'application tourne et on peut montrer quelque chose de nouveau.
5. **Point de validation à la fin de chaque phase** : démonstration rapide, puis passage à la phase suivante.
6. **Clean Architecture respectée et vérifiée automatiquement** (§1.1) : une violation des règles de dépendance fait échouer les tests, au même titre qu'un bug.

### 1.1 Règles de Clean Architecture

Chaque module backend (`employee`, `auth`, `update`, `document`, `admin`) est découpé en 4 couches. Les dépendances vont **uniquement vers l'intérieur** :

```text
        api  ──────────┐
                       v
infrastructure ──> application ──> domain
        │                            ^
        └────────────────────────────┘
```

| Couche | Contient | A le droit d'importer | N'importe **jamais** |
|---|---|---|---|
| `domain` | Entités (`Employee`, `EmployeeUpdate`, `EmployeeChange`, `Document`, `Account`), règles métier pures (statut, blocage, registre des champs, normalisation), **ports** (interfaces `EmployeeRepository`, `UpdateRepository`, `AccountRepository`, `SessionRepository`, `DocumentRepository`, `FileStorage`, `PasswordHasher`, `Clock`) | la bibliothèque standard Python | FastAPI, Pydantic, SQLAlchemy, `csv`, `os`/fichiers, `application`, `infrastructure`, `api` |
| `application` | Cas d'utilisation (`IdentifyEmployee`, `RegisterPassword`, `Login`, `GetEmployeeProfile`, `RecordDecision`, `SaveDraft`, `SubmitUpdate`, `AddDocument`, `GetAdminStatistics`, `SearchEmployees`, `ResetAccess`…), objets d'entrée/sortie simples (dataclasses) | `domain` | FastAPI, Pydantic, SQLAlchemy, `infrastructure`, `api` |
| `infrastructure` | Adaptateurs qui implémentent les ports : `CsvEmployeeRepository`, repositories SQLAlchemy, `LocalFileStorage`, `Argon2PasswordHasher`, `SystemClock` | `domain`, bibliothèques techniques | `api` |
| `api` | Routes FastAPI, schémas Pydantic, conversion HTTP ⇄ cas d'utilisation, traduction des erreurs métier en codes HTTP | `application`, `domain` (erreurs et types) | `infrastructure` |

**Règles complémentaires :**

- **Composition root unique** : `app/main.py` (avec `app/container.py`) est le seul endroit qui instancie les adaptateurs d'infrastructure et les injecte dans les cas d'utilisation (via les dépendances FastAPI). Remplacer le CSV par la base ACME = changer une ligne dans ce fichier.
- **Un cas d'utilisation = une classe** avec une méthode `execute()`, qui reçoit ses ports par le constructeur.
- **Erreurs métier** définies dans `domain` (`IdentityNotRecognized`, `UpdateAlreadySubmitted`…), traduites en réponses HTTP par un gestionnaire unique dans `api`.
- **Entre modules** : un module n'utilise un autre module que par ses **ports** ou ses **cas d'utilisation**, jamais par son infrastructure (ex. `admin` lit les employés via le port `EmployeeRepository`, pas via `CsvEmployeeRepository`).
- **Tests unitaires du domaine et de l'application sans infrastructure** : ports remplacés par des implémentations en mémoire (`InMemoryEmployeeRepository`, `FakeClock`…), aucun fichier ni base.
- **Frontend** : même esprit. Les composants n'appellent jamais `fetch` directement : ils passent par `src/api/` (client HTTP et fonctions par ressource), et la logique d'écran est isolée dans des hooks (`useAutosave`, `useEmployeeSearch`…).

**Vérification automatique** : contrats **import-linter** (`backend/.importlinter`), exécutés avec les tests (`lint-imports`) :

| Contrat | Vérifie |
|---|---|
| Couches | pour chaque module : `api` → `application` → `domain`, et `infrastructure` → `domain` uniquement |
| Domaine pur | `*.domain` n'importe ni `fastapi`, ni `pydantic`, ni `sqlalchemy` |
| Application sans framework | `*.application` n'importe ni `fastapi`, ni `sqlalchemy` |
| Infrastructure isolée | seuls `app.main` / `app.container` importent `*.infrastructure` en dehors de leur module |

### Cycle de réalisation d'une story

```text
1. Relire la story            → critères d'acceptation, règles, hors périmètre
2. Écrire les tests           → unitaires et API (rouges)
3. Domaine + cas d'utilisation→ tests unitaires verts (ports simulés en mémoire)
4. Infrastructure + route API → adaptateurs + câblage dans le composition root ; tests API verts
5. Écran React                → tests composant verts, contrôle visuel à 390 px et 1280 px
6. Definition of Done         → checklist de epics/README.md + `lint-imports` vert
7. Statuts                    → story, epic et phase mis à jour (voir §2.1)
8. Compte rendu               → statut de la story, de l'epic et de la phase ; commit fait par l'utilisateur
```

## 2. Vue d'ensemble

| Phase | Contenu | Stories | Incrément démontrable | Statut |
|---|---|---|---|---|
| **0** | Mise en place | — | Application vide qui démarre, tests qui tournent | **Fait** |
| **1** | **Walking Skeleton** | versions minimales de US-01, 02, 05, 08, 09, 12, 15, 17 | Un employé modifie son téléphone, l'admin le voit « effectué » | **Fait** |
| **2** | Identification complète | US-01, 02, 03, 04 | Connexion sécurisée : homonymes, doublon, blocage, déconnexion | **Fait** |
| **3** | Consultation et mise à jour complètes | US-05, 06, 08, 09, 10, 11, 12 | Parcours employé complet sans documents | **Fait** |
| **4** | Documents | US-13, 14, 07 | Ajout et consultation de documents depuis le téléphone | **Fait** |
| **5** | Administration complète | US-15, 16, 17, 18, 19, 20, 21, 22 | Tableau de bord, recherche, dossiers, documents, réinitialisation | **En cours** (1/8 : US-15 ; US-17 en version minimale) |
| **6** | Finalisation et préparation du test | — | Application prête pour le directeur | Pas encore |

```text
Phase 0 ──> Phase 1 (Skeleton) ──> Phase 2 ──> Phase 3 ──> Phase 4
                                        \                      \
                                         └──────> Phase 5 ──────┴──> Phase 6
```

La phase 5 ne dépend que du Skeleton et de la phase 2 (connexion) ; elle peut être avancée si une démonstration admin est demandée plus tôt.

### 2.1 Avancement

**Règles de statut** (mêmes libellés pour les stories, les epics et les phases) :

| Statut | Story | Epic | Phase |
|---|---|---|---|
| **Pas encore** | aucun code écrit | aucune story commencée | aucune story de la phase commencée |
| **En cours** | commencée (y compris version minimale du Skeleton) | au moins une story commencée | au moins une story de la phase commencée |
| **Fait** | tous les CA couverts par des tests verts, DoD cochée | toutes ses stories « Fait » | toutes ses stories « Fait » et critère de sortie atteint |

À la fin de chaque story, les statuts sont mis à jour dans : le fichier de la story, `epics/README.md` (index et statut des epics), le README de l'epic, ce plan (§2, §2.1, tableau de la phase, §10) et `agent.md` §0. Le compte rendu à l'utilisateur annonce explicitement la fin d'un epic ou d'une phase.

**Epics :**

| Epic | Stories | Phases concernées | Statut |
|---|---|---|---|
| E01 Identification | US-01 → US-04 | 1, 2 | **Fait** |
| E02 Consultation | US-05, 06, 07 | 3 (US-05, 06), 4 (US-07) | **Fait** |
| E03 Mise à jour | US-08 → US-12 | 1, 3 | **Fait** |
| E04 Documents | US-13, 14 | 4 | **Fait** |
| E05 Administration | US-15 → US-22 | 1, 5 | **En cours** (1/8 : US-15 ; US-17 en version minimale) |

Un epic et une phase ne coïncident pas toujours : E02 est réparti sur les phases 3 et 4, car la consultation des documents (US-07) a besoin de l'ajout de documents (US-13).

**Stories :** 15 / 22 « Fait » (US-01 → US-15) ; 1 « En cours » (US-17 en version minimale) ; 6 « Pas encore ».

---

## 3. Phase 0 — Mise en place

**Statut : Fait.**

**Objectif :** une base de projet propre, où l'on peut écrire un test et le voir passer.

| # | Tâche | Résultat |
|---|---|---|
| 0.1 | Créer `backend/` : `pyproject.toml`, environnement virtuel, FastAPI, SQLAlchemy, Pydantic, argon2-cffi, pytest, httpx | `pytest` s'exécute |
| 0.2 | Créer la structure des modules (`shared`, `employee`, `auth`, `update`, `document`, `admin`) avec leurs 4 couches, `app/container.py` (composition root) et le gestionnaire d'erreurs métier → HTTP | Arborescence du Solution Design §4 |
| 0.2b | Configurer **import-linter** avec les contrats du §1.1 ; `lint-imports` lancé avec `pytest` | Une violation de couche fait échouer la vérification |
| 0.3 | `config.py` + `.env.example` + `.env` (hors git) | Paramètres du Solution Design §12 |
| 0.4 | Route `GET /api/health` + test | Premier test API vert |
| 0.5 | Créer `frontend/` : Vite + React + React Router + Tailwind 4 ; jetons du design system (`DESIGN.md`) dans la configuration Tailwind ; police Inter servie localement | Page d'accueil vide aux couleurs ACME |
| 0.6 | Vitest + React Testing Library ; Playwright avec un profil mobile 390 × 844 | `npm test` et `npx playwright test` s'exécutent |
| 0.7 | Proxy Vite `/api` → `:8000` ; FastAPI sert `frontend/dist` en production | Une seule URL en mode production |
| 0.8 | `backend/tests/fixtures/employees_test.csv` (8 employés fictifs, 54 colonnes, cf. `epics/README.md`) + fixtures pytest `client`, `account`, `employee_client`, `admin_client`, `draft`, `submitted`, `document` | Fixtures prêtes pour toutes les stories |
| 0.9 | `run.ps1` : build du frontend, création de `ACME_DATA_DIR`, lancement Uvicorn sur `0.0.0.0:8000`, affichage de l'IP locale | Lancement en une commande |
| 0.10 | Mettre à jour `.gitignore` : `.env`, `.venv/`, `node_modules/`, `dist/`, données | Rien de sensible versionné |

**Critère de sortie :** `run.ps1` lance l'application, la page s'ouvre sur un téléphone du même Wi-Fi, `pytest`, `lint-imports` et `npm test` passent.

---

## 4. Phase 1 — Walking Skeleton

**Statut : Fait** (`e2e/walking-skeleton.spec.js` passe).

**Objectif :** prouver que toutes les couches communiquent, avec le parcours le plus court possible. Chaque élément est **volontairement minimal** ; il sera complété dans les phases suivantes.

```text
CSV de test ─> CsvEmployeeRepository ─> API ─> SQLite
                                         │
Employé : identification ─> création mot de passe ─> profil ─> « Oui »
          ─> modification du téléphone ─> confirmation ─> soumission
                                         │
Admin : connexion ─> liste ─> l'employé apparaît « Mise à jour effectuée »
```

| # | Story (version minimale) | Inclus dans le Skeleton | Reporté |
|---|---|---|---|
| 1.1 | US-01 Vérifier son identité | CA-01, CA-02, CA-04 ; lecture CSV avec liste blanche et actifs uniquement | normalisation complète, homonymes, doublon, nom modifié |
| 1.2 | US-02 Créer son mot de passe | CA-01, CA-06 ; sessions par cookie | messages d'erreur détaillés, afficher/masquer |
| 1.3 | US-05 Consulter son profil | CA-01, CA-02, CA-03 ; affichage simple | sections finales, formats, « Non renseigné » |
| 1.4 | US-08 Choisir Oui/Non | CA-01 (Oui seulement) | Non, changer d'avis |
| 1.5 | US-09 Modifier ses informations | un seul champ : téléphone, avec validation serveur | autres champs, indicateurs visuels |
| 1.6 | US-12 Confirmer et soumettre | CA-01, CA-02, CA-03 | double clic, verrouillage complet |
| 1.7 | US-15 Connexion admin | CA-01, CA-05 | blocage, expiration |
| 1.8 | US-17 Liste des employés | CA-01 (sans pagination) avec statut | pagination, cartes/tableau, ancien nom |
| 1.9 | Test bout en bout du Skeleton | `e2e/walking-skeleton.spec.js` sur mobile | — |

Les écrans du Skeleton utilisent déjà le design system, sans viser la fidélité complète aux maquettes.

**Critère de sortie :** le test `walking-skeleton.spec.js` passe. Démonstration : sur un téléphone, un employé fictif modifie son téléphone et soumet ; sur l'ordinateur, l'admin le voit « Mise à jour effectuée ».

---

## 5. Phase 2 — Identification complète

**Statut : Fait** (epic E01 terminé).

| Ordre | Story | Points d'attention | Statut |
|---|---|---|---|
| 2.1 | US-01 Vérifier son identité | `normalize()`, homonymes, doublon (409), réponses identiques inconnu/inactif, écran `/connexion/homonyme`, sélecteur de date | Fait |
| 2.2 | US-02 Créer son mot de passe | erreurs 422, compte existant, écran fidèle à la maquette | Fait |
| 2.3 | US-03 Se connecter | blocage 5 échecs / 15 min (horloge injectable pour les tests), expiration de session, « Mot de passe oublié ? » | Fait |
| 2.4 | US-04 Se déconnecter | menu avatar dans `AppHeader`, nettoyage des données côté client | Fait |

**Critère de sortie :** tous les tests E01 passent ; le parcours de connexion est conforme aux maquettes `identification_collaborateur` et `v_rification_d_identit_homonyme`.

---

## 6. Phase 3 — Consultation et mise à jour complètes

**Statut : Fait** (epic E03 terminé ; `e2e/us10-brouillon.spec.js` et `e2e/us12-parcours-complet.spec.js` passent).

| Ordre | Story | Points d'attention | Statut |
|---|---|---|---|
| 3.1 | US-05 Consulter son profil | 3 sections, valeurs soumises affichées, maquette `mon_profil_collaborateur` | Fait |
| 3.2 | US-06 État de la mise à jour | calcul de l'état employé (`NOT_DONE` / `IN_PROGRESS` / `DONE`) | Fait |
| 3.3 | US-08 Oui/Non | « Non », changer d'avis, 409 après soumission | Fait |
| 3.4 | US-09 Modifier ses informations | registre des 5 champs, validations, badge « Modifié », ancienne valeur, `GET /fields` | Fait |
| 3.5 | US-10 Brouillon | sauvegarde automatique (2 s), bouton manuel, reprise, erreur réseau | Fait |
| 3.6 | US-11 Vérifier | composant `ValueComparison`, cas « aucune modification » | Fait |
| 3.7 | US-12 Soumettre | verrouillage de toutes les écritures après soumission, double clic, CSV inchangé | Fait |

Composants partagés créés dans cette phase : `Stepper`, `StatusBadge`, `FieldCard`, `ValueComparison`, `StickyActionBar`.

**Critère de sortie :** le parcours employé complet (sans documents) fonctionne sur mobile et est conforme aux maquettes ; `e2e/us10-brouillon.spec.js` passe.

---

## 7. Phase 4 — Documents

**Statut : Fait** (epics E02 et E04 terminés ; `e2e/us12-parcours-complet.spec.js` passe avec un document ; ajout d'une photo avec un vrai téléphone : contrôle manuel prévu en phase 6, tâche 6.4).

| Ordre | Story | Points d'attention | Statut |
|---|---|---|---|
| 4.1 | US-13 Ajouter un document | `LocalFileStorage`, détection par signature, limites 5 Mo / 10 fichiers, redimensionnement des photos, barre de progression, test sur un vrai téléphone (appareil photo) | Fait (test sur vrai téléphone : phase 6) |
| 4.2 | US-14 Supprimer un document | dialogue de confirmation, suppression du fichier sur disque | Fait |
| 4.3 | US-07 Consulter ses documents | regroupement par type, ouverture PDF/image, isolation entre employés | Fait |

**Critère de sortie :** `e2e/us12-parcours-complet.spec.js` (parcours complet avec document) passe ; ajout d'une photo prise avec un vrai téléphone vérifié manuellement.

---

## 8. Phase 5 — Administration complète

**Statut : En cours** (1 / 8 stories faites : US-15 ; US-17 existe en version minimale depuis le Skeleton).

| Ordre | Story | Points d'attention | Statut |
|---|---|---|---|
| 5.1 | US-15 Connexion admin | blocage, expiration 2 h, test paramétré sur **toutes** les routes admin | Fait |
| 5.2 | US-16 Tableau de bord | 2 statuts seulement, inactifs exclus, cartes cliquables | Pas encore |
| 5.3 | US-17 Liste | pagination, cartes (mobile) / tableau (desktop), ancien nom en gris | En cours (version minimale) |
| 5.4 | US-18 **Recherche** | recherche en mémoire normalisée, délai 300 ms, terme dans l'URL, barre collante sur mobile | Pas encore |
| 5.5 | US-19 Filtre par statut | combinaison avec la recherche, compteurs | Pas encore |
| 5.6 | US-20 Dossier | lecture seule vérifiée par test sur les routes, brouillon jamais exposé | Pas encore |
| 5.7 | US-21 Documents de l'employé | aperçu plein écran | Pas encore |
| 5.8 | US-22 Réinitialiser l'accès | sessions coupées, données intactes | Pas encore |

Les écrans admin n'ont pas de maquette : ils sont construits directement avec les composants et jetons du design system des phases précédentes, sans étape de validation visuelle intermédiaire.

**Critère de sortie :** tous les tests E05 passent ; `e2e/us18-recherche-admin.spec.js` passe.

---

## 9. Phase 6 — Finalisation et préparation du test

**Statut : Pas encore.**

| # | Tâche |
|---|---|
| 6.1 | Exécution de **tous** les tests (unitaires, API, composants, E2E) et des contrats d'architecture (`lint-imports`) |
| 6.2 | Démarrage avec le **vrai CSV** : vérification du chargement (364 actifs), des accents, des formats de téléphone, du doublon (écran « Contactez l'administration ») |
| 6.3 | Contrôle de sécurité : aucune colonne exclue dans les réponses (test automatique sur le vrai CSV : recherche des valeurs des colonnes exclues dans toutes les réponses JSON), cookies `HttpOnly`, aucun mot de passe dans les logs |
| 6.4 | Contrôle mobile sur au moins un téléphone Android et un iPhone : zones tactiles, clavier, appareil photo, sélecteur de date |
| 6.5 | Revue visuelle par rapport aux maquettes Stitch, écran par écran |
| 6.6 | Configuration de la machine : `ACME_DATA_DIR` hors OneDrive, règle de pare-feu Windows (port 8000), mise en veille désactivée, mot de passe admin définitif |
| 6.7 | Option tunnel (Cloudflare Tunnel ou ngrok) si le directeur teste hors du réseau local |
| 6.8 | `docs/guide-demarrage.md` : lancer, arrêter, sauvegarder `ACME_DATA_DIR`, remplacer le CSV |
| 6.9 | `docs/scenario-test-directeur.md` : scénario guidé reprenant les 7 critères de succès du PRD (§9), avec une fiche d'observation (temps, demandes d'aide, incidents) |

**Critère de sortie :** les 7 critères de succès du PRD sont vérifiés en répétition générale ; l'application est remise au directeur.

---

## 10. Traçabilité stories → phases

| Story | Epic | Phase 1 (minimal) | Phase complète | Statut |
|---|---|---|---|---|
| US-01, US-02 | E01 | ✓ | 2 | Fait |
| US-03, US-04 | E01 | | 2 | Fait |
| US-05 | E02 | ✓ | 3 | Fait |
| US-06 | E02 | | 3 | Fait |
| US-07 | E02 | | 4 | Fait |
| US-08 | E03 | ✓ | 3 | Fait |
| US-09 | E03 | ✓ | 3 | Fait |
| US-12 | E03 | ✓ | 3 | Fait |
| US-10 | E03 | | 3 | Fait |
| US-11 | E03 | | 3 | Fait |
| US-13 | E04 | | 4 | Fait |
| US-14 | E04 | | 4 | Fait |
| US-15 | E05 | ✓ | 5 | Fait |
| US-17 | E05 | ✓ | 5 | En cours |
| US-16, US-18 → US-22 | E05 | | 5 | Pas encore |

Les 22 stories sont couvertes.

## 11. Risques d'implémentation

| Risque | Mitigation |
|---|---|
| Python 3.14 installé : certaines bibliothèques peuvent ne pas encore publier de paquets pour cette version | Vérifié en phase 0 ; repli sur Python 3.12/3.13 si nécessaire |
| Écart entre maquettes Stitch (HTML statique, images Google) et composants React | Reprendre la structure et les classes Tailwind, remplacer les images distantes par des ressources locales |
| Comportements différents des téléphones (sélecteur de date, appareil photo) | Tests manuels sur appareils réels dès les phases 2 et 4, pas seulement en phase 6 |
| Verrouillage SQLite par OneDrive | `ACME_DATA_DIR` hors OneDrive dès la phase 0 |
| Dérive du périmètre pendant le développement | Toute nouvelle demande devient une story ; elle est priorisée après le MVP sauf décision explicite |
