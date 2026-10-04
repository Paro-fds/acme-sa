# US-11 — Vérifier ses modifications

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E03 Mise à jour |
| **Priorité** | MUST |
| **PRD** | F-15 |
| **Dépendances de code** | `GET /api/me/update`, `GET /api/me/documents` |
| **API** | `GET /api/me/update` |
| **Écran** | `/mise-a-jour/verification` — étape 3 (maquette `mise_jour_r_capitulatif`) |

## Récit

> En tant qu'employé, je veux relire toutes mes modifications avant de les soumettre afin d'éviter une erreur.

## Règles

- Pour chaque champ modifié : composant « Ancienne → Nouvelle » (ancienne valeur grisée et barrée, nouvelle en gras sur fond vert pâle).
- Liste des documents ajoutés, ou « Aucun document joint (optionnel) ».
- Texte d'information : « Ces modifications seront transmises à l'administration ACME pour mise à jour de votre dossier. »
- Lien « Revenir en arrière et modifier » vers l'étape 1.

## Critères d'acceptation

**CA-01 — Récapitulatif des changements**
Étant donné EMP-A avec téléphone et adresse modifiés
Quand il ouvre l'étape 3
Alors il voit « 2 modifications en attente »
Et pour chacune l'ancienne et la nouvelle valeur.

**CA-02 — Documents**
Étant donné EMP-A avec un diplôme ajouté
Quand il ouvre l'étape 3
Alors le diplôme est listé dans « Justificatifs joints ».

**CA-03 — Aucun document**
Étant donné EMP-A sans document
Alors « Aucun document joint (optionnel) » s'affiche, sans bloquer la soumission.

**CA-04 — Aucune modification**
Étant donné EMP-A sans aucun champ modifié
Quand il ouvre l'étape 3
Alors le message « Vous n'avez modifié aucune information. Vous pouvez confirmer que vos informations sont exactes. » s'affiche
Et la soumission reste possible (confirmation que le dossier est à jour).

**CA-05 — Retour à la modification**
Quand il touche « Revenir en arrière et modifier »
Alors l'étape 1 s'ouvre avec ses modifications intactes.

**CA-06 — Valeur vide d'origine**
Étant donné EMP-E ayant ajouté un email
Alors l'ancienne valeur est affichée « Non renseigné ».

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-11.1 | CA-01, CA-02 | API | `tests/api/test_us11_review.py` | `GET /api/me/update` renvoie libellés, anciennes et nouvelles valeurs |
| T-11.2 | CA-01 → CA-06 | Composant | `src/features/update/ReviewStep.test.jsx` | comparaisons, documents, cas vides, lien retour |
| T-11.3 | CA-01 | Composant | `src/components/ValueComparison.test.jsx` | rendu ancienne/nouvelle valeur, « Non renseigné » |

## Hors périmètre

- La case de confirmation et la soumission (US-12).
