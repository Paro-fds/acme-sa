# US-121 — Publier un poste à partir de la matrice des postes du directeur

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-803, EF-804 |
| **Règles** | RG-72 |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux choisir un poste dans la liste officielle des postes d'ACME, avec son code, son département, son service et ses compétences, **afin de publier un poste qui porte le vrai code ACME et que l'employé sache quelles compétences on attend de lui**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** Le catalogue des postes ACME est la matrice des postes du directeur (84 postes) : chaque poste montre son code (vide s'il n'en a pas), son intitulé, son département, son service et ses compétences.
- **CA-02** Le département remplace le domaine partout où celui-ci servait : il s'affiche sur le poste, filtre le catalogue et propose les domaines de diplôme à cocher.
- **CA-03** Quand une description de poste détaillée porte le même intitulé, l'aperçu montre aussi ses rubriques (missions, qualifications…) et son niveau demandé ; sinon le niveau est « Non précisé ».
- **CA-04** « Publier ce poste » pré-remplit en plus le code du poste avec le code de la matrice ; tout reste modifiable.
- **CA-05** L'employé qui voit le poste lit son département et ses compétences, puis les rubriques de la description quand elle existe.
- **CA-06** Les descriptions de poste sans poste dans la matrice ne sont plus proposées ; un poste déjà publié à partir d'une ancienne fiche reste affiché tel qu'il a été saisi.

## Notes

Choix de l'utilisateur du 2026-10-15 : la codification de la matrice du directeur fait foi, sa base SQLite (matrice_competences.sqlite, sans donnée de personne) est la source de vérité pour publier un poste ; les descriptions HTML complètent les postes de même intitulé ; « le département a le même sens que le domaine » ; compétences dans le catalogue RH et sur la fiche employé ; la base entre dans le dépôt et la démo en ligne. Domaines de diplôme proposés par département : proposition du développeur, à valider par la DRH. Remplace la source d'US-119 (fiches et tableau poste → domaine). Hors périmètre : le lien avec les codes de poste de l'export RH (aucun code commun) et les compétences comme critère de visibilité. Nouveau par rapport au registre : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
