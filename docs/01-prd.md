# PRD — Portail de mise à jour des dossiers employés (MVP)

| | |
|---|---|
| **Entreprise** | ACME SA |
| **Document** | Product Requirements Document |
| **Version** | 1.0 — validé le 2026-10-04 |
| **Date** | 2026-10-03 |
| **Source** | `cahier_des_charges_portail_employes.md` v1.1, maquettes Google Stitch |
| **Méthode** | Spec-Driven Development : PRD → Solution Design → Epics/User Stories → Plan d'implémentation |

---

## 1. Problème

Les employés d'ACME SA, répartis dans plusieurs succursales, doivent parfois se déplacer pour mettre à jour leur dossier administratif. Ces déplacements font perdre du temps aux employés, chargent les équipes administratives et rendent difficile le suivi global d'une campagne de mise à jour.

## 2. Objectif du MVP

> Démontrer qu'un employé peut mettre à jour son dossier et transmettre ses documents **depuis son téléphone, sans assistance**, et que l'administration peut **suivre l'avancement** de la campagne en temps réel.

Le MVP n'est pas une mise en production. Il sert à **valider le concept** auprès du directeur avant toute décision d'investissement (V1 complète, V2 intégrée au SI).

## 3. Contexte du test

| Élément | Valeur |
|---|---|
| Testeurs | Le directeur + une autre personne |
| Rôles testés | Employé (avec des identités réelles du CSV) et administrateur |
| Appareils | Smartphones en priorité, ordinateur pour l'admin |
| Hébergement | Machine du développeur, faisant office de serveur |
| Accès | Réseau local (même Wi-Fi) ; tunnel HTTPS en option si accès distant |
| Données | Extraction CSV du 2026-10-01 (1198 employés) |

## 4. Utilisateurs

### 4.1 Employé

Persona : *Jean Joseph, 30 ans, employé dans une succursale éloignée.* Utilise principalement son téléphone, aisance numérique limitée. Veut mettre à jour ses coordonnées et ajouter un certificat sans se déplacer, et savoir que sa démarche a été prise en compte.

### 4.2 Administrateur

Responsable de la campagne de mise à jour. Veut savoir rapidement qui a fait sa mise à jour, retrouver un employé précis et consulter ce qu'il a transmis. **Ne modifie jamais** les données depuis le portail.

## 5. Périmètre fonctionnel du MVP

Chaque fonctionnalité est détaillée dans une ou plusieurs user stories (dossier `docs/epics/`).

### E01 — Identification

| ID | Fonctionnalité | Priorité |
|---|---|---|
| F-01 | L'employé saisit nom + prénom + date de naissance ; le système vérifie qu'il correspond à un **employé actif** | MUST |
| F-02 | Première connexion : l'employé reconnu **crée son mot de passe** (avec confirmation) | MUST |
| F-03 | Connexions suivantes : nom + prénom + date de naissance, puis **mot de passe** | MUST |
| F-04 | Message clair si aucun employé actif ne correspond, sans révéler si la personne existe ou est inactive | MUST |
| F-05 | Si plusieurs dossiers actifs correspondent (nom + prénom + date de naissance identiques), aucun dossier n'est ouvert et l'employé est invité à contacter l'administration | MUST |
| F-06 | Blocage temporaire après 5 mots de passe erronés | SHOULD |
| F-07 | Déconnexion | MUST |
| F-08 | Mot de passe oublié : l'employé contacte l'administration, qui réinitialise son accès (cf. D-06) | SHOULD |

Parcours de connexion :

```text
Nom + Prénom + Date de naissance
        |
        +-- aucun employé actif ---------> « Informations non reconnues »
        +-- plusieurs dossiers ----------> « Contactez l'administration »
        |
        v
  Un seul employé actif
        |
        +-- pas encore de mot de passe --> Créer un mot de passe ---> Profil
        |
        +-- mot de passe existant -------> Saisir le mot de passe --> Profil
```

### E02 — Consultation

| ID | Fonctionnalité | Priorité |
|---|---|---|
| F-09 | L'employé consulte ses informations, regroupées par sections | MUST |
| F-10 | L'employé voit où en est sa mise à jour (non effectuée, en cours avec brouillon, effectuée) | MUST |
| F-11 | L'employé consulte les documents associés à son profil | MUST |

### E03 — Mise à jour

| ID | Fonctionnalité | Priorité |
|---|---|---|
| F-12 | L'employé choisit Oui / Non pour mettre à jour son dossier | MUST |
| F-13 | L'employé modifie plusieurs champs autorisés | MUST |
| F-14 | Sauvegarde en brouillon et reprise ultérieure | MUST |
| F-15 | Récapitulatif « ancienne valeur → nouvelle valeur » | MUST |
| F-16 | Confirmation explicite puis soumission | MUST |
| F-17 | Conservation des anciennes et nouvelles valeurs (historique) | MUST |
| F-18 | Validation du format des champs (téléphone, email) avec messages clairs | SHOULD |

### E04 — Documents

| ID | Fonctionnalité | Priorité |
|---|---|---|
| F-19 | L'employé ajoute un ou plusieurs documents typés (Diplôme, Certificat, Attestation, Autre), facultatifs | MUST |
| F-20 | L'employé supprime un document tant que la mise à jour (ou sa nouvelle modification, F-31) n'est pas envoyée | SHOULD |
| F-21 | Contrôle du type (PDF, JPG, PNG) et de la taille maximale des fichiers | SHOULD |

### E05 — Administration

| ID | Fonctionnalité | Priorité |
|---|---|---|
| F-22 | Connexion administrateur (comptes enregistrés dans la base du portail, cf. F-30) | MUST |
| F-23 | Tableau de bord : total, mises à jour effectuées, non effectuées, % d'avancement | MUST |
| F-24 | Liste des employés avec leur statut | MUST |
| F-25 | **Barre de recherche** par nom, prénom ou matricule (partielle, insensible à la casse et aux accents) | MUST |
| F-26 | Filtre par statut, combinable avec la recherche | SHOULD |
| F-27 | Consultation en lecture seule du dossier d'un employé, avec les changements soumis | MUST |
| F-28 | Consultation des documents transmis par un employé | MUST |
| F-29 | Réinitialisation de l'accès d'un employé (efface son mot de passe ; ne touche pas au dossier), cf. D-06 | SHOULD |
| F-31 | Après l'envoi, l'employé peut modifier à nouveau son dossier et le renvoyer ; l'administration voit la dernière version envoyée, jamais le brouillon (US-24, validée le 2026-10-05) | SHOULD |
| F-30 | Gestion des comptes administrateurs depuis l'administration : liste, ajout avec mot de passe provisoire, suppression, changement de son mot de passe ; premier compte créé au lancement sur l'ordinateur du portail (US-23, validée le 2026-10-05) | SHOULD |

## 6. Hors périmètre du MVP

- Modification des dossiers par l'administrateur.
- Écriture dans le CSV source ou dans un système ACME (les modifications restent dans la base du portail).
- Workflow de validation RH, approbation, validation officielle des diplômes.
- Authentification forte (double facteur), SSO, réinitialisation du mot de passe par email ou SMS.
- Notifications (email, SMS).
- Hébergement cloud, haute disponibilité, sauvegardes automatiques.
- Gestion de carrière complète, paie, recrutement (V2 ou jamais).

## 7. Données

### 7.1 Source

Fichier `data/vault-employee-list_20261001-1400.csv` : **1198 employés, 54 colonnes**, encodage UTF-8, séparateur virgule, dates au format **`MM/JJ/AAAA`** (format américain : vérifié, aucun premier nombre > 12).

Constats issus de l'analyse du fichier :

| Constat | Impact |
|---|---|
| La colonne `id` est unique (1198 valeurs) | C'est la clé de correspondance technique (RM-02) |
| `employee_code` (matricule) n'est **pas** unique : 3 doublons | Ne pas l'utiliser comme clé ; affiché à titre informatif |
| 4 groupes d'homonymes (8 employés) sur nom + prénom | La date de naissance est demandée systématiquement |
| `date_of_birth` est renseignée pour 100 % des employés | Utilisable comme 3ᵉ donnée d'identification pour tous |
| 1 cas où deux employés **actifs** ont mêmes nom, prénom et date de naissance (même agence, même poste, même date d'embauche, matricules différents) | Probable doublon dans la source, à signaler à ACME ; géré par F-10 |
| 834 employés `active = false`, 364 `active = true` | Population de la campagne à décider (D-01) |
| `email_address` vide pour 308 employés, `telephone_number` vide pour 8 | Champs à compléter : justifie la campagne |
| Formats de téléphone hétérogènes (`+509…`, `+ 509…`, `…-…`, 8 chiffres) | Normalisation à l'affichage, validation à la saisie |
| Certains accents sont corrompus dans la source (ex. `Direction Cr�dit`) | Problème de qualité de la source, signalé à ACME |
| Le fichier contient des données **financières et RH sensibles** | Ces colonnes ne sont jamais chargées ni exposées (7.2) |

### 7.2 Classification des colonnes (validée, cf. D-03)

| Catégorie | Colonnes | Traitement |
|---|---|---|
| **Identification** | `last_name`, `first_name`, `date_of_birth` | Utilisées pour retrouver l'employé |
| **Affichées (lecture seule)** | `employee_code`, `first_name`, `last_name`, `gender`, `date_of_birth`, `agency_code`, `department`, `position`, `grade`, `level`, `contract_nature`, `date_of_hire` | Visibles par l'employé et l'admin |
| **Modifiables par l'employé** | `last_name`, `first_name`, `telephone_number`, `email_address`, `address_line_1` | Champs de la mise à jour |
| **Techniques** | `id`, `active` | Utilisées en interne, non affichées |
| **Exclues** | Toutes les autres : comptes bancaires et de paie, dettes, prêts, épargne retraite, primes, licenciement, préavis, rupture de contrat, COVID, géolocalisation, références, pièce d'identité, etc. | **Jamais chargées** dans l'application |

### 7.3 Principe de conservation

Le CSV n'est jamais modifié. L'application distingue : données de référence (CSV), modifications de l'employé, documents, état d'avancement. Une nouvelle extraction CSV doit pouvoir remplacer l'ancienne sans réécrire la logique métier ; le rapprochement se fait par `id`.

## 8. Exigences non fonctionnelles

| ID | Exigence |
|---|---|
| ENF-01 | **Mobile-first** : conçu pour 390 px de large, utilisable jusqu'au desktop ; zones tactiles ≥ 44 px ; texte ≥ 16 px |
| ENF-02 | Interface intégralement en **français** |
| ENF-03 | Respect du design system *ACME Enterprise Clarity* et des maquettes Stitch |
| ENF-04 | Temps de réponse < 1 s pour chaque écran en réseau local |
| ENF-05 | Fichiers : PDF, JPG, PNG ; 5 Mo maximum par fichier ; 10 fichiers maximum par employé |
| ENF-06 | Documents accessibles uniquement à l'employé concerné et à l'administrateur |
| ENF-07 | Aucune colonne « exclue » (7.2) ne transite par l'API ni n'apparaît dans les logs |
| ENF-08 | Le fichier CSV et les données générées (base, documents) restent hors du dépôt git et hors du dossier OneDrive |
| ENF-09 | Lancement de l'application par une seule commande |
| ENF-10 | Architecture : 3 tiers, monolithe modulaire, Clean Architecture, API REST |
| ENF-11 | Mots de passe : 8 caractères minimum, jamais stockés en clair (hachage sécurisé), jamais affichés ni journalisés |
| ENF-12 | Session employé et admin expirant après une période d'inactivité ; toutes les routes employé et admin exigent une session valide |

## 9. Critères de succès du MVP

Le MVP est validé si, pendant le test :

1. Le directeur, sur son téléphone, retrouve un dossier, modifie au moins deux champs, ajoute un document et soumet sa mise à jour **sans aide**.
2. Une démarche interrompue (brouillon) peut être reprise plus tard sans perte.
3. Un homonyme n'accède jamais au dossier d'un autre employé.
4. L'administrateur voit la mise à jour soumise apparaître dans les statistiques et la liste.
5. L'administrateur retrouve un employé précis via la barre de recherche en quelques secondes.
6. L'administrateur consulte les anciennes/nouvelles valeurs et ouvre les documents transmis.
7. L'administrateur ne dispose d'aucun moyen de modifier un dossier.

Indicateurs observés (hypothèses du cahier des charges) : temps pour compléter le parcours, nombre de demandes d'aide (H3), succès des uploads (H5), cas d'homonymie (H4).

## 10. Décisions à valider

| ID | Question | Recommandation |
|---|---|---|
| **D-01** | Quelle population est concernée par la campagne ? | ✅ **Validé** : uniquement les employés `active = true` (364). Les inactifs ne peuvent pas se connecter et sont exclus des statistiques. |
| **D-02** | Comment identifier l'employé ? | ✅ **Validé** : nom + prénom + date de naissance, puis création d'un mot de passe à la première connexion et saisie de ce mot de passe ensuite (F-01 à F-03). |
| **D-03** | Quels champs l'employé peut-il modifier ? | ✅ **Validé** : nom, prénom, téléphone, email, adresse (cf. 7.2). Un employé ayant soumis un nouveau nom ou prénom peut se connecter avec l'ancien ou le nouveau. |
| **D-04** | Après soumission, l'employé peut-il refaire une mise à jour ? | ✅ **Validé** : ~~non pour le MVP : une soumission par employé~~ **Révisé le 2026-10-05 (US-24, F-31)** : oui, « Modifier à nouveau » ; l'administration voit la dernière version envoyée (sans historique) ; le brouillon reste invisible. |
| **D-05** | Que montrer à l'employé après soumission : les valeurs du CSV ou ses nouvelles valeurs ? | ✅ **Validé** : ses nouvelles valeurs, avec la mention « Mise à jour soumise le … ». |
| **D-06** | Mot de passe oublié : l'admin peut-il réinitialiser l'accès d'un employé ? | ✅ **Validé** : oui, un bouton « Réinitialiser l'accès » efface le mot de passe, l'employé en recrée un à sa prochaine connexion. C'est une action sur le **compte**, pas sur les données du dossier : la règle « admin en lecture seule » reste respectée. |

## 11. Risques

| Risque | Mitigation |
|---|---|
| Une personne connaissant le nom, le prénom et la date de naissance d'un collègue crée son mot de passe avant lui | Risque accepté pour le MVP (test à deux personnes). L'employé légitime le signale, l'admin réinitialise l'accès (D-06). En V2 : code d'activation ou SSO |
| Tentatives répétées de mot de passe | Blocage temporaire (F-06) |
| Fuite de données sensibles du CSV | Colonnes exclues jamais chargées (ENF-07) ; `data/` hors git |
| Machine serveur éteinte ou en veille pendant le test | Désactiver la mise en veille pendant la période de test |
| Verrouillage de la base par la synchronisation OneDrive | Base et documents dans un dossier hors OneDrive (ENF-08) |
| Liste des champs modifiables susceptible d'évoluer | Liste configurable sans changer le code |

## 12. Documents suivants

1. `02-solution-design.md` — architecture, modèle de données, API, structure du code.
2. `epics/` — user stories indépendantes avec critères d'acceptation et tests.
3. `03-plan-implementation.md` — ordre de réalisation, en commençant par le Walking Skeleton.
