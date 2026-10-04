# US-13 — Ajouter un document

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E04 Documents |
| **Priorité** | MUST |
| **PRD** | F-19, F-21 |
| **Dépendances de code** | Table `document`, `FileStorage`, mise à jour ouverte (non soumise) |
| **API** | `POST /api/me/documents` (multipart : `file`, `document_type`) |
| **Écran** | `/mise-a-jour/documents` — étape 2 |

## Récit

> En tant qu'employé, je veux ajouter un certificat, un diplôme, une attestation ou un autre document depuis mon téléphone afin d'enrichir mon dossier.

## Règles

- Les documents sont **facultatifs** : lien « Passer cette étape » toujours disponible.
- Source : appareil photo ou fichiers du téléphone.
- Type obligatoire : Diplôme, Certificat, Attestation, Autre.
- Formats : PDF, JPG, PNG — contrôlés par l'extension **et** la signature du fichier.
- Taille max 5 Mo par fichier ; 10 documents max par employé.
- Les photos de plus de 1600 px sont redimensionnées dans le navigateur avant l'envoi.
- Stockage : `ACME_DATA_DIR/documents/<employee_id>/<uuid>.<ext>` ; le nom d'origine n'est conservé qu'en base.
- Rappel affiché : « Formats acceptés : PDF, JPG, PNG — 5 Mo maximum ».

## Critères d'acceptation

**CA-01 — Ajout d'un PDF**
Étant donné EMP-A avec une mise à jour en cours
Quand il choisit le type « Diplôme » et un PDF de 1 Mo
Alors le document est enregistré
Et il apparaît dans la liste avec son nom, son type et une icône PDF.

**CA-02 — Photo depuis l'appareil**
Quand il prend une photo de 4000 px de large
Alors elle est réduite à 1600 px avant l'envoi
Et elle apparaît avec une miniature.

**CA-03 — Plusieurs documents**
Quand il ajoute successivement trois documents
Alors les trois sont listés.

**CA-04 — Format refusé**
Quand il choisit un fichier `.docx`, ou un `.exe` renommé en `.pdf`
Alors la réponse est `415 UNSUPPORTED_FILE_TYPE`
Et le message « Format non accepté. Utilisez un PDF, JPG ou PNG. » s'affiche.

**CA-05 — Fichier trop lourd**
Quand il choisit un PDF de 6 Mo
Alors le refus est immédiat côté écran (sans envoi)
Et l'API répond `413 FILE_TOO_LARGE` si la requête est envoyée quand même
Et le message « Fichier trop volumineux (5 Mo maximum). » s'affiche.

**CA-06 — Limite atteinte**
Étant donné EMP-A avec 10 documents
Quand il en ajoute un 11ᵉ
Alors la réponse est `409 DOCUMENT_LIMIT_REACHED`
Et le bouton d'ajout est désactivé avec « Nombre maximum de documents atteint (10). ».

**CA-07 — Type manquant**
Quand aucun type n'est choisi
Alors l'envoi est impossible côté écran et l'API répond `422`.

**CA-08 — Étape facultative**
Quand il touche « Passer cette étape »
Alors l'étape 3 « Vérification » s'ouvre sans document.

**CA-09 — Progression et échec**
Pendant l'envoi, une barre de progression est affichée
Et en cas d'échec réseau le message « L'envoi a échoué. Réessayez. » s'affiche avec un bouton « Réessayer ».

**CA-10 — Stockage**
Après l'ajout
Alors le fichier sur disque a un nom UUID, se trouve dans le dossier de l'employé et a un contenu identique à l'original.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-13.1 | CA-04 | Unitaire | `tests/unit/test_file_validation.py` | détection par signature : PDF, JPG, PNG acceptés ; DOCX et faux PDF refusés |
| T-13.2 | CA-10 | Unitaire | `tests/unit/test_local_file_storage.py` | save/open/delete dans un dossier temporaire |
| T-13.3 | CA-01, CA-03, CA-10 | API | `tests/api/test_us13_upload.py` | métadonnées en base, fichier sur disque, contenu identique |
| T-13.4 | CA-04, CA-05, CA-06, CA-07 | API | `tests/api/test_us13_upload.py` | 415, 413, 409, 422 ; aucun fichier écrit en cas de refus |
| T-13.5 | CA-02 | Composant | `src/features/documents/resizeImage.test.js` | redimensionnement > 1600 px |
| T-13.6 | CA-04 → CA-09 | Composant | `src/features/documents/DocumentsStep.test.jsx` | contrôles avant envoi, messages, limite, « Passer cette étape », réessai |
| T-13.7 | CA-01 | E2E | `e2e/us13-ajout-document.spec.js` | ajout d'un PDF sur mobile |

## Notes de réalisation

- API : `POST /api/me/documents` et `GET /api/me/documents` (liste, nécessaire à l'étape 2 et à la vérification). Le service du fichier (`GET /api/me/documents/{id}/file`) relève d'**US-07**.
- Miniature (CA-02) : construite dans le navigateur à partir de la photo qui vient d'être envoyée. Depuis US-07, la miniature est servie par l'API, y compris après rechargement.
- L'ajout est refusé sans mise à jour ouverte (`409 UPDATE_NOT_STARTED`) et après soumission (`409 UPDATE_ALREADY_SUBMITTED`, US-12 CA-04).
- Le nom d'origine est nettoyé (sans chemin ni caractère de contrôle) et ne sert qu'à l'affichage ; le fichier est écrit sous `<uuid>.<ext>` (écriture atomique), puis la ligne en base ; si l'enregistrement en base échoue, le fichier est supprimé.

## Hors périmètre

- Validation officielle des documents (WON'T V1).
- Antivirus.
- Ajout de documents après soumission (D-04).
