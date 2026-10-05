# US-31 — Gérer ses compétences

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | MUST |
| **PRD** | F-39, F-38, D-10, D-13 |
| **Dépendances de code** | US-25, US-26 ; `normalize` (`app/shared/domain/text.py`) |
| **API** | `POST/PUT/DELETE /api/me/career/entries…` avec `kind = SKILL` |
| **Écran** | `/parcours/ajouter/competences`, `/parcours/:id/modifier` ; rubrique « Compétences » de `/parcours` |

## Récit

> En tant qu'employé, je veux indiquer mes compétences et mon niveau, afin que l'administration me trouve quand un poste les demande.

## Règles

Rubrique `SKILL` (D-13) :

| Champ | Obligatoire | Règle |
|---|---|---|
| Compétence (`title`) | oui | 2–60 caractères, texte libre |
| Niveau (`skill_level`) | oui | `BASIC` (« Notions »), `GOOD` (« Bon niveau »), `EXPERT` (« Expert ») ; trois boutons radio |

- **Pas de doublon** : une compétence déjà présente chez l'employé, comparée avec `normalize` (sans majuscules, accents ni espaces superflus), est refusée : `409 SKILL_ALREADY_EXISTS` (« Cette compétence figure déjà dans votre parcours. »). Une modification qui garde le même intitulé n'est pas un doublon.
- Pas de dates, pas de justificatif (US-29 CA-07).
- Affichage dans `/parcours` : étiquettes « Analyse de crédit · Expert », triées par niveau décroissant puis ordre alphabétique (Solution Design §3.2).
- Aide sous le champ : « Une compétence par fiche, par exemple : Excel, Analyse de crédit, Anglais, Service client. »
- 30 compétences au plus (D-10). Ajout, modification, suppression, isolation, suivi du parcours : comme US-26.

## Critères d'acceptation

**CA-01 — Ajout**
Étant donné EMP-A connecté
Quand il ajoute « Analyse de crédit », niveau Expert
Alors la réponse est `201` et l'étiquette « Analyse de crédit · Expert » apparaît dans « Compétences ».

**CA-02 — Niveau obligatoire**
Quand il enregistre sans niveau
Alors l'enregistrement est bloqué à l'écran et l'API répond `422 INVALID_CAREER_FIELD` (`field = "skill_level"`).

**CA-03 — Doublon**
Étant donné « Analyse de crédit » déjà présente
Quand il ajoute « analyse de CRÉDIT » ou « Analyse  de credit »
Alors la réponse est `409 SKILL_ALREADY_EXISTS` (`field = "title"`) et le message s'affiche sous le champ.

**CA-04 — Modification du niveau**
Quand il passe « Analyse de crédit » de Expert à Bon niveau sans changer l'intitulé
Alors la modification réussit.

**CA-05 — Tri**
Étant donné « Excel » (Bon niveau), « Anglais » (Notions), « Analyse de crédit » (Expert), « Comptabilité » (Bon niveau)
Alors l'ordre affiché est : Analyse de crédit, Comptabilité, Excel, Anglais.

**CA-06 — Longueur**
Quand l'intitulé fait 1 ou 61 caractères
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "title"`).

**CA-07 — Pas d'autre employé**
Étant donné EMP-B avec « Analyse de crédit »
Quand EMP-A ajoute « Analyse de crédit »
Alors l'ajout réussit (le doublon ne se vérifie que chez le même employé).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-31.1 | CA-02, CA-03, CA-04, CA-06, CA-07 | Unitaire | `tests/unit/test_career_validation.py`, `test_career_use_cases.py` | règles `SKILL`, doublon normalisé, modification sans faux doublon |
| T-31.2 | CA-05 | Unitaire | `tests/unit/test_career_sorting.py` | tri par niveau puis alphabétique |
| T-31.3 | CA-01 → CA-07 | API | `tests/api/test_us31_skills.py` | codes HTTP, messages |
| T-31.4 | CA-01, CA-02, CA-03, CA-05 | Composant | `src/features/career/CareerEntryPage.test.jsx`, `CareerSection.test.jsx` | boutons radio, message de doublon, étiquettes |

## Hors périmètre

- Liste fermée de compétences ou suggestions automatiques (D-13).
- Langues comme rubrique à part (une langue se saisit comme compétence).
- Évaluation du niveau par l'administration.
