# US-30 — Consulter le parcours d'un employé (admin)

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E06 Parcours professionnel |
| **Priorité** | MUST |
| **PRD** | F-37, RM-V2-03, RM-V2-04, D-11 |
| **Dépendances de code** | US-20 (dossier admin, `Block`), US-21 (aperçu des fichiers), US-25 (`CareerRepository`, `CareerEntryCard`) |
| **API** | `GET /api/admin/employees/{id}/career`, `GET /api/admin/career/entries/{id}/proof` |
| **Écran** | `/admin/employes/:id` : bloc « Parcours professionnel » |

## Récit

> En tant qu'administrateur, je veux voir le parcours d'un employé dans son dossier, et ouvrir ses justificatifs, afin de connaître ses qualifications et son expérience.

## Règles

- Bloc « Parcours professionnel » placé après « Documents », chargé avec le dossier ; les quatre rubriques dans l'ordre de `/parcours`, mêmes tris.
- Chaque élément affiche « Ajouté le … » ou « Modifié le … » (D-11) ; l'en-tête du bloc affiche « Parcours modifié le … » (`career_profile.last_changed_at`).
- Parcours vide : « Aucun élément déclaré. ».
- Rappel discret : « Informations déclarées par l'employé, non vérifiées. » (RM-V2-03).
- **Lecture seule** : `CareerEntryCard` sans `onEdit` ; aucune route admin d'écriture (RM-V2-04).
- Employé inactif ou inconnu : `404` (comme US-20) ; justificatif d'un employé devenu inactif : `404`.
- Le parcours est visible dès son enregistrement, sans brouillon ni envoi (D-11).

## Critères d'acceptation

**CA-01 — Parcours affiché**
Étant donné le parcours P-A (compétence, diplôme avec justificatif, expérience)
Quand l'administrateur ouvre `/admin/employes/1001`
Alors le bloc « Parcours professionnel » affiche les trois éléments dans leurs rubriques, avec « Ajouté le … »
Et « Parcours modifié le … » dans son en-tête.

**CA-02 — Justificatif**
Quand il touche « Voir le justificatif » du diplôme
Alors le PDF s'ouvre (image : aperçu plein écran `ImagePreview`)
Et `GET /api/admin/career/entries/{id}/proof` renvoie le fichier avec les en-têtes de sécurité.

**CA-03 — Parcours vide**
Étant donné EMP-E sans parcours
Alors le bloc affiche « Aucun élément déclaré. ».

**CA-04 — Lecture seule**
Alors aucun bouton « Ajouter », « Modifier » ou « Supprimer » n'est présent dans le bloc
Et `POST`, `PUT`, `DELETE` sur `/api/admin/employees/1001/career` et `/api/admin/career/entries/{id}…` répondent `405` ou `404`.

**CA-05 — Employé inactif**
Étant donné le parcours P-I d'EMP-I (inactif)
Quand l'administrateur appelle `GET /api/admin/employees/1006/career` ou le justificatif d'un de ses éléments
Alors la réponse est `404`.

**CA-06 — Contrôle d'accès**
Alors les deux routes répondent `401` sans session et `403` avec une session employé (test paramétré d'US-15).

**CA-07 — Visibilité immédiate**
Étant donné EMP-B qui ajoute une compétence
Quand l'administrateur recharge le dossier d'EMP-B
Alors la compétence apparaît, quel que soit l'état de la mise à jour de campagne d'EMP-B.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-30.1 | CA-05 | Unitaire | `tests/unit/test_admin_employee_career.py` | `GetEmployeeCareer` / `GetEmployeeProofFile` : actif seulement |
| T-30.2 | CA-01 → CA-07 | API | `tests/api/test_us30_admin_career.py` | contenu, fichier, 404, absence de routes d'écriture |
| T-30.3 | CA-06 | API | `tests/api/test_us15_admin_auth.py` | nouvelles routes couvertes automatiquement |
| T-30.4 | CA-01 → CA-04 | Composant | `src/features/admin/AdminCareer.test.jsx`, `EmployeeDetailPage.test.jsx` | bloc, dates, vide, aucun bouton d'action |

## Hors périmètre

- Commentaire, validation ou refus d'un élément par l'administration.
- Parcours dans la liste et le tableau de bord : E07.
