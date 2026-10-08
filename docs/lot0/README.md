# Lot 0 — Cadrage de la refonte du portail

Tout le lot 0 est dans ce dossier : les documents reçus du directeur, le backlog, et un sous-dossier par livrable demandé (message de lancement §2). **Aucun développement au lot 0** : spécifications, maquettes, schémas et tableaux seulement.

**Ce qui fait foi :** le registre des décisions v1.8 (`0-cadrage/registre-des-decisions-v1.8.md`). En cas de contradiction avec un autre document, c'est lui qui l'emporte.

## Où trouver quoi

| Dossier | Contenu | État |
|---|---|---|
| `0-cadrage/` | Documents du directeur, recopiés tels quels : message de lancement, registre des décisions v1.8, son retour sur les schémas ; notre audit et plan en 4 lots | Référence |
| `backlog-lot0.md` | Backlog priorisé et estimé (B-01 → B-20), pièces attendues, points signalés (S-01 → S-10) | Tenu à jour à chaque cycle |
| `backlog-lot0.html` | Version page web du backlog, envoyée au directeur | |

## Les 8 livrables

| # | Dossier | Livrable (message de lancement §2) | Fichiers | Tâches | État |
|---|---|---|---|---|---|
| 1 | `1-specifications/` | Spécifications écrites à partir du besoin métier, avec toutes les règles dans un tableau unique et commenté | `cahier-des-charges.md` · **`tableau-unique-des-regles.md`** · `decisions-a-valider.md` · `schemas-du-systeme.html` · `diagrammes-de-sequence.html` · `diagramme-cas-utilisation.html` · **`epics/`** (10 epics, 40 user stories, plan par lots) | B-03, B-08, B-19 | 🟡 Brouillon complet (12 chapitres, 49 règles commentées) ; attend la validation du directeur (39 décisions, D-01 → D-39) ; stories du lot 1 après les maquettes |
| 2 | `2-maquettes/` | Maquettes des écrans employé et administration, téléphone d'abord | `1-espace-employe-prototype-cliquable/` · `2-espace-employe-ecrans/` · `3-espace-rh-ecrans/` · `documents-de-travail/` | B-06, B-07, B-16, B-17 | 🟡 Espace employé : prototype cliquable publié (fils de fer) ; espace RH : 11 écrans conformes (revue 4) ; habillage final avec le guide de style |
| 3 | `3-modele-de-donnees/` | Modèle de données : champs obligatoires, niveaux, registre des demandes, mouvements, historique des confirmations | `modele-de-donnees.md` · `diagramme-entites-relations.html` | B-04, B-10, B-18 | 🟡 Brouillon v0.5 : contrôlé par les garde-fous du cours de modélisation ; modèle logique normalisé en 3NF (dénormalisations volontaires listées), diagramme entités-relations publié, contrôle de cohérence avec les besoins ; DM-01 → DM-07 validés par le développeur, DM-08 (photo) posé au directeur |
| 4 | `4-referentiel/` | Référentiel des agences, régions et directions, avec le tableau de correspondance de l'export RH | `rapport-anomalies-export.md` · `tableau-de-correspondance.csv` | B-01, B-02 | 🟡 Brouillons, attendent Mme Nérius (codes PB et RC, directions) |
| 5 | `5-demandes-et-lettres/` | Fichier Excel d'import de l'historique des demandes ; plan d'extraction des lettres testé sur 20 à 30 lettres | — | B-11, B-12, B-15 | ⬜ |
| 6 | `6-architecture-aws/` | Architecture AWS en une page : base de données, coût mensuel, VPN, DNS | `architecture-aws.html` | B-09 | 🟡 Proposition v0.1 : schéma, coûts estimés (~135 $/mois), options VPN, base de données ; 9 questions à la DIT |
| 7 | `7-whatsapp-email/` | Prestataire et coût WhatsApp, modèles de messages, test d'envoi d'email | — | B-13, B-14 | ⬜ |
| 8 | `8-guide-de-style/` | Guide de style d'une page | `logo-acme-sa.jpg` | B-05 | ⬜ Logo reçu ; attend mascotte et police |

Hors livrables : `9-demonstrateur/` (plan du démonstrateur pour la direction générale, demandé le 2026-10-07 ; 🟡 proposition v0.1, exception D-40 à faire noter).

Clôture : démonstration d'ensemble et validation écrite du directeur (B-20).

## Règles de rangement

- **Aucune donnée personnelle dans ce dossier** : il est versionné par git. Les fichiers qui en contiennent (export RH, fichier des agences avec les noms des DA et DR, lettres scannées) restent hors du dépôt, dans `C:\acme-data-v2\` ou `app-web\data\`.
- Les documents du directeur sont recopiés tels quels dans `0-cadrage/` ; on n'y modifie que la note d'en-tête.
- Une page web publiée a son fichier source ici (`.html`) ; on la modifie ici, puis on la republie à la même adresse.
