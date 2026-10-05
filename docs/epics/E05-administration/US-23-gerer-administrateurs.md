# US-23 — Gérer les comptes administrateurs

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E05 Administration |
| **Priorité** | SHOULD |
| **PRD** | F-30 (nouvelle ; remplace « compte unique configuré sur le serveur » de F-22) |
| **Dépendances de code** | US-15 (connexion admin, sessions, blocage), base SQLite (`portail.db`) |
| **API** | `GET/POST /api/admin/admins`, `DELETE /api/admin/admins/{id}`, `POST /api/admin/me/password` |
| **Écran** | `/admin/administrateurs` (+ lien dans le menu du compte admin), étape « Nouveau mot de passe » de `/admin/connexion` |

## Récit

> En tant qu'administrateur, je veux que les comptes administrateurs soient enregistrés dans la base du portail et gérés depuis l'administration, afin de ne plus modifier de fichier de configuration et de pouvoir donner un accès personnel à chaque personne de l'équipe.

## Règles

- Les comptes administrateurs sont enregistrés dans la base (`portail.db`, table `admin_account`) : identifiant, hash Argon2 du mot de passe, compteur d'échecs et blocage, date de création, auteur, dernière connexion. Plus aucun mot de passe dans `backend\.env`.
- Tous les administrateurs ont les **mêmes droits** (lecture seule sur les dossiers, réinitialisation d'accès, gestion des administrateurs).
- **Premier administrateur :** tant qu'aucun compte n'existe, `.\run.ps1` le demande **dans la fenêtre PowerShell** (identifiant, mot de passe deux fois, jamais affiché) avant de lancer le portail. Il n'existe **aucune page web** pour créer le premier compte : personne ne peut le réclamer depuis Internet (tunnel). Une commande équivalente existe : `python -m app.tools.create_admin`.
- **Migration :** si la base n'a aucun administrateur et que `backend\.env` contient encore `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`, ce compte est importé au démarrage ; ces deux lignes deviennent inutiles.
- **Ajout :** un administrateur saisit un identifiant (3 à 50 caractères : lettres, chiffres, `.`, `-`, `_` ; unique sans tenir compte des majuscules) et un **mot de passe provisoire** (12 caractères minimum) qu'il transmet lui-même à la personne.
- **Mot de passe provisoire :** à sa première connexion, le nouvel administrateur doit choisir son propre mot de passe (12 caractères minimum) avant d'accéder au tableau de bord.
- **Changer son mot de passe :** depuis le menu du compte, en saisissant l'actuel puis le nouveau ; les autres sessions de ce compte sont fermées.
- **Suppression :** avec confirmation ; ses sessions sont fermées immédiatement. On ne peut pas se supprimer soi-même, ni supprimer le dernier administrateur.
- Le blocage de 15 minutes après 5 échecs (US-15) s'applique **par compte**. Un identifiant inconnu reçoit le même message qu'un mauvais mot de passe (« Identifiant ou mot de passe incorrect. »), sans révéler quels identifiants existent.
- Ces actions portent sur les **comptes administrateurs**, jamais sur les dossiers des employés : la règle « administrateur en lecture seule sur les dossiers » est inchangée.
- Les mots de passe et leurs hash ne sont jamais renvoyés par l'API ni écrits dans les journaux.

## Critères d'acceptation

**CA-01 — Premier administrateur au lancement**
Étant donné une base sans administrateur
Quand `.\run.ps1` est lancé
Alors il demande un identifiant et un mot de passe (12 caractères minimum, confirmation) dans la fenêtre PowerShell
Et le portail démarre ensuite, avec ce compte utilisable sur `/admin/connexion`.

**CA-02 — Aucune création du premier compte par le web**
Étant donné une base sans administrateur
Quand une requête tente de créer un compte par l'API sans session admin
Alors la réponse est `401` et aucun compte n'est créé.

**CA-03 — Migration depuis `.env`**
Étant donné une base sans administrateur et `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` renseignés
Quand le portail démarre
Alors ce compte est créé dans la base et la connexion fonctionne avec l'ancien mot de passe.

**CA-04 — Liste**
Quand un administrateur ouvre « Administrateurs »
Alors chaque compte est listé avec son identifiant, sa date de création et sa dernière connexion (ou « Jamais connecté »), le sien étant marqué « Vous ».

**CA-05 — Ajout**
Quand il ajoute `marie.pierre` avec un mot de passe provisoire valide
Alors le compte apparaît dans la liste
Et `marie.pierre` peut se connecter.

**CA-06 — Identifiant déjà pris ou invalide**
Quand l'identifiant existe déjà (même avec d'autres majuscules) ou ne respecte pas le format
Alors un message s'affiche sous le champ et aucun compte n'est créé.

**CA-07 — Changement du mot de passe provisoire**
Quand `marie.pierre` se connecte pour la première fois
Alors l'écran « Choisissez votre mot de passe » s'affiche
Et le tableau de bord n'est accessible qu'après l'avoir changé (l'API refuse les autres routes admin avec `403 PASSWORD_CHANGE_REQUIRED`).

**CA-08 — Changer son mot de passe**
Quand un administrateur saisit son mot de passe actuel et un nouveau mot de passe valide
Alors l'ancien ne fonctionne plus, le nouveau oui
Et ses autres sessions sont fermées.
Avec un mot de passe actuel erroné, rien ne change.

**CA-09 — Suppression**
Quand un administrateur supprime un autre compte et confirme
Alors le compte disparaît de la liste
Et la session ouverte de ce compte reçoit `401` à sa requête suivante.
« Annuler » ne change rien.

**CA-10 — Garde-fous**
Le bouton « Supprimer » n'apparaît ni sur son propre compte ni sur le dernier administrateur ; l'API refuse ces deux cas (`409`).

**CA-11 — Blocage par compte**
Quand 5 mauvais mots de passe sont saisis pour `marie.pierre`
Alors `marie.pierre` est bloquée 15 minutes
Et les autres administrateurs peuvent toujours se connecter.

**CA-12 — Aucune donnée sensible**
Aucune réponse de l'API ni aucun journal ne contient un mot de passe ou un hash.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-23.1 | CA-03, CA-11 | Unitaire | `tests/unit/test_admin_accounts.py` | migration, règles d'identifiant, blocage par compte |
| T-23.2 | CA-02, CA-04 → CA-12 | API | `tests/api/test_us23_admin_accounts.py` | liste, ajout, doublon, provisoire, changement, suppression, garde-fous, 401/403 |
| T-23.3 | CA-01 | Outil | `tests/test_create_admin_tool.py` | création du premier compte par la commande, refus si un compte existe déjà |
| T-23.4 | CA-04 → CA-10 | Composant | `src/features/admin/AdminAccountsPage.test.jsx`, `AdminLoginPage.test.jsx` | liste, ajout, erreurs, confirmation, nouveau mot de passe |
| T-23.5 | CA-05, CA-07 | E2E | `e2e/us23-administrateurs.spec.js` | ajout d'un compte, première connexion avec changement du mot de passe |

Les tests existants de US-15 passent sur la base (un compte admin de test créé par les fixtures) au lieu de la configuration.

## Impacts sur les documents validés (story validée le 2026-10-05, documents mis à jour)

- PRD : F-22 (« compte unique configuré sur le serveur ») → comptes enregistrés en base ; nouvelle F-30.
- Solution Design : §8 (compte unique dans la configuration), §11 (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` deviennent facultatifs, migration seulement), modèle de données (table `admin_account`).
- US-15 : règle « Compte unique défini dans la configuration ».
- `docs/guide-demarrage.md` §1 : plus de `hash_password --env`.

## Notes de réalisation

- Domaine (`app/auth/domain/admin.py`) : `AdminAccount`, `validate_username`, `validate_admin_password` ; le blocage est partagé avec les comptes employé (classe `Lockable` de `model.py`). Table `admin_account` (`SqlAdminAccountRepository`), unicité de l'identifiant par une colonne en minuscules ; la connexion compare l'identifiant exact (majuscules comprises, comme US-15).
- Cas d'utilisation (`app/auth/application/admin_accounts.py`) : `LoginAdmin` (blocage par compte, dernière connexion), `ImportConfiguredAdmin` (migration au démarrage du conteneur), `CreateFirstAdmin`, `ListAdmins`, `AddAdmin`, `DeleteAdmin`, `ChangeAdminPassword` (ferme toutes les sessions du compte et en rouvre une pour la requête en cours). L'ancien blocage stocké sous l'identifiant `admin` de la table des comptes employés n'est plus utilisé.
- Dépendances : `current_admin` refuse `403 PASSWORD_CHANGE_REQUIRED` tant que le mot de passe est provisoire ; `current_admin_pending` (« qui suis-je », changement de mot de passe, déconnexion) l'accepte. Une session dont le compte a été supprimé reçoit `401`.
- Routes : `GET /api/admin/me`, `POST /api/admin/me/password`, `GET/POST /api/admin/admins`, `DELETE /api/admin/admins/{id}` (`app/auth/api/admin_account_routes.py`) ; couvertes par le test paramétré de US-15 (401/403).
- Console : `python -m app.tools.create_admin [--if-missing]`, appelé par `run.ps1` avant le démarrage (le lancement s'arrête sans compte). `-Tunnel` n'exige plus de mot de passe dans `.env`.
- Écrans : `/admin/administrateurs` (`AdminAccountsPage.jsx` : cartes avec « Vous », « Mot de passe provisoire », dates locales, suppression avec confirmation dans la carte, formulaire d'ajout avec erreurs sous les champs) et `/admin/mot-de-passe` (`AdminPasswordPage.jsx` : « Choisissez votre mot de passe » sans retour possible, ou « Changer mon mot de passe »). Liens dans le menu du compte admin. `useLoader` renvoie vers `/admin/mot-de-passe` sur `PASSWORD_CHANGE_REQUIRED`.
- Vérifié à 390 px et 1280 px par un test Playwright temporaire. E2E : `e2e/us23-administrateurs.spec.js` (compte `e2e.marie`).
- `formatLocalDate` (`lib/format.js`) : jour local d'un horodatage (la date de création s'affichait en UTC).

## Hors périmètre

- Rôles différents entre administrateurs (lecture seule / gestion).
- Mot de passe administrateur oublié par **tous** les administrateurs : la commande `python -m app.tools.create_admin --reset` sur l'ordinateur du portail (à prévoir dans une story suivante si besoin).
- Envoi du mot de passe provisoire par email.
- Historique des actions des administrateurs.
- Base de données en ligne (Turso, PostgreSQL) : non nécessaire pour cette story, la base actuelle suffit.
