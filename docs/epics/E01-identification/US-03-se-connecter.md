# US-03 — Se connecter avec son mot de passe

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E01 Identification |
| **Priorité** | MUST |
| **PRD** | F-03, F-06, F-08 |
| **Dépendances de code** | Vérification d'identité (US-01), comptes, sessions |
| **API** | `POST /api/auth/login` |
| **Écran** | `/connexion/mot-de-passe` (mode saisie) |

## Récit

> En tant qu'employé ayant déjà créé mon mot de passe, je veux me connecter afin de retrouver mon dossier et ma démarche en cours.

## Règles

- Identité re-vérifiée côté serveur (règles US-01), puis mot de passe vérifié.
- 5 échecs consécutifs → compte bloqué 15 minutes (`423 ACCOUNT_LOCKED`) ; compteur remis à zéro après une connexion réussie.
- Session employé : expiration après 30 minutes d'inactivité.

## Critères d'acceptation

**CA-01 — Connexion réussie**
Étant donné EMP-A avec le mot de passe « Bonjour-2026 »
Quand il saisit ses informations et ce mot de passe
Alors un cookie de session est posé
Et il est redirigé vers « Mon profil ».

**CA-02 — Mauvais mot de passe**
Quand le mot de passe est incorrect
Alors la réponse est `401 INVALID_CREDENTIALS`
Et le message « Mot de passe incorrect. » s'affiche
Et le nombre de tentatives restantes est indiqué à partir de la 3ᵉ erreur.

**CA-03 — Blocage**
Étant donné 5 échecs consécutifs
Quand une 6ᵉ tentative est faite, même avec le bon mot de passe, dans les 15 minutes
Alors la réponse est `423 ACCOUNT_LOCKED`
Et le message « Trop de tentatives. Réessayez dans 15 minutes. » s'affiche.

**CA-04 — Déblocage**
Étant donné un compte bloqué
Quand 15 minutes se sont écoulées
Alors une connexion avec le bon mot de passe réussit
Et le compteur d'échecs est remis à zéro.

**CA-05 — Compteur remis à zéro**
Étant donné 3 échecs
Quand la connexion suivante réussit
Alors le compteur revient à 0.

**CA-06 — Pas encore de mot de passe**
Étant donné EMP-B sans compte
Quand une requête de connexion est envoyée
Alors la réponse est `409 PASSWORD_NOT_SET` (l'écran redirige vers la création).

**CA-07 — Session expirée**
Étant donné une session inactive depuis plus de 30 minutes
Quand l'employé appelle une route `/api/me/*`
Alors la réponse est `401 SESSION_EXPIRED`
Et l'écran revient à l'identification avec le message « Votre session a expiré. Reconnectez-vous. ».

**CA-08 — Mot de passe oublié**
L'écran de saisie affiche le lien « Mot de passe oublié ? »
Qui indique : « Contactez l'administration : elle réinitialisera votre accès et vous pourrez créer un nouveau mot de passe. »

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-03.1 | CA-01 | API | `tests/api/test_us03_login.py` | cookie posé, `/api/me/profile` accessible |
| T-03.2 | CA-02 | API | `tests/api/test_us03_login.py` | 401, compteur incrémenté |
| T-03.3 | CA-03, CA-04 | Unitaire | `tests/unit/test_lockout_policy.py` | règle de blocage avec horloge simulée |
| T-03.4 | CA-03 | API | `tests/api/test_us03_login.py` | 6ᵉ tentative → 423 même avec bon mot de passe |
| T-03.5 | CA-04, CA-05 | API | `tests/api/test_us03_login.py` | horloge avancée de 15 min ; remise à zéro |
| T-03.6 | CA-06 | API | `tests/api/test_us03_login.py` | 409 `PASSWORD_NOT_SET` |
| T-03.7 | CA-07 | API | `tests/api/test_us03_login.py` | horloge avancée de 31 min → 401 `SESSION_EXPIRED` |
| T-03.8 | CA-02, CA-03, CA-07, CA-08 | Composant | `src/features/auth/PasswordPage.test.jsx` | messages, tentatives restantes, lien « oublié » |
| T-03.9 | CA-01 | E2E | `e2e/us03-connexion.spec.js` | connexion complète sur mobile |

## Hors périmètre

- Réinitialisation de l'accès (US-22).
- « Se souvenir de moi ».
