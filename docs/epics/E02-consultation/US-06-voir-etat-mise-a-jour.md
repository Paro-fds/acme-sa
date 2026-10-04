# US-06 — Voir l'état de sa mise à jour

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E02 Consultation |
| **Priorité** | MUST |
| **PRD** | F-10 |
| **Dépendances de code** | Table `employee_update`, session employé |
| **API** | `GET /api/me/update` (et objet `update` de `GET /api/me/profile`, champ `state`) |
| **Écran** | Carte d'état en haut de `/profil` |

## Récit

> En tant qu'employé, je veux savoir où en est ma mise à jour afin d'être sûr que mon dossier a été pris en compte.

## Règles

Trois états côté employé (l'admin n'en voit que deux, cf. Solution Design §6.1) :

| État employé | Condition | Affichage |
|---|---|---|
| `NOT_DONE` | aucune mise à jour, ou réponse « Non » | Pastille grise « Non effectuée » + question Oui/Non (US-08) |
| `IN_PROGRESS` | brouillon | Pastille orange « En cours » + « Dernière sauvegarde le … à … » + bouton « Reprendre la mise à jour » |
| `DONE` | soumise | Pastille verte « Effectuée » + « Mise à jour soumise le … » ; plus de bouton de modification |

## Critères d'acceptation

**CA-01 — Non effectuée**
Étant donné EMP-A sans mise à jour
Quand il ouvre son profil
Alors il voit « Non effectuée » et la question « Souhaitez-vous mettre à jour votre dossier ? ».

**CA-02 — En cours**
Étant donné EMP-A avec un brouillon sauvegardé le 04/10/2026 à 14:32
Quand il ouvre son profil
Alors il voit « En cours », « Dernière sauvegarde le 04/10/2026 à 14:32 » et le bouton « Reprendre la mise à jour ».

**CA-03 — Effectuée**
Étant donné EMP-A ayant soumis le 04/10/2026 à 15:10
Quand il ouvre son profil
Alors il voit « Effectuée » et « Mise à jour soumise le 04/10/2026 à 15:10 »
Et aucun bouton ne permet de modifier le dossier.

**CA-04 — Réponse « Non »**
Étant donné EMP-A ayant répondu « Non »
Quand il ouvre son profil
Alors il voit « Non effectuée » et peut encore choisir « Oui ».

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-06.1 | CA-01 → CA-04 | Unitaire | `tests/unit/test_update_state.py` | calcul de l'état employé pour chaque situation |
| T-06.2 | CA-01 → CA-04 | API | `tests/api/test_us06_update_state.py` | `update.state`, dates renvoyées selon les fixtures `draft` / `submitted` |
| T-06.3 | CA-01 → CA-04 | Composant | `src/features/profile/UpdateStateCard.test.jsx` | pastille, textes, boutons selon l'état |

## Hors périmètre

- Historique de plusieurs campagnes.
