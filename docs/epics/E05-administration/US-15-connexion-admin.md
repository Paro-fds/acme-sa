# US-15 — Se connecter en administrateur

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | E05 Administration |
| **Priorité** | MUST |
| **PRD** | F-22 |
| **Dépendances de code** | Configuration `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`, sessions |
| **API** | `POST /api/admin/auth/login`, `POST /api/admin/auth/logout` |
| **Écran** | `/admin/connexion` |

## Récit

> En tant qu'administrateur, je veux me connecter à un espace réservé afin de suivre la campagne sans que les employés y aient accès.

## Règles

- Compte unique défini dans la configuration ; mot de passe stocké uniquement sous forme de hash Argon2.
- Blocage 15 minutes après 5 échecs consécutifs.
- Session admin : expiration après 2 heures d'inactivité.
- Une session employé ne donne **aucun** accès à `/api/admin/*`, et inversement.

## Critères d'acceptation

**CA-01 — Connexion réussie**
Quand l'admin saisit `admin` / `Admin-Test-2026`
Alors une session `ADMIN` est créée
Et le tableau de bord s'affiche.

**CA-02 — Identifiants incorrects**
Quand l'identifiant ou le mot de passe est faux
Alors la réponse est `401 INVALID_CREDENTIALS`
Et le message « Identifiant ou mot de passe incorrect. » s'affiche (sans préciser lequel).

**CA-03 — Blocage**
Après 5 échecs consécutifs
Alors toute tentative pendant 15 minutes renvoie `423 ACCOUNT_LOCKED`.

**CA-04 — Cloisonnement employé / admin**
Étant donné EMP-A connecté
Quand il appelle `/api/admin/statistics`
Alors la réponse est `403`
Et une session admin appelant `/api/me/profile` reçoit `401`.

**CA-05 — Routes protégées**
Quand une route `/api/admin/*` (hors login) est appelée sans session
Alors la réponse est `401`
Et l'écran redirige vers `/admin/connexion`.

**CA-06 — Déconnexion**
Quand l'admin choisit « Se déconnecter »
Alors la session est supprimée et il revient à `/admin/connexion`.

**CA-07 — Session expirée**
Après 2 heures d'inactivité
Alors la prochaine requête renvoie `401 SESSION_EXPIRED`.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-15.1 | CA-01, CA-02, CA-06 | API | `tests/api/test_us15_admin_auth.py` | connexion, refus, déconnexion |
| T-15.2 | CA-03, CA-07 | API | `tests/api/test_us15_admin_auth.py` | blocage et expiration (horloge simulée) |
| T-15.3 | CA-04, CA-05 | API | `tests/api/test_us15_admin_auth.py` | **toutes** les routes `/api/admin/*` testées sans session et avec session employé (test paramétré) |
| T-15.4 | CA-01, CA-02, CA-05 | Composant | `src/features/admin/AdminLoginPage.test.jsx` | formulaire, message, garde de route |

## Hors périmètre

- Plusieurs comptes administrateurs, rôles.
