# US-1024 — Voir mon relevé PER entre deux dates et l'enregistrer en PDF

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Version du directeur du 2026-10-29 (`PAM_pour_Skin`) : `modele_authentification.md` (« Facilités du service »), `noyau.py` (`filtrer_releve`, `rendre_releve_pdf`), `pam.js` (`indiquerMois`, `afficher-releve`, `releve-pdf`) |
| **Règles** | — |
| **Décisions liées** | D-61 |

## Récit

> En tant qu'**employé**, je veux voir mon relevé PER entre deux dates et l'enregistrer en PDF, **afin de de justifier mon épargne sur une période précise**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Relevé PER » indique les mois déjà en base (« Photos en base : août 2026, septembre 2026. ») et propose deux dates, en jour/mois/année (« JJ / MM / AAAA ») : début = première photo, fin = aujourd'hui ou la dernière photo si elle est plus tard. Date illisible : « Indiquez le jour, le mois et l'année, par exemple 31/01/2026. » ; début après fin : « La date de début est postérieure à la date de fin. »
- **CA-02** « Afficher le relevé » garde les photos dont la date du rapport tombe dans l'intervalle, de la plus ancienne à la plus récente : pour chacune, le mois, « Au … · balance … · intérêt cumulé … » et le tableau des comptes (Compte, Ouverture, Balance, Intérêt), puis la mention d'authentification ; aucune : « Aucune photo PER entre ces deux dates. » Un mois absent n'est pas inventé.
- **CA-03** « Relevé en PDF » enregistre un fichier `Releve-PER-AAAA-MM-JJ-au-AAAA-MM-JJ.pdf` : en-tête de la fiche de paie sur chaque page (logo, « Direction des Ressources Humaines », « RELEVÉ PER » et la période à droite, filet indigo), nom et code, « Montants en USD. », les mêmes photos, puis « Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines. » ; seul le code de la session compte.

## Notes

Le PDF est écrit sans bibliothèque, comme celui du directeur (rien à ajouter au paquet Lambda). Remplace la liste complète de US-1012 sur la page « Relevé PER » (US-1023).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
