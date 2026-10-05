# US-27 — Gérer ses formations

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | MUST |
| **PRD** | F-34, F-38, D-07, D-10 ; SD-V2-01 |
| **Dépendances de code** | US-25, US-26 (mécanisme d'ajout / modification / suppression, `MonthField`) |
| **API** | `POST/PUT/DELETE /api/me/career/entries…` avec `kind = TRAINING` |
| **Écran** | `/parcours/ajouter/formations`, `/parcours/:id/modifier` |

## Récit

> En tant qu'employé, je veux déclarer les formations que j'ai suivies, internes ou externes, afin que l'administration connaisse les compétences que j'ai acquises.

## Règles

Rubrique `TRAINING` :

| Champ | Obligatoire | Règle |
|---|---|---|
| Intitulé (`title`) | oui | 2–150 caractères |
| Organisme (`organization`) | oui | 2–150 caractères |
| Début (`start_month`) | oui | `AAAA-MM`, pas après le mois courant |
| Fin (`end_month`) | non | Vide = **en cours** ; ≥ début ; **pas après le mois courant** (SD-V2-01) |
| Durée (`duration_hours`) | non | Entier de 1 à 2000 |

- Case « Formation en cours » : cochée, elle vide et masque la date de fin.
- Affichage : « ACME SA (interne) · mars 2025 → avril 2025 · 24 h » ; en cours : « depuis mars 2025 · en cours ».
- Ajout, modification, suppression, limite, isolation, suivi du parcours : comme US-26.

## Critères d'acceptation

**CA-01 — Formation terminée**
Étant donné EMP-B connecté, horloge au 2026-10-15
Quand il ajoute « Crédit aux PME », « ACME SA (interne) », 03/2025 → 04/2025, 24 heures
Alors elle est enregistrée et affichée « ACME SA (interne) · mars 2025 → avril 2025 · 24 h ».

**CA-02 — Formation en cours**
Quand il coche « Formation en cours »
Alors la date de fin disparaît, l'élément est enregistré sans fin
Et il est affiché « en cours » et listé avant les formations terminées.

**CA-03 — Fin avant le début**
Quand il saisit début 05/2025 et fin 03/2025
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "end_month"`) avec « La date de fin doit être postérieure ou égale à la date de début. ».

**CA-04 — Fin dans le futur (SD-V2-01)**
Quand il saisit une fin en 12/2026
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "end_month"`) avec « La date ne peut pas être dans le futur. Cochez « Formation en cours ». ».

**CA-05 — Durée**
Quand il saisit une durée de 0 ou de 2 500 heures, ou « 12,5 »
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "duration_hours"`).

**CA-06 — Champs propres à la rubrique**
Quand la requête contient `location` ou `skill_level`
Alors ces valeurs sont ignorées et l'élément est enregistré sans elles.

**CA-07 — Modification et suppression**
Comme US-26 CA-06 et CA-07, pour une formation.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-27.1 | CA-02 → CA-06 | Unitaire | `tests/unit/test_career_validation.py` | règles `TRAINING`, mois courant, champs ignorés |
| T-27.2 | CA-01 → CA-07 | API | `tests/api/test_us27_trainings.py` | codes HTTP, messages, tri « en cours » d'abord |
| T-27.3 | CA-01 → CA-04 | Composant | `src/features/career/CareerEntryPage.test.jsx` | case « Formation en cours », messages, affichage |

## Hors périmètre

- Catalogue des formations internes d'ACME, inscription à une formation.
- Fin prévue dans le futur (SD-V2-01) : la formation reste « en cours ».
