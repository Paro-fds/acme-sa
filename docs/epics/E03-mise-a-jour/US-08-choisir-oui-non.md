# US-08 — Choisir de mettre à jour ou non

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | E03 Mise à jour |
| **Priorité** | MUST |
| **PRD** | F-12 |
| **Dépendances de code** | Table `employee_update`, session employé |
| **API** | `POST /api/me/update/decision` |
| **Écran** | Carte « Souhaitez-vous mettre à jour votre dossier ? » sur `/profil` |

## Récit

> En tant qu'employé, je veux indiquer si je souhaite mettre à jour mon dossier afin de ne faire la démarche que si c'est nécessaire.

## Règles

- « Oui » : crée (ou réactive) la mise à jour en `DRAFT`, `accepted = true`, et ouvre l'étape 1.
- « Non » : enregistre `accepted = false` ; l'employé reste sur son profil en consultation. Le statut admin reste « non effectuée ».
- Après un « Non », l'employé peut choisir « Oui » plus tard.
- Impossible après soumission.

## Critères d'acceptation

**CA-01 — Oui**
Étant donné EMP-A sans mise à jour
Quand il touche « Oui, mettre à jour mon dossier »
Alors une mise à jour en brouillon est créée
Et l'étape 1 « Informations » s'affiche.

**CA-02 — Non**
Étant donné EMP-A sans mise à jour
Quand il touche « Non, consulter uniquement »
Alors `accepted = false` est enregistré
Et il reste sur son profil avec le message « C'est noté. Vous pourrez mettre à jour votre dossier à tout moment. ».

**CA-03 — Changer d'avis**
Étant donné EMP-A ayant répondu « Non »
Quand il touche « Oui »
Alors une mise à jour en brouillon est ouverte.

**CA-04 — Après soumission**
Étant donné EMP-A ayant soumis
Quand une décision est envoyée
Alors la réponse est `409 UPDATE_ALREADY_SUBMITTED`
Et la question n'est plus affichée sur le profil.

**CA-05 — Oui avec un brouillon existant**
Étant donné EMP-A avec un brouillon contenant des modifications
Quand il envoie de nouveau « Oui »
Alors le brouillon existant est conservé (pas de remise à zéro).

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-08.1 | CA-01, CA-02, CA-03, CA-05 | API | `tests/api/test_us08_decision.py` | état en base après chaque décision |
| T-08.2 | CA-04 | API | `tests/api/test_us08_decision.py` | 409 après soumission |
| T-08.3 | CA-01 → CA-04 | Composant | `src/features/profile/DecisionCard.test.jsx` | boutons, navigation, message, masquage après soumission |

## Hors périmètre

- Motif du refus.
