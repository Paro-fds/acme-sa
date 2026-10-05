# US-24 — Modifier à nouveau son dossier après l'envoi

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E03 Mise à jour |
| **Priorité** | SHOULD |
| **PRD** | F-31 (nouvelle) ; remplace la décision **D-04** (« une soumission par employé ») |
| **Dépendances de code** | US-09 → US-12 (brouillon, vérification, soumission), US-13/US-14 (documents), US-20 (dossier admin) |
| **API** | `POST /api/me/update/reopen`, `POST /api/me/update/discard` ; `GET /api/me/update` enrichi |
| **Écran** | Carte d'état de `/profil` (« Modifier à nouveau »), étapes `/mise-a-jour/*` |

## Récit

> En tant qu'employé, je veux pouvoir corriger mon dossier après l'avoir envoyé (erreur de saisie, nouveau numéro, nouveau document) afin que l'administration dispose toujours de mes informations à jour.

## Règles

- Après un envoi, la carte d'état du profil propose **« Modifier à nouveau »**. Le nombre de nouveaux envois n'est pas limité.
- « Modifier à nouveau » ouvre l'étape 1 avec les **valeurs du dernier envoi** ; le parcours est le même qu'au premier envoi (brouillon automatique, documents, vérification, confirmation).
- **Ce que voit l'administration pendant ce temps : la dernière version envoyée**, inchangée (valeurs, changements « Ancienne → Nouvelle », date d'envoi) ; le statut reste « Mise à jour effectuée ». Le brouillon en cours n'est **jamais** visible, comme au premier envoi.
- **Nouvel envoi :** il remplace la version précédente. L'administration voit les nouvelles valeurs, toujours comparées aux valeurs d'origine du fichier des employés, et la date du dernier envoi (« Mise à jour effectuée le … »). Pas d'historique des envois précédents.
- **Abandon :** tant que le nouvel envoi n'est pas fait, « Annuler les modifications » efface le brouillon et le dossier revient à la dernière version envoyée (avec confirmation).
- **Documents :** pendant la modification, l'employé peut de nouveau ajouter et supprimer des documents. Les documents étant rattachés au profil (SD-02), l'administration voit les ajouts et suppressions immédiatement (comme pendant le premier brouillon, US-21).
- **Identification :** l'employé peut toujours se connecter avec son nom d'origine ou le nom de son **dernier envoi** (D-03) ; un nom modifié dans le brouillon ne sert pas tant qu'il n'est pas envoyé.
- Le tableau de bord admin ne change pas : un employé qui a envoyé au moins une fois compte dans « Mise à jour effectuée ».

## Critères d'acceptation

**CA-01 — Bouton « Modifier à nouveau »**
Étant donné EMP-A ayant envoyé sa mise à jour
Quand il ouvre son profil
Alors la carte d'état indique « Mise à jour envoyée le … » et propose « Modifier à nouveau ».

**CA-02 — Reprise des valeurs envoyées**
Quand il touche « Modifier à nouveau »
Alors l'étape 1 s'ouvre avec les valeurs de son dernier envoi (par exemple le téléphone `+509 3722 2222` envoyé, et non celui du fichier).

**CA-03 — Administration inchangée pendant la modification**
Étant donné EMP-A en train de modifier (téléphone changé en `+509 3722 3333` dans le brouillon)
Alors le dossier admin affiche toujours `+509 3722 2222`, la date du premier envoi et « Mise à jour effectuée »
Et `+509 3722 3333` n'apparaît dans aucune réponse de l'API admin.

**CA-04 — Nouvel envoi**
Quand EMP-A envoie de nouveau
Alors le dossier admin affiche `+509 3722 3333`, le changement « `+509 3722 1111` → `+509 3722 3333` » (valeur d'origine du fichier) et la date du nouvel envoi
Et le profil de l'employé affiche ses nouvelles valeurs.

**CA-05 — Annuler les modifications**
Quand EMP-A touche « Annuler les modifications » puis confirme
Alors le brouillon est effacé, le profil affiche de nouveau les valeurs du dernier envoi et « Modifier à nouveau »
Et le dossier admin n'a pas changé.

**CA-06 — Revenir à la valeur d'origine**
Quand EMP-A remet son téléphone à la valeur du fichier puis envoie
Alors ce champ n'apparaît plus dans les changements du dossier admin (pas de faux changement).

**CA-07 — Documents**
Pendant la modification, l'ajout et la suppression de documents sont de nouveau possibles ; après le nouvel envoi, ils sont de nouveau en lecture seule.

**CA-08 — Identification**
Étant donné EMP-A ayant envoyé le nom `JOSEPH-PAUL`, puis modifiant son nom en `PAUL` dans un brouillon non envoyé
Alors il peut s'identifier avec `JOSEPH` ou `JOSEPH-PAUL`, mais pas avec `PAUL`.

**CA-09 — Pas de réouverture sans envoi**
Quand un employé qui n'a jamais envoyé appelle `POST /api/me/update/reopen`
Alors la réponse est `409` et rien ne change.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-24.1 | CA-02, CA-04 → CA-06, CA-09 | Unitaire | `tests/unit/test_reopen_update.py` | réouverture, nouvel envoi, abandon, faux changement, refus sans envoi |
| T-24.2 | CA-01 → CA-09 | API | `tests/api/test_us24_reopen.py` | états, dossier admin pendant et après, documents, identification |
| T-24.3 | CA-01, CA-05 | Composant | `src/features/profile/UpdateStateCard.test.jsx`, `ProfilePage.test.jsx` | bouton, confirmation d'abandon |
| T-24.4 | CA-02 → CA-04 | E2E | `e2e/us24-modifier-a-nouveau.spec.js` | parcours complet : envoi, modification, admin inchangé, nouvel envoi |

## Notes de réalisation

- Domaine (`EmployeeUpdate`) : `submitted_changes` (copie du dernier envoi), `has_submission`, `is_reopened`, `reopen()`, `discard()` ; `submit()` remplace la copie. Une réponse « Non » n'est plus possible après un envoi. Statut admin `UPDATED` = `has_submission`.
- Base : table `employee_submitted_change` ; un envoi enregistré avant US-24 (sans copie) est relu avec ses changements comme copie (aucune migration à faire).
- Lecture de la copie : `current_values` (profil, dossier et liste admin, recherche), identification (D-03), `GetEmployeeFolder` (changements et date). Le brouillon reste dans `employee_change` ; `GET /api/me/update` renvoie `reopened` et la date du dernier envoi.
- Routes `POST /api/me/update/reopen` (409 `UPDATE_NOT_SUBMITTED` sans envoi) et `POST /api/me/update/discard` (409 `NO_REOPENED_UPDATE`). Documents : `ensure_update_open` accepte de nouveau l'ajout et la suppression pendant la modification.
- Écran : carte d'état (`UpdateStateCard`) : « Mise à jour envoyée le … » + « Modifier à nouveau » ; pendant la modification : « Vous modifiez votre dossier », « Dernier envoi le … », « Reprendre la modification », « Annuler les modifications » avec confirmation (« Continuer » / « Tout annuler »). Confirmation d'envoi : « Vous pourrez modifier à nouveau votre dossier depuis votre profil ».
- Le test US-06 CA-03 (« aucun bouton de modification » après l'envoi) suit la nouvelle règle : seule action, « Modifier à nouveau ».
- E2E : `e2e/us24-modifier-a-nouveau.spec.js` (EMP-B, après us12 ; fait lui-même le premier envoi s'il est lancé seul). Écran vérifié à 390 px.

## Notes techniques (validées)

- La mise à jour garde une **copie du dernier envoi** (valeurs et date) à côté du brouillon : l'administration et l'identification lisent cette copie, l'employé travaille sur le brouillon. Un nouvel envoi remplace la copie ; un abandon supprime le brouillon.
- `UPDATED` côté admin = « au moins un envoi » (au lieu de « statut SUBMITTED »).

## Impacts sur les documents validés (story validée le 2026-10-05, documents mis à jour)

- PRD : D-04 (« non pour le MVP ») → envois successifs autorisés ; nouvelle F-31 ; F-20 (suppression de documents « tant que la mise à jour n'est pas soumise » → « tant que la modification en cours n'est pas envoyée »).
- Solution Design : §6 et §6.2 (« Après `SUBMITTED`, plus aucune écriture n'est acceptée »), §6.1 (statut admin), §10 (routes `reopen` et `discard`), redirections de §11.
- US-12 (soumission définitive), US-14 (suppression de documents), US-20 (dossier admin : dernier envoi).
- `docs/scenario-test-directeur.md` : étape facultative « modifier à nouveau ».

## Hors périmètre

- Historique des envois précédents côté administration.
- Notification de l'administration lors d'un nouvel envoi.
- Date limite de modification (fin de campagne).
