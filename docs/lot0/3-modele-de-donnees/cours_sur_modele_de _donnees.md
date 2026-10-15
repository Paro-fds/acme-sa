# GL-EN3-2026 Module 2 : Analyse & Conception
## Semaine 8, Cours 1 : De l'ontologie au ERD - Construire le bon modèle de données
**Intervenant :** Jean Fritz SAINT-PAUL  
**Institution :** FDS - UEH (GL-EN3-2026)  

---

## Plan du cours

1. **La modélisation comme acte de communication (10 min)**
   * Langage Ubiquitaire (DDD)
   * 3 niveaux d'abstraction (Lien avec la Semaine 7)
2. **Identifier les entités depuis vos User Stories (15 min)**
   * Fact-Based Modeling (noms et verbes)
   * Table US $\rightarrow$ entités
   * Règle MVP
3. **Construire le ERD - Modèle logique brut (15 min)**
   * 4 composants et cardinalités clés
   * Clés PK / FK
   * ERD complet FDS SYS
4. **Normaliser le modèle (10 min)**
   * 3 anomalies
   * 1NF / 2NF / 3NF / BCNF
   * Vérification FDS SYS
5. **Choisir SQL ou NoSQL (5 min)**
   * ACID vs BASE
   * Familles de bases de données
   * Règle de décision
6. **Du ERD normalisé au SQL + System of Record (5 min)**
   * Source de vérité inter-modules
   * Structure CREATE TABLE et contraintes

---

## 1. La modélisation comme acte de communication

### Pourquoi le vocabulaire précède le SQL
* **La question clé :** Avant d'écrire `CREATE TABLE`, est-ce que toute votre équipe est d'accord sur ce qu'est un "Étudiant" dans votre système ?[cite: 4]
* **Le vrai risque :** La modélisation des données n'est pas qu'une question de stockage. Le plus grand danger est d'avoir deux développeurs avec deux définitions différentes du même concept, menant à un système incohérent[cite: 4].
* **La solution (Langage Ubiquitaire) :** Un vocabulaire commun entre développeurs et experts métier, défini une fois et utilisé partout (code, discussions, tests, documentation)[cite: 4].

> *"Bad programmers worry about the code. Good programmers worry about data structures and their relationships."* — Linus Torvalds[cite: 4]

### Exemples FDS (Langage Ubiquitaire)
* **Étudiant :** Un utilisateur avec `role = 'student'` et un accès actif à au moins un module (ce n'est pas un *alumnus* ni un prospect)[cite: 5].
* **Accès :** La relation entre un Étudiant et un Module, avec une date d'octroi (`granted_at`) et une révocation possible (`revoked_at`)[cite: 5].
* **Désactivé :** Un utilisateur dont le `status = 'disabled'` ; il ne peut plus se connecter mais ses données sont conservées (ce n'est pas une suppression)[cite: 5].

### Les 3 niveaux d'abstraction d'un modèle de données
1. **Conceptuel :** Qu'est-ce que le système doit connaître ? (Audience : Chefs de projet, experts domaine, analystes | Livrable : Glossaire des entités, ERD haut niveau)[cite: 6].
2. **Logique :** Comment ces concepts sont-ils structurés et reliés ? (Audience : Architectes, développeurs senior | Livrable : ERD normalisé, PK/FK définis)[cite: 6].
3. **Physique :** Comment cela est-il stocké concrètement ? (Audience : DBA, DevOps | Livrable : Scripts SQL DDL, stratégie d'index)[cite: 6].

---

## 2. Identifier les entités depuis vos User Stories

### Fact-Based Modeling : Verbaliser avant de modéliser
On ne commence jamais par les tables, mais par les faits[cite: 8]. Pour chaque User Story *Must Have*, écrivez 1 à 3 faits élémentaires en langage naturel[cite: 8] :
* *« Un Administrateur invite un Étudiant par email. »* $\rightarrow$ Noms candidats : Administrateur, Étudiant, Email[cite: 8].
* *« Un Étudiant se connecte et reçoit un token JWT. »* $\rightarrow$ Noms candidats : Étudiant, JWTToken[cite: 8].
* *« Un Administrateur accorde un Accès à un Étudiant pour un Module. »* $\rightarrow$ Noms candidats : Administrateur, Module, Access[cite: 8].
* *« Un Administrateur désactive un compte Étudiant. »* $\rightarrow$ Noms candidats : Administrateur, compte Étudiant[cite: 8].

*Dans chaque phrase : les **noms** sont des entités candidates, les **verbes** sont des relations candidates[cite: 8].*

### Règle MVP : La contrainte de sobriété
Si une entité n'est référencée par aucune User Story *Must Have*, elle n'est pas dans le MVP[cite: 10]. Créer une table inutile mène au *sur-engineering*[cite: 10].
* **Entités retenues pour le MVP FDS SYS :** Étudiant, Admin, Module, Access, Invitation, JWTToken[cite: 10].

---

## 3. Construire le ERD (Modèle logique brut)

### Les 4 composants d'un ERD
1. **Entité :** Représentée par un rectangle (correspond à une table SQL). Règle : si vous stockez des infos *sur* quelque chose, c'est une entité[cite: 12].
2. **Attribut :** Décrit uniquement l'entité à laquelle il appartient (correspond à une colonne)[cite: 12]. Types courants : `UUID`, `VARCHAR`, `INTEGER`, `BOOLEAN`, `TIMESTAMP`, `ENUM`[cite: 12].
3. **Relation :** Indique combien d'instances participent (`1-1`, `1-N`, `N-N`)[cite: 12].
4. **Clés :** `PK` (identifiant unique et immuable, ex: `UUID`) et `FK` (traduction d'une relation pour l'intégrité référentielle)[cite: 12].

### Cardinalités et Implémentation SQL
* **1-1 :** Un utilisateur a un seul profil $\rightarrow$ Clé étrangère `UNIQUE`[cite: 13].
* **1-N :** Un utilisateur a plusieurs tokens JWT $\rightarrow$ Clé étrangère côté "plusieurs"[cite: 13].
* **N-N :** Un étudiant dans plusieurs modules $\rightarrow$ Table de jointure intermédiaire (`Access`)[cite: 13].

---

## 4. Normaliser le modèle

### Les 3 anomalies prévenues par la normalisation
* **Anomalie d'insertion :** Impossible d'ajouter un fait sans en ajouter d'autres (ex: créer un module sans étudiant) $\rightarrow$ Solution : tables indépendantes[cite: 16].
* **Anomalie de modification :** Changer un fait exige de modifier des dizaines de lignes avec un risque d'incohérence $\rightarrow$ Solution : stocker l'information unique à un seul endroit[cite: 16].
* **Anomalie de suppression :** Supprimer un fait efface accidentellement d'autres informations $\rightarrow$ Solution : chaque entité dans sa propre table[cite: 16].

### Les Formes Normales (Progression cumulative)
* **1NF :** Valeurs atomiques, pas de listes ni groupes répétés[cite: 17].
* **2NF :** Tout attribut non-clé dépend de la totalité de la clé primaire (pas de dépendance partielle)[cite: 17].
* **3NF :** Aucun attribut non-clé ne dépend d'un autre attribut non-clé (pas de dépendance transitive)[cite: 17].
* **BCNF :** Tout déterminant est une clé candidate[cite: 17].
> **Standard MVP :** La 3NF est le minimum exigé[cite: 17].

---

## 5. Choisir SQL ou NoSQL

### ACID vs BASE
* **SQL (Relationnel) :** Schéma rigide, garanties **ACID** (atomicité, cohérence, isolation, durabilité), scalabilité verticale[cite: 21]. Indispensable pour les données critiques et les droits d'accès[cite: 21].
* **NoSQL (Non-relationnel) :** Schéma dynamique, cohérence éventuelle (**BASE**), scalabilité horizontale[cite: 21]. Adapté au Big Data ou aux données non structurées[cite: 21].

### Règle de décision
* Choisir **SQL** si : relations claires, cohérence forte (ACID) requise, schéma stable[cite: 22].
* Choisir **NoSQL (Document)** si : schéma évolue fréquemment, données naturellement hiérarchiques, volumes massifs[cite: 22].
* *Pour la plateforme FDS :* Relations fortes + cohérence ACID exigée = **PostgreSQL**[cite: 22].

---

## 6. Du ERD normalisé au SQL + System of Record

### Structure d'un `CREATE TABLE`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);