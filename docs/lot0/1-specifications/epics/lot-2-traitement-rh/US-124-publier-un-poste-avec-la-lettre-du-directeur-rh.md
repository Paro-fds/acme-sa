# US-124 — Publier un poste avec la lettre du directeur RH

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-803, EF-804 |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux publier moi-même un poste en joignant la lettre que m'a donnée le directeur RH, **afin que le poste soit ouvert sans attendre un Administrateur, tout en gardant la preuve de l'accord du directeur**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** L'Agent RH publie un brouillon, saisi hors catalogue ou à partir du catalogue, à condition de joindre la lettre du directeur RH (PDF, JPG ou PNG, contrôlée sur son contenu réel, 5 Mo au plus) ; sans lettre, la publication est refusée avec un message qui le dit.
- **CA-02** L'Administrateur publie toujours, avec ou sans lettre ; seul l'Administrateur clôture un poste ou le marque pourvu.
- **CA-03** La fiche du poste montre la lettre jointe (nom, date, auteur) ; un compte Administrateur (celui du directeur RH) l'ouvre quand il le veut, sans rien bloquer ; chaque ouverture est inscrite au journal d'audit.
- **CA-04** La lettre est jointe au moment de la publication et ne se change plus ensuite ; l'historique du poste dit qui l'a jointe et quand.
- **CA-05** Espace de gestion : le menu dit « Postes à pourvoir » ; l'écran s'intitule « Publication de postes », sans sous-titre ; le bouton dit « Saisir un poste hors catalogue ». La page « Postes ouverts » de l'employé ne change pas.

## Notes

Demande de l'utilisateur du 2026-10-17 : « pour qu'un agent puisse publier un poste il faut qu'il ait une lettre qui sera donnée par le directeur RH ; il faut que le directeur puisse aussi vérifier la lettre s'il en a envie ». Choix du même jour : l'Agent RH publie seul avec la lettre ; lettre = fichier joint ; le directeur RH consulte avec un compte Administrateur, sans valider ; lettre exigée de l'Agent RH pour tous les postes ; l'Administrateur publie sans lettre ; clôture et « Pourvu » restent à l'Administrateur ; sous-titre supprimé. Tout compte qui consulte les postes (Administrateur, Agent RH, Lecture seule) peut ouvrir la lettre, comme le CV d'une candidature. Écart avec US-802 (« seul l'Administrateur publie ») : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
