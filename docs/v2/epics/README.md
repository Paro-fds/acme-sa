# Epics et user stories — V2

Entrées : `docs/v2/01-prd.md` v1.2, `docs/v2/02-solution-design.md` v1.0 (validés le 2026-10-05).

> **Statut des spécifications :** validées le 2026-10-05. Les stories appliquent les décisions D-13 → D-18 (PRD §11) et SD-V2-01, SD-V2-02 (Solution Design §13) ; si l'une change, mettre à jour les stories de la colonne « Concerne ».

| Décision | Décision appliquée | Concerne |
|---|---|---|
| D-13 | Compétence = intitulé libre (2–60) + niveau Notions / Bon niveau / Expert | US-31, US-34 |
| D-14 | Parcours enrichi = au moins un élément ; toute écriture change la date de dernière modification | US-32, US-33 |
| D-15 | Carte « N parcours enrichis, dont X ces 7 derniers jours » | US-33 |
| D-16 | Écran dédié ; tous les mots requis ; recherche dans le parcours déclaré ; classement par nombre d'éléments correspondants | US-34 |
| D-17 | Mention de visibilité en haut de « Mon parcours » | US-25 |
| D-18 | Filtre « Poste actuel » à choix multiple, sans fusion des variantes | US-35 |
| SD-V2-01 | Fin d'une formation dans le futur refusée | US-27 |
| SD-V2-02 | Justificatif ajouté sur le même écran, juste après « Enregistrer » | US-29 |

Mêmes principes que le MVP (`docs/epics/README.md`) : chaque story est **indépendante** (ses tests installent leur propre état), les dépendances indiquées sont des dépendances de **code**.

**Code :** aucun avant le test du directeur ; il se fera dans un dossier séparé (`git worktree`), sans toucher à l'application en service (`app-web`, port 8000).

## Statut des epics

| Epic | Statut |
|---|---|
| [E06 Parcours professionnel](E06-parcours/README.md) | Pas encore |
| [E07 Recherche de profils](E07-recherche-profils/README.md) | Pas encore |

## Index

| Epic | Story | Titre | Fonctionnalités PRD | Priorité | Statut |
|---|---|---|---|---|---|
| **E06 Parcours professionnel** | [US-25](E06-parcours/US-25-consulter-parcours.md) | Consulter son parcours | F-32 | MUST | Pas encore |
| | [US-26](E06-parcours/US-26-diplomes-certifications.md) | Gérer ses diplômes et certifications | F-33, F-38 | MUST | Pas encore |
| | [US-27](E06-parcours/US-27-formations.md) | Gérer ses formations | F-34, F-38 | MUST | Pas encore |
| | [US-28](E06-parcours/US-28-experiences.md) | Gérer ses expériences professionnelles | F-35, F-38 | MUST | Pas encore |
| | [US-29](E06-parcours/US-29-justificatif.md) | Joindre un justificatif à un élément du parcours | F-36 | SHOULD | Pas encore |
| | [US-30](E06-parcours/US-30-parcours-admin.md) | Consulter le parcours d'un employé (admin) | F-37 | MUST | Pas encore |
| | [US-31](E06-parcours/US-31-competences.md) | Gérer ses compétences | F-39, F-38 | MUST | Pas encore |
| **E07 Recherche de profils** | [US-32](E07-recherche-profils/US-32-filtre-parcours-enrichi.md) | Filtrer les employés au parcours enrichi | F-40 | MUST | Pas encore |
| | [US-33](E07-recherche-profils/US-33-carte-tableau-de-bord.md) | Voir les parcours enrichis au tableau de bord | F-41 | SHOULD | Pas encore |
| | [US-34](E07-recherche-profils/US-34-rechercher-profils.md) | Rechercher des profils par compétences | F-42 | MUST | Pas encore |
| | [US-35](E07-recherche-profils/US-35-employes-d-un-poste.md) | Trouver les employés d'un même poste | F-43 | MUST | Pas encore |

**Ordre de réalisation** (PRD §5.1) : US-25 + US-26 (squelette : écran, API, base, contrats d'architecture) → US-27, US-28, US-31 → US-30 → US-34, US-35 → US-32, US-33 → US-29.

## Jeu de données de test

**CSV :** celui du MVP (`backend/tests/fixtures/employees_test.csv`), **inchangé** : EMP-A (1001, « Agent de crédit »), EMP-H1 (1002, « Assistante administrative »), EMP-H2 (1003, « Caissière »), EMP-D1 et EMP-D2 (1004, 1005, « Agent de recouvrement »), EMP-I (1006, **inactif**, « Analyste »), EMP-E (1007, « Chef d'équipe »), EMP-B (1008, « Coursier »).

**Horloge** fixée au **2026-10-15** (mois courant `2026-10`) dans les tests de dates et de « 7 derniers jours ».

**Parcours de référence** (installés par les fixtures, utilisés par US-30, US-32 → US-35) :

| Réf. | Employé | Éléments |
|---|---|---|
| **P-A** | EMP-A | Compétence « Analyse de crédit » (Expert) ; diplôme « Licence en sciences comptables », Université d'État d'Haïti, 06/2021, avec justificatif PDF ; expérience « Caissier », Banque XYZ, 01/2016 → 12/2019 |
| **P-B** | EMP-B | Compétence « Anglais » (Bon niveau) ; formation « Crédit aux PME », ACME SA (interne), 03/2025 → 04/2025, 24 h |
| **P-I** | EMP-I (inactif) | Compétence « Analyse de crédit » (Expert) : ne doit **jamais** apparaître côté admin |
| — | EMP-E, EMP-H1 | Aucun élément (parcours vide) |

**Fixtures pytest** ajoutées :

| Fixture | Effet |
|---|---|
| `career_entry(emp, kind, **fields)` | Crée un élément du parcours (met à jour `career_profile`) |
| `career_proof(entry, file)` | Joint un justificatif à un élément |
| `career_reference` | Installe les parcours P-A, P-B, P-I ci-dessus |
| `frozen_clock(datetime)` | Fixe l'horloge du conteneur |

**Fichiers :** ceux du MVP (`tests/fixtures/files/` : PDF, JPG, PNG valides, faux PDF, DOCX, PDF de 6 Mo généré).

## Definition of Done

Celle du MVP (`docs/epics/README.md`), plus :

- [ ] Le contrat import-linter « Parcours indépendant de la campagne » est vert (aucun import de `app.update` dans `app.career`).
- [ ] Écrans employé sans maquette : vérifiés à 390 px et 1280 px **et présentés à l'utilisateur pour revue visuelle** (ENF-V2-03).
- [ ] Aucune route admin d'écriture sur le parcours ; les nouvelles routes `/api/admin/*` passent le test paramétré d'US-15 (401 / 403).
- [ ] Le statut de campagne et `GET /api/admin/statistics` sont inchangés après toute écriture du parcours (RM-V2-02).
