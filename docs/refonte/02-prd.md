# PRD — Refonte du portail employés

| | |
|---|---|
| **Version** | 0.1, en cours de rédaction (lot 0 du plan `01-audit-et-plan.md`) |
| **Date** | 2026-10-05 |
| **Point de départ** | Le besoin métier exprimé par la Direction RH / DIT, sans reprendre les décisions du MVP (`docs/01-prd.md`) ni de la V2 (`docs/v2/01-prd.md`), qui restent comme historique |

## 1. Problème

L'application actuelle fonctionne comme un simple formulaire d'envoi : rien ne donne envie à l'employé de l'utiliser, et les certificats reçus arrivent dans des dossiers qui peuvent être incomplets ou faux.

## 2. Objectifs

**Pour l'employé (objectif affiché)** : fournir son certificat est dans son intérêt :
1. ses demandes de promotion et de mobilité sont traitées plus vite, parce que son dossier est déjà complet et vérifié ;
2. il est repéré en interne pour les postes vacants grâce à ses qualifications réelles ;
3. il suit sa carrière : profil, qualifications, postes ouverts auxquels il est éligible, prochaines étapes.

**Pour l'institution** : chaque certificat arrive dans un dossier assaini. Le téléversement n'est possible que si les informations clés du dossier sont complètes et à jour. Ce verrou est présenté comme un service (« Complétons votre profil pour valoriser votre certificat »), jamais comme une sanction, et il n'est jamais trompeur : l'employé sait pourquoi il doit compléter son profil.

## 3. Dossier complet

Un dossier est **complet** quand tous les champs obligatoires ci-dessous sont renseignés, valides et confirmés par l'employé (R-01).

| Groupe | Champ | Origine | Règle |
|---|---|---|---|
| Identité | Nom, prénom, date de naissance, sexe | Export RH | Obligatoires ; l'employé les confirme |
| Coordonnées | Téléphone | Export RH, modifiable | Obligatoire |
| | Email | Export RH, modifiable | Facultatif |
| | Adresse | Export RH, modifiable | Obligatoire |
| Poste | Agence, direction, poste, date d'embauche | Export RH | Obligatoires ; l'employé les confirme ou **signale une erreur** (vérifiée par les RH), sans les modifier |
| Études | Niveau d'études | Saisi dans le portail | Obligatoire ; choisi dans une liste |
| Urgence | Contact d'urgence : nom, lien, téléphone | Saisi dans le portail | Obligatoire |

*À préciser : règles de format et de cohérence de chaque champ, liste des niveaux d'études, liste des liens du contact d'urgence, effet d'un signalement d'erreur sur le verrou.*

## 4. Fonctionnalités

*À rédiger après les décisions du §6.*

## 5. Hors périmètre

*À rédiger.*

## 6. Décisions

Les décisions du propriétaire du projet sont dans le **registre des décisions de cadrage v1.8** (`03-registre-decisions-lot0.md`), reçu le 2026-10-06, qui fait foi. Ce PRD sera réécrit à partir de ce registre (backlog `04-backlog-lot0.md`, élément B-08). Le §3 ci-dessus est remplacé par le Q1 du registre (contact d'urgence et niveau d'études obligatoires, email avec l'option « Je n'ai pas d'adresse email », nom et prénom hors verrou).
