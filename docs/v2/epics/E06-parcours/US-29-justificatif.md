# US-29 — Joindre un justificatif à un élément du parcours

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | SHOULD |
| **PRD** | F-36, ENF-V2-02, D-09, RM-V2-06 ; SD-V2-02 |
| **Dépendances de code** | US-26 (page de modification), module `document` (`detect_file_kind`, `display_name`, `FileStorage`), frontend `resizeImage`, `upload()`, `ImagePreview` |
| **API** | `PUT /api/me/career/entries/{id}/proof` (multipart `file`), `DELETE /api/me/career/entries/{id}/proof`, `GET /api/me/career/entries/{id}/proof` |
| **Écran** | `/parcours/:id/modifier`, et `/parcours/ajouter/:kind` juste après « Enregistrer » |

## Récit

> En tant qu'employé, je veux joindre la photo ou le PDF de mon diplôme, de mon attestation de formation ou de mon certificat de travail, afin d'appuyer ce que je déclare.

## Règles

- **Un justificatif au plus** par élément ; facultatif ; possible pour les diplômes et certifications, formations et expériences, **pas pour les compétences** (`422 PROOF_NOT_ALLOWED`).
- Mêmes contrôles que les documents du MVP : PDF, JPG, PNG vérifiés par l'extension **et** la signature ; 5 Mo maximum ; photos de plus de 1600 px redimensionnées dans le navigateur ; appareil photo ou fichiers du téléphone.
- Rangé avec l'élément, **pas** dans « Mes documents » (D-09) ; ne compte pas dans la limite des 10 documents de la campagne.
- Stockage : `ACME_DATA_DIR/career/<employee_id>/<uuid>.<ext>` ; nom d'origine nettoyé, conservé en base pour l'affichage.
- **SD-V2-02** : à l'ajout d'un élément, la zone « Justificatif » est désactivée (« Enregistrez d'abord l'élément ») ; après « Enregistrer », la page reste ouverte, passe en mode modification et la zone devient active. « Terminer » ramène à `/parcours`.
- Remplacer : le nouveau fichier est enregistré, puis l'ancien supprimé. Retirer : confirmation, puis suppression du fichier.
- Supprimer l'élément supprime son justificatif (RM-V2-06).
- Chaque ajout, remplacement ou retrait change `last_changed_at` du parcours.
- Le fichier n'est servi que par l'API, à son propriétaire (et à l'administration, US-30).

## Critères d'acceptation

**CA-01 — Ajout d'un PDF**
Étant donné le diplôme d'EMP-A, sans justificatif
Quand il joint un PDF de 1 Mo
Alors la réponse renvoie l'élément avec `proof` (nom, type, taille, date)
Et la fiche du diplôme affiche une icône PDF et « Voir le justificatif ».

**CA-02 — Photo**
Quand il prend une photo de 4000 px de large
Alors elle est réduite à 1600 px avant l'envoi et affichée en miniature.

**CA-03 — Création puis justificatif (SD-V2-02)**
Étant donné EMP-A sur `/parcours/ajouter/diplomes`
Alors la zone « Justificatif » est désactivée
Quand il enregistre le diplôme
Alors il reste sur la page, la zone devient active, et il peut joindre un fichier sans changer d'écran.

**CA-04 — Remplacement**
Étant donné un justificatif existant
Quand il en envoie un autre
Alors l'élément porte le nouveau fichier et l'ancien n'existe plus sur le disque.

**CA-05 — Retrait**
Quand il retire le justificatif et confirme
Alors la réponse est `204`, `proof` vaut `null` et le fichier est supprimé du disque.

**CA-06 — Format, taille**
Quand il envoie un `.docx`, un `.exe` renommé en `.pdf`, ou un PDF de 6 Mo
Alors les réponses sont `415 UNSUPPORTED_FILE_TYPE` et `413 FILE_TOO_LARGE`, avec les messages du MVP près du champ
Et aucun fichier n'est écrit.

**CA-07 — Compétence**
Quand un justificatif est envoyé pour une compétence
Alors la réponse est `422 PROOF_NOT_ALLOWED` et la zone « Justificatif » n'est jamais proposée pour une compétence.

**CA-08 — Suppression de l'élément**
Étant donné un diplôme avec justificatif
Quand l'élément est supprimé
Alors son fichier est supprimé du disque.

**CA-09 — Accès**
Quand EMP-B demande `GET /api/me/career/entries/{id}/proof` sur l'élément d'EMP-A
Alors la réponse est `404`
Et le fichier d'EMP-A est servi à EMP-A avec `Content-Disposition: inline`, `X-Content-Type-Options: nosniff` et `Cache-Control: private, no-store`.

**CA-10 — Indépendant de la campagne**
Étant donné EMP-A dont la mise à jour est envoyée
Quand il joint un justificatif
Alors l'ajout réussit (aucun `409 UPDATE_ALREADY_SUBMITTED`) et « Mes documents » est inchangé.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-29.1 | CA-04, CA-05, CA-08 | Unitaire | `tests/unit/test_career_proof.py` | ordre des écritures, suppression des fichiers, rollback si la base échoue |
| T-29.2 | CA-01, CA-04 → CA-10 | API | `tests/api/test_us29_career_proof.py` | 413, 415, 422, 404, en-têtes, disque, « Mes documents » inchangé |
| T-29.3 | CA-02, CA-03, CA-05, CA-06, CA-07 | Composant | `src/features/career/ProofField.test.jsx`, `CareerEntryPage.test.jsx` | zone désactivée puis active, progression, confirmation, messages |
| T-29.4 | CA-01, CA-03 | E2E | `e2e/us29-justificatif.spec.js` | diplôme créé puis PDF joint sur mobile |

## Hors périmètre

- Plusieurs justificatifs par élément.
- Choisir un document déjà envoyé dans « Mes documents » (D-09).
- Vérification de l'authenticité du justificatif (RM-V2-03), antivirus.
