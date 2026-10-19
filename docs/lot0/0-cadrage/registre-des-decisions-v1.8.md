# REFONTE DU PORTAIL EMPLOYÉS
## Registre des décisions de cadrage (Lot 0)
### Réponses aux questions Q1 à Q10 de l’audit du 5 octobre 2026

> Reçu du directeur le 2026-10-06, recopié tel quel. **Ce registre fait foi** : en cas de doute ou de contradiction avec un autre document du dossier `docs/lot0/`, c’est lui qui l’emporte. Les points *[entre crochets]* sont à confirmer : on peut leur préparer une proposition par défaut, sans les considérer comme tranchés.

| Élément | Détail |
| :--- | :--- |
| **Émetteur** | Gregory Hilaire, Directeur Principal Ressources Humaines, Informatique et Technologie |
| **Destinataire** | Assistant en développement du portail (DIT) |
| **Date** | 6 octobre 2026 |
| **Version** | 1.8 — Q1 à Q10 : toutes les questions ont reçu une décision |
| **Convention** | Les éléments en [jaune entre crochets] sont à confirmer avant diffusion définitive. |

---

## Suivi des décisions

Ce document regroupe les décisions du propriétaire du projet. Chaque réponse devient une règle de spécification pour le lot 0, puis pour les lots suivants. Les réponses sont posées une à une, dans l’ordre.

| N° | Sujet | Lot concerné | Statut |
| :--- | :--- | :--- | :--- |
| **Q1** | Champs obligatoires pour débloquer le dépôt | Lot 1 | Validée |
| **Q2** | Qui valide les certificats, motifs de rejet | Lots 1 et 2 | Validée |
| **Q3** | Niveaux de certificat | Lot 1 | Validée |
| **Q4** | Liste officielle des agences et directions | Lots 0 et 1 | Validée |
| **Q5** | Postes ouverts et éligibilité | Lots 0 à 4, puis lot distinct | Validée |
| **Q6** | Demandes de promotion et de changement de poste | Lots 2 et 4 | Validée |
| **Q7** | Relances et notifications (WhatsApp, email) | Lots 1 à 4 | Validée |
| **Q8** | Hébergement : AWS et carriere.acmehaiti.com | Lots 0, 1 et 3 | Validée |
| **Q9** | Charte graphique : logo et couleurs | Lot 1 | Validée |
| **Q10** | Durée de péremption d’une information | Lot 4 | Validée (12 mois) |

---

## Q1 — Champs obligatoires pour débloquer le dépôt

**Statut :** Validée

### Principe
Le verrou ne porte que sur ce dont les RH ont besoin pour traiter une promotion ou pourvoir un poste, et que l’employé peut fournir lui-même en quelques minutes. Le profil reste toujours consultable. Seul le dépôt du certificat attend un profil complet, avec un message du type « Complétons votre profil pour valoriser votre certificat », la liste exacte de ce qui manque et un bouton vers chaque champ.

### Champs obligatoires (à saisir ou à confirmer par l’employé)
1. **Téléphone.**
2. **Adresse.**
3. **Email**, avec l’option « Je n’ai pas d’adresse email ». Environ un quart des lignes de l’export n’en ont pas, et ces employés ne doivent pas être bloqués pour cette raison.
4. **Contact d’urgence** (nom, lien avec l’employé, téléphone). Cette donnée n’existe pas dans l’export RH : le portail doit la collecter (elle sert notamment pour les assurances).
5. **Niveau d’études.** Cette donnée n’existe pas non plus dans l’export : le portail doit la collecter. Elle doit rester cohérente avec le certificat déposé.

### Champs à confirmer sans pouvoir les modifier
* **Agence, poste, date d’embauche.** Ces données viennent du système RH. L’employé coche « Ces informations sont exactes » ou « Signaler une erreur ». Un signalement crée une demande de vérification pour les RH ; l’employé ne modifie jamais directement ces champs.

### Hors verrou
* **Nom et prénom**, déjà dans le système et utilisés pour l’identification.
* **Les formations, expériences et compétences**, qui viendront avec « Ma carrière » (lot 4), ne bloquent pas le dépôt du certificat.

### Règle de complétude (tableau unique des règles, lot 1)
* Un champ est complet s’il est rempli (ou, pour l’email, s’il porte la mention « pas d’adresse »).
* Les champs en lecture seule sont complets une fois confirmés.
* La péremption à 12 mois n’est pas active au lancement, puisque la date de confirmation commence au lancement. Elle est reportée au lot 4 (voir Q10).
* Le pourcentage affiché (« Votre dossier est complet à X % ») est calculé à partir de ces champs.

### Points à intégrer
* Le niveau d’études et le contact d’urgence sont de nouvelles données personnelles. Prévoir la mention d’information et le consentement au lot 1, en précisant pourquoi on collecte et qui y a accès.
* Les signalements d’erreur sur agence, poste et date d’embauche alimentent la file de traitement RH (lot 2). Au lot 1, ils sont simplement enregistrés avec date, ancienne valeur et motif.
* Démonstration attendue après codage de la règle : un employé au dossier complet et un employé au dossier incomplet.
* Contact d’urgence : sa collecte correspond à une pratique déjà acceptée dans l’institution, notamment pour les assurances. Cette donnée est absente de la base actuelle et doit y être ajoutée.

---

## Q2 — Qui valide les certificats, et motifs de rejet

**Statut :** Validée

### 1. Qui valide
* Les certificats sont validés par les **Agents RH**, désignés par le propriétaire du projet : Mme Colin Nérius, Assistant DRH, Branche Formation Gestion de Carrières, et Rose-Herline Joseph, Assistant RH, avec les mêmes droits et privilèges. D’autres Agents RH pourront être désignés par la suite.
* Le rôle **Administrateur** (Gregory Hilaire, DRH, suppléé par M. Sinior Raymond, son supérieur hiérarchique) peut aussi valider ou rejeter, réaffecter un dossier, gérer les comptes et réinitialiser l’accès d’un employé.
* Le rôle **Lecture seule** (par exemple la Direction Générale ou l’audit) consulte les dossiers et les tableaux de bord, sans valider.
* **Séparation des tâches :** un agent ne peut jamais valider son propre certificat. Dans ce cas, le dossier est automatiquement dirigé vers un autre valideur : l’autre Agent RH (Mme Nérius et Rose-Herline Joseph valident le certificat l’une de l’autre), ou à défaut un Administrateur.
* Chaque décision enregistre l’identité du valideur, la date, l’heure et le motif en cas de rejet. Les consultations de dossiers sont tracées dans le journal d’audit (lot 2).

### 2. Statuts du certificat
| Statut | Signification |
| :--- | :--- |
| **Reçu / En vérification** | Dès l’envoi par l’employé. |
| **Validé** | Le certificat est accepté et rattaché définitivement au dossier. |
| **À corriger (rejet)** | Un motif est obligatoire. L’employé voit le motif sur son portail et peut redéposer un document corrigé. |

*Un certificat validé n’est jamais supprimé. En cas de remplacement, l’ancien reste archivé avec son historique.*

### 3. Délai de traitement
* **Objectif :** traitement sous 5 jours ouvrables (délai accepté).
* Au-delà, le dossier apparaît en alerte dans la file de validation.
* L’employé voit toujours l’état de son dépôt.

### 4. Motifs de rejet (liste fermée, commentaire facultatif)
1. Document illisible ou de mauvaise qualité (flou, coupé, trop sombre)
2. Document incomplet (pages manquantes)
3. Nom de l’employé absent ou différent de celui du dossier
4. Document non reconnu comme diplôme, certificat ou attestation
5. Niveau déclaré non conforme au document déposé
6. Établissement ou année non identifiable
7. Document expiré ou non valide
8. Doublon d’un document déjà validé
9. Fichier endommagé ou format non conforme
10. Autre (commentaire obligatoire)

*Le message affiché à l’employé est poli et orienté vers la correction, par exemple : « Votre document est difficile à lire. Merci de le redéposer avec une photo plus nette. »*

### 5. Écrans à prévoir (lot 2)
* Une file de validation avec visionneuse : document à gauche, informations du profil à droite.
* Les boutons **Valider** et **Rejeter**, ce dernier ouvrant la liste des motifs.
* Un historique par dossier : qui a fait quoi, et quand.
* Pas de validation groupée au lancement : chaque document est examiné individuellement.

### 6. Ce qui n’est pas demandé pour l’instant
* Pas de vérification auprès des établissements émetteurs.
* Pas de double validation (deux valideurs par certificat). Ce point sera revu si des erreurs sont constatées après le lancement.

---

## Q3 — Niveaux de certificat

**Statut :** Validée

### 1. Trois notions à distinguer
* Le **type de document** reste celui du portail actuel : Diplôme, Certificat, Attestation, Autre.
* Le **niveau** classe chaque document sur une échelle commune. C’est lui qui sert aux filtres RH, à l’éligibilité aux postes ouverts et aux promotions (lot 4).
* Le **niveau d’études du profil** (champ obligatoire de Q1) utilise la même liste. Il correspond au niveau le plus élevé validé par un certificat. Si l’employé déclare un niveau supérieur à celui de ses certificats validés, l’écart est signalé aux RH.

### 2. Liste des niveaux (du plus bas au plus élevé)
*Alignment obligatoire :* ACME SA possède une grille de classification des postes avec des niveaux d’études minimum. La liste ci-dessous est un point de départ ; elle sera alignée sur cette grille (niveaux, intitulés et rangs) au lot 0.
Chaque niveau porte un rang numérique interne, invisible pour l’employé, qui permet de comparer les niveaux entre eux.

| Rang | Niveau | Exemples |
| :---: | :--- | :--- |
| **1** | Primaire / Fondamental | Certificat d’études |
| **2** | Secondaire | Classe de 3e ou diplôme équivalent |
| **3** | Baccalauréat | Bac I / Bac II (Philo) |
| **4** | Formation professionnelle / Technique | Diplôme technique, formation sectorielle (selon la grille d’ACME SA) |
| **5** | Technicien supérieur / Bac + 2 | (selon la grille d’ACME SA) |
| **6** | Licence | Bac + 3 ou 4 selon l’université |
| **7** | Master | Maîtrise, Master 1 ou 2 |
| **8** | Doctorat | Doctorat, PhD |
| **—** | Certification professionnelle | Hors échelle académique (comptabilité, gestion de risque, microfinance, informatique…) |
| **—** | Formation continue / Attestation | Séminaire, atelier, stage avec attestation |

*Les deux dernières lignes sont hors échelle : elles ne comptent pas dans le niveau d’études, mais elles comptent dans la complétude du dossier et dans le profil de compétences.*

### 3. Champs d’un certificat (lot 1)
* Type (Diplôme, Certificat, Attestation, Autre)
* Niveau (liste ci-dessus)
* Intitulé exact et établissement
* Année d’obtention
* Domaine ou spécialité (facultatif, liste libre complétée au fil du temps)
* Aperçu avant envoi

### 4. Règles
* Le niveau est choisi par l’employé dans une liste fermée. Le valideur RH peut le corriger, et le rejet « Niveau déclaré non conforme au document » reste possible.
* Un employé peut déposer plusieurs certificats. Son niveau d’études est recalculé automatiquement à partir du plus élevé validé.
* La liste doit être modifiable sans toucher au code dès que possible (lot 4). Au lot 1, elle est écrite dans le tableau unique des règles, avec les rangs.
* Les diplômes étrangers sont acceptés. L’employé indique le pays, et les RH apprécient l’équivalence au moment de la validation. L’équipe RH se dotera de la capacité d’apprécier ces équivalences.

### 5. Demandes pour le lot 0
* Intégrer cette liste dans les maquettes (sélecteur de niveau avec exemples en infobulle).
* Confirmer la gestion du cas d’un employé dont le niveau déclaré dépasse ses certificats validés.
* Obtenir de la DRH la grille de classification des postes d’ACME SA et aligner la liste des niveaux et leurs rangs sur cette grille, avant de finaliser les maquettes.

---

## Q4 — Liste officielle des agences et des directions

**Statut :** Validée

### 1. Principe
Le portail ne lit plus les agences et directions comme du texte libre issu de l’export. Il utilise un référentiel officiel, c’est-à-dire une table de référence unique. L’export RH est rattaché à ce référentiel par un tableau de correspondance.

### 2. Propriétaire de la donnée
Le référentiel est placé sous la responsabilité de **Mme Colin Nérius**, responsable du référentiel à la DRH, assistée de **Mme Darling Jean**. La liste officielle est validée par la DRH. Toute modification (ouverture, fermeture, fusion ou renommage d’une unité) passe par la responsable du référentiel. La DIT ne la modifie pas seule.

### 3. Structure du référentiel
| Champ | Description |
| :--- | :--- |
| **Code** | Stable et unique. Il ne change jamais, même si le nom change. |
| **Libellé officiel** | Avec les accents corrects. |
| **Type** | Agence, Région, Direction, Service rattaché, Siège. |
| **Rattachement** | Pour une agence : la région à laquelle elle appartient. Pour un service du siège : la direction dont il dépend. |
| **Statut** | Actif ou inactif, avec date de début et de fin. |
| **Anciens libellés** | Reconnus pour faire le lien avec l’export. |

Les régions sont des regroupements dynamiques d’agences : leur composition peut changer. Le portail conserve donc la région d’une agence avec des dates de début et de fin (une agence appartient à une seule région à la fois), ce qui permet de reconstituer l’historique et de produire des tableaux de bord et des filtres par région. La composition est modifiable par le propriétaire du référentiel, sans toucher au code.
Le référentiel compte aujourd’hui 28 agences, plus les directions et services du siège *[liste à confirmer, y compris points de service, antennes et agences récemment ouvertes ou fermées]*.

### 4. Travail demandé au lot 0
1. À partir de l’export CSV, extraire la liste distincte des codes d’agence et des noms de direction, avec le nombre d’employés pour chacun.
2. Repérer les anomalies : doublons, variantes d’écriture, valeurs vides, codes sans nom et caractères mal encodés (un problème d’encodage à la lecture du CSV est probable et peut se corriger à la source).
3. Remettre cette liste dans un tableau Excel à trois colonnes : valeur trouvée dans l’export, proposition de libellé officiel, nombre d’employés.
4. Importer le fichier de correspondance agence → région fourni par la DRH, avec une date de début pour chaque rattachement. Le portail en conserve l’historique et le fichier peut être remplacé à chaque changement de composition.
5. Validation ou correction de chaque ligne par le propriétaire avec la DRH. Aucune valeur ne doit rester sans correspondance.

### 5. Règles pour le portail
* L’affichage, les filtres, les tableaux de bord par agence, par région et par direction, et les exports utilisent uniquement le libellé officiel.
* Si l’import trouve une valeur inconnue, il ne l’ignore pas : il la place dans une liste « À rattacher » visible de l’administrateur, et l’employé concerné est classé « Unité à confirmer » en attendant.
* Les employés d’une unité devenue inactive restent visibles dans l’historique.
* Au lot 1, le référentiel est un fichier ou une table modifiable par la responsable du référentiel, son assistante et les Administrateurs. Une interface de gestion peut attendre le lot 4.

### 6. Interdits
* Corriger les noms directement dans le code.
* Modifier l’export RH. Il reste en lecture seule, et la correction se fait dans le tableau de correspondance.

---

## Q5 — Postes ouverts et éligibilité

**Statut :** Validée
*(Cette fonctionnalité relève du lot 4, mais ses critères conditionnent des données collectées dès le lot 1.)*

### 1. Qui saisit les postes ouverts
* Les postes sont saisis par les Agents RH et validés avant publication par l’Administrateur *([le propriétaire du projet ou le responsable du recrutement interne])*.
* Un responsable hiérarchique peut exprimer un besoin, mais il ne publie pas lui-même : la demande passe par la DRH. *([À confirmer : circuit actuel de publication des postes.])*
* Statuts d’un poste : Brouillon, Publié, Clôturé, Pourvu, avec date et auteur de chaque changement.

### 2. Fiche d’un poste ouvert
* Intitulé et code du poste (celui du référentiel RH)
* Agence, région ou direction (selon le référentiel de Q4)
* Grade ou classe visé, et mission en quelques lignes
* Critères d’éligibilité (voir ci-dessous)
* Date d’ouverture et date limite de candidature
* Visibilité : tous les employés voient tous les postes publiés, sauf les postes marqués confidentiels (voir règles de gestion).

### 3. Critères d’éligibilité retenus
Seuls les critères qui peuvent être vérifiés avec des données validées sont calculés automatiquement.

| Critère | Règle de calcul |
| :--- | :--- |
| **Niveau d’études minimum** | Comparé au niveau le plus élevé validé (rang défini en Q3). |
| **Domaine ou spécialité** | Facultatif, comparé aux certificats validés. |
| **Ancienneté dans l’institution** | Calculée à partir de la date d’embauche, déjà dans l’export. |
| **Grade ou classe actuel** | Présent dans l’export. Règle du type « au moins le grade X » ou « grade X ou Y ». |
| **Ancienneté dans le poste actuel** | Calculée à partir de la date d’effet du dernier mouvement de carrière (voir section 6). Tant que l’historique n’est pas disponible pour un employé, ce critère est « non calculable » et laissé à l’appréciation des RH. |
| **Agence, région ou direction** | Utilisée seulement si le poste est limité à une unité. |

*Exclus du calcul automatique :* les évaluations de performance et les compétences déclarées. Ces éléments sont examinés par les RH lors de l’étude de la candidature.

### 4. Ce que voit l’employé
* Chaque poste affiche un indicateur : **vert** si l’employé est éligible, **orange** s’il ne l’est pas encore.
* En cas d’orange, le portail indique ce qui manque (par exemple « Il vous manque : un certificat de niveau Licence validé »).
* L’indicateur est informatif et non contraignant : il n’empêche jamais de manifester son intérêt.
* Seuls les certificats validés comptent. Un certificat « en vérification » n’ouvre pas l’éligibilité, mais le message invite à patienter. C’est l’argument d’engagement du projet : déposer ses certificats rend éligible.

### 5. Règles de gestion
* L’éligibilité automatique est informative. Elle ne décide jamais d’une nomination ; la décision reste aux RH et à la hiérarchie.
* Un employé en orange peut manifester son intérêt comme les autres ; la demande est simplement marquée « hors critères » pour l’étude des RH.
* Toute modification d’un critère après publication est tracée dans le journal d’audit.
* **Poste confidentiel :** par défaut, tous les postes publiés sont visibles de tous. Pour des cas particuliers (par exemple un remplacement en cours), un Administrateur peut marquer un poste « confidentiel » : il n’est alors visible que des personnes ciblées. Le marquage exige un motif et est tracé dans le journal d’audit.

### 6. Ancienneté dans le poste et mouvements de carrière
L’export RH ne contient pas l’ancienneté dans le poste. L’information existe pourtant dans les lettres de promotion et de transfert classées dans les dossiers des employés.
* **Décision :** doter le système d’un moyen de la récupérer à partir de ces lettres, puis de ne plus dépendre d’elles.

* **Étape A — Récupération de l’historique (lettres existantes) :**
  * Un module d’extraction lit les lettres PDF de promotion, de transfert et de nomination et en tire un mouvement de carrière.
  * Aucun résultat n’est enregistré sans validation humaine. L’Agent RH voit le PDF d’un côté et les champs extraits de l’autre, corrige si besoin et valide.
  * Le module ignore et ne stocke jamais les informations salariales ou de rémunération.
  * L’extraction passe par une reconnaissance de texte (OCR). Un échantillon test de 20 à 30 lettres sert à mesurer la qualité et à choisir l’outil d’OCR.
* **Étape B — Production des lettres par le système (à l’avenir) :**
  * À terme, les lettres sont produites par le système. Le portail produit un export des mouvements validés, à réimporter dans le système RH. Cette étape est planifiée comme un lot distinct.
* **Règle de calcul :** ancienneté dans le poste = date du jour moins date d’effet du dernier mouvement de carrière (ou date d’embauche si aucun mouvement).

### 7. Impact sur les lots
* **Lots 1 et 2 :** collecte et validation du niveau d’études, certificats, confirmation du grade et de la date d’embauche.
* **Lot 0 :** modélisation du modèle « mouvement de carrière » et test d’extraction sur échantillon.
* **Lot 2 :** module d’extraction et file de contrôle des mouvements.
* **Lot 4 :** saisie des postes, calcul d’éligibilité, affichage employé, candidatures.

---

## Q6 — Demandes de promotion et de changement de poste

**Statut :** Validée

### 1. Situation actuelle
Remise d’une lettre aux RH, sans registre centralisé. L’historique des demandes est dispersé.

### 2. Principe : un registre des demandes alimenté par deux voies
* **Voie portail :** l’employé dépose sa demande en ligne (lot 4).
* **Voie lettre :** pendant la transition, l’Agent RH enregistre la demande à réception, avec la lettre scannée en pièce jointe.

### 3. Circuit de traitement
1. Réception (lettre ou portail) et enregistrement par l’Agent RH.
2. Étude des possibilités par la DRH.
3. Consultation du responsable du département concerné (« Disponibilité confirmée » ou « Pas de disponibilité »).
4. Évaluation de la ressource si nécessaire (« Positive » ou « Negative », avec date et commentaire).
5. Décision de la DRH.
6. Approbation de la Direction Générale (« Approuvée » ou « Non approuvée »).
7. Clôture (acceptée, refusée, reportée ou retirée).

### 4. Fiche d’une demande
Contient : Employé, Date de réception, Canal, Type, Poste visé, Motivation, Pièce jointe, Statut / étape, Décision, Profil au moment de la demande, Responsable du traitement.

### 5. Règles
* Demande spontanée autorisée (pas besoin d’un poste ouvert).
* Aucune demande n’est supprimée (historique conservé).
* Accusé de réception et suivi dans « Mes demandes ».
* Délai d’accusé de réception : *[2]* jours ouvrables. Délai de réponse : *[à fixer avec les RH]*.

---

## Q7 — Relances et notifications

**Statut :** Validée

### 1. Canaux et ordre de priorité
1. **WhatsApp** (numéro de téléphone obligatoire de Q1) : canal prioritaire, via l’API officielle WhatsApp Business.
2. **Email institutionnel**.
3. **Email personnel** (en dernier recours, avec consentement).

### 2. Règles WhatsApp
* Utilisation exclusive de l’API officielle de Meta (interdiction des outils non officiels).
* Modèles de messages approuvés à l’avance.
* Consentement recueilli dans le profil.

### 3. Quand envoyer
* Notifications de statut (certificat, demande).
* Message de lancement (lot 3).
* Relances automatiques : 1 à 7 jours, puis 14 jours (maximum *[3]* messages par campagne).
* Résumé périodique des postes ouverts (ex: hebdomadaire).
* **Règle de bonne conduite :** envoi uniquement aux heures ouvrables, du lundi au vendredi *[8 h à 18 h]*. Arrêt immédiat dès que le dossier est complet.

---

## Q8 — Hébergement : serveur et nom de domaine

**Statut :** Validée

### 1. Hébergement et adresse
* Hébergé sur le compte AWS d’ACME SA à l’adresse `carriere.acmehaiti.com`.
* Région AWS : `us-east-2` (comme Cognito) *[à confirmer par la DIT]*.
* HTTPS uniquement, certificat ACM, CloudFront en frontal.

### 2. Environnements
* **Production :** `carriere.acmehaiti.com`
* **Recette (essais) :** `recette-carriere.acmehaiti.com` (protégé par mot de passe, données fictives uniquement).

### 3. Données et documents
* Documents stockés dans un espace S3 privé, chiffré, versionné. Liens temporaires. Analyse antivirus à l’upload.
* Base de données PostgreSQL gérée (RDS) recommandée, sauvegardée quotidiennement (rétention 30 jours).

### 4. Sécurité des accès
* **Employés :** connexion standard (nom, prénom, date de naissance, mot de passe).
* **Admins / Agents RH :** double authentification obligatoire (Cognito / SES), zone d’administration réservée au réseau de l’institution ou accessible via VPN institutionnel.
* Secrets stockés dans AWS Secrets Manager.

---

## Q9 — Charte graphique

**Statut :** Validée

### Éléments retenus
* **Bleu marine (`#1E1E82`) :** couleur principale (en-têtes, boutons principaux, titres).
* **Rouge (`#CC1111`) :** couleur d’accent, utilisée avec parcimonie (ne sert pas à signaler une erreur ou un rejet).
* **Mascotte :** « La Penseuse » (présente sur la page de connexion, écrans d’accueil et d’encouragement, absente des refus/rejets).
* **Logo :** Logo officiel d’ACME SA.
* **Design :** Conçu pour téléphone d’abord (mobile-first).

---

## Q10 — Durée de péremption d’une information

**Statut :** Validée

* **Règle :** Une information est périmée si elle n’a pas été confirmée depuis 12 mois.
* **Lancement :** La règle s’active au lot 4 (la date de dernière confirmation commence au lancement du portail).
* **Fonctionnement :** L’employé confirme en un clic ou met à jour ses informations lors du rappel (envoyé *[30 jours]* avant la péremption). Les certificats validés et le niveau d’études ne se périment pas.

---

## Points ouverts à confirmer (Récapitulatif des éléments surlignés en jaune)
| Question | Point à confirmer |
| :--- | :--- |
| **Q3** | Grille de classification des postes à remettre à la DIT pour aligner les niveaux et les rangs. |
| **Q4** | Fichier de correspondance agence → région à remettre à la DIT ; points de service, antennes et agences ouvertes ou fermées récemment. |
| **Q5** | Circuit actuel de publication des postes ; remise de l’échantillon de lettres scannées ; format de l’export des mouvements. |
| **Q6** | Dépôt par le portail réservé aux profils complets ou non ; information du responsable hiérarchique ; délais d’accusé de réception et de réponse ; période de reprise de l’historique (3 ans proposés) ; grille d’entretien. |
| **Q7** | Prestataire et budget WhatsApp ; nombre max de relances (3) ; horaires d’envoi (8h-18h) ; textes des modèles. |
| **Q8** | Choix de la base de données (PostgreSQL recommandé) ; schéma d’architecture et coût ; gestion DNS ; solution VPN ; région AWS ; fréquence des tests de restauration. |
| **Q9** | Fichiers du logo et de la mascotte ; police officielle. |
| **Q10** | Délai de grâce de 30 jours ; délai du rappel avant péremption (30 jours). |

---

## Livrables attendus au lot 0
1. Spécifications écrites et tableau unique des règles.
2. Maquettes des écrans employé et administration.
3. Modèle de données.
4. Référentiel des agences, régions et directions + table de correspondance.
5. Fichier Excel d’import de l’historique des demandes + plan d’extraction des lettres scannées.
6. Architecture AWS (schéma, coût, VPN, base de données).
7. Prestataire WhatsApp (coût, modèles, test email).
8. Guide de style d’une page.
