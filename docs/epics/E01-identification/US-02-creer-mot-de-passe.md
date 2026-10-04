# US-02 — Créer son mot de passe

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | E01 Identification |
| **Priorité** | MUST |
| **PRD** | F-02 |
| **Dépendances de code** | Vérification d'identité (US-01), table `employee_account`, sessions |
| **API** | `POST /api/auth/register` |
| **Écran** | `/connexion/mot-de-passe` (mode création) |

## Récit

> En tant qu'employé qui se connecte pour la première fois, je veux créer mon mot de passe afin de sécuriser l'accès à mon dossier.

## Règles

- La requête contient de nouveau nom, prénom et date de naissance : l'identité est re-vérifiée côté serveur (mêmes règles que US-01).
- Mot de passe : 8 caractères minimum ; confirmation identique obligatoire.
- Hachage Argon2 ; le mot de passe n'est jamais renvoyé ni journalisé.
- La création ouvre directement une session (pas de seconde saisie).

## Critères d'acceptation

**CA-01 — Création réussie**
Étant donné EMP-A sans compte
Quand il envoie ses informations et un mot de passe valide confirmé
Alors un compte est créé
Et un cookie de session `HttpOnly` est posé
Et il est redirigé vers « Mon profil ».

**CA-02 — Mot de passe trop court**
Quand le mot de passe fait moins de 8 caractères
Alors la réponse est `422 PASSWORD_TOO_SHORT`
Et le message « Le mot de passe doit contenir au moins 8 caractères. » s'affiche sous le champ.

**CA-03 — Confirmation différente**
Quand la confirmation ne correspond pas
Alors la réponse est `422 PASSWORD_MISMATCH`
Et le message « Les deux mots de passe ne correspondent pas. » s'affiche.

**CA-04 — Compte déjà existant**
Étant donné EMP-A ayant déjà un mot de passe
Quand une requête de création est envoyée pour lui
Alors la réponse est `409 ACCOUNT_ALREADY_EXISTS`
Et le mot de passe existant n'est pas modifié.

**CA-05 — Identité non reconnue**
Quand les informations d'identité ne correspondent à aucun employé actif unique
Alors la réponse est celle de US-01 (`401` ou `409`)
Et aucun compte n'est créé.

**CA-06 — Stockage sécurisé**
Quand un compte est créé
Alors la base contient un hash Argon2 et jamais le mot de passe en clair.

**CA-07 — Aide à la saisie**
L'écran indique la règle « 8 caractères minimum » avant la saisie
Et propose un bouton afficher/masquer pour chaque champ.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-02.1 | CA-01 | API | `tests/api/test_us02_register.py` | 201/200, cookie `HttpOnly`, accès à `/api/me/profile` ensuite |
| T-02.2 | CA-02, CA-03 | API | `tests/api/test_us02_register.py` | codes d'erreur 422 |
| T-02.3 | CA-04 | API | `tests/api/test_us02_register.py` | 409, ancien mot de passe toujours valide |
| T-02.4 | CA-05 | API | `tests/api/test_us02_register.py` | inactif, inconnu, doublon : aucun compte créé |
| T-02.5 | CA-06 | Unitaire | `tests/unit/test_password_hasher.py` | hash Argon2, vérification ok/ko |
| T-02.6 | CA-06 | API | `tests/api/test_us02_register.py` | valeur en base ≠ mot de passe, commence par `$argon2` |
| T-02.7 | CA-02, CA-03, CA-07 | Composant | `src/features/auth/PasswordPage.test.jsx` | messages, afficher/masquer, redirection |
| T-02.8 | CA-01 | E2E | `e2e/us02-premiere-connexion.spec.js` | identification → création → profil, sur mobile |

## Hors périmètre

- Changement de mot de passe par l'employé.
- Mot de passe oublié (réinitialisation par l'admin : US-22).
