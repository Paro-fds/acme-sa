# US-01 — Vérifier son identité

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E01 Identification |
| **Priorité** | MUST |
| **PRD** | F-01, F-04, F-05 |
| **Dépendances de code** | `CsvEmployeeRepository`, `normalize()` |
| **API** | `POST /api/auth/identify` |
| **Écran** | `/` (maquette `identification_collaborateur`), `/connexion/homonyme` |

## Récit

> En tant qu'employé, je veux saisir mon nom, mon prénom et ma date de naissance afin que le portail reconnaisse mon dossier.

## Règles

- Seuls les employés `active = true` du CSV sont reconnus.
- Comparaison sur `normalize(nom)`, `normalize(prénom)` et date de naissance exacte. La comparaison porte sur les valeurs du CSV **ou** sur le nouveau nom/prénom **soumis** par l'employé.
- Le message d'échec est identique que la personne soit inconnue ou inactive.
- Si plusieurs employés actifs correspondent, aucun dossier n'est ouvert.
- Cette étape n'ouvre **pas** de session : elle indique seulement l'étape suivante.
- Formats de date : l'écran affiche et saisit `JJ/MM/AAAA` (sélecteur de date natif du téléphone) ; l'API reçoit `AAAA-MM-JJ` ; le CSV est lu en `MM/JJ/AAAA`.

## Critères d'acceptation

**CA-01 — Employé reconnu, sans mot de passe**
Étant donné EMP-A, actif, sans compte
Quand il saisit « JOSEPH », « Jean », 15/03/1996
Alors la réponse est `200 {next_step: "CREATE_PASSWORD"}`
Et l'écran de création du mot de passe s'affiche.

**CA-02 — Employé reconnu, avec mot de passe**
Étant donné EMP-A avec un compte
Quand il saisit ses informations
Alors la réponse est `200 {next_step: "ENTER_PASSWORD"}`
Et l'écran de saisie du mot de passe s'affiche.

**CA-03 — Casse, accents et espaces ignorés**
Étant donné EMP-E (« ÉTIENNE Rosé »)
Quand il saisit « etienne », «  rose  », 30/09/1979
Alors il est reconnu.

**CA-04 — Informations inconnues**
Quand une personne saisit un nom, prénom ou date de naissance ne correspondant à aucun employé
Alors la réponse est `401 IDENTITY_NOT_RECOGNIZED`
Et le message « Informations non reconnues. Vérifiez votre saisie. » s'affiche.

**CA-05 — Employé inactif**
Étant donné EMP-I, inactif
Quand il saisit ses informations exactes
Alors la réponse est strictement identique à CA-04 (code et message).

**CA-06 — Homonymes distingués par la date de naissance**
Étant donné EMP-H1 et EMP-H2 (même nom et prénom)
Quand on saisit « PIERRE », « Marie », 02/07/1990
Alors seul EMP-H1 est reconnu.

**CA-07 — Doublon complet**
Étant donné EMP-D1 et EMP-D2 (même nom, prénom et date de naissance)
Quand on saisit leurs informations
Alors la réponse est `409 IDENTITY_AMBIGUOUS`
Et l'écran « Plusieurs dossiers correspondent à vos informations. Contactez l'administration. » s'affiche
Et aucun dossier n'est ouvert.

**CA-08 — Nom modifié et soumis**
Étant donné EMP-A ayant soumis le nouveau nom « JOSEPH-PAUL »
Quand il saisit « Joseph-Paul », « Jean », 15/03/1996
Alors il est reconnu
Et il l'est toujours avec son ancien nom « JOSEPH ».

**CA-09 — Champs obligatoires**
Quand un champ est vide
Alors le bouton « Continuer » reste inactif côté écran
Et l'API répond `422` si la requête est envoyée quand même.

**CA-10 — Aucune donnée exposée**
Quand l'identification réussit
Alors la réponse ne contient aucune donnée de l'employé (ni id, ni nom, ni matricule).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-01.1 | CA-01, CA-02 | API | `tests/api/test_us01_identify.py` | `next_step` selon l'existence du compte |
| T-01.2 | CA-03 | Unitaire | `tests/unit/test_normalize.py` | `normalize()` : casse, accents, espaces multiples |
| T-01.3 | CA-03 | API | `tests/api/test_us01_identify.py` | EMP-E reconnu avec saisie sans accents |
| T-01.4 | CA-04, CA-05 | API | `tests/api/test_us01_identify.py` | inconnu et inactif → réponses identiques (corps et code comparés) |
| T-01.5 | CA-06 | API | `tests/api/test_us01_identify.py` | homonymes distingués |
| T-01.6 | CA-07 | API | `tests/api/test_us01_identify.py` | doublon → 409, aucun cookie de session |
| T-01.7 | CA-08 | API | `tests/api/test_us01_identify.py` | ancien et nouveau nom reconnus après soumission |
| T-01.8 | CA-09 | API | `tests/api/test_us01_identify.py` | champ manquant → 422 |
| T-01.9 | CA-10 | API | `tests/api/test_us01_identify.py` | corps de réponse = `{next_step}` uniquement |
| T-01.10 | CA-01, CA-04, CA-07, CA-09 | Composant | `src/features/auth/IdentifyPage.test.jsx` | navigation vers l'étape suivante, messages d'erreur, bouton inactif |
| T-01.11 | CA-01 | Unitaire | `tests/unit/test_csv_employee_repository.py` | lecture CSV : actifs seulement, dates `MM/JJ/AAAA`, colonnes exclues absentes |

## Hors périmètre

- Création du mot de passe (US-02) et saisie du mot de passe (US-03).
- Blocage après tentatives répétées (US-03).
