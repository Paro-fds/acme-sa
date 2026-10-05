# US-35 — Trouver les employés d'un même poste

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E07 Recherche de profils |
| **Priorité** | MUST |
| **PRD** | F-43, RM-V2-08, RM-V2-09, D-18 |
| **Dépendances de code** | US-34 (`/admin/profils`, `SearchProfiles`, `ContactLinks`), `EmployeeRepository`, `normalize` |
| **API** | `GET /api/admin/positions` → `[{position, count}]` ; `GET /api/admin/profiles?q=&position=&position=&page=` |
| **Écran** | `/admin/profils` : filtre « Poste actuel » (`PositionFilter`) |

## Récit

> En tant qu'administrateur, je veux choisir un ou plusieurs postes et obtenir **tous** les employés qui les occupent, avec leur téléphone et leur email, afin de les contacter (ex. tous les caissiers).

## Règles

Solution Design §5, point 7.

- **Liste des postes** : valeurs distinctes de `position` chez les employés **actifs**, regroupées par `normalize` (variantes de majuscules ou d'accents fusionnées, la première orthographe rencontrée est affichée), avec le nombre d'employés ; ordre alphabétique ; postes vides ignorés.
- **Pas de fusion des variantes de mot** : « Caissier » et « Caissière » sont deux postes ; l'administrateur coche les deux (D-18).
- **Choix multiple** : un employé est retenu si son poste normalisé est **égal** à l'un des postes choisis (pas « contient » : « Agent de crédit » ne ramène pas « Agent de crédit senior »).
- **Poste seul** : tous les employés actifs de ces postes, **avec ou sans parcours**, triés par nom puis prénom ; aucun élément correspondant affiché.
- **Poste + mots-clés** : ceux de ces postes dont le parcours correspond (US-34), avec le classement d'US-34.
- Poste inconnu dans l'adresse : ignoré.
- Écran : `PositionFilter` à côté du champ de recherche ; liste à cases à cocher avec nombre d'employés, champ pour filtrer la liste des postes ; postes choisis affichés en étiquettes retirables ; conservés dans l'adresse (`?position=` répété) ; en-tête des résultats « **N** employés ».
- Chaque résultat : comme US-34 (nom, poste, agence, téléphone et email à jour avec « Appeler » / « Écrire », « Voir le dossier »).

## Critères d'acceptation

**CA-01 — Liste des postes**
Quand l'administrateur ouvre le filtre « Poste actuel »
Alors il voit notamment « Agent de recouvrement (2) », « Caissière (1) », « Agent de crédit (1) »
Et « Analyste » (seul EMP-I, inactif) n'y figure pas.

**CA-02 — Poste seul**
Quand il choisit « Agent de recouvrement » sans mot-clé
Alors EMP-D1 et EMP-D2 sont listés, triés par nom puis prénom, avec « 2 employés » en tête
Et chacun a ses liens « Appeler » et « Écrire » (si l'email est renseigné), même sans parcours.

**CA-03 — Plusieurs postes**
Quand il choisit « Caissière » et « Coursier »
Alors EMP-H2 et EMP-B sont listés.

**CA-04 — Poste + mots-clés**
Quand il choisit « Coursier » et cherche « anglais »
Alors EMP-B est listé (compétence « Anglais »)
Et quand il choisit « Agent de recouvrement » et cherche « anglais », aucun employé n'est listé.

**CA-05 — Variantes**
Étant donné (dépôt en mémoire) des employés actifs aux postes « Caissier », « caissier », « CAISSIER » et « Caissière »
Alors la liste des postes contient « Caissier (3) » et « Caissière (1) »
Et choisir « Caissier » ne ramène pas l'employé « Caissière ».

**CA-06 — Égalité, pas « contient »**
Étant donné (dépôt en mémoire) les postes « Agent de crédit » et « Agent de crédit senior »
Quand « Agent de crédit » est choisi
Alors seul l'employé « Agent de crédit » est listé.

**CA-07 — Adresse et navigation**
Quand il choisit deux postes, ouvre un dossier puis revient
Alors les deux postes, le terme et la page sont conservés.

**CA-08 — Sécurité**
Alors `GET /api/admin/positions` répond `401` sans session et `403` avec une session employé
Et aucun employé inactif n'est compté ni listé.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-35.1 | CA-05, CA-06 | Unitaire | `tests/unit/test_positions.py` | regroupement des postes, égalité normalisée, avec dépôt d'employés en mémoire (CSV de test inchangé) |
| T-35.2 | CA-02 → CA-04 | Unitaire | `tests/unit/test_profile_search.py` | poste seul, plusieurs postes, poste + mots-clés, tri |
| T-35.3 | CA-01 → CA-04, CA-08 | API | `tests/api/test_us35_positions.py` | liste des postes, filtre répété, inactifs exclus, 401 / 403 |
| T-35.4 | CA-01, CA-02, CA-07 | Composant | `src/features/admin/PositionFilter.test.jsx`, `ProfileSearchPage.test.jsx` | cases à cocher, filtre de la liste, étiquettes, adresse, compteur |

## Hors périmètre

- Fusion automatique des variantes d'un même métier (« Caissier » / « Caissière ») ; table de correspondance des postes.
- Filtre par agence ou par département.
- Export de la liste ou envoi groupé (RM-V2-09).
