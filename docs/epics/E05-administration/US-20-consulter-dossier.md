# US-20 — Consulter le dossier d'un employé

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E05 Administration |
| **Priorité** | MUST |
| **PRD** | F-27 |
| **Dépendances de code** | `EmployeeRepository`, tables `employee_update` / `employee_change` / `employee_account` |
| **API** | `GET /api/admin/employees/{id}` |
| **Écran** | `/admin/employes/:id` |

## Récit

> En tant qu'administrateur, je veux consulter le dossier d'un employé afin de vérifier les informations qu'il a fournies.

## Règles

- Badge « Lecture seule » en haut ; **aucun champ éditable ni bouton de modification**.
- En-tête : nom, prénom, matricule, agence, poste, pastille de statut.
- Bloc « Mise à jour » :
  - effectuée → date de soumission + liste des changements « Ancienne → Nouvelle » ;
  - non effectuée → « Mise à jour non effectuée », et la mention « L'employé a indiqué ne pas souhaiter mettre à jour son dossier » s'il a répondu « Non ». Les brouillons ne sont **pas** affichés.
- Bloc « Informations » : mêmes sections que le profil employé (US-05), avec les nouvelles valeurs si soumises.
- Bloc « Accès » : « Compte activé » / « Compte non activé » (mot de passe créé ou non).
- Bloc « Documents » : US-21.

## Critères d'acceptation

**CA-01 — Dossier d'un employé ayant soumis**
Étant donné EMP-A ayant soumis téléphone et adresse
Quand l'admin ouvre son dossier
Alors il voit « Mise à jour effectuée le JJ/MM/AAAA à HH:MM »
Et les deux changements avec ancienne et nouvelle valeur.

**CA-02 — Brouillon non visible**
Étant donné EMP-B avec un brouillon
Quand l'admin ouvre son dossier
Alors il voit « Mise à jour non effectuée »
Et aucune valeur du brouillon n'est renvoyée par l'API ni affichée.

**CA-03 — Réponse « Non »**
Étant donné EMP-H1 ayant répondu « Non »
Alors la mention « L'employé a indiqué ne pas souhaiter mettre à jour son dossier » s'affiche.

**CA-04 — Lecture seule**
L'écran ne contient aucun champ de saisie ni bouton de modification du dossier
Et aucune route `PUT`, `PATCH` ou `DELETE` n'existe sous `/api/admin/employees`.

**CA-05 — Aucune donnée sensible**
La réponse ne contient aucune colonne exclue du CSV.

**CA-06 — Employé inconnu ou inactif**
Quand l'admin demande l'id d'EMP-I ou un id inexistant
Alors la réponse est `404` et l'écran affiche « Employé introuvable » avec un lien vers la liste.

**CA-07 — État du compte**
Étant donné EMP-A avec mot de passe et EMP-B sans
Alors le dossier d'EMP-A indique « Compte activé » et celui d'EMP-B « Compte non activé ».

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-20.1 | CA-01, CA-03, CA-07 | API | `tests/api/test_us20_admin_employee.py` | contenu du dossier selon la situation |
| T-20.2 | CA-02 | API | `tests/api/test_us20_admin_employee.py` | brouillon : valeurs absentes de la réponse |
| T-20.3 | CA-04 | API | `tests/api/test_us20_admin_employee.py` | inspection des routes de l'application : aucune méthode d'écriture sur `/api/admin/employees` hormis `reset-access` |
| T-20.4 | CA-05, CA-06 | API | `tests/api/test_us20_admin_employee.py` | colonnes exclues absentes ; 404 |
| T-20.5 | CA-01 → CA-04, CA-06 | Composant | `src/features/admin/EmployeeDetailPage.test.jsx` | blocs, mentions, absence de champ de saisie, page introuvable |

## Notes de réalisation

- Cas d'utilisation `GetEmployeeFolder` (module `admin`) : valeurs actuelles (nouvelles si soumises), `status`, `submitted_at`, `declined` (réponse « Non » sans soumission), `changes` (**uniquement** si soumise, dans l'ordre du registre des champs), `account_activated` (mot de passe créé). Un brouillon ne laisse aucune trace dans la réponse (ni valeur, ni date, ni « DRAFT »). Inactif, inconnu ou `admin` → 404 `EMPLOYEE_NOT_FOUND`.
- `EmployeeFolderOut` liste explicitement les champs exposés (aucune colonne exclue, aucun hash).
- CA-04 : le test lit le schéma OpenAPI ; seule méthode d'écriture tolérée sous `/api/admin/employees` : `POST …/reset-access` (US-22). Une requête `POST/PUT/PATCH/DELETE` sur un dossier est refusée (404/405) et ne change rien.
- Écran `/admin/employes/:id` (`features/admin/EmployeeDetailPage.jsx`) : en-tête (initiales, badge « Lecture seule », nom + « anciennement … », matricule · agence · poste, pastille), blocs « Mise à jour » (`ValueComparison`), Identité / Coordonnées / Informations professionnelles (sections partagées avec le profil employé : `features/profile/profileSections.js`, `InfoSection showEditable={false}`), « Accès ». Le bloc « Documents » viendra avec US-21.
- La liste transmet sa recherche et son filtre au dossier (`state.listSearch`) : le bouton retour de l'en-tête y ramène, comme le retour arrière du navigateur. E2E : `us18-recherche-admin.spec.js` (CA-11 de US-18) et `walking-skeleton.spec.js` (dossier de JOSEPH Jean avec son changement).

## Hors périmètre

- Modification du dossier par l'admin (WON'T V1).
- Validation / rejet de la mise à jour.
