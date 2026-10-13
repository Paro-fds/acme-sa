# US-117 — Créer un poste sans le référentiel

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-803, EF-804 |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux créer et publier un poste même si le référentiel des unités n'est pas encore importé, **afin de montrer et utiliser les postes ouverts sans attendre le référentiel officiel**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** Tant que le référentiel n'est pas importé, « Unité du poste » est un texte libre (par exemple « Agence de Pétion-Ville »), obligatoire, de 120 caractères au plus.
- **CA-02** Le formulaire dit que le référentiel n'est pas encore importé et que, sans unité choisie, le poste est proposé à tous les employés qui remplissent les autres critères ; « Visible seulement par les employés de… » ne s'affiche pas.
- **CA-03** Les autres critères (niveau, domaines, ancienneté, grade) fonctionnent comme avant ; l'unité saisie s'affiche telle quelle sur la fiche et pour les employés.
- **CA-04** Dès que le référentiel est importé, l'unité se choisit de nouveau dans la liste officielle, comme en US-802 et US-115.

## Notes

Choix de l'utilisateur du 2026-10-13 (option B), pour la démonstration au directeur : le référentiel officiel n'est pas encore fourni et « Référentiel » / « À rattacher » sont retirés des menus le même jour (l'écran reste joignable par le tableau de bord). Les codes d'agence de l'export (option A) et ses directions et services (doublons, voir B-01) ne sont pas utilisés. Exception à « l'unité vient du référentiel » d'US-802 : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
