# E06 — Parcours professionnel

**Statut de l'epic :** Pas encore.

**Objectif :** donner à chaque employé un espace « Mon parcours », disponible à tout moment, pour déclarer ses diplômes et certifications, formations, expériences et compétences, et permettre à l'administration de le consulter en lecture seule.

**Module backend :** `career` (nouveau ; registre `entry_kinds.py`, `CareerRepository`, second `FileStorage` dans `ACME_DATA_DIR/career/`). Consultation admin : module `admin`.
**Écrans :** `/parcours`, `/parcours/ajouter/:kind`, `/parcours/:id/modifier` (sans maquette : design system + revue de l'utilisateur) ; bloc « Parcours professionnel » de `/admin/employes/:id`.

| Story | Titre | Priorité |
|---|---|---|
| [US-25](US-25-consulter-parcours.md) | Consulter son parcours | MUST |
| [US-26](US-26-diplomes-certifications.md) | Gérer ses diplômes et certifications | MUST |
| [US-27](US-27-formations.md) | Gérer ses formations | MUST |
| [US-28](US-28-experiences.md) | Gérer ses expériences professionnelles | MUST |
| [US-29](US-29-justificatif.md) | Joindre un justificatif à un élément du parcours | SHOULD |
| [US-30](US-30-parcours-admin.md) | Consulter le parcours d'un employé (admin) | MUST |
| [US-31](US-31-competences.md) | Gérer ses compétences | MUST |

US-25 et US-26 forment le squelette : une fois faites, US-27, US-28 et US-31 ajoutent une rubrique au registre et ses règles propres.
