# Dictionnaire de données — Carrières

ACME SA · `https://carrieres.acmehaiti.com` · version 1.0 · 27 octobre 2026

Document de référence pour un programmeur qui développe un add-in sur cette plateforme. Il décrit les données telles qu’elles sont stockées et échangées. La source est le schéma SQLAlchemy (`Archivage-dossiers/backend/app/models.py`), les nomenclatures (`classement.py`, `profils.py`, `parametres_quotes.yaml`) et les contrats d’API (`schemas.py`).

Base de production : PostgreSQL, base `archivage`, schéma `public`. Le moteur est celui de `DATABASE_URL` (`postgresql+psycopg`).

## 1. Comment lire ce dictionnaire

Les noms suivent l’usage d’un dictionnaire de données (ISO/IEC 11179, repris dans la pratique des dictionnaires de variables) :

| Colonne | Sens |
| --- | --- |
| Attribut | Nom physique, en `snake_case`. C’est l’identifiant de l’élément de donnée : `entite.attribut`. |
| Définition | Ce que la valeur représente, une seule idée. |
| Représentation | Type PostgreSQL, longueur, format. |
| Obligation | `O` obligatoire (colonne `NOT NULL` ou présence exigée à l’échange). `F` facultatif (`NULL` admis). |
| Clé | `PK` clé primaire, `FK` clé étrangère, `UK` contrainte d’unicité, `IX` index. |
| Domaine | Ensemble fermé des valeurs, ou règle qui les borne. |

Règles communes à tout le schéma :

- Les dates calendaires sont des `DATE` au format ISO `AAAA-MM-JJ`.
- Les horodatages sont des `TIMESTAMP WITH TIME ZONE`, écrits en UTC.
- Les montants de quote sont des `NUMERIC(14,6)`. Aucun calcul ne passe par un flottant binaire.
- Un booléen est `true` ou `false`. Il n’est pas codé `0`/`1` dans PostgreSQL.
- Les codes de nomenclature sont en minuscules, sans accent, avec des soulignés (`lettre_blame`, `a_completer`).
- Un texte vide `''` est une valeur renseignée. Il ne signifie pas `NULL`.
- Les identifiants techniques (`id`) sont des `INTEGER` générés. Un add-in ne les invente pas.
- Le code employé est la clé métier. Il est en majuscules, sans espace, au plus 32 caractères. Les seuls signes hors alphanumériques admis pour un portrait sont `'` et `` ` ``.

Cardinalités des associations : `1` exactement un, `0..1` au plus un, `1..*` au moins un, `0..*` zéro ou plusieurs.

## 2. Modèle logique

```text
utilisateurs 1 ── 0..* profils_utilisateur
utilisateurs 1 ── 0..* defis_otp
employes 1 ── 0..* documents
documents 1 ── 0..1 fichiers_document
documents * ── * competences_dictionnaire   (documents_competences)
competences_dictionnaire 1 ── 0..* competences_postes
competences_dictionnaire 1 ── 0..* competences_pieces
etat_vault          (une seule ligne, id = 1)
vault_actifs        (ensemble des codes actifs de la dernière copie Vault)
journal_audit       (ajout seul, sans clé étrangère)
```

`employes.code_superieur` pointe vers un autre `employes.code_employe` par convention. Ce n’est pas une clé étrangère. `utilisateurs.code_employe` non plus.

## 3. Entité `utilisateurs`

Compte de connexion. Un compte est porté par un employé actif, sauf le compte d’origine `drh@acmehaiti.com`.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique du compte. | `INTEGER` | O | PK | Généré. |
| `courriel` | Identifiant de connexion, stocké en minuscules. | `VARCHAR(180)` | O | UK | Adresse réelle, ou `{code}@matricule.acmehaiti.local` quand le compte n’a pas de double authentification. |
| `nom` | Nom affiché. Relu dans Vault (`prénom` + `nom`) à chaque mise à jour d’un compte lié à un employé. | `VARCHAR(180)` | O | | Texte. |
| `role` | Copie dénormalisée des profils, séparés par une virgule, dans l’ordre d’enregistrement. | `VARCHAR(32)` | O | | Même vocabulaire que `profils_utilisateur.role`. Le jeton JWT recopie cette chaîne. Les droits effectifs sont les lignes de `profils_utilisateur`. |
| `code_employe` | Code Vault de la personne qui porte le compte. | `VARCHAR(32)` | F | | Référence logique vers `employes.code_employe`. Vide pour le compte DRH d’origine. |
| `mot_de_passe_hash` | Empreinte du mot de passe. Le mot de passe en clair n’est pas stocké. | `VARCHAR(200)` | O | | bcrypt, 12 tours. Longueur du mot de passe à la saisie : 12 à 200 caractères. |
| `actif` | Le compte peut ouvrir une session. | `BOOLEAN` | O | | Défaut `true`. |
| `double_auth` | Un code à 6 chiffres est exigé avant la session. | `BOOLEAN` | O | | Défaut `false`. S’il est vrai, `courriel` doit être une adresse qui reçoit le code. |
| `photo_mime` | Type du portrait du compte. | `VARCHAR(40)` | O | | `image/jpeg`, `image/png`, `image/webp`, ou `''` s’il n’y a pas de photo. |
| `photo_octets` | Octets du portrait du compte. Chargés seulement à la lecture. | `BYTEA` | F | | 1 à 400 000 octets. Ce n’est pas la photo Vault `vault/photos/{code}.jpg`. |

## 4. Entité `profils_utilisateur`

Groupe métier porté par un compte. C’est la source des droits.

Contrainte `uq_profil_role` : un couple (`utilisateur_id`, `role`) est unique.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique du lien. | `INTEGER` | O | PK | Généré. |
| `utilisateur_id` | Compte porteur. | `INTEGER` | O | FK → `utilisateurs.id`, IX | |
| `role` | Profil attribué. | `VARCHAR(32)` | O | UK (avec le compte) | `admin`, `drh`, `auditeur`, `superviseur_drh`, `charge_drh`. |

Règle de groupe : `admin`, `drh` et `auditeur` se cumulent. `superviseur_drh` et `charge_drh` sont exclusifs : celui qui porte l’un d’eux n’a aucun autre profil.

Libellés d’affichage : Admin, DRH, Auditeur, Superviseur DRH, Chargé DRH.

## 5. Entité `employes`

Personne du référentiel. L’alimentation de production est la copie Vault. La création et l’import CSV par l’API sont refusés : « Le référentiel est alimenté par Vault. »

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique. | `INTEGER` | O | PK | Généré. Les add-in qui parlent métier utilisent `code_employe`. |
| `code_employe` | Matricule Vault. | `VARCHAR(32)` | O | UK, IX | Majuscules, sans espace. |
| `nom` | Nom de famille. | `VARCHAR(120)` | O | IX | Tronqué à 120 à la synchro. |
| `prenom` | Prénom. | `VARCHAR(120)` | O | | Tronqué à 120. |
| `date_embauche` | Date d’entrée. Base du coefficient d’ancienneté quand `coefficient_anciennete.base` vaut `employe`. | `DATE` | O | | |
| `date_sortie` | Date de fin de contrat. | `DATE` | F | | `NULL` tant que la personne est active dans Vault. La synchro remet `NULL` pour un actif, et pose la date Vault ou la date du jour pour un sorti. |
| `direction` | Département Vault (`department`). | `VARCHAR(120)` | O | IX | Défaut `''`. |
| `agence` | Code d’agence Vault (`agency_code`), mis en majuscules. | `VARCHAR(120)` | O | IX | Défaut `''`. |
| `poste` | Intitulé de poste Vault (`position`). | `VARCHAR(120)` | O | | Défaut `''`. Sert au rapprochement des compétences. |
| `filiere` | Filière locale. Vault ne l’écrit pas. La synchro ne l’écrase pas. | `VARCHAR(120)` | O | | Défaut `''`. Clé éventuelle de `parametres_quotes.yaml` → `filieres`. |
| `code_superieur` | Matricule du supérieur (`depends_on`). | `VARCHAR(32)` | F | IX | Référence logique, sans FK. |
| `courriel` | Courriel professionnel Vault (`email_address`). | `VARCHAR(180)` | O | | Défaut `''`. Distinct du courriel de connexion. |
| `actif` | La personne est dans la population active du référentiel. | `BOOLEAN` | O | | Défaut `true`. Une date de sortie posée par l’API force `false`. |
| `origine` | Système qui a écrit la fiche en dernier. | `VARCHAR(16)` | O | | `vault` après synchro. Le défaut de colonne `saisie` ne concerne que des lignes antérieures : la synchro ne désactive pas une ligne dont l’origine n’est pas `vault`. |
| `quote_ressource` | Quote GPEC agrégée. `NULL` signifie « non évaluée », jamais zéro. | `NUMERIC(14,6)` | F | | Recalculée à chaque décision, retour, correction ou suppression de pièce. Voir § 16. |
| `cree_le` | Horodatage de la première insertion. | `TIMESTAMPTZ` | O | | |
| `modifie_le` | Horodatage de la dernière écriture, y compris la synchro Vault. | `TIMESTAMPTZ` | O | | |

Index secondaires : `nom`, `direction`, `agence`, `code_superieur`.

## 6. Entité `documents`

Pièce du dossier collaborateur. Le commentaire historique du modèle (« aucun fichier en base ») est dépassé : le scan est dans `fichiers_document`.

Contrainte `uq_empreinte_employe` : une même empreinte SHA-256 n’est versée qu’une fois pour un même `employe_id`.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique de la pièce. | `INTEGER` | O | PK | Généré. |
| `employe_id` | Collaborateur titulaire. | `INTEGER` | O | FK → `employes.id`, IX | |
| `type_document` | Nature de la pièce. | `VARCHAR(64)` | O | | Clé de `poids_types` (§ 14). Chaîne vide `''` tant qu’un scan de lot est à compléter. |
| `titre` | Intitulé. Pour un lot, nom du fichier à l’arrivée. | `VARCHAR(300)` | O | | |
| `date_document` | Date de la pièce. Pour un lot non qualifié : date du dépôt. | `DATE` | O | | |
| `date_imputation` | Horodatage du versement. | `TIMESTAMPTZ` | O | | |
| `imputeur_code` | `code_employe` du compte qui a versé. | `VARCHAR(32)` | O | | `''` si le compte n’a pas de matricule. |
| `imputeur_nom` | Nom du compte imputeur au moment du versement. | `VARCHAR(180)` | O | | |
| `empreinte_sha256` | Empreinte hexadécimale du scan, ou, sans scan, de `code\|type\|titre\|date\|horodatage`. | `VARCHAR(64)` | O | UK (avec `employe_id`) | 64 caractères hexadécimaux. |
| `taille_octets` | Taille du scan. `0` s’il n’y a pas de fichier. | `INTEGER` | O | | Scan : 1 à 4 000 000 octets. |
| `nombre_pages` | Nombre de pages prévu au schéma. Le versement actuel ne l’écrit pas. | `INTEGER` | O | | Reste à `0`. |
| `gravite` | Degré du blâme retenu pour le calcul. | `VARCHAR(16)` | F | | `legere`, `moyenne`, `grave`, ou `NULL` hors blâme. |
| `gravite_derogation` | Marqueur posé à `true` pour toute `lettre_blame` créée ou corrigée par l’API. | `BOOLEAN` | O | | Défaut `false`. Il ne distingue pas une saisie manuelle d’une déduction par mot-clé. |
| `quote_document` | Quote de cette pièce après le dernier recalcul. `NULL` si elle n’entre pas dans l’agrégat. | `NUMERIC(14,6)` | F | | `poids × coefficient` quand elle est prise en compte. |
| `statut` | Étape du circuit. | `VARCHAR(32)` | O | IX | `a_completer`, `en_attente`, `valide`, `refuse`. |
| `version` | Numéro de version prévu au schéma. Le versement actuel ne l’incrémente pas. | `INTEGER` | O | | Défaut `1`. |
| `est_actif` | La pièce peut entrer dans la quote. Passe à `false` au refus. | `BOOLEAN` | O | | Défaut `true`. Un alignement `hors` la laisse `true` en base et la sort du calcul (§ 16). |
| `chemin_stockage` | Indicateur de présence du scan. | `VARCHAR(500)` | O | | `base` s’il y a une ligne dans `fichiers_document`, sinon `''`. Ce n’est pas une clé S3. |
| `motif_suppression` | Motif du refus. Remis à `''` quand la DRH renvoie la pièce en attente. | `VARCHAR(500)` | O | | Obligatoire à la saisie quand la décision est `refuse`. |
| `alignement` | Lien de la formation au référentiel ACME. | `VARCHAR(24)` | O | | `acme`, `hors`, ou `''` hors formation. |
| `categorie` | Famille thématique de la formation. | `VARCHAR(64)` | O | | Clé de § 14, ou `''` hors formation. |
| `poste_vise` | Poste cité par une lettre de promotion. | `VARCHAR(120)` | O | | Obligatoire si `type_document = lettre_promotion`, sinon `''`. |
| `lieu` | Lieu ou agence cité par une lettre d’affectation. | `VARCHAR(120)` | O | | Obligatoire si `type_document = lettre_affectation`, sinon `''`. |

Champs selon le type, à l’écriture :

| Type | Champs exigés | Champs vidés |
| --- | --- | --- |
| Formation (§ 14) | `alignement`, `categorie` | `poste_vise`, `lieu`, `gravite` |
| `lettre_promotion` | `poste_vise` | alignement, catégorie, lieu, gravité, compétences liées |
| `lettre_affectation` | `lieu` | alignement, catégorie, poste, gravité, compétences liées |
| `lettre_blame` | `gravite` | alignement, catégorie, poste, lieu, compétences liées |
| Autres lettres et pièces sans décompte | aucun de ces quatre | ces quatre champs, et les compétences liées pour toute lettre |

Circuit de `statut` :

```text
dépôt unitaire            → en_attente
dépôt d’un lot            → a_completer → (qualification) en_attente
en_attente + approuve     → valide
en_attente + refuse       → refuse   et est_actif = false
valide    + retour DRH    → en_attente et est_actif = true
```

La décision d’API s’écrit `approuve` ou `refuse`. La valeur persistée d’une approbation est `valide`, pas `approuve`.

Une pièce `a_completer` n’entre pas dans la liste générale ni dans les approbations. Seule une pièce `en_attente` se corrige. Seule une pièce `valide` revient en attente, et seule la DRH le fait. L’effacement est physique (`DELETE`), pas un changement de statut.

## 7. Entité `fichiers_document`

Scan joint. Une pièce a au plus un fichier. La suppression de la pièce emporte le fichier.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique. | `INTEGER` | O | PK | Généré. |
| `document_id` | Pièce porteuse. | `INTEGER` | O | FK → `documents.id`, UK | |
| `type_mime` | Type reconnu sur les octets, pas seulement sur l’en-tête HTTP. | `VARCHAR(80)` | O | | Versement unitaire : `application/pdf`, `image/jpeg`, `image/png`. Lot : `application/pdf`, `image/jpeg`. |
| `contenu` | Octets du scan. Chargés seulement au téléchargement. | `BYTEA` | O | | 1 à 4 000 000 octets. PDF : la marque `%PDF` est cherchée dans les 1 024 premiers octets. JPEG : `FF D8 FF`. PNG : signature PNG. |

## 8. Entité `documents_competences`

Association entre une pièce versée et une compétence du dictionnaire. Clé primaire composée. `ON DELETE CASCADE` des deux côtés. Les lettres n’y figurent pas : les corriger vide l’association.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `document_id` | Pièce. | `INTEGER` | O | PK, FK → `documents.id` | |
| `competence_id` | Compétence attestée par cette pièce. | `INTEGER` | O | PK, FK → `competences_dictionnaire.id` | |

## 9. Entité `competences_dictionnaire`

Fiche du bottin de compétences. Le libellé est unique.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique. | `INTEGER` | O | PK | Généré. |
| `libelle` | Intitulé unique de la compétence. Colonne CSV `intitule`. | `VARCHAR(300)` | O | UK | |
| `code` | Code de fiche. | `VARCHAR(32)` | O | | Défaut `''`. Pas une clé métier garantie unique. |
| `famille` | Famille du référentiel. | `VARCHAR(80)` | O | | Défaut `''`. |
| `sous_famille` | Sous-famille. | `VARCHAR(80)` | O | | Défaut `''`. |
| `type_competence` | Type de compétence. Colonne CSV `type`. | `VARCHAR(40)` | O | | Défaut `''`. Texte libre, sans nomenclature fermée dans le code. |
| `definition` | Définition de la fiche. | `TEXT` | O | | Défaut `''`. |
| `verbe_action` | Verbe d’action observable. | `VARCHAR(300)` | O | | Défaut `''`. |
| `methodes_evaluation` | Méthodes d’évaluation. | `TEXT` | O | | Défaut `''`. |
| `competences_liees` | Renvois textuels vers d’autres compétences. Ce n’est pas une clé étrangère. | `VARCHAR(300)` | O | | Défaut `''`. |
| `freq_reeval_mois` | Périodicité de réévaluation, en mois. | `INTEGER` | O | | Défaut `12`. Saisie API : 0 à 120. |
| `statut_fiche` | État éditorial de la fiche. Colonne CSV `statut`. | `VARCHAR(32)` | O | | Défaut `''`. Texte libre. |
| `version_fiche` | Version éditoriale. Colonne CSV `version`. | `VARCHAR(16)` | O | | Défaut `''`. |
| `proprietaire` | Propriétaire de la fiche. | `VARCHAR(120)` | O | | Défaut `''`. |
| `indicateurs` | Indicateurs de la fiche, hors niveaux. | `TEXT` | O | | Défaut `''`. |
| `niveaux` | Quatre niveaux, sérialisés en JSON. Voir § 10. | `TEXT` | O | | Défaut `''`, lu alors comme les quatre libellés standards vides de description. |

## 10. Structure JSON `niveaux`

`competences_dictionnaire.niveaux` est un tableau JSON UTF-8. Chaque objet :

| Attribut | Définition | Représentation | Obligation | Domaine |
| --- | --- | --- | --- | --- |
| `niveau` | Rang. | entier | O | 1, 2, 3 ou 4. |
| `libelle` | Nom du palier. | chaîne | O | Défaut : 1 Initial, 2 Opérationnel, 3 Confirmé, 4 Expert. |
| `description` | Comportement observable. | chaîne | O | `''` admis. |
| `preuves` | Preuves attendues. | chaîne | O | `''` admis. |
| `indicateurs` | Indicateurs du palier. | chaîne | O | `''` admis. |

Le CSV d’échange (délimiteur `;`, UTF-8) a une colonne `intitule` obligatoire et aplatit les niveaux : `niveau_{n}_libelle`, `niveau_{n}_description`, `niveau_{n}_preuves`, `niveau_{n}_indicateurs` pour `n` de 1 à 4. La colonne `postes` est la liste des intitulés joints par ` | `.

## 11. Entité `competences_postes`

Poste auquel la compétence est rattachée. Contrainte `uq_competence_poste` sur (`competence_id`, `intitule`).

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique du lien. | `INTEGER` | O | PK | Généré. |
| `competence_id` | Compétence. | `INTEGER` | O | FK → `competences_dictionnaire.id`, IX | Suppression de la compétence en cascade. |
| `code` | Code de poste, s’il est connu. | `VARCHAR(32)` | O | | Défaut `''`. |
| `intitule` | Intitulé de poste rapproché de `employes.poste`. | `VARCHAR(180)` | O | UK (avec la compétence) | |

Le rapprochement avec l’employé reprend la clé souple des carrières : accents et mots vides retirés, féminin ramené au masculin, alias d’intitulé, ou code de poste lorsqu’il est renseigné.

## 12. Entité `competences_pieces`

Modèle de pièce (type + intitulé) qui atteste une compétence, indépendamment d’un dossier particulier. Contrainte `uq_competence_piece` sur (`competence_id`, `type_document`, `intitule`).

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant technique du lien. | `INTEGER` | O | PK | Généré. |
| `competence_id` | Compétence attestée. | `INTEGER` | O | FK → `competences_dictionnaire.id`, IX | |
| `type_document` | Type de la pièce modèle. | `VARCHAR(64)` | O | | Restreint aux formations (§ 14). |
| `intitule` | Titre de la pièce modèle. La comparaison d’unicité ignore la casse et les accents. | `VARCHAR(300)` | O | | Défaut `''`. |

`documents_competences` lie une pièce réelle. `competences_pieces` lie un modèle de diplôme au dictionnaire. Les deux coexistent.

## 13. Entités de synchro, de session et d’audit

### `etat_vault`

Une seule ligne, `id = 1`.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Toujours `1`. | `INTEGER` | O | PK | |
| `etag` | ETag S3 de la copie lue, sans guillemets. | `VARCHAR(128)` | O | | Défaut `''`. |
| `source` | Emplacement lu, en pratique la clé S3. | `VARCHAR(300)` | O | | Défaut `''`. |
| `nombre_actifs` | Nombre de codes actifs retenus. | `INTEGER` | O | | Défaut `0`. |
| `synchronise_le` | Horodatage de la dernière synchro réussie. | `TIMESTAMPTZ` | F | | `NULL` avant la première lecture. |
| `message` | Compte rendu court. | `VARCHAR(500)` | O | | Forme : `{n} employé(s) actif(s) dans Vault.` |

### `vault_actifs`

Ensemble reconstruit à chaque synchro : `DELETE` puis réinsertion. Sert à refuser un certificat pour un code absent.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `code_employe` | Code actif dans la dernière copie. | `VARCHAR(32)` | O | PK | Majuscules. |

Une ligne Vault n’est retenue comme active que si `active` est vrai et que le nom, le prénom et la date d’embauche sont présents.

### `defis_otp`

Défi de double authentification. Le code à 6 chiffres n’est pas stocké : seule son empreinte l’est.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant du défi, repris dans le jeton d’étape. | `INTEGER` | O | PK | Généré. |
| `utilisateur_id` | Compte défié. | `INTEGER` | O | FK → `utilisateurs.id`, IX | |
| `empreinte` | SHA-256 hexadécimal de `{secret_key}:{code}`. | `VARCHAR(64)` | O | | |
| `expire_le` | Fin de validité. | `TIMESTAMPTZ` | O | | 10 minutes après l’envoi. |
| `tentatives` | Essais déjà consommés. | `INTEGER` | O | | Défaut `0`. À 5, ou si l’empreinte ne correspond pas, l’essai est refusé et le compteur augmente. |
| `consomme` | Le défi a déjà ouvert une session. | `BOOLEAN` | O | | Défaut `false`. |

### `journal_audit`

Journal en ajout seul. L’application n’expose ni modification ni suppression.

| Attribut | Définition | Représentation | Obligation | Clé | Domaine |
| --- | --- | --- | --- | --- | --- |
| `id` | Identifiant de l’entrée. | `INTEGER` | O | PK | Généré. |
| `horodatage` | Instant de l’écriture, UTC. | `TIMESTAMPTZ` | O | IX | |
| `acteur_courriel` | Courriel du compte, ou l’identifiant tenté si la connexion est refusée. | `VARCHAR(180)` | O | | `systeme` pour la création du compte DRH au démarrage. |
| `acteur_role` | `utilisateurs.role` au moment de l’acte, donc les profils joints par une virgule. | `VARCHAR(32)` | O | | `systeme` pour le démarrage. Chaîne vide si l’acteur est inconnu. |
| `action` | Verbe d’audit. | `VARCHAR(64)` | O | | Vocabulaire § 15. |
| `cible_type` | Famille de l’objet visé. | `VARCHAR(64)` | O | | `utilisateur`, `employe`, `document`, `competence`, ou `''`. |
| `cible_id` | Identifiant métier de la cible. Selon l’action : courriel, code employé, id de pièce, id ou libellé de compétence. | `VARCHAR(64)` | O | | Défaut `''`. |
| `detail` | Objet JSON UTF-8. Jamais une phrase libre. | `TEXT` | O | | `{}` s’il n’y a pas de détail. Clés réellement écrites : `nom`, `prenom`, `champs`, `type`, `titre`, `scan`, `octets`, `id`, `decision`, `roles`, `competences`, `postes`, `creees`, `completees`, `poste`, `intitule`, `code_employe`, `actif`, `double_auth`, `mot_de_passe` (booléen, pas le secret), `otp`, `admin`. |
| `adresse_ip` | Adresse du client. | `VARCHAR(64)` | O | | Défaut `''`. |

## 14. Nomenclatures

Ces domaines sont fermés. Un add-in qui introduit un code absent est rejeté, ou, pour un type de document, ignoré du calcul des quotes (`Type de document inconnu`).

### `type_document` et poids de base

Source : `parametres_quotes.yaml` → `poids_types`, libellés dans `LIBELLES_TYPES`. Le poids est un entier. `null` est réservé à `lettre_blame` : son poids vient de la gravité. Un poids `0` garde la pièce au dossier et la sort de la quote.

| Code | Libellé | Famille | Poids en vigueur (version YAML 1, effet 2026-10-18) |
| --- | --- | --- | --- |
| `doctorat` | Doctorat | formation | 10 |
| `master` | Master | formation | 8 |
| `licence` | Licence | formation | 6 |
| `baccalaureat` | Baccalauréat | formation | 6 |
| `diplome_technique` | Diplôme technique | formation | 4 |
| `diplome` | Diplôme | formation | 4 |
| `certificat` | Certificat | formation | 3 |
| `attestation_generale` | Attestation | formation | 3 |
| `attestation` | Attestation de suivi | formation | 2 |
| `lettre_promotion` | Lettre de promotion | lettre | 2 |
| `lettre_affectation` | Lettre d'affectation | lettre | 2 |
| `lettre_felicitation` | Lettre de félicitation et d'encouragement | lettre | 2 |
| `lettre_blame` | Lettre de blâme | lettre | selon la gravité |
| `lettre_travail` | Lettre de travail | lettre | 0 |
| `autre_divers` | Autre / Divers | hors décompte | 0 |
| `releve_notes` | Relevé de notes | hors décompte | 0 |

Ensemble `FORMATIONS` : les neuf premiers codes. Ensemble `LETTRES` : les cinq lettres. `PIECES_SANS_DECOMPTE` : `autre_divers`, `releve_notes`.

Ordre du plus haut diplôme retenu dans le calcul, du plus élevé au plus bas : `doctorat`, `master`, `licence`, `baccalaureat`, `diplome_technique`, `diplome`, `certificat`, `attestation_generale`, `attestation`. Ce rang est calculé, il n’a pas de colonne.

Un certificat (`certificat`) n’est accepté que si le code est dans `vault_actifs`.

### `alignement`

| Code | Libellé |
| --- | --- |
| `acme` | Métier, alignée ACME |
| `hors` | Extra-professionnelle, hors référentiel |

### `categorie`

| Code | Libellé |
| --- | --- |
| `finance` | Secteur financier et bancaire |
| `gestion` | Gestion et management |
| `technologie` | Technologie et data |
| `langues` | Langues et communication |
| `personnel` | Développement personnel et divers |
| `sante_securite` | Santé Sécurité |
| `surete_travail` | Sûreté et sécurité au travail |

### `gravite`

| Code | Libellé | Points en vigueur |
| --- | --- | --- |
| `legere` | Légère | −3 |
| `moyenne` | Moyenne | −4 |
| `grave` | Grave | −5 |

Défaut YAML : `legere`. Si `documents.gravite` est renseigné, il prime. Sinon le titre est comparé aux mots-clés, sans casse ni accent, et le niveau le plus élevé trouvé l’emporte.

Mots-clés actuels, déjà normalisés dans le YAML :

| Niveau | Mots |
| --- | --- |
| `legere` | rappel a l'ordre, observation, avertissement, retard |
| `moyenne` | blame, manquement, negligence, absence injustifiee |
| `grave` | faute grave, fraude, detournement, abandon de poste, insubordination, harcelement |

### `statut` de pièce

| Code persisté | Libellé affiché | Décision d’API qui y mène |
| --- | --- | --- |
| `a_completer` | À compléter | dépôt de lot |
| `en_attente` | En attente | versement unitaire, qualification, retour DRH |
| `valide` | Approuvée | décision `approuve` |
| `refuse` | Refusée | décision `refuse` |

## 15. Vocabulaire `journal_audit.action`

Verbes réellement écrits par l’application.

| Code | Cible typique | `cible_id` typique |
| --- | --- | --- |
| `connexion` | `utilisateur` | courriel |
| `connexion_refusee` | `utilisateur` | identifiant tenté |
| `envoi_otp` | `utilisateur` | courriel |
| `changement_mot_de_passe` | `utilisateur` | courriel |
| `changement_photo` | `utilisateur` | courriel |
| `creation_utilisateur` | `utilisateur` | courriel |
| `modification_profils` | `utilisateur` | courriel |
| `suppression_utilisateur` | `utilisateur` | courriel |
| `creation_compte_drh` | `utilisateur` | courriel |
| `modification_employe` | `employe` | code employé |
| `suppression_saisie_employe` | `employe` | code employé |
| `versement_document` | `document` | code employé |
| `depot_lot` | `document` | code employé |
| `completion_document` | `document` | code employé |
| `correction_document` | `document` | code employé |
| `remplacement_scan` | `document` | code employé |
| `decision_document` | `document` | id de pièce |
| `retour_document` | `document` | code employé |
| `suppression_document` | `document` | code employé |
| `association_competences_piece` | `document` | |
| `association_annuaire_piece` | `document` | intitulé |
| `creation_competence` | `competence` | libellé |
| `renommage_competence` | `competence` | id |
| `suppression_competence` | `competence` | libellé |
| `lien_poste_competence` | `competence` | id |
| `retrait_poste_competence` | `competence` | id |
| `lien_piece_competence` | `competence` | id |
| `retrait_piece_competence` | `competence` | id |
| `import_matrice` | `competence` | `''` |
| `import_csv_competences` | `competence` | `''` |

Le rapport connaît le libellé `synchronisation_vault`, mais aucune écriture ne produit cette action. `creation_employe` et `import_employes` sont dans le code après un refus immédiat : l’API ne les journalise pas.

## 16. Attributs calculés

Ils ne sont pas tous des colonnes. Un add-in les relit, il ne les pose pas à la main.

### Quote d’une pièce

Une pièce entre dans l’agrégat si, en même temps :

- `est_actif` est vrai et `alignement` n’est pas `hors` ;
- `statut` vaut `valide` ;
- le poids de base n’est pas `0` ;
- pour un blâme, le nombre de mois révolus entre `date_document` et la date du calcul ne dépasse pas `calcul.fenetre_blame_mois` (24). L’égalité avec la fenêtre reste dans le calcul. Le test est strictement supérieur.

Mois révolus : différence d’années et de mois, moins un si le jour de fin est antérieur au jour de début.

`quote_document = poids × coefficient`.

Le coefficient vient de l’ancienneté en années décimales : nombre de jours / 365,25, entre la base et la date du calcul. La base en vigueur est `employes.date_embauche` (`coefficient_anciennete.base = employe`). Bornes de la grille : minimum inclus, maximum exclu. Dernière tranche ouverte (`max` vide).

| Ancienneté (années) | Coefficient |
| --- | --- |
| 0 ≤ x < 2 | 1,00 |
| 2 ≤ x < 5 | 1,05 |
| 5 ≤ x < 10 | 1,10 |
| 10 ≤ x | 1,15 |

### Quote de la ressource

`employes.quote_ressource` agrège les quotes prises. Méthode en vigueur : `somme`. Les deux autres méthodes prévues par le schéma YAML sont `moyenne` (somme divisée par le nombre de pièces prises) et `moyenne_ponderee` (somme de `quote × |poids|`, divisée par la somme des valeurs absolues des poids).

S’il n’y a aucune pièce prise, la colonne reste `NULL`. L’affichage `quote_libelle` vaut alors la chaîne `non évaluée`. Sinon `quote_libelle` est la quote quantifiée à `calcul.arrondi_affichage` décimales (2). La colonne garde la pleine précision `NUMERIC(14,6)`.

### Ancienneté affichée

`annees_poste`, `annees_collaborateur`, `mois_poste`, `mois_collaborateur` sont des champs de sortie d’API. Ils ne sont pas stockés.

### Portrait Vault

Objet S3 distinct de `utilisateurs.photo_octets` : clé `vault/photos/{CODE}.jpg`. JPEG uniquement (magic `FF D8 FF`), 1 à 2 000 000 octets. Le même objet est partagé avec SISA et l’évaluation.

## 17. Paramètres de calcul

Fichier `Archivage-dossiers/parametres_quotes.yaml`, validé par `ParametresQuotes`. Une clé inconnue est refusée. Version lue : `version = 1`, `date_effet = 2026-10-18`.

| Élément | Définition | Représentation | Domaine en vigueur |
| --- | --- | --- | --- |
| `version` | Numéro du jeu de paramètres. | entier ≥ 1 | 1 |
| `date_effet` | Date d’effet du jeu. | `DATE` | 2026-10-18 |
| `session.inactivite_minutes` | Fermeture sans action. L’avertissement s’affiche une minute avant. | entier | 2 à 480, valeur 15 |
| `calcul.methode_agregation` | Agrégat de la quote ressource. | énumération | `somme`, `moyenne`, `moyenne_ponderee` |
| `calcul.fenetre_blame_mois` | Au-delà, le blâme reste au dossier et sort du calcul. | entier | 0 à 240, valeur 24 |
| `calcul.arrondi_affichage` | Décimales de `quote_libelle`. | entier | 0 à 6, valeur 2 |
| `calcul.quote_ressource_si_aucun_document` | Doit rester `null`. | nul | « non évaluée », jamais 0 |
| `versions.conservation_ancienne_version_jours` | Durée prévue de conservation d’une ancienne version. | entier | 1 à 3650, valeur 30. La colonne `documents.version` n’est pas incrémentée par le versement actuel. |
| `archivage.delai_annees` | Délai d’archivage après la sortie. | entier | 1 à 100, valeur 5 |
| `archivage.declencheur` | Événement qui arme ce délai. | énumération | `date_sortie_employe` |
| `numerisation.poids_cible_ko_par_page` | Cible documentaire, en Kio par page. | entier > 0 | 250 |
| `numerisation.poids_max_ko_par_document` | Plafond documentaire, en Kio. | entier > 0 | 1024 |
| `numerisation.poids_max_brut_upload_mo` | Plafond déclaré, en Mo. | entier > 0 | 10. Le contrôle d’API du scan est 4 000 000 octets. |
| `numerisation.resolution_dpi` | Résolution cible. | entier > 0 | 200 |
| `numerisation.formats_acceptes` | Formats déclarés. | liste | `pdf`, `jpeg` |
| `numerisation.format_stockage` | Format cible. | énumération | `pdf/a-2b`. Le scan est toutefois stocké tel quel dans `fichiers_document`. |
| `coefficient_anciennete.base` | Date qui arme le coefficient. | énumération | `employe` ou `document` |
| `coefficient_anciennete.grille[]` | `min`, `max`, `coefficient` | décimaux | `min` ≥ 0, `coefficient` > 0, couverture continue depuis 0, dernière tranche ouverte |
| `acces.employe_consulte_son_dossier` | Paramètre d’accès. | booléen | `true` |
| `acces.superieur_consulte_subordonnes` | Paramètre d’accès. | booléen | `true` |
| `acces.profondeur_hierarchie` | Profondeur. `null` : toute la ligne descendante. | entier ≥ 1 ou nul | `null` |
| `acces.afficher_quotes_employe_et_superieur` | Affichage des quotes. | booléen | `true` |
| `acces.journaliser_consultations` | Journal des consultations. | booléen | `true` |
| `acces.export_dossier_pdf` | Profils autorisés à l’export PDF du dossier. | liste | `drh`, `agent_rh`, `employe`. Valeur actuelle : `drh`, `agent_rh` |
| `filieres.{cle}.diplome_entree_minimum` | Diplôme d’entrée d’une filière. | chaîne non vide | Dictionnaire vide aujourd’hui. |

## 18. Structures d’échange

Un add-in qui passe par l’HTTP reprend ces objets. Les noms sont ceux du JSON. Les champs homonymes d’une colonne ont la même définition que dans les tables.

### Jeton de session

JWT HS256. Durée : `jeton_heures` (défaut 8). Claims : `sub` (courriel en minuscules), `role` (copie de `utilisateurs.role`), `exp`. L’en-tête d’appel est `Authorization: Bearer {jeton}`. Le claim `role` n’est pas la source des droits : le service recharge `profils_utilisateur` pour le `sub`.

Jeton d’étape OTP, 10 minutes : `sub`, `purpose` = `otp`, `defi` (id de `defis_otp`), `exp`. Le corps de validation est `{ "defi": "...", "code": "000000" }` avec `code` sur 6 caractères.

Réponse de connexion `JetonOut` : `etape` (`session` ou `otp`), `jeton`, `defi`, `utilisateur`.

### Compte vu par l’API

`UtilisateurOut` : `courriel`, `nom`, `role`, `roles` (liste des profils), `code_employe`, `double_auth`, `photo` (booléen de présence, pas les octets).

`UtilisateurAdminOut` ajoute `id` et `actif`.

`UtilisateurIn` : `code_employe`, `courriel`, `mot_de_passe` (12 à 200), `roles` (au moins un), `double_auth`.

### Collaborateur vu par l’API

`EmployeOut` reprend les colonnes de `employes` utiles au métier, plus `nom_superieur` (résolu, non stocké) et `quote_libelle` (chaîne d’affichage). `PageEmployes` porte `total`, `page`, `taille`, `elements`, et optionnellement `vault` (`nombre_actifs`, `synchronise_le`, `source`, `message`) et `indicateurs` (`collaborateurs`, `actifs`, `sortis`, `agences`, `completude`).

Export CSV des collaborateurs, délimiteur `;`, BOM UTF-8, colonnes dans l’ordre : `code_employe`, `nom`, `prenom`, `date_embauche`, `date_sortie`, `direction`, `agence`, `poste`, `filiere`, `code_superieur`, `courriel`, `actif` (`oui` / `non`).

### Pièce vue par l’API

`DocumentOut` : `id`, `code_employe`, `nom`, `type_document`, `titre`, `date_document`, `statut`, `imputeur_nom`, `imputeur_code`, `date_imputation`, `quote_document`, `alignement`, `categorie`, `poste_vise`, `lieu`, `gravite`, `a_fichier`, `competence_ids`.

`DecisionIn` : `decision` sur le motif `approuve|refuse`, `motif` (0 à 500, obligatoire si refus).

`DossierOut` : `postes` (événements `type`, `date`, `titre`, `detail`), `notes` et `formations` (pièces réduites : `id`, `type`, `date`, `titre`, `statut`, `a_fichier`, et les champs de classement).

### Copie Vault lue

Objet S3 `vault/vault-employee-list.csv` (UTF-8, virgule ou point-virgule). Colonnes consommées, les autres sont ignorées :

| Colonne source | Attribut cible | Règle |
| --- | --- | --- |
| `employee_code` | `code_employe` | Obligatoire dans l’en-tête. Majuscules, sans espace. |
| `first_name` | `prenom` | |
| `last_name` | `nom` | |
| `date_of_hire` | `date_embauche` | `%m/%d/%Y`, `%Y-%m-%d`, `%m/%d/%y`, `%d/%m/%Y`. |
| `date_of_termination` | `date_sortie` | Mêmes formats. Vide si absente. |
| `department` | `direction` | |
| `agency_code` | `agence` | Majuscules. |
| `position` | `poste` | |
| `email_address` | `courriel` | |
| `depends_on` | `code_superieur` | Majuscules, `NULL` si vide. |
| `active` | `actif` | Vrai si `true`, `1`, `oui`, `vrai`, `yes`, `y`. |

## 19. Règles qu’un add-in respecte

- Il lit les codes de ce dictionnaire. Il n’ajoute pas de type, de statut, de profil ni de gravité hors liste.
- Il traite `quote_ressource` nulle comme « non évaluée ». Il n’y substitue pas zéro.
- Il distingue `valide` (colonne) et `approuve` (verbe de décision).
- Il distingue la photo de compte (`utilisateurs.photo_octets`) et le portrait Vault (`vault/photos/{CODE}.jpg`).
- Il ne reconstruit pas un mot de passe, un code OTP ni une empreinte à partir du journal : ces secrets n’y sont pas.
- Il considère `profils_utilisateur` comme la source des droits, et `utilisateurs.role` comme une copie.
- Il considère Vault comme la source des personnes. `filiere` est la seule donnée d’employé que la synchro ne réécrit pas.
- Il s’aligne sur `parametres_quotes.yaml` pour les poids, la fenêtre de blâme et la grille d’ancienneté, plutôt que sur des constantes recopiées.
