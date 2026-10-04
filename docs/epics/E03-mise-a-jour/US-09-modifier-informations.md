# US-09 — Modifier ses informations

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | E03 Mise à jour |
| **Priorité** | MUST |
| **PRD** | F-13, F-18 |
| **Dépendances de code** | Registre des champs modifiables, tables `employee_update` / `employee_change` |
| **API** | `GET /api/me/update/fields`, `PUT /api/me/update/changes` |
| **Écran** | `/mise-a-jour/informations` — étape 1 (maquette `mise_jour_informations`) |

## Récit

> En tant qu'employé, je veux modifier plusieurs informations autorisées afin de corriger mon dossier.

## Règles

- Champs modifiables (registre, Solution Design §7) : nom, prénom, téléphone, email, adresse.
- Sections repliables : **Identité** (nom, prénom), **Coordonnées** (téléphone, email, adresse). Les informations professionnelles sont affichées en « Lecture seule ».
- Un champ modifié affiche le badge « Modifié » et « Ancienne valeur : … » barrée.
- Un champ remis à sa valeur d'origine n'est plus considéré comme modifié.
- Validation à la saisie (à la sortie du champ) **et** côté serveur.

| Champ | Obligatoire | Règle | Message d'erreur |
|---|---|---|---|
| Nom, Prénom | oui | 1–60 caractères : lettres, espaces, `-`, `'` | « Saisissez un nom valide (lettres, espaces, tirets). » |
| Téléphone | oui | 8 à 15 chiffres, `+` en tête autorisé, espaces et `-` ignorés | « Saisissez un numéro valide, par exemple +509 3722 1111. » |
| Email | non | format email, 254 caractères max | « Saisissez une adresse email valide. » |
| Adresse | non | 5–200 caractères | « L'adresse doit contenir entre 5 et 200 caractères. » |

## Critères d'acceptation

**CA-01 — Formulaire pré-rempli**
Étant donné EMP-A avec un brouillon vide
Quand il ouvre l'étape 1
Alors chaque champ modifiable est pré-rempli avec sa valeur actuelle
Et le stepper affiche « Étape 1 sur 4 : Informations ».

**CA-02 — Plusieurs modifications**
Quand il modifie le téléphone et l'adresse puis continue
Alors deux changements sont enregistrés, chacun avec ancienne et nouvelle valeur.

**CA-03 — Indicateurs visuels**
Quand un champ est modifié
Alors il affiche le badge « Modifié » et l'ancienne valeur barrée
Et l'en-tête de section indique « 2 modifications en cours ».

**CA-04 — Retour à la valeur d'origine**
Étant donné le téléphone modifié
Quand l'employé remet la valeur d'origine
Alors le badge disparaît
Et le changement est supprimé lors de l'enregistrement.

**CA-05 — Validation**
Quand une valeur invalide est saisie (ex. téléphone « 12ab »)
Alors le message d'erreur du tableau s'affiche sous le champ
Et le bouton « Continuer vers les documents » est inactif
Et l'API répond `422 INVALID_FIELD` avec le code du champ si la requête est envoyée.

**CA-06 — Champ obligatoire vidé**
Quand le téléphone, le nom ou le prénom est vidé
Alors l'erreur « Ce champ est obligatoire. » s'affiche.

**CA-07 — Champ non modifiable refusé**
Quand l'API reçoit un changement sur un champ hors registre (ex. `position`, `debt_amount`)
Alors la réponse est `422 FIELD_NOT_EDITABLE` et rien n'est enregistré.

**CA-08 — Email vide dans la source**
Étant donné EMP-E dont l'email est vide
Quand il saisit un email
Alors le changement est enregistré avec une ancienne valeur vide, affichée « Non renseigné ».

**CA-09 — Accès sans mise à jour ouverte**
Étant donné EMP-A n'ayant pas choisi « Oui »
Quand il ouvre `/mise-a-jour/informations`
Alors il est redirigé vers son profil (API : `409 UPDATE_NOT_STARTED`).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-09.1 | CA-05, CA-06 | Unitaire | `tests/unit/test_editable_fields.py` | règles de validation de chaque champ (cas valides et invalides) |
| T-09.2 | CA-02, CA-04 | Unitaire | `tests/unit/test_record_changes.py` | calcul des changements, suppression si valeur d'origine |
| T-09.3 | CA-01 | API | `tests/api/test_us09_changes.py` | `/fields` renvoie le registre et les valeurs actuelles |
| T-09.4 | CA-02, CA-04, CA-08 | API | `tests/api/test_us09_changes.py` | lignes `employee_change` en base |
| T-09.5 | CA-05, CA-07 | API | `tests/api/test_us09_changes.py` | 422 avec code de champ, aucune écriture |
| T-09.6 | CA-09 | API | `tests/api/test_us09_changes.py` | 409 sans mise à jour ouverte |
| T-09.7 | CA-01, CA-03, CA-05, CA-06 | Composant | `src/features/update/InformationsStep.test.jsx` | pré-remplissage, badge, ancienne valeur, erreurs, bouton inactif |

## Hors périmètre

- Modification des informations professionnelles.
- Justificatif obligatoire pour un changement de nom (pourra être ajouté via les documents, facultatifs).
