# agent.md — Consignes pour les agents qui travaillent sur ce projet

**Portail carrière ACME SA** : refonte du portail des dossiers employés demandée par M. Hilaire (DRH).
Web **mobile d'abord**. Langue du projet et de l'interface : **français**. Le code se fait ici (`app-web-v2`, branche `v2`).

## 0. Où en est le projet ? (à lire en premier)

> Mise à jour le 2026-10-09. Source de vérité des statuts : `docs/lot0/1-specifications/epics/README.md`.

| Story | Statut | Où on en est |
|---|---|---|
| US-105 Accueil | **Fait** | — |
| US-101 Connexion en un écran | **Fait** | — |
| US-001 Socle déployable | **Fait** | En ligne : Vercel (site) → Render `https://acme-sa.onrender.com` (API, Docker) → Supabase (PostgreSQL, stockage S3) ; chaque push sur `v2` redéploie. Dépôt signé → US-301 ; répétition AWS → US-002 |
| US-102 Double authentification RH | **En cours** (avancée, D-42) | Écrans, règles et TOTP faits ; envoi réel WhatsApp/email en attente de la DIT (D-41) ; `MFA_METHODS` dit quelles méthodes sont ouvertes |
| US-106 Double authentification employés | Pas encore | Exigence du 2026-10-08 (D-41, P-15) |
| US-501 Référentiel des unités | **Fait** | Import Excel (`app/referential`, écran `/admin/referentiel`). Interface au lot 4 → US-503 |
| US-201 Voir mon dossier et ma progression | **Fait** | `app/employee/domain/completion.py` : 8 éléments (RG-01), tronqué à l'entier (5/8 = 62 %) ; affectation en libellés officiels, « Unité à confirmer » sinon |
| US-202 Compléter mes coordonnées | **Fait** | Module `app/dossier`, écrans `features/dossier/` (`/avant-de-commencer`, `/profil/coordonnees`, `/profil/contact-etudes`). Une information compte seulement saisie ou confirmée. Mention d'information à valider (D-43) |
| US-203 Confirmer ou signaler agence, poste, date d'embauche | **Fait** | Section 3/3 `/profil/informations-rh` ; confirmation datée ou signalement (table `error_report`, traité au lot 2 par US-403) ; signalement automatique si embauche avant 18 ans (RG-16) |
| US-204 Savoir ce qui me reste avant de déposer | **Fait** | `/certificats` fermé tant que le profil n'est pas complet, liste de ce qui reste avec un lien par élément ; `completion.is_complete` |
| US-206 Retirer l'ancien parcours de mise à jour | **Fait** | Plus de routes `/api/me/update/*` ni `/api/me/documents/*` ; `/mise-a-jour/*` et `/documents` ramènent à `/profil` ; les écrans RH du MVP lisent toujours les envois passés |
| US-301 Déposer un certificat | **Fait** | Module `app/certificate` : dépôt signé direct au stockage (S3, ou route locale en `local`), contenu réel contrôlé, 5 Mo, 20 au plus, nom aléatoire. Domaines à valider (D-45). CORS du stockage à vérifier sur le démonstrateur |
| US-302 Savoir ce que mon certificat m'apporte | **Fait** | `/certificats/merci` : récapitulatif, « Reçu », ce que ça débloque, avis en un clic (D-46) |
| US-303 Suivre mon certificat | **Fait** | Statuts dans « Mes certificats ». « À corriger » et redépôt au lot 2 ; notification avec US-701 |
| US-502 Rattacher les valeurs inconnues | **Fait** | Bloc « À rattacher » de `/admin/referentiel`, avec le nombre d'employés ; disparaît après import de la correspondance |
| US-605 Mesurer si les employés reviennent | **Fait** | Journal `employee_login` ; carte « Engagement des employés » du tableau de bord RH (`GET /api/admin/engagement`) |
| US-207 Aligner l'espace employé sur les écrans validés | **Fait** | Écrans validés par M. Hilaire = `2-espace-employe-ecrans/` et `3-espace-rh-ecrans/` (D-47). Accueil `/accueil` (écran 06) après la connexion, « Avant de commencer » d'abord à la première connexion ; en-tête « Portail Carrière » et barre du bas ; identité en lecture seule (08) ; écrans 07, 11, 12, 13 alignés ; niveau d'études validé en tête de « Mes certificats » |
| US-107 Aligner la connexion RH sur l'écran validé | **Fait** | Écran A01 : `RhLoginCard` (carte, logo, étapes `LoginStep`), étape 2 sur la même carte (`mfa/MfaStep.jsx`) ; code en 6 cases (`mfa/CodeBoxes.jsx` : un seul champ invisible sous les cases, `one-time-code`, collage) ; « Renvoyer le code » pour WhatsApp/email seulement ; « Mot de passe oublié ? » → voir un Administrateur. `/admin/double-authentification` reste pour un écran RH ouvert avant le code. US-102 reste au lot 3 (envoi des codes, réseau) |
| US-701, US-702 Notifications et rappels | Pas encore | **Reportées** le 2026-10-08 : prestataire non choisi (D-41) ; déclenchement des rappels à décider |

**Prochaine action :** lot 1 terminé le 2026-10-09 (US-107 comprise), sauf US-701 et US-702 reportées. Les écrans RH (menu latéral, A09 « Valeurs à rattacher ») sont repris au début du lot 2. Avant le lot 2 : pousser `v2` (migrations 0005 → 0007), essayer un dépôt de certificat sur le démonstrateur (CORS), faire valider D-43, D-44, D-45. Lot 2 : ordre proposé dans `docs/03-plan-implementation.md` §2, en revenant au cycle normal (tests après chaque story). Une story à la fois.

À savoir :
- **Code hérité** du MVP et de la V2 : modules `update` et `document` (sans route employé depuis US-206, lus par les écrans RH du MVP), écrans RH du MVP, `career` (`/parcours`, D-44) : à remplacer par des stories (`docs/01-prd.md` §7). Ne pas l'étendre.
- Tests API d'un profil complet : `complete_profile(client)` (`tests/conftest.py`) ; dépôt : `_deposit(client)` (`tests/api/test_us301_depot.py`).
- Connexion RH : le mot de passe ouvre une session « en attente du code » (`ADMIN_MFA`) ; aucun réglage ne désactive la double authentification. Tests API : `rh_login()` (`tests/conftest.py`) ; tests E2E : `e2e/admin.js`.
- Les codes WhatsApp/email ne s'affichent à l'écran qu'avec `APP_ENV=local` ; en ligne, jamais.
- Le démonstrateur ne reçoit que du travail du projet : rien de « spécial démo ». Chaque push sur `v2` le met à jour : ne pousser que des tests verts.
- `TEST_POSTGRES_URL` fait tourner toute la suite sur PostgreSQL.
- Écran admin : `Page account="admin"` et `useLoader(load, { loginPath: '/admin/connexion' })`. Le test paramétré `test_us15_admin_auth.py` couvre toute nouvelle route `/api/admin/*` (401 sans session, 403 avec session employé).
- Écran employé d'une section du profil : `useDossierSection()` (`features/dossier/`) gère le chargement, le passage par « Avant de commencer » et les erreurs de champ.

## 1. Méthode : Spec-Driven Development

Les spécifications font foi. Ordre de lecture :

| Document | Rôle |
|---|---|
| `docs/lot0/0-cadrage/registre-des-decisions-v1.8.md` | **Fait foi** en cas de contradiction |
| `docs/01-prd.md` | Le quoi et le pourquoi, en court, avec les renvois au cahier des charges |
| `docs/lot0/1-specifications/` | Cahier des charges (EF, ENF), tableau unique des règles (RG), décisions (D) |
| `docs/lot0/1-specifications/epics/` | Index des stories (**statuts**), une story par fichier : récit, critères d'acceptation (CA-xx), Definition of Done |
| `docs/02-solution-design.md` | Le comment : architecture, modules, données, API, sécurité, **règles de Clean Architecture** (§3) |
| `docs/03-plan-implementation.md` | Ordre de réalisation, démonstrateur, jeu de test, Definition of Done commune |
| `docs/lot0/2-maquettes/2-espace-employe-ecrans/`, `3-espace-rh-ecrans/` | Écrans **validés par M. Hilaire** (D-47) : la référence ; une règle du registre l'emporte sur un texte d'écran |

Ne pas changer une règle métier ou une décision sans l'accord de l'utilisateur. Toute nouvelle demande devient une nouvelle story. S'en tenir aux mots du directeur : citer la source, mettre le reste en question ouverte (❓).

## 2. Travailler story par story

**Une seule story à la fois.** Ne pas commencer la suivante avant que la courante soit « Fait » et que l'utilisateur ait validé.

Les fichiers de story, les README des epics et l'index sont **générés** par `docs/lot0/1-specifications/epics/generer_stories.py` (listes `EPICS`, `S` et dictionnaire `STATUS`) : on ne les modifie jamais à la main ; on change le générateur, puis on le relance.

1. Passer son statut à **En cours** (générateur, puis §0 de ce fichier).
2. Relire la story : critères d'acceptation, règles, maquette. **Poser toutes les questions ouvertes à l'utilisateur dès maintenant**, pas à la fin.
3. Écrire les tests de la story (**avant** le code), nommés d'après la story et le critère (`test_us202_*.py`, `test_ca04_*`).
4. Domaine + cas d'utilisation → tests unitaires verts (ports simulés en mémoire).
5. Infrastructure + route API + migration Alembic, câblage dans `backend/app/container.py` → tests API verts.
6. Écran React → tests composant verts ; vérifier à 390 px et 1280 px.
   Pendant les étapes 4 à 6, ne lancer que les tests de la story et ceux du code touché.
7. Lancer **toute** la suite (§5), **une seule fois**, à la fin : tout doit être vert. Playwright seulement si un écran ou un parcours a changé.
8. En une seule passe : Definition of Done cochée, statut **Fait** (générateur, puis §0), `docs/02-solution-design.md` si l'architecture a changé.
9. S'arrêter et présenter le résultat à l'utilisateur, en court : ce qui a été fait, les tests, où en sont l'**epic** et le **lot**, ce qui reste à décider. Annoncer un epic ou un lot terminé. **Ne pas commiter : l'utilisateur s'en charge.**

| Statut | Signification |
|---|---|
| **Pas encore** | Aucun code écrit |
| **En cours** | Commencée |
| **Fait** | Tous les critères d'acceptation couverts par des tests verts, Definition of Done cochée |

## 3. Architecture

Monolithe modulaire, 3 tiers, **Clean Architecture** : règles complètes dans `docs/02-solution-design.md` §3, modules dans §4. L'essentiel :

- Chaque module backend a 4 couches : `domain` → `application` → `infrastructure` / `api`. Le domaine et l'application n'importent aucun framework.
- `backend/app/container.py` est le **seul** endroit qui instancie l'infrastructure.
- Un module n'utilise un autre que par ses ports ou ses cas d'utilisation.
- Erreurs métier : `code` stable et `message` en français, traduites en HTTP dans `app/shared/api/errors.py`.
- Vérifié par import-linter (`tests/test_architecture.py`) : un nouveau module s'ajoute aux contrats de `backend/pyproject.toml`.
- Frontend : jamais de `fetch` dans un composant ; tout passe par `frontend/src/api/`.

## 4. Règles métier et sécurité à ne jamais enfreindre

- L'export RH est en **lecture seule** ; seuls les employés actifs et les colonnes de la liste blanche sont lus. Dates du CSV : **MM/JJ/AAAA**.
- **Aucune colonne exclue** (bancaire, dettes, licenciement, références, pièce d'identité…) dans l'API ou les journaux. Le CSV de test met `FAKE-SECRET-…` dans ces colonnes : les tests le vérifient.
- **Aucune donnée réelle d'employé** hors de la production sécurisée : démonstrateur et recette sur données fictives. Ne jamais copier le vrai export.
- Un employé n'accède à ses données que par `/api/me/*`.
- Mots de passe : Argon2, jamais renvoyés ni journalisés. Secrets seulement dans `backend/.env` ou chez l'hébergeur, jamais dans le dépôt.
- Aucune saisie dans le dossier de l'employé avant son consentement (US-202).

## 5. Commandes

```powershell
# Backend (depuis backend/)
.venv\Scripts\python -m pytest            # tests unitaires, API et contrats d'architecture
.venv\Scripts\lint-imports                # contrats d'architecture seuls
.venv\Scripts\alembic revision --autogenerate -m "..." --rev-id 000N   # nouvelle migration

# Frontend (depuis frontend/)
npm test                                  # tests unitaires et composants (Vitest)
npx playwright test                       # tests bout en bout (mobile 390 px, CSV fictif)

# Outils (depuis backend/)
python -m app.tools.create_admin          # premier compte RH
python -m app.tools.check_csv             # contrôle d'un export sans afficher aucune donnée (docs/guide-demarrage.md)
```

## 6. Données et environnement

- Tests : uniquement le CSV fictif `backend/tests/fixtures/employees_test.csv` et les fixtures de `backend/tests/conftest.py` (`docs/03-plan-implementation.md` §4).
- Données locales : `C:\acme-data-v2`, **hors OneDrive**. Le vrai export n'est jamais versionné ni utilisé dans les tests.
- Configuration : `backend/.env` (non versionné), modèle dans `backend/.env.example` (aucun secret).
- Démonstrateur : `docs/lot0/9-demonstrateur/` ; référentiel fictif à importer : `backend/demo/referentiel-fictif.xlsx`.

## 7. Conventions

- Textes d'interface et messages d'erreur en français, près de l'élément concerné, qui disent quoi faire (RG-15).
- Mobile d'abord : zones tactiles ≥ 44 px, texte ≥ 16 px, aucun défilement horizontal, bouton principal dans la barre collée en bas.
- Couleurs et styles uniquement via les jetons Tailwind de `frontend/src/index.css`.
- Ne pas commiter ni pousser : l'utilisateur gère git.
