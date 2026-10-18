---
created: 2026-10-18T09:00:00Z
updated: 2026-10-18T09:00:00Z
---

# ws-tech-01 — Accès et compte

**Workstream :** epic D1 « Accès et compte » (`docs/lot0/1-specifications/epics/`).
**Dernière story close :** US-125 (déconnexion après 15 minutes sans activité). Avant : US-101, US-103, US-107, US-108, US-111, US-112. **En cours :** US-102 (envoi réel des codes). **Pas encore :** US-106.
**Code :** module backend `app/auth` (4 couches) ; frontend `features/auth/`, `features/admin/` (connexion, comptes, double authentification), `lib/useLoader.js`, `lib/useLogout.js`, `lib/useIdleLogout.js`, `api/auth.js`, `api/session.js`.

Ce fichier répond aux trois questions du README de `technical-specs/`.

---

## 1. Que doit savoir un nouvel ingénieur pour modifier ceci sans casser un invariant ?

### Les sessions

- **Une session = une ligne de la table `session`**, retrouvée par le **condensé SHA-256** du jeton (`token_hash`) ; le jeton lui-même n'est jamais stocké. Il voyage dans le cookie `acme_session` : `HttpOnly`, `SameSite=Strict`, `Secure` en HTTPS, chemin `/`.
- **Trois types de session** (`SubjectType`) :

  | Type | Ouvert par | Ouvre |
  |---|---|---|
  | `EMPLOYEE` | connexion employé (`LoginEmployee`, `RegisterPassword`) | les routes `/api/me/*` |
  | `ADMIN_MFA` | mot de passe RH vérifié, code attendu (US-102) | seulement les écrans de double authentification (10 minutes) |
  | `ADMIN` | code vérifié, ou mot de passe seul si `ADMIN_MFA_REQUIRED=false` (US-112) | les routes `/api/admin/*` selon le rôle |

- **Expiration glissante** (`SessionService.authenticate`, `app/auth/application/sessions.py`) : **chaque** requête authentifiée repousse la fin de la session de sa durée complète ; une session expirée est supprimée et répond `401 SESSION_EXPIRED`. Durées : `EMPLOYEE_SESSION_MINUTES` et `ADMIN_SESSION_MINUTES`, **15 par défaut** (US-125).
- **Conséquence à retenir :** tout ce qui appelle une route authentifiée garde la session ouverte. **Ne jamais ajouter d'appel automatique** (rafraîchissement périodique, sondage des notifications…) : la session ne se fermerait plus jamais, et US-125 CA-05 serait cassé. Un écran qui veut se mettre à jour le fait à l'action de la personne.
- **L'inactivité vue par l'écran** (US-125, `lib/useIdleLogout.js`) : branchée dans `Page` pour `account` (employé) et `account="admin"`. Un écran connecté qui n'utilise pas `Page` avec `account` échappe à la déconnexion : tout nouvel écran connecté passe par `Page`.
- **Les tests qui avancent l'horloge de 15 minutes ou plus avec une session ouverte la voient expirer.** Pour ordonner des événements dans le temps, avancer de quelques minutes seulement.

### Les autorisations

- **Un employé n'accède à ses données que par `/api/me/*`**, jamais par un identifiant dans l'adresse. Son identifiant vient uniquement de la session (`current_employee_id`).
- **Côté gestion, les dépendances de `app/auth/api/dependencies.py` sont la seule porte** :
  - `current_admin_pending` : compte RH connecté, même avec un mot de passe provisoire. Réservé à « qui suis-je », au changement de mot de passe, à la déconnexion et à `keep-alive`.
  - `current_admin_account` / `current_admin` : refuse un mot de passe provisoire (`403 PASSWORD_CHANGE_REQUIRED`).
  - `require_admin`, `require_not_readonly`, `require_roles(...)`, `require_validator`, `require_case_reader`, `require_referential_editor` : les rôles.
- **Le test `tests/api/test_us15_admin_auth.py` parcourt toutes les routes `/api/admin/*`** : 401 sans session, 403 avec une session employé. Une nouvelle route est couverte d'office ; une route qui prend un `{id}` reçoit `1001`.
- **Les droits affichés à l'écran (`features/admin/roles.js`) ne protègent rien** : ils cachent des liens. La règle est côté serveur ; les deux tableaux doivent rester d'accord.
- **Réseau des bureaux** (US-102 CA-06) : un middleware refuse toute route `/api/admin/*`, connexion comprise, hors des réseaux configurés (`rh_networks`). Sans réseau configuré, aucune restriction (poste du développeur, démonstrateur).

### Les connexions

- **Un seul message d'échec** pour l'employé (`INVALID_CREDENTIALS`) : identité inconnue, pas encore de mot de passe ou mot de passe faux répondent pareil (US-03 CA-03, US-101 CA-03). Ne jamais distinguer ces cas dans l'API ni à l'écran. Seule exception : une identité qui correspond à plusieurs employés (`IDENTITY_AMBIGUOUS`).
- **Blocage** (`app/auth/domain/lockout.py`) : 5 erreurs consécutives bloquent le compte 15 minutes ; un succès remet le compteur à zéro. Les codes de double authentification faux comptent comme des mots de passe faux.
- **L'identité** (`find_employee`) se compare sans accents ni majuscules ; plusieurs employés possibles → `IDENTITY_AMBIGUOUS` (écran `/connexion/homonyme`), jamais un choix arbitraire.
- **Mots de passe** : Argon2 (`argon2_hasher.py`), jamais renvoyés ni journalisés.
- **Il reste toujours un Administrateur actif** : supprimer, désactiver ou changer le rôle du dernier est refusé (`LAST_ADMIN`, `LAST_ADMIN_ACTIVE`).

---

## 2. Quel est le contrat de données exact ?

### Cookie et session

| Élément | Valeur |
|---|---|
| Nom du cookie | `acme_session` |
| Attributs | `HttpOnly`, `SameSite=Strict`, `Secure` si HTTPS, `path=/` |
| Jeton | `secrets.token_urlsafe(32)` |
| Stocké en base | `token_hash` = SHA-256 hexadécimal du jeton, `subject_type`, `subject_id`, `created_at`, `last_seen_at`, `expires_at` |
| Durées | `EMPLOYEE` : `EMPLOYEE_SESSION_MINUTES` (15) ; `ADMIN` : `ADMIN_SESSION_MINUTES` (15) ; `ADMIN_MFA` : 10 minutes fixes |

### Routes de session (US-125)

| Route | Accès | Réponse |
|---|---|---|
| `GET /api/auth/session-options` | publique | `{"employee_idle_minutes": 15, "admin_idle_minutes": 15}` |
| `POST /api/auth/keep-alive` | session `EMPLOYEE` | `204` (session prolongée) ou `401` |
| `POST /api/admin/auth/keep-alive` | session `ADMIN` (mot de passe provisoire accepté) | `204`, `401`, ou `403` avec une session employé |

### Côté écran (US-125)

| Élément | Valeur |
|---|---|
| Clé partagée entre onglets | `localStorage["acme-last-activity"]` = horodatage en millisecondes |
| Événements comptés | `pointerdown`, `keydown`, `scroll`, `wheel`, `touchstart` (sur `window`, en capture) |
| Vérification | toutes les 15 secondes |
| Signal au serveur | au plus une fois par minute, et seulement s'il y a eu une activité depuis le dernier |
| Fin du délai | `POST` de déconnexion de l'espace, puis retour à `/connexion` ou `/admin/connexion` avec `state.notice` = « Vous avez été déconnecté après N minutes sans activité. Reconnectez-vous. » |
| Appels | `api/session.js` (`getSessionOptions`, `keepAlive(space)`, `endSession(space)`), `space` = `employee` ou `admin` |

### Erreurs (format commun `{"error": {"code", "message", "field"?}}`)

| Code | HTTP | Quand |
|---|---|---|
| `NOT_AUTHENTICATED` | 401 | pas de session, ou session d'un autre type |
| `SESSION_EXPIRED` | 401 | session trouvée mais expirée (elle est alors supprimée) |
| `MFA_REQUIRED` | 401 | session `ADMIN_MFA` sur une route qui demande `ADMIN` |
| `ADMIN_ONLY` | 403 | session employé sur une route de gestion |
| `INSUFFICIENT_ROLE` | 403 | rôle insuffisant |
| `PASSWORD_CHANGE_REQUIRED` | 403 | mot de passe provisoire |
| `INVALID_CREDENTIALS` | 401 | échec de connexion : identité inconnue, pas de mot de passe ou mot de passe faux |
| `IDENTITY_AMBIGUOUS` | 409 | plusieurs employés possibles pour cette identité (écran `/connexion/homonyme`) |
| `ACCOUNT_LOCKED` | 423 | compte bloqué ; `retry_after` = secondes restantes |

L'écran réagit à ces codes à un seul endroit : `useLoader` et `useUnauthorizedRedirect` (`lib/useLoader.js`) renvoient un `401` vers la connexion, `MFA_REQUIRED` vers la double authentification et `PASSWORD_CHANGE_REQUIRED` vers le changement de mot de passe.

### Rôles de l'espace de gestion

`ADMIN` (Administrateur), `AGENT_RH` (Agent RH), `REFERENTIAL` (Responsable du référentiel), `READONLY` (Lecture seule), dans `app/auth/domain/admin.py` (`AdminRole`, `ROLE_LABELS`).

---

## 3. Quelles décisions peu évidentes ne faut-il pas « corriger » ?

| Décision | Pourquoi | Ce qu'il ne faut pas faire |
|---|---|---|
| Sessions en base, pas de JWT | une session se ferme vraiment (déconnexion, compte supprimé, inactivité, réinitialisation d'accès) | ne pas passer à un jeton autoporteur « pour éviter une lecture en base » |
| Seul le condensé du jeton est stocké | une fuite de la base ne donne aucune session utilisable | ne pas stocker le jeton en clair pour « déboguer » |
| Expiration glissante sur **toute** requête authentifiée | simple et sûr : l'activité réelle passe par des requêtes | ne pas ajouter de rafraîchissement automatique, il garderait les sessions ouvertes indéfiniment |
| Le signal d'activité de l'écran (`keep-alive`) existe en plus | une saisie longue sans enregistrement ne fait aucune requête : sans ce signal, la personne serait coupée en pleine saisie (US-125 CA-02) | ne pas le supprimer en pensant que l'expiration glissante suffit ; ne pas l'envoyer sans activité |
| 15 minutes pour les deux espaces, sans avertissement | choix de l'utilisateur du 2026-10-17 | ne pas remettre 30 / 120, ni ajouter un avertissement, sans nouvelle décision |
| Appels de session dans `api/session.js`, pas dans `api/auth.js` | `Page` est utilisé par tous les écrans connectés ; beaucoup de tests simulent `auth.js` avec seulement quelques fonctions, et une fonction absente casse le chargement du module | ne pas « regrouper » ces appels dans `auth.js` |
| Un seul message d'échec de connexion employé | ne pas révéler qui est employé ni qui a déjà un mot de passe | ne pas renvoyer un message plus « précis » |
| Session `ADMIN_MFA` distincte de `ADMIN` | le mot de passe seul ne doit ouvrir aucune donnée tant que le code n'est pas vérifié | ne pas ouvrir directement une session `ADMIN` puis « vérifier le code plus tard » |
| `ADMIN_MFA_REQUIRED=false` par défaut (US-112) | la double authentification attend l'envoi réel des codes (US-102, D-41) ; le réglage la rallume sans changer le code | ne pas supprimer le chemin avec code : il reviendra avec US-102 |
| Les tests backend forcent `ADMIN_MFA_REQUIRED=true` (`conftest`), ceux d'US-112 le coupent | les règles de la double authentification restent testées | ne pas aligner `conftest` sur la valeur par défaut |
| Restriction au réseau des bureaux dans l'application **et** en amont | défense en profondeur ; sans réseau configuré, aucune restriction pour le poste du développeur | ne pas retirer le middleware sous prétexte que le pare-feu le fait |
| Toujours un Administrateur actif | sinon plus personne ne peut gérer les comptes | ne pas permettre de supprimer ou rétrograder le dernier |

---

## Tests

- Sessions et inactivité : `tests/api/test_us125_inactivite.py`, `tests/api/test_us03_login.py` (CA-07), `tests/api/test_us15_admin_auth.py` (CA-07 et toutes les routes `/api/admin/*`) ; écran `src/lib/useIdleLogout.test.jsx` ; E2E `e2e/us125-inactivite.spec.js` (horloge simulée par `page.clock`).
- Rôles : `tests/api/test_us108_droits_par_role.py`, `src/features/admin/AdminLayout.test.jsx`.
- Blocage : `tests/unit/test_lockout_policy.py`.
