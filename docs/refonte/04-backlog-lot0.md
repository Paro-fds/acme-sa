# Backlog du lot 0 — Cadrage de la refonte

| | |
|---|---|
| **Version** | 1.0, 2026-10-06 |
| **Référence** | Message de lancement (`00-message-lancement-lot0.md`) et registre des décisions v1.8 (`03-registre-decisions-lot0.md`), qui fait foi |
| **Règle** | Liste unique, classée par priorité ; le directeur peut la réordonner à tout moment. Cycles de 48 heures au plus, point d'avancement à chaque fin de cycle. Pas de développement au lot 0. |

**Estimations** en jours de travail, hors temps d'attente des validations et des pièces à fournir. Total : **20,5 jours**, soit une dizaine de cycles de 48 heures.

## 1. Backlog priorisé

| Prio | N° | Élément | Livrable | Estim. (j) | Dépend de | Cycle |
|:---:|---|---|:---:|:---:|---|:---:|
| 1 | B-01 | **Anomalies de l'export RH** : agences et directions distinctes avec effectifs, doublons de matricule, lignes sans email, encodage, écart 364 actifs / ~500 réels | 4 | 0,5 | — | 1 |
| 2 | B-02 | **Tableau de correspondance** Excel (valeur trouvée, libellé officiel proposé, effectif) à valider par Mme Nérius et Mme Jean | 4 | 0,5 | B-01 | 1 |
| 3 | B-03 | **Tableau unique des règles**, première partie : complétude du dossier (Q1), statuts et motifs de rejet (Q2), niveaux et rangs (Q3), avec une proposition par défaut pour chaque point à confirmer | 1 | 1 | — | 1 |
| 4 | B-04 | **Modèle de données** du lot 1 : champs obligatoires, confirmations et leur historique, signalements d'erreur, certificats et décisions de validation, niveaux, référentiel des unités avec l'historique des régions | 3 | 1,5 | B-03 | 2 |
| 5 | B-05 | **Guide de style** d'une page (couleurs Q9, typographie, composants, ton, place de la mascotte) | 8 | 0,5 | Logo, mascotte, police | 2 |
| 6 | B-06 | **Maquettes du parcours « certificat »** (téléphone d'abord) : accueil et progression, connexion, profil et checklist du verrou, confirmation ou signalement des champs RH, contact d'urgence et niveau d'études, consentement, dépôt avec aperçu, confirmation, statuts « en vérification », « validé », « à corriger » | 2 | 2,5 | B-03, B-05 | 3 |
| 7 | B-07 | **Maquettes de la file de validation RH** : file avec alerte au-delà de 5 jours ouvrables, visionneuse (document / profil), Valider, Rejeter avec motif, correction du niveau, historique | 2 | 1 | B-03, B-05 | 4 |
| 8 | B-08 | **PRD de la refonte** : fonctionnalités par lot, rôles (Administrateur, Agent RH, Lecture seule), séparation des tâches, mention d'information, hors périmètre | 1 | 1 | B-03 | 4 |
| 9 | B-09 | **Architecture AWS** : schéma d'une page (CloudFront, application, RDS PostgreSQL, S3 chiffré, antivirus, Cognito pour les comptes RH, Secrets Manager), VPN, DNS, recette et production, coût mensuel estimé | 6 | 1,5 | Infos de la DIT | 5 |
| 10 | B-10 | **Modèle « mouvement de carrière » et registre des demandes** (Q5, Q6) : circuit en 7 étapes, fiche de demande, historique | 3 | 1 | B-04 | 5 |
| 11 | B-11 | **Fichier Excel d'import** de l'historique des demandes, avec ses règles de contrôle | 5 | 0,5 | B-10 | 6 |
| 12 | B-12 | **Plan d'extraction des lettres scannées** : OCR, contrôle humain, exclusion des montants de salaire | 5 | 0,5 | B-10 | 6 |
| 13 | B-13 | **WhatsApp** : prestataires (API officielle Meta), coûts, consentement, textes des modèles de messages | 7 | 1 | — | 6 |
| 14 | B-14 | **Envoi automatisé par email** : vérification sur le domaine de l'institution (expéditeur, authentification du domaine) | 7 | 0,5 | Accès DNS | 7 |
| 15 | B-15 | **Test d'extraction** sur 20 à 30 lettres et choix de l'outil d'OCR | 5 | 1,5 | B-12, échantillon, environnement sécurisé | 7 |
| 16 | B-16 | **Maquettes administration** restantes : tableau de bord (agence, région, direction), liste, filtres et export, unités « À rattacher », signalements, comptes et rôles | 2 | 1,5 | B-05 | 8 |
| 17 | B-17 | **Maquettes esquisses du lot 4** : « Ma carrière », postes ouverts et éligibilité (vert / orange), « Mes demandes » | 2 | 1 | B-05 | 8 |
| 18 | B-18 | **Solution Design** : réutilisation du code existant, migration non destructive vers PostgreSQL, sécurité | 1, 3 | 1,5 | B-04, B-09 | 9 |
| 19 | B-19 | **Epics et user stories du lot 1**, avec critères d'acceptation et jeu de test (dossier complet, incomplet) | 1 | 1 | B-06, B-08 | 9 |
| 20 | B-20 | **Démonstration d'ensemble**, validation écrite, bilan du lot 0 | — | 0,5 | Tout | 10 |

## 2. Premier cycle (48 heures)

| N° | Résultat montré en fin de cycle |
|---|---|
| B-01 | Rapport des anomalies de l'export : chiffres et listes de valeurs d'agences et de directions, sans aucune donnée personnelle |
| B-02 | Fichier Excel de correspondance prêt à être revu par Mme Nérius et Mme Jean |
| B-03 | Tableau des règles Q1 à Q3, commenté, avec les propositions par défaut |

## 3. Pièces attendues

| Pièce | Nécessaire pour | Urgence |
|---|---|---|
| Logo, mascotte « La Penseuse », police | B-05, puis toutes les maquettes | Cycle 2 |
| Grille de classification des postes | B-03 (rangs définitifs), B-06 | Cycle 2 |
| Fichier de correspondance agence → région | B-02, B-04 | Cycle 2 |
| Région AWS, comptes existants (Cognito), solution VPN en place, gestion du DNS d'acmehaiti.com | B-09, B-14 | Cycle 5 |
| Échantillon de 20 à 30 lettres et un environnement sécurisé pour les traiter | B-15 | Cycle 7 |

## 4. Points signalés au directeur avant de continuer

| N° | Constat | Proposition par défaut |
|---|---|---|
| S-01 | **Salaires dans les lettres scannées.** Les lettres de promotion et de transfert contiennent probablement des montants. Les garder en pièce jointe (registre des demandes, file de contrôle des mouvements) revient à stocker ces montants, ce que la règle interdit. | Le portail ne garde que les champs extraits et validés. La lettre d'origine reste dans le dossier papier ou l'archive RH actuelle ; le portail n'en conserve qu'une référence, ou une copie dont les montants sont masqués avant dépôt. |
| S-02 | **Test d'extraction sur de vraies lettres.** Un échantillon de 20 à 30 lettres est une donnée réelle d'employé, interdite dans les environnements de test. | Le test tourne sur un poste de la DIT ou sur le compte AWS de l'institution, lancé par la DIT avec un outil fourni. Seuls les résultats chiffrés (taux de champs bien lus) sortent. Les lettres ne passent ni par l'environnement de développement ni par un service d'IA externe. |
| S-03 | **MVP actuel.** Il tourne sur le poste du développeur avec le vrai export et reste accessible par Internet (tunnel temporaire). C'est contraire à la règle « aucune donnée réelle hors production sécurisée ». | Couper l'accès Internet du MVP dès maintenant ; le relancer seulement pour une démonstration ponctuelle à votre demande. Les nouveaux travaux se font sur des données fictives. |
| S-04 | **Analyse de l'export (B-01).** Elle demande de lire le vrai fichier. | Un outil la fait sur le poste du développeur, hors ligne. Il n'affiche que des chiffres et des noms d'agences et de directions. Les listes nominatives (matricules en double, lignes sans email) sont écrites dans un fichier remis seulement à Mme Nérius. |
| S-05 | **Séparation des tâches (Q2).** Pour qu'un Agent RH ne valide jamais son propre certificat, le portail doit savoir à quel employé correspond chaque compte RH. | Chaque compte Administrateur ou Agent RH est rattaché à son matricule, à la création du compte. |
| S-06 | **Comptes RH avec Cognito (Q8).** Les comptes administrateurs actuels sont dans la base du portail. Passer à Cognito avec double authentification remplace cette partie du code existant. | Accepté pour le lot 3 ; d'ici là, le code des comptes reste en place et ne reçoit plus d'évolution. |
| S-07 | **Rouge d'accent et erreurs (Q9).** Si le rouge de la charte ne signale pas les erreurs, il faut une autre couleur pour les messages d'erreur, assez distincte. Le vert / orange de l'éligibilité (Q5) doit aussi se lire sans les couleurs. | Le guide de style (B-05) propose une couleur d'erreur distincte, et chaque indicateur porte un texte (« Éligible », « Pas encore éligible »). |
| S-08 | **Taille du lot 0.** Le lot couvrait au départ les spécifications et les maquettes ; il comprend maintenant l'architecture AWS, WhatsApp et l'OCR. Estimation : 20,5 jours de travail. | Garder sur le chemin critique B-01 à B-08 et B-19 (ce qui conditionne le lot 1). Traiter B-09 à B-15 en parallèle, sans bloquer la validation des maquettes du lot 1. |
| S-09 | **364 actifs contre ~500.** Les 1 198 lignes de l'export comptent 364 actifs et 834 inactifs. L'écart peut venir de l'indicateur « actif », d'un périmètre d'extraction partiel ou d'employés absents du système. | Chiffré au cycle 1 (B-01) ; la cause est à confirmer avec la DRH. |
