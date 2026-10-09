# PRD — Portail carrière ACME SA (refonte)

| | |
|---|---|
| **Version** | 2.1, 2026-10-09 : ancien parcours retiré côté employé (US-206) |
| **Rôle** | Le quoi et le pourquoi, en court. Le détail est dans le cahier des charges : ce PRD n'en recopie aucune table, il y renvoie. |
| **Fait foi** | Le registre des décisions v1.8 (`lot0/0-cadrage/registre-des-decisions-v1.8.md`), puis le cahier des charges (`lot0/1-specifications/cahier-des-charges.md`) |
| **Remplace** | Le PRD du MVP (v1.0) et celui de la V2 (v1.2), retirés de la branche `v2` le 2026-10-08 ; ils restent dans l'historique git et sur la branche `main` |

## 1. Problème

Le premier portail (MVP) fonctionnait comme un simple formulaire d'envoi : rien ne donnait envie à l'employé de l'utiliser, et les documents reçus pouvaient être incomplets ou faux (cahier §1).

## 2. Objectif

> Obtenir de chaque employé un **dossier complet, vérifié et à jour**, avec ses **certificats validés**, pour que les RH décident vite et bien des promotions, des mobilités et des postes vacants, en donnant à l'employé une **vraie raison personnelle**, et du plaisir, à le faire.

Trois besoins s'emboîtent : des données fiables, des qualifications prouvées, une raison de participer. Le **verrou** les relie : le dépôt de certificats s'ouvre quand le dossier est complet ; il est présenté comme un service, jamais comme une sanction (cahier §2.2).

## 3. Critères de réussite

Six critères classés, avec leur mesure : cahier §2.3. Le premier : un agent RH trouve en une minute tous les titulaires d'une Licence en comptabilité d'une région.

## 4. Utilisateurs

L'employé, l'Agent RH, le responsable du référentiel, l'Administrateur (M. Hilaire, DRH) et la Lecture seule. Qui ils sont, ce qu'ils font et ce qu'ils y gagnent : cahier §4.

## 5. Périmètre par lot

| Lot | But | Stories |
|---|---|---|
| Démonstrateur | Montrer tôt à la direction générale ce qui se construit, sur données fictives (D-40) | US-001 |
| 1. Parcours « certificat » | Un employé complète son profil et dépose ses certificats | 16 stories |
| 2. Traitement RH | Les RH valident, pilotent et enregistrent les demandes | 14 stories |
| 3. Mise en service | Le portail est hébergé, sécurisé et annoncé | 5 stories |
| 4. Carrière et engagement | L'employé voit ses postes éligibles et suit ses demandes | 7 stories |
| Lot distinct | Lettres de promotion et retour au système RH | 2 stories |

La liste des stories, leurs statuts et les enchaînements à respecter sont dans l'index des epics (`lot0/1-specifications/epics/README.md`). Le contenu de chaque lot et ses sources sont au cahier §3.1 ; le hors périmètre au cahier §3.2.

## 6. Où sont les exigences

| Quoi | Où |
|---|---|
| Exigences fonctionnelles (EF) et non fonctionnelles (ENF) | Cahier des charges §6 et §9 |
| Règles métier (RG), une seule fois chacune | `lot0/1-specifications/tableau-unique-des-regles.md` |
| Décisions (D) et leur état | `lot0/1-specifications/decisions-a-valider.md` |
| Modèle de données | `lot0/3-modele-de-donnees/modele-de-donnees.md` |
| Écrans | Validés par M. Hilaire (D-47) : espace employé `lot0/2-maquettes/2-espace-employe-ecrans/`, espace RH `lot0/2-maquettes/3-espace-rh-ecrans/` |
| Epics et user stories | `lot0/1-specifications/epics/` (10 epics D0 → D9, 45 stories) |

## 7. Ce qui reste du MVP et de la V2

Le code de la refonte part de celui du MVP. Ces fonctions existent encore ; aucune n'est dans le cahier des charges sous cette forme.

| Fonction héritée | Écrans | Ce qu'on en fait |
|---|---|---|
| Parcours « mise à jour » en 4 étapes (Oui / Non, brouillon, vérification, envoi) | — | **Retiré** côté employé par US-206 (2026-10-09) ; ses envois restent lus par les écrans RH du MVP |
| Documents joints à la mise à jour | — | **Retirés** côté employé par US-206 ; remplacés par les certificats (US-301 → US-305) ; les documents déjà joints restent lus par les RH |
| Écrans RH du MVP : tableau de bord, liste, recherche, filtre, dossier, réinitialisation, comptes | `/admin/*` | Remplacés au lot 2 (US-103, US-104, US-401 → US-403, US-601 → US-604) |
| « Mon parcours » (V2) : diplômes, formations, expériences, compétences | `/parcours` | **À décider** (D-44) : gardé, remplacé par les certificats, ou repris par US-803 |

## 8. Décisions ouvertes depuis le cahier

D-41 (envoi des codes WhatsApp et email), D-42 (double authentification RH avancée au démonstrateur), D-43 (texte de la mention d'information), D-44 (« Mon parcours »), D-45 (liste des domaines d'un certificat). Toutes dans `decisions-a-valider.md`.

## 9. Documents suivants

- `02-solution-design.md` : le comment (architecture, modules, données, API, sécurité).
- `03-plan-implementation.md` : l'ordre de réalisation, le démonstrateur, le jeu de test et la Definition of Done.
