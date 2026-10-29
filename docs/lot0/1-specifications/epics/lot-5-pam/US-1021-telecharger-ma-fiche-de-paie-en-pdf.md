# US-1021 — Télécharger ma fiche de paie en PDF

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Module du directeur (bouton « Télécharger la fiche de paie (PDF) », fiche_paie.py, /api/fiche.pdf) |
| **Règles** | — |
| **Décisions liées** | D-61 |

## Récit

> En tant qu'**employé**, je veux télécharger la fiche de paie d'un mois en PDF, **afin de de la garder ou de l'imprimer, par exemple pour une banque**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Sous le détail d'un bulletin, « Télécharger la fiche de paie (PDF) » enregistre `fiche-paie-AAAA-MM.pdf` pour ce mois.
- **CA-02** La fiche reprend celle du directeur, à nos couleurs : logo, « ACME SA », « Fiche de paie », nom, code employé, période, date de paie, gains, retenues, net à payer, charges employeur « pour information », et en pied « Document personnel. ACME SA. Ne le transmettez pas. » ; ni les lignes à zéro.
- **CA-03** La fiche vient du code de la session (aucun code dans l'adresse), seule la période AAAA-MM est demandée ; période inconnue ou mal écrite : « Aucun bulletin n'est disponible pour cette période. » ; sans session : refusé ; réponse jamais mise en cache.

## Notes

Comme le module du directeur (choix du 2026-10-28 : « fais comme il a fait »). Sa fiche montre les charges employeur « pour information », alors que l'écran (US-1020) ne les montre pas : repris tel quel, à confirmer (Q20). PDF écrit sans bibliothèque, comme `fiche_paie.py` (rien à ajouter au paquet Lambda). **Remplacée par US-1022 le 2026-10-29** : dans la version du directeur, la fiche est une page imprimable, plus un fichier.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
