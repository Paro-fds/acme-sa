# US-122 — Saisir un poste sans grade

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-803 |
| **Règles** | RG-72 |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux saisir un poste sans indiquer de grade, **afin de publier vite un poste sans une information que personne ne sait encore remplir**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** Le formulaire du poste n'a plus ni « Grade visé » ni le critère « Grade minimum » ; un poste s'enregistre et se publie sans grade.
- **CA-02** Le grade visé ne s'affiche plus : ni dans la liste des postes publiés, ni sur la fiche du poste côté RH, ni dans « Ma carrière » de l'employé.
- **CA-03** La visibilité d'un nouveau poste ne dépend plus du grade ; les autres critères (unités, domaines, niveau, ancienneté) fonctionnent comme avant.
- **CA-04** Les postes déjà saisis gardent leur valeur en base, sans l'afficher.

## Notes

Demande de l'utilisateur du 2026-10-15 (« ce n'est pas la peine de remplir le champ grade visé ») et choix du même jour : retirer les deux champs de grade et l'affichage du grade visé. ❓ Tous les employés ont un grade, mais sa gestion n'est pas connue (utilisateur) : à demander à la DRH avant de réintroduire un critère de grade. Écart avec US-802 (grade visé obligatoire) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
