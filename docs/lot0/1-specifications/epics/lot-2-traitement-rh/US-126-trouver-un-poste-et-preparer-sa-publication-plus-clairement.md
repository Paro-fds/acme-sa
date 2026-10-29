# US-126 — Trouver un poste et préparer sa publication plus clairement

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-803 |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux trouver d'abord les postes dont l'intitulé commence par ce que je cherche, et comprendre que la publication vient après le formulaire, **afin de publier le bon poste sans hésiter**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** Dans « Catalogue des postes ACME », les résultats d'une recherche sont rangés en trois groupes, dans l'ordre alphabétique à l'intérieur de chacun : l'intitulé commence par la recherche (« Directeur administratif » pour « directeur ») ; puis un mot de l'intitulé commence par chaque mot cherché (« Assistant directeur administratif ») ; puis l'intitulé contient seulement les mots cherchés. Sans recherche, l'ordre alphabétique ne change pas.
- **CA-02** La recherche ignore toujours les accents et les majuscules ; le filtre par département et le nombre « n postes sur N » ne changent pas.
- **CA-03** Dans le formulaire d'un nouveau poste (hors catalogue ou à partir du catalogue), le bouton « Enregistrer le brouillon » devient « Suivant » : il enregistre le brouillon et mène à la fiche du poste, où se joint la lettre du directeur RH avant « Publier » (US-124). La modification d'un poste existant garde « Enregistrer ».

## Notes

Demande de l'utilisateur du 2026-10-19 : « au moment de faire la recherche on devrait voir les directeurs avant » ; ordre en trois groupes proposé et validé le même jour. Pour la lettre : « je l'ai vu, mais à la place de Enregistrer mettez plutôt Suivant » ; la lettre reste sur la fiche du poste.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
