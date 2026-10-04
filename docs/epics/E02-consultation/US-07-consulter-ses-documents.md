# US-07 — Consulter ses documents

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E02 Consultation |
| **Priorité** | MUST |
| **PRD** | F-11 |
| **Dépendances de code** | Table `document`, `FileStorage`, session employé |
| **API** | `GET /api/me/documents`, `GET /api/me/documents/{id}/file` |
| **Écran** | `/documents` (maquette `mes_documents_professionnels`) |

## Récit

> En tant qu'employé, je veux consulter les documents associés à mon profil afin de suivre mon parcours professionnel.

## Règles

- Documents regroupés par type : Diplômes, Certificats, Attestations, Autres.
- Chaque document affiche : nom du fichier, type, date d'ajout, taille.
- « Voir » ouvre le fichier : aperçu intégré pour les images, ouverture dans le lecteur du téléphone pour les PDF.

## Critères d'acceptation

**CA-01 — Liste groupée**
Étant donné EMP-A avec un diplôme PDF et un certificat JPG
Quand il ouvre « Mes documents »
Alors il voit les deux documents dans leur groupe respectif, avec nom, date et taille.

**CA-02 — Aucun document**
Étant donné EMP-B sans document
Quand il ouvre « Mes documents »
Alors il voit « Aucun document pour le moment » et un bouton menant à la mise à jour (si elle n'est pas soumise).

**CA-03 — Ouverture d'un document**
Quand il touche « Voir » sur un document
Alors le fichier s'ouvre avec le bon type de contenu.

**CA-04 — Documents d'un autre employé inaccessibles**
Étant donné un document appartenant à EMP-B
Quand EMP-A demande `/api/me/documents/{id}/file` avec cet identifiant
Alors la réponse est `404`.

**CA-05 — Accès sans session**
Quand un fichier est demandé sans session
Alors la réponse est `401` et aucun contenu n'est servi.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-07.1 | CA-01, CA-02 | API | `tests/api/test_us07_my_documents.py` | liste, métadonnées, liste vide |
| T-07.2 | CA-03 | API | `tests/api/test_us07_my_documents.py` | contenu identique au fichier, `Content-Type`, `Content-Disposition` |
| T-07.3 | CA-04 | API | `tests/api/test_us07_my_documents.py` | document d'EMP-B demandé par EMP-A → 404 |
| T-07.4 | CA-05 | API | `tests/api/test_us07_my_documents.py` | sans cookie → 401 |
| T-07.5 | CA-01, CA-02 | Composant | `src/features/documents/MyDocumentsPage.test.jsx` | regroupement, état vide |

## Hors périmètre

- Ajout et suppression (US-13, US-14).
- Catégories avancées, historique professionnel (V2).
