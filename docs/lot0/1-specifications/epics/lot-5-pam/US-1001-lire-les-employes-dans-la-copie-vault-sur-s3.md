# US-1001 — Lire les employés dans la copie Vault sur S3

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Plan PAM §3 (étape A) ; ENF-13 |
| **Règles** | P-11, D-01 |
| **Décisions liées** | D-51 |

## Récit

> En tant que **portail**, je veux lire la liste des employés dans la copie Vault déposée sur S3, celle que Carrières lit aussi, **afin que PAM et Carrières voient les mêmes employés, sans qu'aucun export ne soit posé sur un disque en production**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Avec `VAULT_S3_BUCKET`, les employés sont lus dans l'objet `VAULT_S3_KEY` (par défaut `vault/vault-employee-list.csv`), avec les règles d'aujourd'hui : liste blanche des colonnes (P-11), employés actifs seulement, dates MM/JJ/AAAA.
- **CA-02** Sans seau, le fichier `ACME_CSV_PATH` est lu (poste du développeur, tests). En `demo` et `recette`, le jeu fictif reste imposé, même si un seau est configuré. En `production`, sans seau, le portail refuse de démarrer : un export posé sur le disque n'est jamais lu.
- **CA-03** Quand la copie change (ETag de l'objet, date du fichier), la liste est rechargée sans redémarrer ; la vérification a lieu au plus une fois toutes les 5 minutes.
- **CA-04** Si une relecture échoue, la dernière liste lue reste en service et l'échec est journalisé sans aucune donnée d'employé. Si la première lecture échoue, le portail ne démarre pas.
- **CA-05** Comme Carrières, la colonne `active` vaut vrai pour `true`, `1`, `oui`, `vrai`, `yes` ou `y` (sans tenir compte de la casse), et le séparateur peut être la virgule ou le point-virgule.

## Notes

Précisé le 2026-10-27 : la table `employes` de Carrières n'a ni date de naissance, ni téléphone, ni genre, ni grade ; PAM lit donc la copie Vault elle-même, comme le demandait le directeur (« la liste des employés doit venir du fichier Vault »). La table `employes` ne sert qu'à rattacher les pièces (US-1007), par le code employé. Droit à demander pour le rôle Lambda : `s3:GetObject` sur `vault/vault-employee-list.csv` du seau `acme-prospection-data`.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
