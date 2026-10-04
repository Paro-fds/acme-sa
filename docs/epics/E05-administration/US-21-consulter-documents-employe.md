# US-21 — Consulter les documents d'un employé

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E05 Administration |
| **Priorité** | MUST |
| **PRD** | F-28 |
| **Dépendances de code** | Table `document`, `FileStorage`, session admin |
| **API** | `GET /api/admin/employees/{id}/documents`, `GET /api/admin/documents/{id}/file` |
| **Écran** | Bloc « Documents » de `/admin/employes/:id` |

## Récit

> En tant qu'administrateur, je veux consulter les documents transmis par un employé afin de vérifier les pièces fournies.

## Règles

- Liste : type, nom du fichier, date d'ajout, taille, bouton « Voir ».
- « Voir » : aperçu plein écran pour les images, PDF ouvert dans un nouvel onglet.
- Lecture seule : ni ajout, ni suppression, ni renommage.

## Critères d'acceptation

**CA-01 — Liste des documents**
Étant donné EMP-A avec un diplôme PDF et un certificat JPG
Quand l'admin ouvre son dossier
Alors les deux documents sont listés avec type, nom, date et taille.

**CA-02 — Ouverture**
Quand il touche « Voir » sur le certificat
Alors l'image s'affiche en plein écran, avec un bouton de fermeture
Et le PDF s'ouvre dans un nouvel onglet.

**CA-03 — Aucun document**
Étant donné EMP-B sans document
Alors « Aucun document transmis » s'affiche.

**CA-04 — Accès réservé**
Quand `/api/admin/documents/{id}/file` est appelé sans session ou avec une session employé
Alors la réponse est `401` ou `403` et aucun contenu n'est servi.

**CA-05 — Document inexistant**
Quand un id de document inexistant est demandé
Alors la réponse est `404`.

**CA-06 — Lecture seule**
Aucun bouton d'ajout ou de suppression n'est affiché.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-21.1 | CA-01, CA-03 | API | `tests/api/test_us21_admin_documents.py` | liste et métadonnées, liste vide |
| T-21.2 | CA-02 | API | `tests/api/test_us21_admin_documents.py` | contenu identique, `Content-Type` correct |
| T-21.3 | CA-04, CA-05 | API | `tests/api/test_us21_admin_documents.py` | 401/403/404 |
| T-21.4 | CA-01, CA-02, CA-03, CA-06 | Composant | `src/features/admin/AdminDocuments.test.jsx` | liste, aperçu image, état vide, aucun bouton d'écriture |

## Hors périmètre

- Téléchargement groupé (ZIP).
- Annotation ou validation des documents.
