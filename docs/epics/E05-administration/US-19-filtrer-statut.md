# US-19 — Filtrer par statut

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E05 Administration |
| **Priorité** | SHOULD |
| **PRD** | F-26 |
| **Dépendances de code** | Liste des employés (US-17) |
| **API** | `GET /api/admin/employees?status=UPDATED\|NOT_UPDATED` |
| **Écran** | Puces de filtre sous la barre de recherche de `/admin/employes` |

## Récit

> En tant qu'administrateur, je veux filtrer la liste par statut afin de voir rapidement qui n'a pas encore effectué sa mise à jour.

## Règles

- Trois puces : « Tous » (par défaut), « Effectuée », « Non effectuée », chacune avec son nombre.
- Le filtre se combine avec la recherche (US-18) et est conservé dans l'URL (`?status=`).
- Une valeur de `status` inconnue → `422`.

## Critères d'acceptation

**CA-01 — Filtre « Non effectuée »**
Étant donné EMP-A soumis, EMP-B en brouillon
Quand l'admin choisit « Non effectuée »
Alors EMP-B et les autres employés non soumis sont listés, mais pas EMP-A.

**CA-02 — Filtre « Effectuée »**
Quand il choisit « Effectuée »
Alors seul EMP-A est listé.

**CA-03 — Combinaison avec la recherche**
Étant donné EMP-H1 soumis et EMP-H2 non soumis
Quand il tape « pierre » et choisit « Effectuée »
Alors seul EMP-H1 est listé.

**CA-04 — Compteurs**
Les puces affichent le nombre d'employés de chaque statut, en tenant compte de la recherche en cours.

**CA-05 — Lien depuis le tableau de bord**
Quand la liste est ouverte avec `?status=NOT_UPDATED`
Alors la puce « Non effectuée » est sélectionnée.

**CA-06 — Valeur invalide**
Quand l'API reçoit `status=DRAFT`
Alors la réponse est `422`.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-19.1 | CA-01 → CA-04, CA-06 | API | `tests/api/test_us19_status_filter.py` | filtres, combinaison, compteurs, 422 |
| T-19.2 | CA-01, CA-04, CA-05 | Composant | `src/features/admin/StatusFilter.test.jsx` | puces, compteurs, lecture de l'URL |

## Hors périmètre

- Filtres par agence ou département.
