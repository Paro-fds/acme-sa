# US-17 — Consulter la liste des employés

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E05 Administration |
| **Priorité** | MUST |
| **PRD** | F-24 |
| **Dépendances de code** | `EmployeeRepository`, table `employee_update`, session admin |
| **API** | `GET /api/admin/employees?page=&page_size=` |
| **Écran** | `/admin/employes` |

## Récit

> En tant qu'administrateur, je veux voir la liste des employés et leur statut de mise à jour.

## Règles

- Employés actifs uniquement, triés par nom puis prénom.
- Pagination : 20 par page ; affichage « X employés ».
- Chaque ligne : nom, prénom, matricule, agence, pastille de statut (Effectuée / Non effectuée).
- Si un nouveau nom ou prénom a été soumis : nouveau nom en principal, ancien en dessous en gris (SD-03).
- Mobile : liste de cartes avec chevron ; desktop (≥ 1024 px) : tableau.
- Toucher une ligne ouvre le dossier (US-20).

## Critères d'acceptation

**CA-01 — Liste**
Étant donné le CSV de test
Quand l'admin ouvre la liste
Alors il voit les 7 employés actifs triés par nom, avec leur statut
Et « 7 employés ».

**CA-02 — Pagination**
Étant donné 45 employés actifs (fixture dédiée)
Alors la page 1 affiche 20 employés, la page 3 en affiche 5
Et les boutons « Précédent / Suivant » sont désactivés aux extrémités.

**CA-03 — Nom modifié**
Étant donné EMP-A ayant soumis le nom « JOSEPH-PAUL »
Alors sa ligne affiche « JOSEPH-PAUL Jean » et, en dessous en gris, « anciennement JOSEPH ».

**CA-04 — Affichage adapté**
À 390 px la liste est affichée en cartes ; à 1280 px en tableau.

**CA-05 — Ouverture d'un dossier**
Quand l'admin touche la ligne d'EMP-A
Alors le dossier d'EMP-A s'ouvre.

**CA-06 — Lecture seule**
Aucune action de modification n'est proposée dans la liste.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-17.1 | CA-01, CA-02 | API | `tests/api/test_us17_employee_list.py` | tri, pagination, total, statut, inactifs absents |
| T-17.2 | CA-03 | API | `tests/api/test_us17_employee_list.py` | champs `display_name` / `previous_name` |
| T-17.3 | CA-01, CA-03, CA-05, CA-06 | Composant | `src/features/admin/EmployeeListPage.test.jsx` | lignes, pastilles, ancien nom, navigation |
| T-17.4 | CA-04 | E2E | `e2e/us17-liste-admin.spec.js` | cartes à 390 px, tableau à 1280 px |

## Notes de réalisation

- API : chaque ligne contient aussi `display_name` (« NOM Prénom » actuels) et `previous_name` : les parties du nom remplacées par une mise à jour **soumise**, dans l'ordre nom puis prénom (« JOSEPH », « Rosé » ou « JOSEPH Jean ») ; `null` sinon. Un brouillon ne change ni le nom affiché ni le statut. La réponse contient `page_count` (au moins 1). Une page au-delà de la dernière renvoie une liste vide ; `page` < 1 ou `page_size` hors 1–100 → 422.
- Le tri utilise le nom actuel (nouveau nom si soumis).
- Écran : la page est dans l'adresse (`?page=2`) ; les autres paramètres (`?status=` de US-19) sont conservés. Cartes et tableau sont tous deux dans le DOM, le CSS (`lg:`) choisit ; dans le tableau, toute la ligne est cliquable et le nom est le lien accessible. `Page` accepte `wide` (contenu jusqu'à `max-w-6xl`) pour le tableau.
- CA-05 : les lignes mènent à `/admin/employes/:id` ; l'écran du dossier est réalisé dans **US-20** (en attendant, l'adresse inconnue renvoie à l'accueil).
- E2E : `e2e/us17-liste-admin.spec.js` (cartes à 390 px, tableau à 1280 px, aucun défilement horizontal).

## Hors périmètre

- Export CSV/Excel de la liste.
- Tri par colonne.
