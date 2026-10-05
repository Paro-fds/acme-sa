# Plan d'implémentation V2 — Parcours professionnel et recherche de profils

| | |
|---|---|
| **Version** | 1.0 — validé le 2026-10-05 |
| **Date** | 2026-10-05 |
| **Entrées** | `docs/v2/01-prd.md` v1.2, `docs/v2/02-solution-design.md` v1.0, `docs/v2/epics/` (11 user stories, US-25 → US-35) |
| **Complète** | `docs/03-plan-implementation.md` (MVP) : principes, règles de Clean Architecture (§1.1), cycle d'une story, règles de statut (§2.1) inchangés |
| **Avancement mis à jour le** | 2026-10-05 (aucune phase commencée) |

---

## 1. Principes

Ceux du MVP (`docs/03-plan-implementation.md` §1), plus deux règles propres à la V2 :

1. **Démarrage** : après la phase 6 du MVP (faite le 2026-10-05). Le **test du directeur est reporté** par l'utilisateur (2026-10-05) : la V2 démarre sans l'attendre.
2. **Application en service intouchable** (décision de l'utilisateur, 2026-10-05 : le MVP **reste en service** pendant tout le développement de la V2, d'où les tâches 7.1 → 7.3) : le MVP tourne depuis `app-web` sur la machine de l'utilisateur (port 8000, `C:\acme-data`, `frontend/dist`). La V2 se développe dans un **dossier séparé** (§3), avec ses propres données et ports. Dans `app-web`, tant que le MVP est en service : pas de modification du code, pas de `npm run build`, **pas de `npx playwright test`** (il recompile `frontend/dist`), pas de changement de branche.

## 2. Vue d'ensemble

| Phase | Contenu | Stories | Incrément démontrable | Statut |
|---|---|---|---|---|
| **7** | Mise en place V2 + **squelette du parcours** | US-25, US-26 | Un employé ajoute un diplôme depuis son téléphone ; l'admin le voit dans le dossier (version minimale d'US-30) | Pas encore |
| **8** | Parcours complet | US-27, US-28, US-31, US-30, US-29 | Les quatre rubriques, les justificatifs, le bloc admin complet | Pas encore |
| **9** | Recherche de profils | US-34, US-35, US-32, US-33 | L'admin trouve les employés par compétence ou par poste et les appelle ; filtre et carte « Parcours enrichis » | Pas encore |
| **10** | Finalisation et mise en service de la V2 | — | V2 installée à la place du MVP, sans perte de données | Pas encore |

```text
Phase 6 du MVP ────────> Phase 7 ──> Phase 8 ──> Phase 9 ──> Phase 10
                                  \                    ^
                                   └── (US-34, US-35 ne dépendent que d'US-25, US-31, US-30)
```

### 2.1 Avancement

Règles de statut : celles du MVP (§2.1). À la fin de chaque story, les statuts sont mis à jour dans : le fichier de la story, `docs/v2/epics/README.md` (index et statut des epics), le README de l'epic, ce plan (§2, §2.1, tableau de la phase, §8) et `agent.md` §0.

| Epic | Stories | Phases | Statut |
|---|---|---|---|
| E06 Parcours professionnel | US-25 → US-31 | 7, 8 | **Pas encore** |
| E07 Recherche de profils | US-32 → US-35 | 9 | **Pas encore** |

**Stories :** 0 / 11 « Fait ».

## 3. Dossier de développement V2

| Élément | MVP en service (`app-web`) | Développement V2 |
|---|---|---|
| Dossier | `ACME SA\app-web` | `ACME SA\app-web-v2` (`git worktree`, branche `v2`) |
| Données (`ACME_DATA_DIR`) | `C:\acme-data` | `C:\acme-data-v2` |
| API | port **8000** (`run.ps1`) | port **8002** (`run.ps1 -Port 8002`) |
| Frontend en développement | — | Vite **5174**, proxy `/api` → **8002** |
| Tests E2E (Playwright) | — (interdits tant que le MVP est en service) | port **8001** (configuration actuelle), dossier temporaire |
| CSV | `data/` réel | CSV de test pour le développement ; réel seulement via `check_csv` (aucune donnée affichée) |

Le port 8001 est déjà celui des tests E2E : le serveur de développement V2 prend donc le 8002 pour que les deux puissent tourner en même temps.

## 4. Phase 7 — Mise en place V2 et squelette du parcours

**Statut : Pas encore.** **Prérequis :** phase 6 du MVP (faite).

| # | Tâche | Résultat | Statut |
|---|---|---|---|
| 7.1 | **Utilisateur** : créer le dossier `git worktree add ..\app-web-v2 -b v2` depuis `app-web` (ou m'autoriser à le faire) | `ACME SA\app-web-v2` sur la branche `v2` | Pas encore |
| 7.2 | Dans `app-web-v2` : environnement virtuel et `npm install` ; `backend\.env` copié avec `ACME_DATA_DIR=C:\acme-data-v2` | Les tests du MVP passent dans le nouveau dossier (455 backend, 242 composants, 11 E2E) | Pas encore |
| 7.3 | Proxy Vite configurable (`ACME_API_PORT`, 8000 par défaut) ; lancement de développement V2 sur 8002 / 5174 | Le MVP en service n'est jamais appelé par la V2 | Pas encore |
| 7.4 | Module `career` (4 couches, vide), ajout aux contrats import-linter + contrat « Parcours indépendant de la campagne » ; `MAX_CAREER_ENTRIES_PER_KIND`, `CAREER_RECENT_DAYS`, dossier `career/` | `lint-imports` vert avec 4 contrats | Pas encore |
| 7.5 | Fixtures pytest `career_entry`, `career_proof`, `career_reference`, `frozen_clock` ; dépôt `InMemoryCareerRepository` pour les tests unitaires | Jeu de données de `docs/v2/epics/README.md` disponible | Pas encore |
| 7.6 | **US-25** Consulter son parcours (registre des 4 rubriques, tables `career_entry` et `career_profile`, `/parcours`, carte du profil, lien du menu, mention de visibilité) | Tests T-25.x verts | Pas encore |
| 7.7 | **US-26** Diplômes et certifications (`MonthField`, `CareerEntryPage`, validation, limite, `career_profile`) | Tests T-26.x verts, E2E `us26-diplome` | Pas encore |
| 7.8 | Version minimale d'**US-30** : bloc « Parcours professionnel » en lecture seule dans le dossier admin (sans justificatifs) | Un diplôme ajouté par l'employé est visible par l'admin | Pas encore |
| 7.9 | **Revue visuelle par l'utilisateur** de `/parcours` et du formulaire, à 390 px et 1280 px (ENF-V2-03) | Remarques intégrées avant de dupliquer le formulaire aux autres rubriques | Pas encore |

**Critère de sortie :** E2E « un employé ajoute un diplôme sur mobile → l'admin le voit dans le dossier » vert ; tous les tests du MVP toujours verts ; revue visuelle faite.

## 5. Phase 8 — Parcours complet

**Statut : Pas encore.**

| # | Tâche | Point d'attention | Statut |
|---|---|---|---|
| 8.1 | **US-27** Formations | Case « Formation en cours », fin dans le futur refusée (SD-V2-01) | Pas encore |
| 8.2 | **US-28** Expériences | Case « Poste actuel », description de 500 caractères, durée affichée | Pas encore |
| 8.3 | **US-31** Compétences | Doublon normalisé, tri par niveau | Pas encore |
| 8.4 | **US-30** complète | Dates « Ajouté / Modifié le », employé inactif → 404, aucune route d'écriture | Pas encore |
| 8.5 | **US-29** Justificatifs | Second `LocalFileStorage` (`career/`), ordre des écritures, zone active après « Enregistrer » (SD-V2-02) ; justificatif visible côté admin | Pas encore |
| 8.6 | Contrôle sur **téléphones réels** (Android, iPhone) : `MonthField`, appareil photo, clavier | Fait par l'utilisateur | Pas encore |

**Critère de sortie :** tous les tests E06 verts ; `e2e/us29-justificatif.spec.js` vert ; statut de campagne et `GET /api/admin/statistics` inchangés par toute écriture du parcours. **Epic E06 terminé.**

## 6. Phase 9 — Recherche de profils

**Statut : Pas encore.**

| # | Tâche | Point d'attention | Statut |
|---|---|---|---|
| 9.1 | **US-34** Rechercher des profils | Règle pure `profile_search.py` testée seule ; valeurs à jour (dernier envoi) ; test de performance 364 × 120 éléments < 1 s ; accès depuis le tableau de bord et le menu admin | Pas encore |
| 9.2 | **US-35** Employés d'un même poste | `ListPositions` (actifs, regroupement normalisé, pas de fusion « Caissier » / « Caissière ») ; `position` répété dans l'adresse | Pas encore |
| 9.3 | **US-32** Filtre « Parcours enrichi » | Combinaison avec `search` et `status` ; tests d'US-17 → US-19 inchangés | Pas encore |
| 9.4 | **US-33** Carte du tableau de bord | Route séparée ; échec isolé ; statistiques de campagne inchangées | Pas encore |

Écrans admin : design system, sans validation visuelle intermédiaire (comme au MVP).

**Critère de sortie :** tous les tests E07 verts ; `e2e/us34-recherche-profils.spec.js` vert (un employé ajoute une compétence, l'admin le trouve et voit « Appeler »). **Epic E07 terminé.**

## 7. Phase 10 — Finalisation et mise en service de la V2

**Statut : Pas encore.**

| # | Tâche | Statut |
|---|---|---|
| 10.1 | Exécution de **tous** les tests (MVP + V2 : unitaires, API, composants, E2E) et des contrats d'architecture | Pas encore |
| 10.2 | `check_csv` étendu aux nouvelles routes (`/api/me/career*`, `/api/admin/*career*`, `/api/admin/profiles`, `/api/admin/positions`) : aucune colonne exclue du **vrai** CSV dans les réponses | Pas encore |
| 10.3 | Liste des postes du **vrai** CSV contrôlée par un outil qui n'affiche que des comptes (nombre de postes distincts, nombre de variantes de majuscules/accents fusionnées), pour savoir si le choix multiple suffit | Pas encore |
| 10.4 | Revue visuelle finale des écrans employé V2 par l'utilisateur | Pas encore |
| 10.5 | `docs/guide-demarrage.md` : sauvegarde de `C:\acme-data\career\` ; `docs/scenario-test-directeur.md` : scénario V2 (critères de succès 1 → 8 du PRD V2) | Pas encore |
| 10.6 | **Mise en service** : (1) arrêter le MVP ; (2) **sauvegarder `C:\acme-data`** ; (3) l'utilisateur fusionne `v2` dans `main` ; (4) `.\run.ps1 -Build` dans `app-web` ; les tables `career_entry` et `career_profile` sont créées au démarrage, les données du MVP restent intactes (AD-V2-07) ; (5) vérifier une connexion employé, le tableau de bord et un dossier | Pas encore |
| 10.7 | Retirer le dossier `app-web-v2` (`git worktree remove`) une fois la V2 en service | Pas encore |

**Critère de sortie :** les 8 critères de succès du PRD V2 vérifiés en répétition ; V2 en service ; données du MVP (comptes, mises à jour, documents) intactes.

## 8. Traçabilité stories → phases

| Story | Epic | Phase 7 (minimal) | Phase complète | Statut |
|---|---|---|---|---|
| US-25 | E06 | | 7 | Pas encore |
| US-26 | E06 | | 7 | Pas encore |
| US-30 | E06 | ✓ | 8 | Pas encore |
| US-27 | E06 | | 8 | Pas encore |
| US-28 | E06 | | 8 | Pas encore |
| US-31 | E06 | | 8 | Pas encore |
| US-29 | E06 | | 8 | Pas encore |
| US-34 | E07 | | 9 | Pas encore |
| US-35 | E07 | | 9 | Pas encore |
| US-32 | E07 | | 9 | Pas encore |
| US-33 | E07 | | 9 | Pas encore |

Les 11 stories sont couvertes.

## 9. Risques d'implémentation

| Risque | Mitigation |
|---|---|
| Modifier par erreur l'application en service (`app-web`) pendant le développement | Dossier séparé, ports et données distincts (§3) ; jamais de build, d'E2E ni de changement de branche dans `app-web` |
| Correction urgente du MVP pendant le développement V2 | Corrigée sur `main` dans `app-web` (arrêt bref, relance), puis reportée dans `v2` par l'utilisateur (`git merge main`) |
| Mise en service : base du MVP endommagée | Sauvegarde de `C:\acme-data` avant ; nouvelles tables seulement (pas de modification des tables existantes) ; retour possible à l'ancien code avec la même base |
| `MonthField` ou appareil photo différents selon les téléphones | Contrôle sur appareils réels dès la phase 8 (8.6) |
| Postes du vrai CSV trop hétérogènes pour le choix multiple | Mesuré en 10.3 ; si besoin, nouvelle story (table de correspondance des postes) |
| Recherche lente avec beaucoup de parcours | Test de performance dès US-34 ; index plein texte seulement si le seuil n'est pas tenu |
| Dérive du périmètre | Toute nouvelle demande devient une story V2 numérotée à la suite (US-36…) |
