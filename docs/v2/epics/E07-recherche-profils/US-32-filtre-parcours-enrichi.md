# US-32 — Filtrer les employés au parcours enrichi

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E07 Recherche de profils |
| **Priorité** | MUST |
| **PRD** | F-40, RM-V2-07, D-14 |
| **Dépendances de code** | US-17 (liste), US-18 (recherche), US-19 (filtre de statut), US-25 (`career_profile`, `CareerRepository.profiles()`) |
| **API** | `GET /api/admin/employees?…&career=ENRICHED` (paramètre ajouté) |
| **Écran** | `/admin/employes` : bascule « Parcours enrichi » (`CareerFilter`), date « Parcours modifié le … » |

## Récit

> En tant qu'administrateur, je veux afficher seulement les employés qui ont enrichi leur parcours, les plus récents en premier, afin de repérer ceux qui se sont formés ou ont obtenu un nouveau diplôme.

## Règles

- **Parcours enrichi** (D-14, RM-V2-07) : `career_profile.entry_count ≥ 1`. Un employé dont le dernier élément a été supprimé ne l'est plus.
- `career=ENRICHED` est **combinable** avec `search` et `status` ; sans ce paramètre, la liste est inchangée (tri par nom).
- Avec le filtre : tri par `career_updated_at` **décroissant**, puis nom.
- Chaque employé de la réponse porte `career_updated_at` (null si parcours vide) ; la réponse ajoute `career_counts: {ENRICHED: n}` calculé avec les mêmes `search` et `status`.
- Écran : bascule « Parcours enrichi (n) » à côté de `StatusFilter`, conservée dans l'adresse (`?career=ENRICHED`) avec les autres paramètres ; retour à la page 1 au changement ; « Parcours modifié le 12 oct. 2026 » sur la carte (mobile) et dans une colonne du tableau (≥ 1024 px).
- Valeur de `career` inconnue : ignorée (comme un `status` inconnu).

## Critères d'acceptation

**CA-01 — Filtre**
Étant donné les parcours P-A (modifié le 2026-10-12), P-B (modifié le 2026-10-14) et P-I (inactif)
Quand l'administrateur active « Parcours enrichi »
Alors la liste contient EMP-B puis EMP-A, et rien d'autre
Et la bascule indique « Parcours enrichi (2) ».

**CA-02 — Date affichée**
Alors chaque ligne affiche « Parcours modifié le … » à la date de `last_changed_at`
Et les employés sans parcours n'affichent pas cette mention dans la liste complète.

**CA-03 — Combinaison**
Quand le filtre est combiné avec `status=UPDATED` et/ou une recherche « baptiste »
Alors seuls les employés qui remplissent toutes les conditions sont listés
Et `career_counts` tient compte de la recherche et du statut.

**CA-04 — Suppression et modification**
Étant donné EMP-B qui supprime son seul élément restant
Alors il ne figure plus dans la liste filtrée
Et étant donné EMP-A qui modifie un élément, il remonte en tête.

**CA-05 — Adresse**
Quand l'administrateur active le filtre, change de page, ouvre un dossier puis revient
Alors `?career=ENRICHED` et la page sont conservés.

**CA-06 — Liste inchangée sans filtre**
Sans `career`, la liste, le tri, les compteurs `counts` et la pagination sont identiques à ceux du MVP (tests d'US-17 → US-19 verts).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-32.1 | CA-01, CA-03, CA-04 | Unitaire | `tests/unit/test_list_employees_career.py` | filtre, tri, combinaison, comptage avec dépôts en mémoire |
| T-32.2 | CA-01 → CA-04, CA-06 | API | `tests/api/test_us32_career_filter.py` | paramètre, `career_updated_at`, `career_counts`, inactif exclu |
| T-32.3 | CA-01, CA-02, CA-05 | Composant | `src/features/admin/CareerFilter.test.jsx`, `EmployeeListPage.test.jsx` | bascule, compteur, adresse, date affichée (cartes et tableau) |

## Hors périmètre

- Filtre « modifié depuis le … » (non retenu).
- Notification de l'administrateur à chaque modification.
