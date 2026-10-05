# Epics et user stories

Entrées : `01-prd.md` v1.0, `02-solution-design.md` v1.0.

Chaque user story est **indépendante** : elle déclare ses préconditions, que les tests installent eux-mêmes via des fixtures (base SQLite vide + CSV de test). Aucune story n'a besoin qu'une autre soit déjà testée pour être vérifiée. Les dépendances indiquées dans les stories sont des dépendances de **code** (ce qui doit exister pour implémenter), pas de **test**.

## Statut des epics

Un epic est **Fait** quand toutes ses stories sont « Fait » ; **En cours** dès qu'une story est commencée ; sinon **Pas encore**.

| Epic | Statut |
|---|---|
| [E01 Identification](E01-identification/README.md) | Fait |
| [E02 Consultation](E02-consultation/README.md) | Fait |
| [E03 Mise à jour](E03-mise-a-jour/README.md) | Fait |
| [E04 Documents](E04-documents/README.md) | Fait |
| [E05 Administration](E05-administration/README.md) | Fait |

## Index

| Epic | Story | Titre | Fonctionnalités PRD | Priorité | Statut |
|---|---|---|---|---|---|
| **E01 Identification** | [US-01](E01-identification/US-01-verifier-identite.md) | Vérifier son identité | F-01, F-04, F-05 | MUST | Fait |
| | [US-02](E01-identification/US-02-creer-mot-de-passe.md) | Créer son mot de passe | F-02 | MUST | Fait |
| | [US-03](E01-identification/US-03-se-connecter.md) | Se connecter avec son mot de passe | F-03, F-06, F-08 | MUST | Fait |
| | [US-04](E01-identification/US-04-se-deconnecter.md) | Se déconnecter | F-07 | MUST | Fait |
| **E02 Consultation** | [US-05](E02-consultation/US-05-consulter-profil.md) | Consulter son profil | F-09 | MUST | Fait |
| | [US-06](E02-consultation/US-06-voir-etat-mise-a-jour.md) | Voir l'état de sa mise à jour | F-10 | MUST | Fait |
| | [US-07](E02-consultation/US-07-consulter-ses-documents.md) | Consulter ses documents | F-11 | MUST | Fait |
| **E03 Mise à jour** | [US-08](E03-mise-a-jour/US-08-choisir-oui-non.md) | Choisir de mettre à jour ou non | F-12 | MUST | Fait |
| | [US-09](E03-mise-a-jour/US-09-modifier-informations.md) | Modifier ses informations | F-13, F-18 | MUST | Fait |
| | [US-10](E03-mise-a-jour/US-10-brouillon.md) | Sauvegarder et reprendre un brouillon | F-14 | MUST | Fait |
| | [US-11](E03-mise-a-jour/US-11-verifier-modifications.md) | Vérifier ses modifications | F-15 | MUST | Fait |
| | [US-12](E03-mise-a-jour/US-12-soumettre.md) | Confirmer et soumettre | F-16, F-17 | MUST | Fait |
| **E04 Documents** | [US-13](E04-documents/US-13-ajouter-document.md) | Ajouter un document | F-19, F-21 | MUST | Fait |
| | [US-14](E04-documents/US-14-supprimer-document.md) | Supprimer un document | F-20 | SHOULD | Fait |
| **E05 Administration** | [US-15](E05-administration/US-15-connexion-admin.md) | Se connecter en administrateur | F-22 | MUST | Fait |
| | [US-16](E05-administration/US-16-tableau-de-bord.md) | Voir le tableau de bord | F-23 | MUST | Fait |
| | [US-17](E05-administration/US-17-liste-employes.md) | Consulter la liste des employés | F-24 | MUST | Fait |
| | [US-18](E05-administration/US-18-rechercher-employe.md) | Rechercher un employé | F-25 | MUST | Fait |
| | [US-19](E05-administration/US-19-filtrer-statut.md) | Filtrer par statut | F-26 | SHOULD | Fait |
| | [US-20](E05-administration/US-20-consulter-dossier.md) | Consulter le dossier d'un employé | F-27 | MUST | Fait |
| | [US-21](E05-administration/US-21-consulter-documents-employe.md) | Consulter les documents d'un employé | F-28 | MUST | Fait |
| | [US-22](E05-administration/US-22-reinitialiser-acces.md) | Réinitialiser l'accès d'un employé | F-29 | SHOULD | Fait |

> La numérotation des stories est propre à ces spécifications et remplace celle du cahier des charges (US-01 à US-14).

## Statuts

| Statut | Signification |
|---|---|
| **Pas encore** | Aucun code écrit pour cette story |
| **En cours** | Story commencée (dont version minimale du Walking Skeleton) : critères d'acceptation pas tous couverts |
| **Fait** | Tous les critères couverts par des tests verts et Definition of Done cochée |

Le statut est mis à jour **dans le fichier de la story et dans cet index** à chaque changement.

## Modèle d'une story

```text
# US-XX — Titre
En-tête : epic, priorité, fonctionnalités PRD, dépendances de code
Récit : En tant que… je veux… afin de…
Règles : rappel des règles du Solution Design concernées
Critères d'acceptation : CA-01… au format Étant donné / Quand / Alors
Tests : au moins un test par critère (ID, CA couvert, niveau, fichier)
Hors périmètre
```

## Jeu de données de test commun

Fichier `backend/tests/fixtures/employees_test.csv`, **entièrement fictif**, avec les 54 colonnes du fichier réel (colonnes sensibles remplies de valeurs factices, pour vérifier qu'elles ne fuient jamais). Dates au format `MM/JJ/AAAA`.

| Réf. | id | Nom | Prénom | Naissance | Actif | Particularité |
|---|---|---|---|---|---|---|
| **EMP-A** | 1001 | JOSEPH | Jean | 03/15/1996 | oui | Cas nominal, toutes les données remplies |
| **EMP-H1** | 1002 | PIERRE | Marie | 07/02/1990 | oui | Homonyme de EMP-H2, date différente |
| **EMP-H2** | 1003 | PIERRE | Marie | 11/20/1985 | oui | Homonyme de EMP-H1 |
| **EMP-D1** | 1004 | LOUIS | Paul | 01/10/1988 | oui | Doublon complet de EMP-D2 |
| **EMP-D2** | 1005 | LOUIS | Paul | 01/10/1988 | oui | Doublon complet de EMP-D1 |
| **EMP-I** | 1006 | CHARLES | Anne | 05/05/1992 | **non** | Employé inactif |
| **EMP-E** | 1007 | ÉTIENNE | Rosé | 09/30/1979 | oui | Accents dans le nom, email vide |
| **EMP-B** | 1008 | BAPTISTE | Marc | 12/01/2000 | oui | Second employé pour les tests d'isolation |

Compte admin de test : `admin` / `Admin-Test-2026`.

**Fixtures pytest** disponibles pour toutes les stories :

| Fixture | Effet |
|---|---|
| `client` | Application avec SQLite temporaire, dossier de documents temporaire et CSV de test |
| `account(emp, password)` | Crée le compte d'un employé avec ce mot de passe |
| `employee_client(emp)` | Client déjà connecté en tant que l'employé |
| `admin_client` | Client déjà connecté en tant qu'administrateur |
| `draft(emp, changes)` | Crée une mise à jour en brouillon avec ces changements |
| `submitted(emp, changes)` | Crée une mise à jour soumise avec ces changements |
| `document(emp, type, file)` | Ajoute un document à l'employé |

## Definition of Done (commune à toutes les stories)

- [ ] Tous les critères d'acceptation sont couverts par au moins un test automatisé, et tous les tests passent.
- [ ] L'écran est conforme à la maquette Stitch (ou au design system pour les écrans admin) à 390 px de large et à 1280 px.
- [ ] Zones tactiles ≥ 44 px, texte ≥ 16 px, aucun défilement horizontal sur mobile.
- [ ] Les messages d'erreur sont en français, clairs et affichés près de l'élément concerné.
- [ ] Aucune colonne exclue du CSV n'apparaît dans les réponses de l'API ni dans les logs.
- [ ] Le code respecte la Clean Architecture (`03-plan-implementation.md` §1.1) : logique métier dans `domain`/`application` sans dépendance à FastAPI, SQLAlchemy ni aux fichiers ; adaptateurs câblés uniquement dans le composition root ; `lint-imports` vert.
