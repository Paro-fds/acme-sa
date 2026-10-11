# US-801 — Voir les postes auxquels je suis éligible

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | D8 Carrière et postes |
| **Lot** | 4 |
| **Priorité** | Must |
| **Exigences** | EF-801, EF-805, EF-806 |
| **Règles** | RG-72 |
| **Décisions liées** | D-24 |

## Récit

> En tant qu'**employé**, je veux voir dans « Ma carrière » les postes ouverts et si j'y suis éligible, **afin de savoir ce qui me manque pour progresser**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** Chaque poste porte un indicateur vert (éligible) ou orange (pas encore), avec un texte, pas seulement une couleur.
- **CA-02** Orange : le portail dit ce qui manque (« Il vous manque un certificat de niveau Licence validé »).
- **CA-03** Seules les données validées comptent ; l'indicateur informe et ne décide jamais.
- **CA-04** Je peux toujours manifester mon intérêt ; s'il est orange, il est marqué « hors critères ».

## Notes

Choix de l'utilisateur du 2026-10-11 : pour l'instant, un poste publié et ouvert (date d'ouverture atteinte, date limite non passée) n'apparaît dans « Ma carrière » (`/carriere`) qu'aux employés aptes, qui remplissent tous ses critères : certificat validé du niveau et du domaine demandés, ancienneté dans l'institution, ancienneté dans le poste, grade, unité (agence, région, direction). Seules les données validées comptent (CA-03, fait). L'ancienneté dans le poste part de la date d'embauche tant que l'historique des mouvements manque (EF-907, US-903). Restent à décider avec l'utilisateur : l'indicateur orange avec ce qui manque (CA-01, CA-02 ; la règle `missing` le calcule déjà) et la manifestation d'intérêt (CA-04).

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
