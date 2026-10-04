# US-16 — Voir le tableau de bord

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E05 Administration |
| **Priorité** | MUST |
| **PRD** | F-23 |
| **Dépendances de code** | `EmployeeRepository`, table `employee_update`, session admin |
| **API** | `GET /api/admin/statistics` |
| **Écran** | `/admin` |

## Récit

> En tant qu'administrateur, je veux voir combien d'employés ont effectué leur mise à jour afin de suivre l'avancement de la campagne.

## Règles

- Population : employés actifs du CSV.
- `total` = nombre d'employés actifs ; `updated` = mises à jour `SUBMITTED` ; `not_updated` = `total − updated` ; `progress` = `updated / total` en %, arrondi à l'entier.
- Écran : 3 cartes (Total, Effectuées, Non effectuées) + barre de progression « X % de la campagne ».
- Raccourcis : chaque carte ouvre la liste filtrée correspondante (US-19).

## Critères d'acceptation

**CA-01 — Statistiques**
Étant donné le CSV de test (7 employés actifs), EMP-A soumis, EMP-B en brouillon, EMP-H1 ayant répondu « Non »
Quand l'admin ouvre le tableau de bord
Alors il voit Total 7, Effectuées 1, Non effectuées 6, progression 14 %.

**CA-02 — Brouillon invisible**
Dans la situation CA-01
Alors le brouillon d'EMP-B est compté dans « Non effectuées » et aucune mention de brouillon n'apparaît.

**CA-03 — Inactifs exclus**
Alors EMP-I (inactif) n'est compté nulle part.

**CA-04 — Campagne non démarrée**
Étant donné aucune mise à jour soumise
Alors Effectuées 0 et progression 0 %, sans erreur.

**CA-05 — Données à jour**
Étant donné le tableau de bord ouvert
Quand un employé soumet sa mise à jour puis que l'admin actualise la page
Alors les chiffres sont mis à jour.

**CA-06 — Raccourcis**
Quand l'admin touche la carte « Non effectuées »
Alors la liste des employés s'ouvre filtrée sur « Non effectuée ».

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-16.1 | CA-01 → CA-04 | Unitaire | `tests/unit/test_statistics.py` | calcul et arrondi, division par zéro impossible |
| T-16.2 | CA-01 → CA-05 | API | `tests/api/test_us16_statistics.py` | valeurs avec les fixtures `submitted` / `draft` |
| T-16.3 | CA-01, CA-06 | Composant | `src/features/admin/DashboardPage.test.jsx` | cartes, barre, liens filtrés |

## Hors périmètre

- Indicateurs détaillés (par agence, par département) : SHOULD V1.1.
- Rafraîchissement automatique en temps réel.
