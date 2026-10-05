# US-12 — Confirmer et soumettre

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E03 Mise à jour |
| **Priorité** | MUST |
| **PRD** | F-16, F-17 |
| **Dépendances de code** | Tables `employee_update` / `employee_change` |
| **API** | `POST /api/me/update/submit` |
| **Écran** | Bas de `/mise-a-jour/verification`, puis `/mise-a-jour/confirmation` (maquette `confirmation_de_soumission`) |

## Récit

> En tant qu'employé, je veux confirmer et soumettre ma mise à jour afin d'indiquer que les informations fournies sont exactes.

## Règles

- Case obligatoire : « Je confirme que les informations fournies sont exactes et sincères. »
- Soumission : `status = SUBMITTED`, `submitted_at` = maintenant. Les lignes `employee_change` (ancienne/nouvelle valeur) sont conservées telles quelles : c'est l'historique (F-17).
- Une seule soumission par employé (D-04) : ensuite plus aucune modification ni ajout/suppression de document.
- Côté admin, l'employé passe en « Mise à jour effectuée ».

## Critères d'acceptation

**CA-01 — Bouton inactif sans confirmation**
Étant donné l'étape 3 affichée
Tant que la case n'est pas cochée
Alors le bouton « Soumettre ma mise à jour » est inactif
Et l'API répond `422 CONFIRMATION_REQUIRED` si `confirmed` est absent ou faux.

**CA-02 — Soumission réussie**
Étant donné EMP-A avec deux changements et la case cochée
Quand il touche « Soumettre ma mise à jour »
Alors le statut passe à `SUBMITTED` avec la date de soumission
Et l'écran « Confirmation » affiche « Votre mise à jour a bien été transmise » et la date
Et le stepper affiche l'étape 4 sur 4.

**CA-03 — Historique conservé**
Après la soumission
Alors chaque changement est conservé avec son ancienne valeur, sa nouvelle valeur et sa date.

**CA-04 — Plus de modification possible**
Étant donné EMP-A ayant soumis
Quand il tente `PUT /api/me/update/changes`, `POST /api/me/documents`, `DELETE /api/me/documents/{id}` ou une nouvelle soumission
Alors la réponse est `409 UPDATE_ALREADY_SUBMITTED`
Et les routes `/mise-a-jour/*` redirigent vers le profil.

**CA-05 — Soumission sans changement**
Étant donné EMP-A sans aucun changement
Quand il confirme et soumet
Alors la soumission est acceptée (le dossier est confirmé exact).

**CA-06 — Double clic**
Quand le bouton est touché deux fois rapidement
Alors une seule soumission est enregistrée et l'écran de confirmation s'affiche normalement.

**CA-07 — Le CSV n'est pas modifié**
Après la soumission
Alors le fichier CSV source est inchangé.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-12.1 | CA-01 | API | `tests/api/test_us12_submit.py` | 422 sans confirmation |
| T-12.2 | CA-02, CA-03, CA-05 | API | `tests/api/test_us12_submit.py` | statut, `submitted_at`, changements intacts, soumission vide |
| T-12.3 | CA-04, CA-06 | API | `tests/api/test_us12_submit.py` | toutes les écritures → 409 après soumission |
| T-12.4 | CA-07 | API | `tests/api/test_us12_submit.py` | empreinte (hash) du CSV de test identique avant/après |
| T-12.5 | CA-01, CA-02, CA-06 | Composant | `src/features/update/SubmitSection.test.jsx` | case, bouton, désactivation pendant l'envoi |
| T-12.6 | CA-02 | E2E | `e2e/us12-parcours-complet.spec.js` | identification → Oui → 2 modifications → document → vérification → soumission → profil « Effectuée » |

## Notes de réalisation

- CA-04 : les écritures existantes (changements, décision, soumission) et `GET /api/me/update/fields` répondent `409 UPDATE_ALREADY_SUBMITTED` ; les écrans `/mise-a-jour/informations` et `/mise-a-jour/verification` renvoient au profil. L'ajout de document est refusé après soumission depuis US-13 (`test_upload_is_refused_after_submission`, `tests/api/test_us13_upload.py`)  ; la suppression aussi depuis US-14 (`test_ca03_deletion_is_refused_after_submission`, `tests/api/test_us14_delete_document.py`).
- CA-06 : verrou synchrone côté écran (`useSubmission`, `SubmitSection.jsx`) ; un second envoi reçoit 409 et l'écran de confirmation s'affiche normalement.
- T-12.6 : `e2e/us12-parcours-complet.spec.js` couvre le parcours complet, ajout d'un diplôme PDF compris (depuis US-13).
- L'écran de confirmation n'affiche ni référence ni récépissé PDF (absents de la story) et n'annonce pas de notification à l'administration (aucune notification dans le MVP).

- **Depuis US-24 :** l'envoi n'est plus définitif : « Modifier à nouveau » permet de corriger puis de renvoyer ; chaque envoi remplace le précédent.

## Hors périmètre

- Accusé de réception par email ou SMS.
- Annulation d'une soumission.
