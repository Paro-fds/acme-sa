# E07 — Recherche de profils

**Statut de l'epic :** Pas encore.

**Objectif :** permettre à l'administration de repérer les employés qui ont enrichi leur parcours, de trouver ceux qui ont les compétences pour un poste ou qui occupent un poste donné, et de les **contacter** (téléphone, email), sans export ni envoi de message par le portail.

**Modules backend :** `admin` (règle `profile_search.py`, cas d'utilisation `SearchProfiles`, `ListPositions`, `GetCareerStatistics` ; filtre `career` de `ListEmployees`), qui lit `career` par son port `CareerRepository`.
**Écrans :** `/admin/profils` (nouveau), `/admin/employes` (filtre), `/admin` (carte). Écrans admin : design system, sans validation visuelle intermédiaire.

| Story | Titre | Priorité |
|---|---|---|
| [US-32](US-32-filtre-parcours-enrichi.md) | Filtrer les employés au parcours enrichi | MUST |
| [US-33](US-33-carte-tableau-de-bord.md) | Voir les parcours enrichis au tableau de bord | SHOULD |
| [US-34](US-34-rechercher-profils.md) | Rechercher des profils par compétences | MUST |
| [US-35](US-35-employes-d-un-poste.md) | Trouver les employés d'un même poste | MUST |

Règles communes : employés **actifs** seulement (RM-V2-08) ; lecture seule (RM-V2-04) ; contact hors du portail par liens `tel:` / `mailto:` (RM-V2-09) ; rappel « Informations déclarées par les employés, non vérifiées. » partout où le parcours est montré (RM-V2-03).
