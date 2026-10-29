# PAM — Plan d'intégration à Carrières et de mise en production

| | |
|---|---|
| **Version** | 0.2, 2026-10-28 — ajout du §0 (module PAM du directeur, postes) ; 0.1 du 2026-10-27 |
| **Sources** | Échanges du 2026-10-27 avec le directeur (par le développeur) ; documents reçus le 2026-10-27 : *Dictionnaire de données — Carrières* v1.0, *Cahier des charges — Référentiel des dossiers collaborateurs* (Carrières), *PAM — Cahier des charges et architecture* (G. Hilaire). Ces documents sont à déposer dans `docs/pam/sources/` |
| **Ce que le plan change** | Le portail carrière devient **PAM** (Plateforme ACME Multifonction). Il devient l'interface des collaborateurs de Carrières, qui reste l'espace de la DRH. Il passe en production sur AWS |

## 0. Mise à jour du 2026-10-28 : le module PAM du directeur

**Reçu** : le dossier `pam/pam/`, avec son application PAM (connexion et balance PER), déjà publiée en test par `plateforme/deploy/publier.py` (une Lambda `pam-api`, une table `pam-etat`, une HTTP API), et sa cible `plateforme/infra/stack.py` (CloudFront, API REST, WAF, DynamoDB, KMS). Le dossier `postes/` contient 71 fiches de poste et la correspondance de chaque poste avec un domaine. Message du directeur : « modèle à suivre pour le développement de PAM de manière sécurisée oui il faut absolument publier les postes disponibles et qui correspondent au profil actif (actuellement signin) ».

| # | Décision | Source | Statut |
|---|---|---|---|
| D-60 | `pam/pam/modele_authentification.md` fait foi pour la connexion de **toute** l'application : valeurs, messages, stockage. `test_noyau.py` donne les parcours que nos tests doivent garder | Message du directeur | Retenue |
| D-61 | Le PER devient un **module de notre application** (une seule connexion). Ses fonctions de lecture (`releve_per`, montants, dates) sont reprises ; la clé `per/{CODE}.json` vient du code de la session | Développeur, 2026-10-28 | À confirmer par le directeur |
| D-62 | Déploiement **par la console**, avec l'accès dev-conges (accord du directeur) : une fonction Lambda et une API HTTP, noms `conges-dispo-pam-*`, étiquette `Project`, rôle imposé `conges-dispo-lambda-role`. Guide : `docs/pam/deploiement-console.md`. La cible `stack.py` (CloudFront, WAF) attend des droits que cet accès n'a pas | Directeur et développeur, 2026-10-28 | Retenue ; droits du rôle et bases PostgreSQL à obtenir |
| D-63 | Les postes ouverts qui correspondent au profil de l'employé connecté sont publiés dans PAM | Message du directeur | Retenue ; règles en Q15 à Q17 |
| D-64 | La **main levée** du gel de 72 heures (version du directeur du 2026-10-29, `main_levee`) se fait depuis le **dossier de l'employé, dans l'espace de gestion RH**, et non depuis la session PAM d'un employé de la DRH : la DRH y a déjà une connexion forte et y débloque déjà les accès (US-22). Mêmes règles et même courriel à l'employé que le directeur | Choix de l'utilisateur, 2026-10-29 (US-1026) |

**Écarts à corriger** (notre connexion → le modèle) : date en un champ de 8 chiffres JJMMAAAA masqué ; captcha à 3 échecs ; verrous de 1 min, 15 min puis 1 h, comptés par code **et** par adresse IP ; « Code incorrect ou expiré. » sans nombre d'essais ; 3 renvois par 15 minutes ; courriel du code en HTML (`pam_otp_email.html`, sujet « ACME SA — Code de vérification PAM », expéditeur `autorapport@acmehaiti.com`), avis en texte (« ACME SA — PAM ») ; WhatsApp « Indisponible » tant que le modèle Meta et le jeton manquent ; session de 15 minutes en cookie `HttpOnly; Secure; SameSite=Strict`, 5 minutes d'inactivité.

| Story | Récit | Bloquée par |
|---|---|---|
| **US-1005** Bloquer un contact récemment changé | Conforme au modèle (avis à l'ancienne adresse). **Fait le 2026-10-28** | — |
| **US-1014** Saisir la date en huit chiffres | Champ unique masqué, Afficher / Masquer, même réponse pour code inconnu, date fausse et compte inactif. **Fait le 2026-10-28** | — |
| **US-1015** Captcha et verrous par code et par adresse | 3 échecs : captcha ; 5, 10, 15 échecs : 1 min, 15 min, 1 h ; compteur figé pendant le verrou ; avertissement à 5 échecs. **Fait le 2026-10-28** | — |
| **US-1016** Code et courriels du modèle | Message unique, 3 renvois par 15 minutes, courriel HTML du code, avis en texte. **Fait le 2026-10-28** | — |
| **US-1017** Session du modèle | Cookie et en-têtes de sécurité du modèle ; 5 et 15 minutes pour toute l'application (Q14 tranchée : comme le modèle). **Fait le 2026-10-28** | — |
| **US-1018** WhatsApp indisponible sans Meta | Bouton grisé « Indisponible » au lieu d'un refus au clic. **Fait le 2026-10-28** | — |
| **US-1012** (revue) Consulter ma balance PER | Module de l'application, lecture de `pam/balances/per/{CODE}.json` (Q10 réglée par `export_shivam.py`). **Fait le 2026-10-28** ; devise non affichée (Q19) | D-61 |
| **US-1020** Voir mes bulletins de paie | Comme l'onglet « Bulletin » du directeur, dans « Mon PER ». **Fait le 2026-10-28** | — |
| **US-1021** Télécharger ma fiche de paie en PDF | Comme le bouton « Télécharger la fiche de paie (PDF) » et `fiche_paie.py` du directeur, à nos couleurs. **Fait le 2026-10-28, remplacée par US-1022 le 2026-10-29** | Q20 |
| **US-1022** Fiche de paie au format du directeur | Version du directeur du 2026-10-29 : `payslip.html` affichée dans « Mon PER », « Enregistrer en PDF » par l'impression du navigateur, net sans le bonus AF et phrase du bonus, autres mois en lignes. Remplace le fichier PDF de US-1021. **Fait le 2026-10-29** | — |
| **US-1023** Menu de « Mon PER » | Comme le « Menu principal » du directeur : Balance PER (centrée, en USD), Relevé PER, Fiche de paie, chacun sur sa page, « Menu principal » pour revenir. **Fait le 2026-10-29** | — |
| **US-1027** Secrets Manager | Consignes du directeur (phase B) : la fonction lit `pam-dev/db-portail`, `pam-dev/db-carrieres` et `pam-dev/otp-hmac` au démarrage ; guide `deploiement-console.md` aux noms `pam-dev-…`. **Fait le 2026-10-29** | — |
| **US-1024** Relevé PER entre deux dates | Comme le directeur : mois en base, deux dates (JJ/MM/AAAA), photos de l'intervalle, « Relevé en PDF » (fichier, en-tête répété, USD). **Fait le 2026-10-29** | — |
| **US-1025** Avis de sécurité en HTML | `pam_alerte_email.html` du directeur à nos couleurs, ses quatre textes (consultation, essais refusés, courriel ou numéro changé). **Fait le 2026-10-29** | — |
| **US-1026** Main levée du gel de 72 heures | Depuis le dossier de l'employé dans l'espace de gestion (D-64) : « Lever le gel », tracé, avis à l'employé. **Fait le 2026-10-29** | D-64 |
| **US-1019** Voir les postes qui correspondent à mon profil | Liste des postes ouverts pour l'employé connecté, fiche du poste | Q15 à Q17 |

Questions ajoutées : voir Q14 à Q18 au §5.

## 1. Décisions à inscrire au registre

Numéros proposés à la suite de D-47. « Directeur » : réponse rapportée par le développeur le 2026-10-27. « Proposée » : recommandation du plan, à valider.

| # | Décision | Source |
|---|---|---|
| D-48 | Le portail s'appelle **PAM**. Le PER en est un module | Directeur ; doc PAM « Nom validé » |
| D-49 | La base de données est la base PostgreSQL **`archivage`** de Carrières. Les tables propres au portail vont dans un **schéma `portail`** de cette base, jamais dans le schéma `public` de Carrières | Directeur (la base) ; **proposée** (le schéma, R7) |
| D-50 | Le portail accède à la base par un **compte PostgreSQL dédié**. Droits : lecture de `employes`, `documents`, `fichiers_document`, `documents_competences` et des tables de compétences, `vault_actifs`, `etat_vault` ; ajout seul dans `documents`, `fichiers_document` et `journal_audit` ; aucune modification, aucune suppression dans `public` ; tous les droits dans `portail`. L'API HTTP de Carrières n'est pas utilisée, car elle n'ouvre de session qu'aux profils DRH, qui sont fermés | **Proposée** (R6) |
| D-51 | La liste des employés vient de la **copie Vault S3** (`vault/vault-employee-list.csv`), l'objet que Carrières synchronise lui aussi. PAM la lit directement : la table `employes` de Carrières n'a ni date de naissance, ni téléphone, ni genre, ni grade. `employes` ne sert qu'à rattacher les pièces, par le code employé. Aucun export n'est lu sur le disque en production. La liste blanche (P-11) reste en vigueur | Directeur (« la liste des employés doit venir du fichier Vault ») ; dictionnaire Carrières §5 ; précisé le 2026-10-27 |
| D-52 | La validation des pièces se fait **dans Carrières**, par la DRH. Le portail adopte la **nomenclature de Carrières** (`type_document`, `alignement`, `categorie`). Les champs établissement, pays, domaine et niveau déclaré disparaissent. Le niveau d'études validé est le plus haut type de formation `valide` | Directeur (R2, R3, R4) |
| D-53 | Une pièce déposée par l'employé entre dans Carrières au statut **`a_completer`**, avec son scan dans `fichiers_document` (4 Mo au plus, PDF, JPEG ou PNG). La DRH précise ensuite le type, la date, l'alignement et la catégorie | Directeur (R5, R8) |
| D-54 | L'employé consulte son **dossier Carrières** : postes occupés, formations, lettres (blâmes compris ❓), quote | Directeur (R8) ; blâmes : accord du développeur, à confirmer |
| D-55 | **Connexion des employés** : code employé et date de naissance (simple identifiant), puis code à usage unique de 6 chiffres envoyé par **courriel** ou par **WhatsApp**. Plus de mot de passe pour les employés. Toutes les règles de sécurité du document PAM s'appliquent. Remplace P-15 et D-41 pour les employés | Directeur ; doc PAM |
| D-56 | Le courriel et le téléphone sont lus dans **Vault**. Ils ne se modifient pas dans PAM : seule la DRH les change. Un contact nouveau ne reçoit aucun code pendant **72 heures**. PAM retient pour cela le dernier contact vu et la date où il l'a vu, et compare chaque nouvelle copie de Vault | Directeur (R5, R6) ; doc PAM ; méthode **proposée** |
| D-57 | **Module PER** : balance lue à la demande dans un seau S3 de production, en lecture seule, sans copie durable. Exception à P-11 pour la seule balance PER. Sur cet écran : 5 minutes sans action, 15 minutes au plus | Directeur (R2, R4) ; doc PAM |
| D-58 | L'**espace de gestion** reste dans PAM. Le **back-office des pièces** se fait dans Carrières (voir Q1 pour le partage exact) | Directeur, 2026-10-27 |
| D-59 | Production : le compte AWS d'ACME (celui de SISA et de Carrières), région **us-east-1** | Doc PAM ; dictionnaire Carrières |

## 2. Ce que cela change dans le code existant

| Partie existante | Effet | Story |
|---|---|---|
| Lecture du CSV (`csv_employee_repository.py`) | Lit la copie Vault sur S3 en production, rechargée quand elle change | US-1001 |
| Comptes employés avec mot de passe (`employee_account`, création du mot de passe, « Mot de passe oublié ») | Retirés, remplacés par le code à usage unique | US-1003 |
| US-106 (double authentification des employés) | Absorbée par US-1003 et US-1004 | — |
| Module `certificate` (dépôt US-301, suivi US-303 et US-130, fichier US-118, renvoi « Corriger et renvoyer ») | Réécrit sur `documents` de Carrières. Carrières n'a pas d'état « À corriger » : une pièce refusée l'est définitivement, et l'employé en dépose une nouvelle (❓ Q7) | US-1007, US-1008 |
| File de validation et examen (US-133), tableau de bord RH en partie (US-132), notifications RH sur les certificats (US-116) | Retirés : la validation se fait dans Carrières | US-1010 |
| Critères d'éligibilité « Domaine » des postes (US-115, `DIPLOMA_DOMAINS`) | Le domaine disparaît (D-52). Remplacé par la `categorie` de Carrières ? (❓ Q5) | US-1010 |
| Coordonnées (US-202) : téléphone et courriel saisis par l'employé | En lecture seule depuis Vault. Le calcul du dossier complet (RG-01, 8 éléments) est à revoir | US-1011 |
| « Ma carrière », frise (US-114) | **Gain** : les lettres de promotion et d'affectation validées de Carrières donnent enfin les anciens postes chez ACME (source qui manquait) | US-1009 |
| Notifications employé « Certificat validé / à corriger » (US-120) | Calculées à partir du statut Carrières | US-1008 |
| Avatar (US-113, `photo_url` vide) | Possible : portrait Vault `vault/photos/{CODE}.jpg` (❓ Q12) | — |
| Pièces déposées sur le démonstrateur | Données fictives : rien à reprendre | — |

## 3. Stories proposées (épic E10 — PAM)

Une story à la fois, dans cet ordre, selon le cycle habituel (tests d'abord). Les numéros et les découpages sont des propositions.

### Étape A — Fondations (rien ne change à l'écran)

| Story | Récit | Critères principaux | Bloquée par |
|---|---|---|---|
| **US-1000** Base de Carrières fictive pour les tests | En tant que développeur, je travaille sur une copie fictive du schéma de Carrières, jamais sur les vraies données | **Fait le 2026-10-27.** Tables lues ou écrites par PAM recréées d'après le dictionnaire v1.0 ; commande `create_fake_carrieres` ; employés fictifs du jeu de test ; Alembic ignore ces tables ; testé sur SQLite et PostgreSQL 17. Le schéma `portail` vient avec la recette (US-002) | — |
| **US-1001** Lire les employés dans la copie Vault sur S3 | En tant que portail, je lis les employés dans la copie Vault S3, celle que lit Carrières | Mêmes règles qu'aujourd'hui (liste blanche, actifs, dates) ; rechargée quand l'objet change ; dernière liste gardée si une relecture échoue ; jamais un fichier du disque en production. **Fait le 2026-10-27** | US-1000 |

### Étape B — Environnement de recette sur AWS

| Story | Récit | Critères principaux | Bloquée par |
|---|---|---|---|
| **US-002** (revue) Recette sur AWS | En tant que directeur, je vois PAM tourner dans le compte ACME, sur une base Carrières **fictive** | Voir §4 ; aucune donnée réelle en recette (règle du message de lancement §5) | Q2, Q3 |

La recette passe avant les écrans, parce que le risque principal est l'accès réseau et les droits sur la base de Carrières.

### Étape C — Connexion PAM

| Story | Récit | Critères principaux | Bloquée par |
|---|---|---|---|
| **US-1003** Me connecter avec un code reçu par courriel | Code employé + date de naissance, puis code de 6 chiffres reçu par courriel | Message unique « Informations incorrectes » et délai de réponse uniforme ; verrouillage progressif après 5 échecs, CAPTCHA après 3 ; code cryptographique, valable 5 minutes, à usage unique, 3 essais, 3 renvois par 15 minutes, 60 secondes entre deux envois, conservé sous forme d'empreinte HMAC ; courriel affiché masqué ; message sans lien ni code employé ; SES comme pour SISA ; courriel à l'employé après chaque connexion et chaque verrouillage ; mots de passe employés retirés. **Fait le 2026-10-28** | US-1001 |
| **US-1004** Recevoir le code par WhatsApp | Choisir WhatsApp quand le profil a un numéro | Numéro masqué ; quota de 5 messages par mois civil, renvois compris, compté côté serveur, affiché ; à la limite, courriel proposé, sinon « Contactez la DRH » ; API officielle de Meta, modèle « Authentification ». **Fait le 2026-10-28** | US-1003 ; points WhatsApp du doc PAM |
| **US-1005** Bloquer un contact récemment changé | Un contact nouveau ne reçoit pas de code pendant 72 heures | Comparaison à chaque copie de Vault ; « Contactez la DRH » ; alerte par courriel sur l'ancien contact (modèle du directeur). **Fait le 2026-10-28** | US-1003 |
| **US-1006** Retrouver PAM | Nom, textes et marque PAM dans les deux espaces | « Portail Carrière » remplacé par PAM ; textes de l'accueil et de la connexion à revoir avec le PER et les postes. **Fait le 2026-10-28** | D-48 |

### Étape D — Pièces et dossier depuis Carrières

| Story | Récit | Critères principaux | Bloquée par |
|---|---|---|---|
| **US-1007** Déposer une pièce dans Carrières | L'employé dépose un scan, qui entre dans Carrières à compléter | Statut `a_completer`, `type_document` vide, `titre` (❓ Q6) ; scan dans `fichiers_document`, type reconnu sur le contenu, 4 Mo au plus ; empreinte SHA-256 (doublon refusé avec un message clair) ; code présent dans `vault_actifs` ; `imputeur_code` = code de l'employé ; entrée `versement_document` dans `journal_audit`. **Fait le 2026-10-28** (serveur ; écran avec US-1008) | US-1001, Q6 |
| **US-1008** Suivre mes pièces | « Mes certificats » montre toutes mes formations de Carrières, y compris celles recueillies par la DRH | Statuts : À compléter, En attente, Approuvée, Refusée (avec le motif) ; niveau d'études validé ; notifications employé recalculées. **Fait le 2026-10-28** (liste, dépôt, scan ; niveau d'études et notifications à reprendre avec US-1010) | US-1007 |
| **US-1009** Voir mon dossier Carrières | Postes occupés, lettres, formations, quote | Lettres de blâme selon Q9 ; quote « non évaluée » quand elle est nulle, jamais 0 ; frise de « Ma carrière » alimentée par les promotions et affectations validées | US-1001, Q9 |
| **US-1010** Retirer la validation des pièces du portail | L'espace de gestion ne valide plus de pièces | File, examen et notifications RH des certificats retirés ; tables `certificate*` retirées ; critères d'éligibilité recalés sur la nomenclature de Carrières | Q1, Q5 |
| **US-1011** Coordonnées en lecture seule | L'employé voit son courriel et son téléphone, sans pouvoir les changer | « Pour les changer, adressez-vous à la DRH » ; règle du dossier complet revue (téléphone et courriel comptent comme complets). **Fait le 2026-10-28** | — |

### Étape E — PER

| Story | Récit | Critères principaux | Bloquée par |
|---|---|---|---|
| **US-1012** Consulter ma balance PER | L'employé connecté voit sa balance et sa date de mise à jour | Identité tirée de la session, jamais d'un paramètre ; lecture S3 à la demande, sans copie ; employé absent du rapport : message clair ; rien d'autre que sa ligne n'est renvoyé ni journalisé ; 5 minutes sans action, 15 minutes au plus ; rôle IAM limité à `s3:GetObject` sur le préfixe des balances | Q10 (seau, préfixe, format) |

### Étape F — Production

| Story | Récit | Bloquée par |
|---|---|---|
| **US-1013** Ouvrir PAM en production | Bascule sur la vraie base `archivage`, adresse définitive, pilote avec quelques employés volontaires, puis ouverture | Toutes les stories précédentes, Q4 |

## 4. Déploiement sur AWS

Le plan du 2026-10-13 (`docs/lot0/6-architecture-aws/plan-deploiement-aws.md`) prévoyait un sandbox en us-east-2 avec sa propre base RDS et son propre stockage. Les décisions du 2026-10-27 en changent une partie.

| Élément | Plan du 2026-10-13 | Désormais |
|---|---|---|
| Compte et région | Sandbox à part, us-east-2 | Compte ACME de SISA et Carrières, **us-east-1** (D-59) |
| Base de données | RDS PostgreSQL à nous | **Base `archivage` de Carrières**, schéma `portail`, compte dédié (D-49, D-50). En recette : une copie **fictive** |
| Employés | CSV sur le disque (écart E-3) | Table `employes` (E-3 réglé) |
| Fichiers des pièces | Compartiment S3 « certificats » | Dans la base de Carrières (`fichiers_document`). Le S3 reste pour les CV des candidatures (US-902) et les lettres du directeur RH (US-124) |
| Courriel | Simulé (E-5) | Amazon SES, mêmes procédés que SISA, expéditeur dédié à PAM |
| WhatsApp | En attente (D-41) | Compte WhatsApp Business d'ACME, jeton dans Secrets Manager |
| PER | — | Lecture seule du seau des balances, par un rôle limité au préfixe |
| Protection | CloudFront, WAF prévu | WAF obligatoire devant l'API (limitation de débit, CAPTCHA). WAF ne s'attache pas à une « HTTP API » d'API Gateway : API de type REST, ou CloudFront devant |
| Adresse | `carriere.acmehaiti.com` | À choisir (❓ Q4), CNAME dans la zone DNS SiteGround comme Carrières |
| Mises à jour | GitHub Actions, Terraform | Inchangé |

**Calcul (où tourne l'API).** Deux possibilités :
- **Lambda + API Gateway + Amplify**, comme l'application Évaluation du directeur. C'est la pratique déjà en place à ACME. Points d'attention : un appel est limité à 6 Mo (un scan de 4 Mo passe tout juste) et les migrations Alembic doivent être lancées à part. Avec ce choix, le **PER** peut avoir sa **propre fonction**, avec son propre rôle, comme le demande le doc PAM.
- **ECS Fargate**, comme le prévoyait le plan du 2026-10-13. L'image Docker existe déjà et il n'y a pas de limite de taille. En revanche, ce mode est moins habituel à ACME.

**Recommandation : Lambda**, pour suivre la pratique d'ACME, sauf si l'hébergement de la base de Carrières l'empêche (Q2). Dans tous les cas, l'API doit se trouver dans le même réseau (VPC) que la base de Carrières.

**Où va chaque donnée.**

| Donnée | Stockage | Pourquoi |
|---|---|---|
| Codes à usage unique, quota WhatsApp, compteurs d'échecs et verrouillage, journal d'audit des connexions, dernier contact vu (72 heures) | **DynamoDB** (tables `pam-*`, TTL, chiffrement KMS), comme le prévoit le doc PAM | Données courtes et sans relations ; expiration native ; pratique d'ACME |
| Profil, consentement, postes, candidatures, référentiel des unités | **PostgreSQL**, schéma `portail` | Relationnel ; les tables et les migrations existent déjà |
| Employés, pièces, dossier | **PostgreSQL** de Carrières, schéma `public`, droits limités (D-50) | Source de Carrières |
| Date de naissance, courriel, téléphone | **Copie Vault S3**, liste blanche | Absents de `employes` (D-51) |
| Balance PER | **S3** des balances, lecture à la demande | Doc PAM |

Session : notre cookie HttpOnly, Secure, SameSite=Strict. Le doc PAM l'admet (« ou jeton Cognito équivalent ») : pas de Cognito.

**Conséquence sur le réseau.** La connexion et le PER n'ont besoin que de Vault (S3), de DynamoDB, de SES et de Secrets Manager. Leurs fonctions Lambda tournent **hors du VPC** de la base de Carrières. C'est plus simple, et la partie la plus exposée est mieux isolée. Seules les fonctions du dossier, des pièces et de l'espace de gestion entrent dans le VPC. Avec une passerelle VPC pour S3 et DynamoDB, qui est gratuite, elles n'ont pas besoin de passerelle NAT.

Le code garde ses ports (Clean Architecture) : les adaptateurs DynamoDB vont dans `infrastructure`. En test, ils sont remplacés par leurs versions en mémoire. En local, on utilise DynamoDB Local ou `moto`.

## 5. Questions ouvertes

| # | Question | Pour qui | Bloque |
|---|---|---|---|
| Q1 | Espace de gestion : on garde la gestion des comptes, le tableau de bord, la liste des employés, le référentiel des unités, la publication de postes et les candidatures ; on retire la validation des pièces. Est-ce bien cela ? | Directeur | US-1010 |
| Q2 | Comment Carrières est-il hébergé ? Une API Gateway `acme-archivage` existe dans le compte, mais où est sa base (RDS, et dans quel VPC) ? Qui crée le compte PostgreSQL du portail et le schéma `portail` ? Un accès AWS propre à PAM (préfixe `pam-`) est à demander : l'accès du projet Congés ne permet ni RDS, ni VPC, ni SES, ni la création de rôles | Directeur | Étape B |
| Q3 | Réglée le 2026-10-27 : DynamoDB pour la connexion, comme dans le doc PAM ; notre cookie de session au lieu de Cognito, que le doc PAM admet. Reste à demander : le rôle Lambda doit pouvoir lire `vault/vault-employee-list.csv` (date de naissance, téléphone) | Directeur | US-1003 |
| Q4 | Adresse de PAM : `pam.acmehaiti.com` ? | Directeur | US-1013 |
| Q5 | Les critères « Domaine » des postes deviennent-ils la `categorie` de Carrières (finance, gestion, technologie…) ? | Directeur | US-1010 |
| Q6 | Au dépôt, l'employé saisit-il seulement un intitulé (repris comme `titre`), ou rien du tout, le nom du fichier servant de titre ? | Directeur | US-1007 |
| Q7 | Une pièce refusée par la DRH est définitive dans Carrières. L'employé en dépose simplement une nouvelle : d'accord ? | Directeur | US-1008 |
| Q9 | L'employé voit-il ses lettres de blâme ? | Directeur | US-1009 |
| Q10 | PER : seau, préfixe, format du rapport (un fichier pour tous ou un par employé), fréquence d'import | Réglée le 2026-10-28 : `acme-pam-balances`, `pam/balances/per/{CODE}.json`, un objet par employé, export mensuel (`export_shivam.py`) | US-1012 |
| Q14 | Délais de 5 et 15 minutes : pour toute l'application (modèle) ou pour le PER seulement (D-52) ? | Directeur | US-1017 |
| Q15 | Postes « disponibles » : qui ouvre ou ferme un poste, et où (Carrières, S3, écran PAM) ? | Directeur | US-1019 |
| Q16 | « Correspondent au profil » : domaine des diplômes et certificats dans Carrières, ou domaine du poste actuel ? | Directeur | US-1019 |
| Q17 | L'employé consulte-t-il seulement la fiche, ou peut-il postuler ? | Directeur | US-1019 |
| Q18 | Déploiement : CDK (`stack.py`) ou script comme `publier.py` ? Accès à SiteGround pour le DNS ? | Directeur | Étape B |
| Q19 | PER : faut-il afficher une devise (HTG ?) à côté des montants ? Votre module n'en montre pas. Et les bulletins de paie (`payslip/`) : à afficher ? | Directeur | US-1012 |
| Q20 | ~~Fiche de paie PDF : garder les charges employeur ?~~ **Réglée le 2026-10-28** : le format du directeur les montre, « Charges patronales (information) » (US-1022) | Directeur | US-1021 |
| Q11 | WhatsApp : modèle « Authentification » approuvé ? Qui fournit le jeton d'utilisateur système ? | G. Hilaire | US-1004 |
| Q12 | Afficher le portrait Vault (`vault/photos/{CODE}.jpg`) comme photo de l'employé ? | Directeur | — |
| Q13 | Créole en option (doc PAM) : dans ce périmètre ou plus tard ? | Directeur | — |

(Q8 du 2026-10-27, les pièces déjà déposées sur le portail, est réglée : ce sont des données fictives du démonstrateur.)

## 6. Prochaine étape

1. Le développeur relit ce plan et le fait valider par le directeur, avec les réponses à Q1, Q2 et Q3.
2. Les décisions D-48 à D-59 entrent au registre (v1.9), et le cahier des charges est mis à jour.
3. Les stories sont ajoutées au générateur (`generer_stories.py`).
4. On commence par **US-1000**.
