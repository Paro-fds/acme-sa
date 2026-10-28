# US-1000 — Travailler sur une base Carrières fictive

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Plan PAM §3 (étape A) |
| **Règles** | P-11 |
| **Décisions liées** | D-49, D-50 (proposées, plan PAM) |

## Récit

> En tant que **développeur**, je veux une copie fictive des tables de Carrières que PAM lit ou écrit, créée et remplie par une commande, **afin de développer et tester PAM sans jamais toucher aux vraies données ni à la base de production**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Les tables de Carrières lues ou écrites par PAM (`employes`, `documents`, `fichiers_document`, `documents_competences`, `competences_dictionnaire`, `competences_postes`, `competences_pieces`, `vault_actifs`, `etat_vault`, `journal_audit`) sont décrites une seule fois dans le code, colonne par colonne comme dans le dictionnaire : type, longueur, obligation, clés, contraintes d'unicité.
- **CA-02** La commande `python -m app.tools.create_fake_carrieres` crée ces tables sur une base qui n'en a aucune et les remplit de données fictives, sur SQLite comme sur PostgreSQL.
- **CA-03** Elle refuse de s'exécuter avec `APP_ENV=production`, et sur une base qui contient déjà une table de Carrières : rien n'est créé ni modifié.
- **CA-04** Les données fictives couvrent : des employés actifs, un employé sorti avec sa date de sortie, un supérieur ; des pièces dans les quatre statuts ; des formations alignées ACME et hors référentiel ; des lettres de promotion, d'affectation et de blâme (avec gravité) ; un employé sans pièce validée, dont la quote est nulle ; un scan PDF, un JPEG et un PNG aux signatures réelles ; `vault_actifs` égal aux codes actifs ; `etat_vault` renseigné.
- **CA-05** Les codes sont ceux des employés fictifs de la suite de tests (AC-1001 → AC-1008), en majuscules et sans espace ; aucune donnée réelle.
- **CA-06** Les migrations Alembic du portail ignorent les tables de Carrières : comparées à une base qui les contient, elles ne proposent ni de les modifier ni de les supprimer.

## Notes

Source : *Dictionnaire de données — Carrières* v1.0 (2026-10-27), §3 à §14. Seules les tables lues ou écrites par PAM sont reproduites : `utilisateurs`, `profils_utilisateur` et `defis_otp` (comptes DRH) ne le sont pas. Quand le directeur fournira l'export du schéma (`pg_dump --schema-only`), les écarts seront corrigés. Le schéma `portail` (nos tables à part) viendra avec la recette (US-002).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
