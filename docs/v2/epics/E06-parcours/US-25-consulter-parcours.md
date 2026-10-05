# US-25 — Consulter son parcours

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | MUST |
| **PRD** | F-32, RM-V2-01, RM-V2-02, D-12, D-17 |
| **Dépendances de code** | Session employé (US-03), `Page` / `AccountMenu`, module `career` (créé par cette story : registre, table `career_entry` et `career_profile`, `CareerRepository`) |
| **API** | `GET /api/me/career`, `GET /api/me/career/fields` |
| **Écran** | `/parcours` ; carte « Mon parcours » sur `/profil` ; lien dans le menu de l'avatar |

## Récit

> En tant qu'employé, je veux ouvrir « Mon parcours » à tout moment afin de voir mes diplômes, formations, expériences et compétences, et de savoir quoi compléter.

## Règles

- Accessible à tout employé connecté, **quel que soit l'état de sa mise à jour de campagne** (aucune, « Non », brouillon, envoyée).
- Quatre rubriques, dans cet ordre : Diplômes et certifications, Formations suivies, Expériences professionnelles, Compétences ; chacune avec son nombre d'éléments et un bouton « Ajouter ».
- Rubrique vide : message d'accueil propre à la rubrique (ex. « Ajoutez vos diplômes et certifications pour les faire connaître à ACME SA. »).
- Tri dans chaque rubrique : Solution Design §3.2.
- Mention en haut de page (D-17) : « Votre parcours est visible par l'administration d'ACME SA, qui peut vous contacter pour des opportunités internes. »
- `GET /api/me/career` ne renvoie que le parcours de l'employé de la session ; chaque rubrique porte `count` et `limit` (30).
- `GET /api/me/career/fields` renvoie le registre (rubriques, libellés, champs, obligatoires, choix possibles, limites).

## Critères d'acceptation

**CA-01 — Parcours vide**
Étant donné EMP-E connecté, sans aucun élément
Quand il ouvre `/parcours`
Alors les quatre rubriques s'affichent dans l'ordre, chacune avec son message d'accueil et un bouton « Ajouter »
Et la mention de visibilité est affichée en haut de la page.

**CA-02 — Parcours rempli et trié**
Étant donné EMP-A avec deux expériences (01/2016 → 12/2019, et 01/2020 → poste actuel) et deux diplômes (2015, 2021)
Quand il ouvre `/parcours`
Alors le poste actuel est listé avant l'expérience terminée
Et le diplôme de 2021 avant celui de 2015
Et chaque rubrique indique son nombre d'éléments.

**CA-03 — Accès depuis le profil et le menu**
Étant donné EMP-A sur `/profil`
Alors une carte « Mon parcours » est affichée sous « Mes documents » et mène à `/parcours`
Et le menu de l'avatar contient « Mon parcours ».

**CA-04 — Indépendant de la campagne**
Étant donné EMP-A dont la mise à jour est envoyée (`SUBMITTED`)
Quand il ouvre `/parcours`
Alors la page s'affiche normalement, avec les boutons « Ajouter » actifs.

**CA-05 — Isolation**
Étant donné EMP-A et EMP-B ayant chacun un parcours
Quand EMP-B appelle `GET /api/me/career`
Alors seuls ses propres éléments sont renvoyés.

**CA-06 — Session exigée**
Quand `GET /api/me/career` ou `GET /api/me/career/fields` est appelé sans session
Alors la réponse est `401`.

**CA-07 — Registre**
Quand `GET /api/me/career/fields` est appelé
Alors il renvoie les quatre rubriques avec, pour chacune, ses champs (code, libellé, obligatoire, type, longueur maximale, choix) et la limite de 30.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-25.1 | CA-02 | Unitaire | `tests/unit/test_career_sorting.py` | tri des quatre rubriques (en cours d'abord, dates décroissantes, niveau puis alphabétique) |
| T-25.2 | CA-07 | Unitaire | `tests/unit/test_career_entry_kinds.py` | registre complet et cohérent (chaque champ déclaré existe dans l'entité) |
| T-25.3 | CA-02, CA-04, CA-05, CA-06, CA-07 | API | `tests/api/test_us25_career.py` | réponses, tri, `count`/`limit`, isolation, 401, indépendance du statut de campagne |
| T-25.4 | CA-01, CA-02 | Composant | `src/features/career/CareerPage.test.jsx` | rubriques, messages d'accueil, mention de visibilité, ordre |
| T-25.5 | CA-03 | Composant | `src/features/profile/ProfilePage.test.jsx`, `src/components/AppHeader.test.jsx` | carte « Mon parcours », lien du menu |
| T-25.6 | — | Architecture | `tests/test_architecture.py` | `app.career` dans les contrats ; contrat « Parcours indépendant de la campagne » |

## Hors périmètre

- Ajout, modification, suppression : US-26, US-27, US-28, US-31.
- Justificatifs : US-29.
- Impression ou export du parcours.
