# US-28 — Gérer ses expériences professionnelles

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | MUST |
| **PRD** | F-35, F-38, D-07, D-10 |
| **Dépendances de code** | US-25, US-26 |
| **API** | `POST/PUT/DELETE /api/me/career/entries…` avec `kind = EXPERIENCE` |
| **Écran** | `/parcours/ajouter/experiences`, `/parcours/:id/modifier` |

## Récit

> En tant qu'employé, je veux déclarer les postes que j'ai occupés, chez ACME ou ailleurs, afin que mon expérience soit prise en compte pour d'autres postes.

## Règles

Rubrique `EXPERIENCE` :

| Champ | Obligatoire | Règle |
|---|---|---|
| Poste (`title`) | oui | 2–150 caractères |
| Employeur (`organization`) | oui | 2–150 caractères |
| Lieu (`location`) | non | ≤ 100 caractères |
| Début (`start_month`) | oui | `AAAA-MM`, pas après le mois courant |
| Fin (`end_month`) | non | Vide = **poste actuel** ; ≥ début ; pas après le mois courant |
| Description (`description`) | non | ≤ 500 caractères ; retours à la ligne conservés ; compteur de caractères affiché |

- Case « Poste actuel » : cochée, elle vide et masque la date de fin. Plusieurs postes actuels sont possibles (temps partiel, cumul).
- Affichage : « Caissier — Banque XYZ, Cap-Haïtien · janv. 2016 → déc. 2019 (4 ans) » ; poste actuel : « depuis janv. 2020 · poste actuel ».
- Durée affichée calculée à l'écran (années et mois), non enregistrée.
- Ajout, modification, suppression, limite, isolation, suivi du parcours : comme US-26.

## Critères d'acceptation

**CA-01 — Expérience terminée**
Étant donné EMP-A connecté, horloge au 2026-10-15
Quand il ajoute « Caissier », « Banque XYZ », « Cap-Haïtien », 01/2016 → 12/2019, description « Accueil, opérations de caisse »
Alors elle est enregistrée et affichée « Caissier — Banque XYZ, Cap-Haïtien · janv. 2016 → déc. 2019 (4 ans) ».

**CA-02 — Poste actuel**
Quand il coche « Poste actuel » pour une expérience commencée en 01/2020
Alors elle est enregistrée sans fin, affichée « poste actuel » et listée en premier.

**CA-03 — Dates incohérentes**
Quand la fin précède le début, ou que le début ou la fin est après le mois courant
Alors l'API répond `422 INVALID_CAREER_FIELD` avec le champ concerné.

**CA-04 — Description**
Quand il saisit une description de 501 caractères
Alors la saisie est bloquée à 500 à l'écran (compteur « 500 / 500 »)
Et l'API répond `422 INVALID_CAREER_FIELD` (`field = "description"`) si la requête est envoyée quand même
Et une description avec des retours à la ligne est restituée telle quelle.

**CA-05 — Caractères de contrôle**
Quand le poste contient un caractère de contrôle (ex. `\u0007`)
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "title"`).

**CA-06 — Modification et suppression**
Comme US-26 CA-06 et CA-07, pour une expérience.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-28.1 | CA-03 → CA-05 | Unitaire | `tests/unit/test_career_validation.py` | règles `EXPERIENCE`, description, caractères de contrôle |
| T-28.2 | CA-01 → CA-06 | API | `tests/api/test_us28_experiences.py` | codes HTTP, tri « poste actuel » d'abord |
| T-28.3 | CA-01, CA-02, CA-04 | Composant | `src/features/career/CareerEntryPage.test.jsx`, `src/lib/format.test.js` | case « Poste actuel », compteur, durée affichée |

## Hors périmètre

- Historique interne ACME issu du SI (postes, grades, agences successifs) : hors incrément (PRD §9).
- Références ou contacts d'anciens employeurs.
