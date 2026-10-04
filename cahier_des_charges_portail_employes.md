# Cahier des charges --- Portail de mise à jour et de gestion des dossiers employés

**Entreprise :** ACME SA\
**Type de solution :** Application web mobile-first\
**Architecture :** 3 tiers, monolithe modulaire, Clean Architecture, API
REST\
**Version du document :** 1.1\
**Périmètre :** V1 --- Campagne de mise à jour / V2 --- Gestion de
carrière et intégration SI

------------------------------------------------------------------------

## 1. Problème

### 1.1 Contexte

ACME SA dispose de plusieurs succursales à travers le pays. Certaines
démarches administratives liées aux dossiers des employés peuvent
nécessiter des déplacements physiques ou des échanges manuels avec les
services concernés.

Ces démarches peuvent entraîner :

-   des déplacements entre succursales et services administratifs ;
-   une perte de temps pour les employés ;
-   une charge supplémentaire pour les équipes administratives ;
-   des délais dans la collecte et la centralisation des informations ;
-   une difficulté à suivre globalement l'état d'une campagne de mise à
    jour.

### 1.2 Problème à résoudre

ACME SA souhaite mettre en place un portail web mobile-first permettant
aux employés de consulter leurs informations, de signaler leur volonté
de mettre à jour leur dossier, de modifier les informations autorisées
et, lorsque nécessaire, de transmettre des documents numériques.

L'administration doit également pouvoir suivre l'avancement de la
campagne et consulter les informations et documents transmis, sans
modifier les données depuis le portail.

### 1.3 Objectif général

> Réduire les déplacements et simplifier la collecte des informations et
> documents des employés, tout en donnant à ACME SA une visibilité
> centralisée sur l'avancement des mises à jour.

------------------------------------------------------------------------

# 2. Analyse du besoin

## 2.1 Acteurs

### Employé

L'employé doit pouvoir :

-   s'identifier ;
-   consulter ses informations ;
-   choisir de mettre ou non son dossier à jour ;
-   modifier plusieurs informations autorisées ;
-   sauvegarder ses modifications comme brouillon ;
-   reprendre son dossier plus tard ;
-   ajouter plusieurs documents ;
-   confirmer les informations fournies ;
-   soumettre sa mise à jour ;
-   consulter ses documents de carrière.

### Administrateur

L'administrateur doit pouvoir :

-   consulter le nombre total d'employés ;
-   voir combien ont effectué leur mise à jour ;
-   voir combien n'ont pas encore effectué leur mise à jour ;
-   consulter la liste des employés et leur statut ;
-   rechercher un employé à l'aide d'une barre de recherche ;
-   consulter les informations d'un employé ;
-   consulter les documents transmis ;
-   vérifier visuellement les informations.

L'administrateur ne peut pas modifier les informations de l'employé via
le portail.

------------------------------------------------------------------------

# 3. Source de vérité et données

## 3.1 Source de référence V1

Le fichier :

``` text
vaultEmployee.csv
```

constitue la source de référence des informations initiales des employés
pour la V1.

Le fichier contient plusieurs colonnes et chaque employé possède un
identifiant unique.

L'identifiant unique sert à établir la correspondance technique entre
l'employé et les données enregistrées dans l'application. Il n'est pas
nécessairement connu de l'employé.

## 3.2 Identification

Pour la phase de test, l'employé sera identifié principalement à partir
de son nom et de son prénom.

Le système devra prévoir le cas des homonymes. Si plusieurs employés
correspondent aux mêmes informations, une donnée supplémentaire devra
être demandée afin d'identifier correctement le dossier.

## 3.3 Principe de conservation

Le fichier CSV original ne doit pas être directement modifié par
l'employé.

La solution distingue :

1.  les données de référence provenant du CSV ;
2.  les modifications réalisées par l'employé ;
3.  les documents ajoutés ;
4.  l'état d'avancement de la mise à jour.

Cette séparation permettra ultérieurement de remplacer le CSV par la
base de données du système d'information d'ACME SA sans remettre en
cause la logique métier de l'application.

------------------------------------------------------------------------

# 4. Persona

## Persona principal --- Employé ACME

**Nom fictif :** Jean Joseph\
**Âge :** 30 ans\
**Fonction :** Employé ACME\
**Localisation :** Succursale éloignée du siège.

### Situation

Jean doit mettre à jour certaines informations de son dossier. Il
possède également un nouveau certificat professionnel qu'il souhaite
ajouter à son profil.

Il souhaite effectuer la démarche depuis son téléphone sans devoir se
déplacer physiquement.

### Frustrations

-   déplacement vers une autre succursale ;
-   perte de temps ;
-   procédures administratives longues ;
-   difficulté à savoir si son dossier a été pris en compte.

### Objectifs

-   consulter ses informations ;
-   effectuer sa mise à jour depuis son téléphone ;
-   envoyer ses documents ;
-   conserver ses documents professionnels dans son profil ;
-   pouvoir reprendre une démarche interrompue.

------------------------------------------------------------------------

# 5. Jobs To Be Done

## JTBD principal --- Employé

> Quand mes informations personnelles ou professionnelles doivent être
> mises à jour, je veux pouvoir consulter et modifier mon dossier depuis
> mon téléphone et transmettre mes documents, afin d'éviter un
> déplacement physique et de m'assurer que mon dossier ACME est à jour.

## JTBD secondaire --- Gestion de carrière

> Quand j'obtiens un nouveau diplôme, certificat ou document
> professionnel, je veux pouvoir l'ajouter à mon profil afin de
> conserver mon parcours professionnel à jour.

## JTBD --- Administrateur

> Quand une campagne de mise à jour est lancée, je veux connaître
> rapidement quels employés ont effectué leur mise à jour et pouvoir
> consulter leurs informations et documents afin de suivre l'avancement
> sans gérer manuellement chaque dossier.

------------------------------------------------------------------------

# 6. Hypothèses testables

## H1 --- Réduction des déplacements

**Hypothèse :**

Le portail permettra de réduire le nombre de démarches nécessitant un
déplacement physique.

**Indicateur :**

-   nombre de démarches nécessitant un déplacement avant le portail ;
-   nombre de démarches effectuées à distance après le déploiement.

## H2 --- Adoption mobile

**Hypothèse :**

Une majorité des employés pourra effectuer la démarche depuis un
smartphone.

**Indicateur :**

-   pourcentage des mises à jour complétées sur mobile.

## H3 --- Compréhension du processus

**Hypothèse :**

Un employé peut comprendre et compléter le processus sans assistance
administrative.

**Indicateur :**

-   taux de dossiers commencés puis soumis ;
-   nombre de demandes d'assistance.

## H4 --- Identification

**Hypothèse :**

Nom + prénom permettent d'identifier suffisamment l'employé dans la
majorité des cas.

**Indicateur :**

-   nombre de cas d'homonymie ;
-   nombre de cas nécessitant une information complémentaire.

## H5 --- Utilisation des documents

**Hypothèse :**

Les employés sont capables d'ajouter leurs documents numériques sans
assistance.

**Indicateur :**

-   nombre de documents ajoutés ;
-   taux de réussite des uploads ;
-   nombre d'incidents liés aux documents.

------------------------------------------------------------------------

# 7. Priorisation MoSCoW

## MUST HAVE --- V1

  Fonctionnalité                             Priorité
  ------------------------------------------ ----------
  Lecture du `vaultEmployee.csv`             MUST
  Identification de l'employé                MUST
  Consultation du profil                     MUST
  Choix Oui/Non pour la mise à jour          MUST
  Modification des informations autorisées   MUST
  Sauvegarde en brouillon                    MUST
  Reprise d'un brouillon                     MUST
  Confirmation de la mise à jour             MUST
  Upload de documents                        MUST
  Stockage des documents                     MUST
  Liste des employés côté admin              MUST
  Recherche d'employés côté admin            MUST
  Statistiques de mise à jour                MUST
  Consultation des documents par l'admin     MUST
  API REST                                   MUST
  Architecture 3 tiers                       MUST
  Monolithe modulaire                        MUST
  Clean Architecture                         MUST
  Interface mobile-first                     MUST

## SHOULD HAVE --- V1 / V1.1

-   historique détaillé des modifications ;
-   filtres administrateur ;
-   indicateurs détaillés ;
-   validation des formats de fichiers ;
-   limitation de la taille des fichiers ;
-   messages d'erreur clairs ;
-   amélioration progressive de l'expérience mobile.

## COULD HAVE --- V2

-   authentification plus robuste ;
-   gestion complète de carrière ;
-   catégories avancées de documents ;
-   historique professionnel ;
-   notifications ;
-   intégration avec la base de données ACME ;
-   synchronisation automatique avec la source de données ;
-   versioning du fichier source ;
-   fonctionnalités de recherche avancées.

## WON'T HAVE --- V1

Les éléments suivants sont explicitement exclus du périmètre de la V1 :

-   modification des dossiers par l'administrateur ;
-   workflow complexe de validation RH ;
-   validation officielle des diplômes et certificats ;
-   système RH complet ;
-   recrutement ;
-   gestion de paie ;
-   remplacement du système RH existant ;
-   authentification SSO de l'entreprise si elle n'est pas encore
    disponible ;
-   synchronisation automatique avec les systèmes internes d'ACME ;
-   moteur de notifications complexe ;
-   workflow d'approbation multi-niveaux.

------------------------------------------------------------------------

# 8. Walking Skeleton

Le Walking Skeleton doit démontrer un flux complet traversant l'ensemble
de l'architecture.

## Flux minimal

``` text
vaultEmployee.csv
       |
       v
Backend
       |
       v
API REST
       |
       v
Frontend mobile
       |
       v
Identification employé
       |
       v
Consultation profil
       |
       v
"Je souhaite mettre à jour"
       |
       v
Modification d'une information
       |
       v
Confirmation
       |
       v
Enregistrement dans la DB
       |
       v
Admin
       |
       v
L'employé apparaît comme ayant effectué sa mise à jour
```

Le Walking Skeleton doit être développé avant d'ajouter toutes les
fonctionnalités secondaires.

------------------------------------------------------------------------

# 9. User Stories

## Epic 1 --- Identification

### US-01 --- Identifier un employé

> En tant qu'employé, je veux m'identifier afin d'accéder à mon dossier.

**Critères d'acceptation :**

-   l'employé fournit les informations demandées ;
-   le système recherche son dossier dans la source de référence ;
-   un employé existant peut accéder à son profil ;
-   un employé inexistant reçoit un message approprié ;
-   les homonymes sont gérés sans sélectionner arbitrairement un
    dossier.

------------------------------------------------------------------------

## Epic 2 --- Consultation

### US-02 --- Consulter son profil

> En tant qu'employé, je veux consulter mes informations afin de
> vérifier les données détenues par ACME.

### US-03 --- Consulter ses documents

> En tant qu'employé, je veux consulter mes documents afin de connaître
> les documents associés à mon profil.

------------------------------------------------------------------------

## Epic 3 --- Mise à jour

### US-04 --- Choisir de mettre à jour son dossier

> En tant qu'employé, je veux indiquer si je souhaite effectuer la mise
> à jour de mon dossier.

### US-05 --- Modifier plusieurs informations

> En tant qu'employé, je veux modifier plusieurs informations autorisées
> afin de corriger mon dossier.

### US-06 --- Sauvegarder un brouillon

> En tant qu'employé, je veux sauvegarder mes modifications comme
> brouillon afin de reprendre la démarche plus tard.

### US-07 --- Confirmer la mise à jour

> En tant qu'employé, je veux confirmer ma mise à jour afin d'indiquer
> que les informations fournies sont exactes.

------------------------------------------------------------------------

## Epic 4 --- Documents et carrière

### US-08 --- Ajouter un document

> En tant qu'employé, je veux ajouter un certificat, diplôme,
> attestation ou autre document afin d'enrichir mon dossier.

Les documents sont facultatifs.

### US-09 --- Consulter ses documents

> En tant qu'employé, je veux consulter mes documents afin de suivre mon
> parcours professionnel.

------------------------------------------------------------------------

## Epic 5 --- Administration

### US-10 --- Voir les statistiques

> En tant qu'administrateur, je veux voir le nombre d'employés ayant
> effectué leur mise à jour afin de suivre l'avancement de la campagne.

### US-11 --- Consulter la liste

> En tant qu'administrateur, je veux voir la liste des employés et leur
> statut de mise à jour.

### US-12 --- Consulter un dossier

> En tant qu'administrateur, je veux consulter le dossier d'un employé
> afin de vérifier les informations fournies.

### US-13 --- Consulter les documents

> En tant qu'administrateur, je veux consulter les documents uploadés
> afin de vérifier les pièces transmises.

### US-14 --- Rechercher un employé

> En tant qu'administrateur, je veux rechercher un employé à l'aide
> d'une barre de recherche afin d'accéder rapidement à son dossier sans
> parcourir toute la liste.

**Critères d'acceptation :**

-   une barre de recherche est affichée en haut de la liste des
    employés dans l'espace administrateur ;
-   la recherche porte au minimum sur le nom, le prénom et
    l'identifiant unique de l'employé ;
-   la recherche accepte une saisie partielle (ex. « jos » retrouve
    « Joseph ») ;
-   la recherche ne tient pas compte des majuscules/minuscules ni des
    accents ;
-   la liste des résultats affiche le nom, le prénom et le statut de
    mise à jour de chaque employé ;
-   la recherche peut être combinée avec le filtre par statut ;
-   un message clair est affiché lorsqu'aucun employé ne correspond ;
-   effacer la recherche réaffiche la liste complète ;
-   un clic sur un résultat ouvre le dossier de l'employé en
    consultation (US-12) ;
-   la barre de recherche est utilisable sur mobile.

------------------------------------------------------------------------

# 10. Règles métier principales

## RM-01 --- Source de référence

Le `vaultEmployee.csv` constitue la source de référence des informations
initiales des employés en V1.

## RM-02 --- Identifiant unique

Chaque employé possède un identifiant unique fourni par la source de
référence.

## RM-03 --- Identification utilisateur

L'identifiant technique de l'employé n'est pas nécessairement demandé à
l'utilisateur.

## RM-04 --- Mise à jour facultative

L'employé peut indiquer qu'il ne souhaite pas effectuer la mise à jour.

## RM-05 --- Documents facultatifs

L'ajout de documents n'est pas obligatoire pour soumettre une mise à
jour.

## RM-06 --- Brouillon

L'employé peut sauvegarder une mise à jour incomplète et la reprendre
ultérieurement.

## RM-07 --- Confirmation

L'employé doit confirmer sa mise à jour avant de la considérer comme
soumise.

## RM-08 --- Modifications multiples

Un employé peut modifier plusieurs champs au cours d'une même mise à
jour.

## RM-09 --- Historique

Les anciennes et nouvelles valeurs des champs modifiés doivent pouvoir
être conservées afin de garder une trace des changements.

## RM-10 --- Administration en lecture

L'administrateur dispose d'un accès en consultation et ne modifie pas
les informations de l'employé depuis le portail.

## RM-11 --- Documents

Les fichiers sont stockés dans un système de stockage de fichiers. La
base de données conserve leurs métadonnées et leur association avec
l'employé.

## RM-12 --- Mise à jour du CSV

Le système doit être conçu de manière à pouvoir utiliser une nouvelle
version du fichier source sans réécrire la logique métier de
l'application.

## RM-13 --- Recherche administrateur

La recherche d'employés est une fonctionnalité de consultation
uniquement. Elle est réservée à l'administrateur et ne permet aucune
modification des données. Elle s'appuie sur l'abstraction
`EmployeeRepository` afin de rester indépendante de la source de
données (CSV en V1, base ACME en V2).

------------------------------------------------------------------------

# 11. Modèle de données conceptuel

Le modèle de données de développement doit séparer les informations de
référence des données générées par l'application.

## Employee

``` text
Employee
--------
id
employee_id
nom
prenom
...
```

Les données initiales sont issues du CSV.

## EmployeeUpdate

``` text
EmployeeUpdate
--------------
id
employee_id
status
accepted
created_at
updated_at
submitted_at
```

Exemples de statut :

``` text
NOT_STARTED
DRAFT
SUBMITTED
```

## EmployeeChange

``` text
EmployeeChange
--------------
id
update_id
field_name
old_value
new_value
changed_at
```

Exemple :

``` text
update_id   : 25
field_name  : telephone
old_value   : 3722-1111
new_value   : 3722-2222
```

## Document

``` text
Document
--------
id
employee_id
document_type
file_name
file_url
uploaded_at
```

Exemples de types :

``` text
DIPLOME
CERTIFICAT
ATTESTATION
AUTRE
```

------------------------------------------------------------------------

# 12. Architecture technique

## 12.1 Architecture 3 tiers

La solution utilisera une architecture 3 tiers :

``` text
+---------------------------------------------+
|              PRESENTATION                   |
|                                             |
|       Frontend Web Mobile-First             |
+-------------------------+-------------------+
                          |
                       HTTP/REST
                          |
                          v
+---------------------------------------------+
|               APPLICATION                   |
|                                             |
|                API REST                     |
|                                             |
| Employee | Update | Document | Admin       |
+-------------------------+-------------------+
                          |
                          v
+---------------------------------------------+
|                   DATA                      |
|                                             |
| Database + File Storage + CSV Adapter      |
+---------------------------------------------+
```

------------------------------------------------------------------------

# 13. Monolithe modulaire

La solution sera développée comme un **monolithe modulaire**, et non
comme une architecture microservices.

L'application sera déployée comme une seule application, mais son code
sera organisé en modules fonctionnels.

``` text
Application
|
+-- Employee
|
+-- Update
|
+-- Document
|
+-- Career
|
+-- Admin
|
+-- Shared
```

### Pourquoi ce choix ?

Le projet ne nécessite pas actuellement la complexité opérationnelle des
microservices.

Le monolithe modulaire permet :

-   une architecture claire ;
-   un déploiement simple ;
-   une maintenance facilitée ;
-   une séparation des responsabilités ;
-   une évolution future possible.

------------------------------------------------------------------------

# 14. Clean Architecture

La logique interne du backend suivra les principes de Clean
Architecture.

``` text
+---------------------------+
|       Presentation        |
|      Controllers/API      |
+-------------+-------------+
              |
              v
+---------------------------+
|        Application        |
|       Use Cases           |
+-------------+-------------+
              |
              v
+---------------------------+
|          Domain           |
| Entities + Business Rules |
+-------------+-------------+
              ^
              |
+---------------------------+
|      Infrastructure       |
| DB | CSV | Storage | etc. |
+---------------------------+
```

## Domain

Contient les concepts métier :

-   Employee ;
-   EmployeeUpdate ;
-   EmployeeChange ;
-   Document.

## Application

Contient les cas d'utilisation :

``` text
IdentifyEmployee
GetEmployeeProfile
StartUpdate
SaveDraft
SubmitUpdate
AddDocument
GetEmployeeDocuments
GetAdminStatistics
ListEmployees
SearchEmployees
GetEmployeeForAdmin
```

## Infrastructure

Contient les implémentations techniques :

-   lecture du CSV ;
-   accès à la base de données ;
-   stockage des fichiers ;
-   repositories ;
-   configuration technique.

------------------------------------------------------------------------

# 15. API REST

L'application exposera une API REST.

Exemples conceptuels :

``` text
GET    /api/employees/:id
GET    /api/employees/:id/update

POST   /api/updates
PATCH  /api/updates/:id

POST   /api/updates/:id/submit

GET    /api/employees/:id/documents
POST   /api/employees/:id/documents

GET    /api/admin/statistics
GET    /api/admin/employees
GET    /api/admin/employees?search=:terme&status=:statut
GET    /api/admin/employees/:id
GET    /api/admin/employees/:id/documents
```

Le paramètre `search` filtre la liste des employés sur le nom, le
prénom et l'identifiant unique ; il peut être combiné avec le paramètre
`status`.

Les routes définitives seront précisées lors de la conception de l'API.

------------------------------------------------------------------------

# 16. Gestion de la source CSV

## 16.1 V1

Le système doit lire :

``` text
vaultEmployee.csv
```

sans considérer le CSV comme une table directement modifiable par
l'utilisateur.

Un composant d'infrastructure dédié sera responsable de la lecture de la
source.

Conceptuellement :

``` text
CSVEmployeeRepository
        |
        v
vaultEmployee.csv
```

Le reste de l'application utilise une abstraction de type :

``` text
EmployeeRepository
```

plutôt que de dépendre directement du fichier.

## 16.2 Évolution future

Lorsque ACME SA fournira l'accès à sa base de données, l'implémentation
pourra évoluer :

``` text
V1

EmployeeRepository
        |
        v
CSV


V2

EmployeeRepository
        |
        v
ACME Database
```

L'objectif est de ne pas modifier les règles métier et les cas
d'utilisation uniquement parce que la source de données change.

------------------------------------------------------------------------

# 17. V1 --- Campagne de mise à jour

## Objectif

Permettre aux employés de mettre à jour leur dossier à distance et
permettre à l'administration de suivre l'avancement.

## Parcours employé

``` text
Identification
      |
      v
Consultation du profil
      |
      v
Choix Oui / Non
      |
      +------ NON ------> Fin / consultation du profil
      |
      v
Modification des informations
      |
      v
Sauvegarde brouillon
      |
      v
Ajout éventuel de documents
      |
      v
Confirmation
      |
      v
Soumission
```

## Parcours administrateur

``` text
Connexion Admin
      |
      v
Dashboard
      |
      +--> Statistiques
      |
      +--> Liste des employés
      |
      +--> Rechercher un employé (barre de recherche)
      |
      +--> Filtrer les statuts
      |
      +--> Consulter un dossier
      |
      +--> Consulter les documents
```

------------------------------------------------------------------------

# 18. V2 --- Gestion de carrière et intégration SI

La V2 pourra transformer le portail en un espace personnel employé plus
complet.

## Gestion de carrière

``` text
Mon profil
|
+-- Informations personnelles
|
+-- Informations professionnelles
|
+-- Diplômes
|
+-- Certifications
|
+-- Attestations
|
+-- Formations
|
+-- Expériences
|
+-- Historique
```

## Intégration avec le SI ACME

La source de données pourra évoluer de :

``` text
vaultEmployee.csv
```

vers :

``` text
SI ACME
   |
   v
Base de données
   |
   v
Repository
   |
   v
Application
```

Le portail pourra alors fonctionner comme une couche applicative
au-dessus des systèmes existants.

------------------------------------------------------------------------

# 19. Évolution V1 → V2

  Élément                V1             V2
  ---------------------- -------------- ---------------------------
  Source employés        CSV            Base de données / SI ACME
  Identification         Simple         Authentification robuste
  Consultation profil    Oui            Oui
  Mise à jour            Oui            Oui
  Brouillon              Oui            Oui
  Documents              Oui            Oui
  Gestion de carrière    Basique        Complète
  Administration         Consultation   Dashboard avancé
  Historique             Oui            Complet
  Validation documents   Non            Potentiellement
  Intégration SI         Non            Oui
  Notifications          Optionnel      Oui
  Synchronisation        Manuelle       Automatisée

------------------------------------------------------------------------

# 20. Hors périmètre V1

Afin d'éviter une dérive du périmètre, les fonctionnalités suivantes ne
font pas partie de la première version :

1.  Modification des dossiers par l'administrateur.
2.  Validation officielle des diplômes et certificats.
3.  Workflow RH complexe.
4.  Approbation multi-niveaux.
5.  Gestion de paie.
6.  Recrutement.
7.  Gestion complète des ressources humaines.
8.  Remplacement du système RH existant.
9.  Synchronisation automatique avec la base de données ACME.
10. Authentification SSO si les informations nécessaires ne sont pas
    disponibles.
11. Notifications complexes.
12. Gestion complète des carrières.
13. Analyse avancée des parcours professionnels.

Ces fonctionnalités pourront être étudiées dans la V2.

------------------------------------------------------------------------

# 21. Risques et points à clarifier

## R1 --- Identification par nom et prénom

Le nom et le prénom peuvent produire des homonymes.

**Action :**

Prévoir une donnée complémentaire ou un mécanisme permettant de
distinguer les employés.

## R2 --- Informations modifiables

La liste exacte des champs que l'employé peut modifier n'est pas encore
définie.

**Action :**

Obtenir de l'entreprise la liste des champs :

-   modifiables ;
-   non modifiables ;
-   obligatoires ;
-   facultatifs.

## R3 --- Base de données ACME

L'accès à la base de données de l'entreprise n'est pas encore
disponible.

**Action :**

Développer la V1 avec une base de développement et une abstraction de
repository permettant une future intégration.

## R4 --- Évolution du CSV

Le fichier source est régulièrement mis à jour.

**Action :**

Prévoir un mécanisme d'import/remplacement du fichier et utiliser
l'identifiant unique comme clé de correspondance.

## R5 --- Sécurité des documents

Les documents peuvent contenir des informations personnelles sensibles.

**Action :**

Définir les règles de :

-   contrôle d'accès ;
-   stockage ;
-   téléchargement ;
-   suppression ;
-   taille maximale ;
-   types de fichiers acceptés ;
-   journalisation.

------------------------------------------------------------------------

# 22. Critères de réussite de la V1

La V1 sera considérée comme fonctionnelle lorsque :

-   un employé peut être retrouvé à partir des informations prévues ;
-   l'employé peut consulter son profil ;
-   l'employé peut choisir Oui ou Non ;
-   un employé ayant choisi Oui peut modifier plusieurs informations ;
-   les modifications peuvent être sauvegardées en brouillon ;
-   l'employé peut reprendre un brouillon ;
-   l'employé peut ajouter des documents facultatifs ;
-   l'employé peut confirmer et soumettre sa mise à jour ;
-   les modifications sont enregistrées dans la base ;
-   les anciennes et nouvelles valeurs peuvent être retracées ;
-   l'administrateur peut consulter les statistiques ;
-   l'administrateur peut consulter la liste des employés ;
-   l'administrateur peut rechercher un employé via la barre de
    recherche ;
-   l'administrateur peut consulter les informations et documents ;
-   l'administrateur ne peut pas modifier les données ;
-   l'application fonctionne correctement sur mobile ;
-   la source CSV peut être remplacée sans réécrire la logique métier.

------------------------------------------------------------------------

# 23. Principe directeur du projet

Le projet doit respecter le principe suivant :

> **Construire une V1 simple, utile et testable, mais suffisamment bien
> structurée pour évoluer vers une V2 intégrée au système d'information
> d'ACME SA.**

La V1 ne doit donc pas chercher à devenir immédiatement un système RH
complet.

Elle doit résoudre un problème précis :

> **Permettre aux employés de mettre à jour leur dossier et de
> transmettre leurs documents à distance, tout en permettant à ACME SA
> de suivre l'avancement de la campagne.**

La V2 pourra ensuite étendre cette base vers un véritable portail de
gestion de carrière et une intégration avec les systèmes internes d'ACME
SA.
