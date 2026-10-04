# US-18 — Rechercher un employé

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E05 Administration |
| **Priorité** | MUST |
| **PRD** | F-25 |
| **Dépendances de code** | Liste des employés (US-17), `normalize()` |
| **API** | `GET /api/admin/employees?search=` |
| **Écran** | Barre de recherche en haut de `/admin/employes` |

## Récit

> En tant qu'administrateur, je veux rechercher un employé à l'aide d'une barre de recherche afin d'accéder rapidement à son dossier sans parcourir toute la liste.

## Règles

- Barre fixée en haut de la liste, placeholder « Rechercher par nom, prénom ou matricule… », icône loupe, bouton « effacer ».
- Recherche lancée 300 ms après la dernière frappe (pas de bouton à toucher).
- Terme normalisé (casse, accents, espaces) et comparé par « contient » à : nom, prénom, « nom prénom », « prénom nom », matricule, et nouveau nom/prénom soumis.
- Le terme est conservé dans l'URL (`?search=`) : retour arrière depuis un dossier = même recherche.
- Résultats paginés comme la liste ; retour à la page 1 à chaque nouvelle recherche.

## Critères d'acceptation

**CA-01 — Recherche par nom**
Quand l'admin tape « pierre »
Alors EMP-H1 et EMP-H2 s'affichent, et eux seuls
Et « 2 employés » est indiqué.

**CA-02 — Saisie partielle**
Quand il tape « jos »
Alors EMP-A (JOSEPH) s'affiche.

**CA-03 — Accents et casse ignorés**
Quand il tape « ETIENNE » ou « étienne »
Alors EMP-E (ÉTIENNE) s'affiche.

**CA-04 — Prénom + nom**
Quand il tape « jean joseph » ou « joseph jean »
Alors EMP-A s'affiche.

**CA-05 — Matricule**
Quand il tape le matricule d'EMP-B (ou une partie)
Alors EMP-B s'affiche.

**CA-06 — Nouveau nom**
Étant donné EMP-A ayant soumis le nom « JOSEPH-PAUL »
Quand il tape « paul »
Alors EMP-A fait partie des résultats.

**CA-07 — Aucun résultat**
Quand il tape « zzz »
Alors le message « Aucun employé ne correspond à votre recherche. » s'affiche avec un bouton « Effacer la recherche ».

**CA-08 — Effacer**
Quand il touche « effacer » (ou vide le champ)
Alors la liste complète réapparaît.

**CA-09 — Inactifs exclus**
Quand il tape « charles »
Alors EMP-I (inactif) n'apparaît pas.

**CA-10 — Mobile**
À 390 px, la barre occupe toute la largeur, reste visible en haut lors du défilement et ouvre le clavier avec la touche « Rechercher ».

**CA-11 — Retour depuis un dossier**
Étant donné une recherche « pierre » puis l'ouverture du dossier d'EMP-H1
Quand l'admin revient en arrière
Alors la recherche « pierre » et ses résultats sont toujours affichés.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-18.1 | CA-01 → CA-06, CA-09 | Unitaire | `tests/unit/test_employee_search.py` | correspondances (tableau de cas : terme → ids attendus) |
| T-18.2 | CA-01, CA-07, CA-09 | API | `tests/api/test_us18_search.py` | paramètre `search`, total, liste vide, inactifs absents |
| T-18.3 | CA-06 | API | `tests/api/test_us18_search.py` | nouveau nom soumis trouvé (fixture `submitted`) |
| T-18.4 | CA-07, CA-08, CA-11 | Composant | `src/features/admin/EmployeeSearch.test.jsx` | délai 300 ms, état vide, effacer, synchronisation avec l'URL |
| T-18.5 | CA-01, CA-10 | E2E | `e2e/us18-recherche-admin.spec.js` | recherche sur mobile, barre collante, ouverture d'un résultat |

## Notes de réalisation

- Règle de correspondance dans le domaine : `app/admin/domain/search.py` (`matches_search`), appliquée par `ListEmployees` **avant** la pagination. Les noms comparés sont ceux de la référence et, une fois soumis, les nouveaux (l'ancien nom reste donc trouvable) ; un nom en brouillon n'est pas cherchable. Terme vide (ou espaces) = tout le monde ; plus de 100 caractères → 422.
- Écran : `features/admin/EmployeeSearch.jsx` (`<form role="search">`, champ `type="search"`, `enterKeyHint="search"`, collé sous l'en-tête). La recherche part 300 ms après la dernière frappe, ou tout de suite avec Entrée (qui ferme aussi le clavier). Le terme va dans l'adresse en **remplaçant** l'entrée d'historique : un seul retour arrière quitte la liste, et le retour depuis un dossier retrouve la recherche (CA-11). Une nouvelle recherche supprime `?page=` et conserve les autres paramètres (`?status=` de US-19).
- Bouton « Effacer » dans le champ (vide et remet le focus) ; sans résultat : message + « Effacer la recherche », sans le compteur « 0 employé ».
- À 390 px, le texte d'aide (placeholder) imposé ne tient pas en entier à 16 px et est coupé (« … matricu »).
- E2E `e2e/us18-recherche-admin.spec.js` : barre pleine largeur et collante, recherche, aucun résultat, effacer, terme repris de l'adresse. Depuis US-20, le test ouvre aussi un résultat puis revient (retour du navigateur et bouton retour de l'en-tête) : la recherche est conservée (CA-11).

## Hors périmètre

- Recherche avancée multi-critères (agence, département, poste) : COULD V2.
- Combinaison avec le filtre de statut : couverte par US-19.
