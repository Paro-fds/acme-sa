# US-33 — Voir les parcours enrichis au tableau de bord

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E07 Recherche de profils |
| **Priorité** | SHOULD |
| **PRD** | F-41, RM-V2-02, D-15 |
| **Dépendances de code** | US-16 (tableau de bord, `StatCard`), US-32 (liste filtrée) |
| **API** | `GET /api/admin/career/statistics` → `{enriched, enriched_last_7_days}` |
| **Écran** | `/admin` : carte « Parcours enrichis » |

## Récit

> En tant qu'administrateur, je veux voir dès le tableau de bord combien d'employés ont enrichi leur parcours, et combien récemment, afin de savoir s'il y a du nouveau à consulter.

## Règles

- `enriched` : employés **actifs** avec `entry_count ≥ 1` ; `enriched_last_7_days` : parmi eux, ceux dont `last_changed_at` est postérieur à maintenant − `CAREER_RECENT_DAYS` (7 jours, configurable).
- Carte « Parcours enrichis » : « **N** employés », sous-texte « dont **X** ces 7 derniers jours » ; un clic mène à `/admin/employes?career=ENRICHED` (trié du plus récent, US-32).
- Route **séparée** : `GET /api/admin/statistics` (campagne) ne change pas (AD-V2-10) ; les cartes de la campagne restent à leur place, la nouvelle carte vient après.
- Chargement indépendant : si la route du parcours échoue, les cartes de la campagne restent affichées et la carte indique « Indisponible ».

## Critères d'acceptation

**CA-01 — Compteurs**
Étant donné l'horloge au 2026-10-15 12:00, P-A modifié le 2026-10-01, P-B modifié le 2026-10-14, P-I (inactif) modifié le 2026-10-15
Quand l'administrateur ouvre `/admin`
Alors la carte affiche « 2 employés » et « dont 1 ces 7 derniers jours ».

**CA-02 — Lien**
Quand il touche la carte
Alors `/admin/employes?career=ENRICHED` s'ouvre.

**CA-03 — Aucun parcours**
Étant donné aucun parcours
Alors la carte affiche « 0 employé » et « dont 0 ces 7 derniers jours ».

**CA-04 — Campagne inchangée**
Alors `GET /api/admin/statistics` renvoie exactement les mêmes champs et valeurs qu'avant US-33.

**CA-05 — Échec isolé**
Étant donné `GET /api/admin/career/statistics` en erreur
Alors les cartes de la campagne s'affichent et la carte « Parcours enrichis » indique « Indisponible ».

**CA-06 — Contrôle d'accès**
La route répond `401` sans session et `403` avec une session employé (test paramétré d'US-15).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-33.1 | CA-01, CA-03 | Unitaire | `tests/unit/test_career_statistics.py` | comptage, fenêtre de 7 jours (bornes), inactifs exclus |
| T-33.2 | CA-01, CA-03, CA-04, CA-06 | API | `tests/api/test_us33_career_statistics.py` | valeurs, statistiques de campagne inchangées |
| T-33.3 | CA-01, CA-02, CA-03, CA-05 | Composant | `src/features/admin/DashboardPage.test.jsx` | carte, pluriel, lien, échec isolé |

## Hors périmètre

- Graphiques d'évolution, statistiques par rubrique, par compétence ou par agence.
