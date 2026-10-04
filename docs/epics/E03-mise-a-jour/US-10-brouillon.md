# US-10 — Sauvegarder et reprendre un brouillon

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E03 Mise à jour |
| **Priorité** | MUST |
| **PRD** | F-14 |
| **Dépendances de code** | Tables `employee_update` / `employee_change` |
| **API** | `PUT /api/me/update/changes`, `GET /api/me/update` |
| **Écran** | Toutes les étapes `/mise-a-jour/*` ; carte « En cours » de `/profil` |

## Récit

> En tant qu'employé, je veux sauvegarder mes modifications comme brouillon afin de reprendre la démarche plus tard sans rien perdre.

## Règles

- **Sauvegarde automatique** : 2 secondes après la dernière frappe sur un champ valide, et à chaque changement d'étape.
- **Sauvegarde manuelle** : bouton « Enregistrer comme brouillon », qui renvoie au profil.
- Indication permanente : « Brouillon enregistré automatiquement à HH:MM ».
- Les champs invalides ne sont pas sauvegardés (le reste l'est) : c'est l'écran qui n'envoie que les champs valides, l'API refusant en bloc toute requête contenant un champ invalide (US-09 CA-05).
- La reprise ramène à l'étape 1 avec les valeurs du brouillon.

## Critères d'acceptation

**CA-01 — Sauvegarde automatique**
Étant donné EMP-A à l'étape 1
Quand il modifie le téléphone et attend 2 secondes
Alors le changement est enregistré en base
Et le texte « Brouillon enregistré automatiquement à HH:MM » est mis à jour.

**CA-02 — Sauvegarde manuelle**
Quand il touche « Enregistrer comme brouillon »
Alors les modifications sont enregistrées
Et il revient à son profil, qui affiche « En cours ».

**CA-03 — Reprise**
Étant donné EMP-A avec un brouillon (téléphone et adresse modifiés)
Quand il se reconnecte et touche « Reprendre la mise à jour »
Alors l'étape 1 s'ouvre avec ses deux modifications.

**CA-04 — Champ invalide non sauvegardé**
Étant donné un téléphone invalide et une adresse valide modifiés
Quand la sauvegarde automatique se déclenche
Alors seule l'adresse est enregistrée
Et l'erreur reste affichée sur le téléphone.

**CA-05 — Échec réseau**
Quand la sauvegarde échoue (serveur injoignable)
Alors le message « Enregistrement impossible. Vérifiez votre connexion. » s'affiche
Et la saisie n'est pas perdue à l'écran
Et une nouvelle tentative est faite à la prochaine modification.

**CA-06 — Date de dernière modification**
Quand un brouillon est enregistré
Alors `updated_at` est mis à jour (utilisé par la carte « Dernière sauvegarde le … »).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-10.1 | CA-01, CA-03, CA-06 | API | `tests/api/test_us10_draft.py` | enregistrement partiel, relecture, `updated_at` |
| T-10.2 | CA-01, CA-04, CA-05 | Composant | `src/features/update/useAutosave.test.jsx` | délai 2 s (horloge simulée), seuls les champs valides envoyés, statut, erreur réseau |
| T-10.3 | CA-02, CA-03 | E2E | `e2e/us10-brouillon.spec.js` | modifier → enregistrer → déconnexion → reconnexion → reprise |
| T-10.4 | CA-01 → CA-05 | Composant | `src/features/update/InformationsStep.test.jsx` | heure affichée, bouton « Enregistrer comme brouillon », reprise, échec réseau |

## Notes de réalisation

- Logique dans `src/features/update/useAutosave.js` : n'envoie que les champs valides qui diffèrent de ce que le serveur a déjà enregistré ; `flush()` pour le changement d'étape et le bouton manuel.
- « Enregistrer comme brouillon » avec un champ invalide : les champs valides sont enregistrés et l'employé reste sur l'écran, l'erreur affichée, pour ne pas perdre silencieusement sa saisie.

## Hors périmètre

- Sauvegarde hors ligne (sans réseau).
- Plusieurs brouillons simultanés.
