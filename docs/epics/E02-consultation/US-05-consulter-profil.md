# US-05 — Consulter son profil

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | E02 Consultation |
| **Priorité** | MUST |
| **PRD** | F-09 |
| **Dépendances de code** | `CsvEmployeeRepository`, session employé |
| **API** | `GET /api/me/profile` |
| **Écran** | `/profil` (maquette `mon_profil_collaborateur`) |

## Récit

> En tant qu'employé, je veux consulter mes informations afin de vérifier les données détenues par ACME.

## Règles

- Seuls les champs « affichés » et « modifiables » du PRD (§7.2) sont renvoyés.
- Après soumission, les champs modifiés affichent la **nouvelle** valeur (D-05).
- Sections : **Identité** (nom, prénom, sexe, date de naissance), **Coordonnées** (téléphone, email, adresse), **Informations professionnelles** (matricule, agence, département, poste, grade, niveau, contrat, date d'embauche).
- Les champs modifiables portent l'indication « Modifiable » ; les autres un cadenas.
- Les dates sont affichées au format `JJ/MM/AAAA` ; un champ vide affiche « Non renseigné ».

## Critères d'acceptation

**CA-01 — Affichage du profil**
Étant donné EMP-A connecté
Quand il ouvre « Mon profil »
Alors il voit son nom, prénom, matricule, agence et poste en haut de page
Et ses informations regroupées dans les trois sections.

**CA-02 — Uniquement ses propres données**
Étant donné EMP-A connecté
Quand il appelle `/api/me/profile`
Alors seules les données d'EMP-A sont renvoyées
Et aucune route ne permet de demander le profil d'un autre employé.

**CA-03 — Aucune donnée sensible**
Quand le profil est renvoyé
Alors la réponse ne contient aucune colonne exclue (comptes bancaires, dettes, licenciement, références, pièce d'identité, géolocalisation…).

**CA-04 — Champs vides**
Étant donné EMP-E dont l'email est vide
Quand il consulte son profil
Alors le champ email affiche « Non renseigné ».

**CA-05 — Valeurs après soumission**
Étant donné EMP-A ayant soumis le téléphone « +509 3722 2222 »
Quand il consulte son profil
Alors le téléphone affiché est « +509 3722 2222 ».

**CA-06 — Accès sans session**
Quand `/profil` est ouvert sans session
Alors l'utilisateur est redirigé vers l'identification.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-05.1 | CA-01 | API | `tests/api/test_us05_profile.py` | champs et sections renvoyés, dates ISO |
| T-05.2 | CA-02 | API | `tests/api/test_us05_profile.py` | connecté en EMP-B → données d'EMP-B uniquement |
| T-05.3 | CA-03 | API | `tests/api/test_us05_profile.py` | aucune clé ni valeur factice des colonnes exclues dans la réponse |
| T-05.4 | CA-05 | API | `tests/api/test_us05_profile.py` | nouvelle valeur après soumission |
| T-05.5 | CA-06 | API | `tests/api/test_us05_profile.py` | sans cookie → 401 |
| T-05.6 | CA-01, CA-04, CA-06 | Composant | `src/features/profile/ProfilePage.test.jsx` | sections, « Non renseigné », format de date, redirection |

## Hors périmètre

- Photo de l'employé (la colonne `has_photo` n'est pas exploitée ; un avatar avec initiales est affiché).
- Choix Oui/Non (US-08) et état de la mise à jour (US-06), présents sur le même écran.
