# US-1014 — Saisir la date en huit chiffres

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | pam/pam/modele_authentification.md (porte 1) |
| **Règles** | — |
| **Décisions liées** | D-60 |

## Récit

> En tant qu'**employé**, je veux taper ma date de naissance en huit chiffres dans un champ masqué, **afin que personne ne la lise par-dessus mon épaule et que je la saisisse vite au téléphone**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Un seul champ « Date de naissance », masqué comme un mot de passe, au clavier numérique, avec Afficher / Masquer et l'exemple « 27101990 pour le 27 octobre 1990 ».
- **CA-02** Le navigateur ne garde que les chiffres, au plus huit ; « Continuer » s'active à huit chiffres.
- **CA-03** Le serveur lit JJMMAAAA (séparateurs ignorés, huit chiffres exigés) et compare en temps constant : une date incomplète, impossible ou fausse reçoit « Informations incorrectes. » et compte comme un échec.

## Notes

Modèle d'authentification du directeur (2026-10-28). Remplace les trois cases Jour / Mois / Année d'US-110.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
