# US-14 — Supprimer un document

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E04 Documents |
| **Priorité** | SHOULD |
| **PRD** | F-20 |
| **Dépendances de code** | Table `document`, `FileStorage` |
| **API** | `DELETE /api/me/documents/{id}` |
| **Écran** | Bouton « Supprimer » de chaque document à l'étape 2 |

## Récit

> En tant qu'employé, je veux supprimer un document ajouté par erreur avant de soumettre ma mise à jour.

## Critères d'acceptation

**CA-01 — Suppression avec confirmation**
Étant donné EMP-A avec un document et une mise à jour non soumise
Quand il touche « Supprimer » puis confirme « Supprimer ce document ? »
Alors le document disparaît de la liste
Et la ligne en base et le fichier sur disque sont supprimés.

**CA-02 — Annulation**
Quand il touche « Annuler » dans la confirmation
Alors rien n'est supprimé.

**CA-03 — Après soumission**
Étant donné EMP-A ayant soumis
Quand une suppression est demandée
Alors la réponse est `409 UPDATE_ALREADY_SUBMITTED`
Et aucun bouton « Supprimer » n'est affiché.

**CA-04 — Document d'un autre employé**
Étant donné un document d'EMP-B
Quand EMP-A demande sa suppression
Alors la réponse est `404` et rien n'est supprimé.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-14.1 | CA-01 | API | `tests/api/test_us14_delete_document.py` | ligne et fichier supprimés |
| T-14.2 | CA-03, CA-04 | API | `tests/api/test_us14_delete_document.py` | 409 et 404, document intact |
| T-14.3 | CA-01, CA-02, CA-03 | Composant | `src/features/documents/DocumentItem.test.jsx` | dialogue de confirmation, annulation, masquage après soumission |

## Notes de réalisation

- La confirmation s'affiche dans la carte du document (`role="alertdialog"`), centrée à l'écran pour ne pas être masquée par la barre d'action ; le focus va sur « Annuler », Échap annule.
- L'appartenance du document est vérifiée **avant** l'état de la mise à jour : le document d'un autre employé donne toujours 404, sans rien révéler.
- La ligne est supprimée en base, puis le fichier sur disque.
- Test bout en bout ajouté à la fin de `e2e/us13-ajout-document.spec.js` (ajout puis suppression, vérifiée après rechargement).

## Hors périmètre

- Corbeille ou restauration.
