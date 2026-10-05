# US-26 — Gérer ses diplômes et certifications

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | MUST |
| **PRD** | F-33, F-38, D-07, D-10, D-11 |
| **Dépendances de code** | US-25 (module `career`, page `/parcours`) |
| **API** | `POST /api/me/career/entries`, `PUT /api/me/career/entries/{id}`, `DELETE /api/me/career/entries/{id}` |
| **Écran** | `/parcours/ajouter/diplomes`, `/parcours/:id/modifier` |

## Récit

> En tant qu'employé, je veux ajouter, corriger ou retirer un diplôme ou une certification afin que mon parcours reflète mes qualifications.

## Règles

Rubrique `QUALIFICATION` (PRD §6, Solution Design §3) :

| Champ | Obligatoire | Règle |
|---|---|---|
| Type (`qualification_type`) | oui | `DIPLOME` (« Diplôme ») ou `CERTIFICATION` (« Certification ») |
| Intitulé (`title`) | oui | 2–150 caractères |
| Établissement ou organisme (`organization`) | oui | 2–150 caractères |
| Date d'obtention (`start_month`) | oui | `AAAA-MM`, pas après le mois courant |
| Date d'expiration (`end_month`) | non | Certification seulement, strictement après l'obtention, peut être dans le futur ; interdite pour un diplôme |

- Saisie des dates : `MonthField` (mois en toutes lettres + année) ; affichage « juin 2021 ».
- Le champ « Date d'expiration » n'apparaît que pour une certification ; passer de Certification à Diplôme le vide.
- Pas d'enregistrement automatique ; « Enregistrer » dans la barre collée en bas ; après succès : retour à `/parcours` avec « Élément enregistré. ».
- Modification : remplace tous les champs ; le type de rubrique ne change pas.
- Suppression : bouton « Supprimer cet élément » en bas de la page de modification, confirmation (« Supprimer définitivement ce diplôme ? »), puis retour à `/parcours`.
- 30 éléments au plus dans la rubrique (D-10).
- Chaque écriture met à jour `career_profile` (nombre d'éléments, `last_changed_at`).

## Critères d'acceptation

**CA-01 — Ajout d'un diplôme**
Étant donné EMP-A connecté, horloge au 2026-10-15
Quand il ajoute un Diplôme « Licence en sciences comptables », « Université d'État d'Haïti », obtenu en juin 2021
Alors la réponse est `201` avec l'élément
Et il apparaît dans « Diplômes et certifications » avec « Diplôme · Université d'État d'Haïti · juin 2021 ».

**CA-02 — Certification avec expiration**
Quand il ajoute une Certification obtenue en 03/2024, expirant en 03/2027
Alors elle est enregistrée et affiche « expire en mars 2027 ».

**CA-03 — Champs obligatoires**
Quand il enregistre sans intitulé
Alors l'enregistrement est bloqué à l'écran avec « Ce champ est obligatoire. » sous le champ
Et l'API répond `422 INVALID_CAREER_FIELD` avec `field = "title"` si la requête est envoyée quand même.

**CA-04 — Date dans le futur**
Quand il saisit une date d'obtention en 11/2026
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "start_month"`) avec « La date ne peut pas être dans le futur. ».

**CA-05 — Expiration incohérente**
Quand il saisit une certification obtenue en 03/2024 expirant en 01/2024, ou un diplôme avec une date d'expiration
Alors l'API répond `422 INVALID_CAREER_FIELD` (`field = "end_month"`).

**CA-06 — Modification**
Étant donné le diplôme de CA-01
Quand il corrige l'établissement
Alors `PUT` renvoie l'élément modifié avec un `updated_at` récent
Et `/parcours` affiche la nouvelle valeur.

**CA-07 — Suppression**
Quand il supprime le diplôme et confirme
Alors la réponse est `204`, l'élément disparaît
Et s'il annule la confirmation, rien n'est supprimé.

**CA-08 — Limite**
Étant donné 30 éléments dans la rubrique
Quand il en ajoute un 31ᵉ
Alors la réponse est `409 CAREER_LIMIT_REACHED`
Et le bouton « Ajouter » de la rubrique est désactivé avec « Nombre maximum d'éléments atteint pour cette rubrique (30). ».

**CA-09 — Élément d'un autre employé**
Étant donné un diplôme d'EMP-B
Quand EMP-A envoie `PUT` ou `DELETE` sur son identifiant
Alors la réponse est `404 CAREER_ENTRY_NOT_FOUND` et l'élément d'EMP-B est inchangé.

**CA-10 — Campagne inchangée**
Étant donné EMP-A avec une mise à jour en brouillon
Quand il ajoute, modifie puis supprime un diplôme
Alors son brouillon, son statut de campagne et `GET /api/admin/statistics` sont identiques avant et après.

**CA-11 — Suivi du parcours**
Après chaque ajout, modification ou suppression
Alors `career_profile` d'EMP-A a le bon nombre d'éléments et `last_changed_at` = l'heure de l'horloge.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-26.1 | CA-03, CA-04, CA-05 | Unitaire | `tests/unit/test_career_validation.py` | règles de la rubrique, mois courant donné par l'horloge, textes nettoyés |
| T-26.2 | CA-01, CA-08, CA-09, CA-11 | Unitaire | `tests/unit/test_career_use_cases.py` | cas d'utilisation avec dépôt en mémoire : limite, propriétaire, `career_profile` |
| T-26.3 | CA-01 → CA-11 | API | `tests/api/test_us26_qualifications.py` | codes HTTP, format d'erreur, isolation, campagne inchangée |
| T-26.4 | CA-01 → CA-08 | Composant | `src/features/career/CareerEntryPage.test.jsx`, `MonthField.test.jsx` | formulaire généré, champ d'expiration selon le type, messages, confirmation, bouton désactivé |
| T-26.5 | CA-01, CA-07 | E2E | `e2e/us26-diplome.spec.js` | ajout puis suppression d'un diplôme sur mobile (390 px) |

## Hors périmètre

- Justificatif : US-29.
- Liste fermée de diplômes ou d'établissements ; vérification de l'authenticité (RM-V2-03).
