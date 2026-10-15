# US-115 — Choisir qui verra un poste

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D3 Certificats |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-803, EF-805 |
| **Règles** | RG-72 |
| **Décisions liées** |  |

## Récit

> En tant qu'**Agent RH**, je veux réserver un poste à une ou plusieurs agences et à un ou plusieurs domaines, en voyant combien d'employés le verront, **afin de publier seul un poste qui touche les bonnes personnes, sans en publier un que personne ne voit**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** « Visible seulement par les employés de… » accepte une ou plusieurs unités du référentiel ; une région ou une direction inclut toutes ses agences ; sans choix, toutes les unités.
- **CA-02** « Domaines acceptés » accepte un ou plusieurs domaines : l'employé doit avoir un certificat validé par les RH dans l'un d'eux (au niveau minimum, s'il est demandé).
- **CA-03** Un employé ne voit le poste que s'il remplit tous les critères ; les postes déjà enregistrés gardent leur unité et leur domaine.
- **CA-04** L'aperçu de l'audience affiche, à chaque changement de critère, combien d'employés verront le poste et combien chaque critère en écarte, sur les seules données validées.
- **CA-05** Si personne ne verrait le poste, un avertissement le dit ; l'enregistrement reste possible.

## Notes

Suggestion du directeur rapportée le 2026-10-12 (« affecter telle demande à telle agence », « les postes devraient être aussi par domaine ») et choix de l'utilisateur sur la maquette « Postes ouverts : qui verra le poste » : plusieurs unités, plusieurs domaines, aperçu de l'audience détaillé, simple avertissement si personne ne voit le poste. Le domaine reste celui d'un certificat validé, pas une compétence déclarée. Questions ouvertes au directeur : plusieurs agences et plusieurs domaines pour un même poste.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
