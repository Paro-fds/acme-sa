# US-22 — Réinitialiser l'accès d'un employé

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E05 Administration |
| **Priorité** | SHOULD |
| **PRD** | F-29 (D-06) |
| **Dépendances de code** | Tables `employee_account` et `session`, session admin |
| **API** | `POST /api/admin/employees/{id}/reset-access` |
| **Écran** | Bouton « Réinitialiser l'accès » dans le bloc « Accès » de `/admin/employes/:id` |

## Récit

> En tant qu'administrateur, je veux réinitialiser l'accès d'un employé qui a oublié son mot de passe (ou dont le compte a été créé par quelqu'un d'autre) afin qu'il puisse créer un nouveau mot de passe.

## Règles

- Efface `password_hash`, remet le compteur d'échecs et le blocage à zéro, supprime toutes les sessions de l'employé.
- **Ne touche à aucune donnée du dossier** : brouillon, mise à jour soumise, changements et documents sont conservés.
- Bouton visible uniquement si le compte est activé ; confirmation obligatoire.

## Critères d'acceptation

**CA-01 — Réinitialisation**
Étant donné EMP-A avec un compte activé
Quand l'admin touche « Réinitialiser l'accès » puis confirme
Alors le mot de passe est effacé
Et le dossier affiche « Compte non activé »
Et le message « Accès réinitialisé. L'employé pourra créer un nouveau mot de passe à sa prochaine connexion. » s'affiche.

**CA-02 — Nouvelle création possible**
Après la réinitialisation
Quand EMP-A s'identifie
Alors l'étape suivante est `CREATE_PASSWORD`.

**CA-03 — Sessions coupées**
Étant donné EMP-A connecté sur son téléphone
Quand l'admin réinitialise son accès
Alors sa requête suivante reçoit `401`.

**CA-04 — Données conservées**
Étant donné EMP-A avec une mise à jour soumise et un document
Après la réinitialisation
Alors la mise à jour, les changements et le document sont intacts.

**CA-05 — Déblocage**
Étant donné EMP-A bloqué après 5 échecs
Après la réinitialisation
Alors il peut immédiatement créer un nouveau mot de passe.

**CA-06 — Compte non activé**
Étant donné EMP-B sans compte
Alors le bouton n'est pas affiché
Et l'API répond `409 ACCOUNT_NOT_ACTIVATED`.

**CA-07 — Confirmation**
Quand l'admin touche « Annuler » dans la confirmation
Alors rien n'est modifié.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-22.1 | CA-01, CA-02, CA-05 | API | `tests/api/test_us22_reset_access.py` | hash effacé, compteur à zéro, `identify` → `CREATE_PASSWORD` |
| T-22.2 | CA-03 | API | `tests/api/test_us22_reset_access.py` | session employé existante → 401 |
| T-22.3 | CA-04 | API | `tests/api/test_us22_reset_access.py` | mise à jour, changements, documents inchangés |
| T-22.4 | CA-06 | API | `tests/api/test_us22_reset_access.py` | 409 sans compte |
| T-22.5 | CA-01, CA-06, CA-07 | Composant | `src/features/admin/ResetAccess.test.jsx` | bouton conditionnel, dialogue, message |

## Notes de réalisation

- Cas d'utilisation `ResetAccess` (module `admin`, `app/admin/application/reset_access.py`) : efface `password_hash`, remet le compteur d'échecs et le blocage à zéro (`register_success`), ferme toutes les sessions **employé** de la personne (`SessionService.close_all_for`). Aucun accès aux tables de mise à jour ni de documents.
- Seul un employé actif du CSV est accepté (sinon 404 `EMPLOYEE_NOT_FOUND`) : la ligne `admin` de la table des comptes (blocage de la connexion admin) n'est jamais touchée, ce que vérifie un test.
- `POST /api/admin/employees/{id}/reset-access` → `204` ; compte inexistant ou sans mot de passe (y compris une deuxième réinitialisation) → `409 ACCOUNT_NOT_ACTIVATED`. Seule route d'écriture de l'administration (test CA-04 de US-20) ; le test paramétré de US-15 la couvre (401/403).
- Écran : `features/admin/ResetAccess.jsx` remplace le bloc « Accès » du dossier : bouton « Réinitialiser l'accès » (compte activé seulement), confirmation dans le bloc (« Annuler » ou Échap ne modifient rien, boutons désactivés pendant l'envoi), message de succès, puis rechargement du dossier (« Compte non activé »). Erreur 409 affichée près du bouton ; 401 → connexion admin.
- Vérifié à 390 px et 1280 px par un test Playwright temporaire (réinitialisation de EMP-E : session ouverte coupée, `identify` → `CREATE_PASSWORD`).

## Hors périmètre

- Choix d'un mot de passe par l'admin.
- Historique des réinitialisations.
