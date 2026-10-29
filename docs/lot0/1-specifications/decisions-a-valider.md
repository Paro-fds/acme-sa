# Décisions à valider par le directeur — Livrable 1

| | |
|---|---|
| **Version** | 1.2, 2026-10-07 (ajout de D-38 : numérisation des lettres ; D-39 : photo de l'employé) |
| **Rôle** | Tout ce qui reste à trancher pour que les spécifications (`cahier-des-charges.md`) et le tableau des règles (`tableau-unique-des-regles.md`) passent de « brouillon complet » à « validés » |
| **Méthode** | Une question à la fois, avec une proposition par défaut (message de lancement §6). Sans réponse contraire, la proposition par défaut sert de base aux maquettes. |
| **Ordre** | Du plus bloquant au moins urgent : d'abord ce qui conditionne les maquettes du lot 1 (B-06), puis la file de validation (B-07), puis les lots suivants |

## A. Bloquent les maquettes du parcours « certificat » (à poser en premier)

**Statut : ✅ propositions par défaut validées par le développeur le 2026-10-06.** Elles servent de base aux maquettes du lot 1 (B-06) ; le directeur garde le dernier mot et peut en changer une à tout moment.

| N° | Question | Proposition par défaut | Réf. | Statut |
|---|---|---|---|:---:|
| D-01 | Faut-il distinguer **profil complet** (débloque le dépôt) et **dossier complet** (profil complet et au moins un certificat validé) ? | Oui | P-06 ; RG-06 | ✅ dév. |
| D-02 | Si un contrôle échoue sur une donnée que l'employé **ne peut pas modifier**, le bloque-t-on ? | Non : signalement automatique aux RH, sans bloquer | P-02 ; QP-05 ; RG-03, RG-16 | ✅ dév. |
| D-03 | Comment calculer le **pourcentage** affiché ? | Chacun des 8 éléments compte pour un point ; tronqué à l'entier (5 sur 8 = 62 %, comme la maquette ; choix du développeur le 2026-10-08) | P-05 ; RG-05 | ✅ dév. |
| D-04 | Le **domaine** d'un certificat est-il choisi dans une liste, et obligatoire ? | Liste fermée (avec « Autre »), obligatoire à partir de Bac + 2 | P-01 ; RG-31 | ✅ dév. |
| D-05 | **Formats** : téléphone, email, adresse ? | 8 chiffres ou +509 et 8 chiffres ; email standard ; adresse de 5 à 200 caractères | P-04 ; RG-10 → RG-12 | ✅ dév. |
| D-06 | **Lien** du contact d'urgence : texte libre ou liste ? | Liste : Conjoint·e, Parent, Enfant, Frère / Sœur, Autre | P-07 ; RG-13 | ✅ dév. |
| D-07 | **Taille** d'un fichier, **nombre** de certificats, **année** d'obtention ? | 5 Mo (photos réduites avant envoi), 20 certificats au plus, année pas dans le futur | P-08 ; QP-03 ; RG-21, RG-22, RG-25 | ✅ dév. |
| D-08 | La page d'accueil est-elle vue **avant la connexion** ? | Oui, avec les 3 bénéfices ; le pourcentage s'affiche après la connexion | QP-01 | ✅ dév. |
| D-09 | **Quand** l'employé donne-t-il son consentement ? | À la première connexion, avant de saisir les nouvelles données | QP-02 | ✅ dév. |
| D-10 | Que montre « **ce que ce certificat débloque** » avant le lot 4 ? | Le niveau d'études validé, et le fait que l'employé apparaît désormais dans les recherches des RH pour les promotions et les postes à pourvoir | QP-04 ; EF-307 | ✅ dév. |
| D-11 | Le **niveau** et ses rangs | Liste du registre (Q3 §2) jusqu'à réception de la grille de classification, puis alignement | Q3 §5 | ✅ dév. |

## B. Bloquent la maquette de la file de validation

**Statut : ✅ propositions par défaut validées par le développeur le 2026-10-06.** Elles servent de base à la maquette de la file de validation (B-07) ; le directeur garde le dernier mot.

| N° | Question | Proposition par défaut | Réf. | Statut |
|---|---|---|---|:---:|
| D-12 | File **commune** ou dossiers **attribués** ? | Commune ; un dossier pris passe « en cours » au nom de l'agent ; l'Administrateur peut réaffecter | P-03 ; QR-01 ; RG-43 | ✅ dév. |
| D-13 | Le valideur peut-il corriger **d'autres champs** que le niveau (intitulé, établissement, année, domaine) ? | Oui, chaque correction étant tracée : on évite un rejet pour une faute de frappe | QR-02 ; RG-44 | ✅ dév. |
| D-14 | Un Agent RH peut-il **réaffecter** un dossier ? | Non, l'Administrateur seul (Q2 §1 ne cite que lui) | §4.3 | ✅ dév. |

## C. Droits encore ouverts (§4.3 du cahier)

| N° | Question | Proposition par défaut |
|---|---|---|
| D-15 | La responsable du référentiel **consulte-t-elle les dossiers** ? | Seulement à travers son rôle d'Agent RH (Mme Nérius a les deux) ; le rôle « référentiel » seul ne donne pas accès aux dossiers |
| D-16 | L'Administrateur **traite-t-il les signalements**, **saisit-il les postes**, **enregistre-t-il les demandes** et **contrôle-t-il les mouvements** ? | Oui : il peut tout ce que fait un Agent RH, comme pour la validation |
| D-17 | Qui voit les **tableaux de bord** ? | Agent RH, responsable du référentiel, Administrateur, Lecture seule |
| D-18 | Qui peut **exporter** des listes, avec quelles colonnes ? | L'Administrateur seul ; jamais le contact d'urgence ; chaque export tracé (QR-06) |
| D-19 | Qui consulte le **journal d'audit** ? | Administrateur et Lecture seule (le registre cite « l'audit » parmi les profils en lecture seule) |

## D. Lots 2 à 4

| N° | Question | Proposition par défaut | Réf. |
|---|---|---|---|
| D-20 | Comment une correction validée revient-elle dans le **système RH** ? | Au lot 2, export des corrections validées à réimporter (format à convenir avec la DIT) ; en attendant, le portail affiche la valeur corrigée, marquée « en attente du système RH » | QR-03 ; audit §4.3 |
| D-21 | Relances **automatiques** ou **campagnes** lancées par un Administrateur ? | Automatiques selon RG-51 → RG-53 ; l'Administrateur peut les suspendre | QR-04 |
| D-22 | Valeurs du filtre **« statut du dossier »** ? | Profil incomplet · Profil complet · Dossier complet | QR-05 ; D-01 |
| D-23 | Le dépôt d'une **demande** par le portail est-il réservé aux profils complets ? | Oui, par cohérence avec le verrou | QP-06 ; Q6 |
| D-24 | Responsable de département, évaluateur, Direction Générale : ont-ils un **accès au portail** au lot 4 ? | Non au départ : les RH saisissent leurs réponses ; à revoir après le lancement | §4.2 ; retour du directeur, point 5 |
| D-25 | La DIT a-t-elle un compte dans le portail ? | Non : elle exploite l'infrastructure seulement | §4.2 |
| D-26 | Le référentiel garde-t-il le **responsable** de chaque agence et région ? | Oui (le fichier reçu les donne) | P-10 |
| D-27 | Au lot 1, comment la responsable gère-t-elle le **référentiel** ? | Fichier Excel importé par un Administrateur | P-13 |
| D-38 | **Qui numérise** les lettres de promotion, de transfert et de nomination classées dans les dossiers papier, **combien** y en a-t-il, et **pour quand** ? | Les RH numérisent les lettres des employés actifs seulement, en PDF, une lettre par fichier ; le volume est estimé lors du test sur l'échantillon (livrable 5) ; tout est numérisé avant l'ouverture du module au lot 2 | QR-07 ; Q5 §6 |

## E. Données, sécurité et conservation

| N° | Question | Proposition par défaut | Réf. |
|---|---|---|---|
| D-28 | Ne lire de l'export que les colonnes utiles ? | Oui : jamais les colonnes bancaires, de prêts, de licenciement ni de pièce d'identité | P-11 |
| D-29 | Seuils de légèreté des pages ? | Moins de 500 Ko par page hors documents, affichage en moins de 5 s en 3G | P-12 |
| D-30 | Tentatives de connexion ? | Blocage de 15 minutes après 5 mots de passe erronés | P-09 ; RG-80 |
| D-31 | Que devient le dossier d'un employé qui **quitte** l'institution ? | Conservé, marqué « parti », visible des RH seulement ; durée selon les règles d'archivage RH, à préciser | Cahier §8.6 |
| D-32 | Combien de temps garder un **certificat rejeté** jamais redéposé, le **journal d'audit**, les **messages envoyés** ? | Comme le reste du dossier, sans suppression, jusqu'à une règle d'archivage RH | Cahier §8.6 |
| D-33 | Les lettres d'origine (avec salaires) sont-elles gardées dans le portail ? | Non : champs extraits et validés seulement, plus une référence à la lettre ou une copie masquée | S-01 |
| D-41 | **Double authentification** : la personne choisit-elle sa méthode (WhatsApp, email, application TOTP) ? Les employés en ont-ils une aussi ? | Oui au choix, pour les comptes RH **et pour les employés** (demande du 2026-10-08, qui remplace « employés : non au lancement »). Technologie à choisir avec la DIT ; en attendant, seules les méthodes dont l'envoi existe sont ouvertes (`MFA_METHODS`) | P-14, P-15 ; RG-82, RG-83 ; US-102, US-106 |
| D-42 | **Ordre des lots** : la double authentification RH (US-102, lot 3) est avancée pour être montrée au démonstrateur. Le directeur l'accepte-t-il, avec D-40 ? | Oui : US-102 reste « En cours » jusqu'au choix du service d'envoi ; les stories du lot 1 restent prioritaires ensuite | D-40 ; US-102 |
| D-43 | **Mention d'information** (US-202) : le texte rédigé par le développeur (écran « Avant de commencer », `ConsentPage.jsx`) convient-il ? La DRH doit le valider | Texte court : ce que l'on collecte, pourquoi, qui y a accès (RH uniquement) ; version enregistrée avec chaque consentement | EF-208 ; ENF-10 ; D-09 ; prototype « à rédiger et valider par la DRH » |
| D-44 | **« Mon parcours »** (V2 : diplômes, formations, expériences, compétences déclarés par l'employé) est codé mais absent du cahier des charges. Le garde-t-on ? | À décider : le garder, le remplacer par les certificats (D3), ou le reprendre dans US-803 « Ajouter mes formations et expériences » | Code hérité de la V2 ; PRD v2.0 §7 | ❓ |
| D-45 | **Domaines** d'un certificat (RG-31) : le registre ne cite que Comptabilité, Gestion, Finance, Informatique. La liste de départ convient-elle ? | Comptabilité, Gestion, Finance, Banque et microfinance, Économie, Informatique, Droit, Ressources humaines, Marketing et commerce, Statistiques, Agronomie, Autre (à préciser) | P-01 ; RG-31 ; US-301 | ❓ |
| D-46 | **Avis en un clic** après le dépôt (US-302, US-605) : quelle échelle ? | Trois réponses : Facile, Correct, Difficile ; aucun commentaire libre | Cahier §2.3 (« plaisir ») ; EF-607 | ✅ dév. |
| D-47 | **Maquettes de référence** : lesquelles M. Hilaire a-t-il validées ? | Les 13 écrans de l'espace employé (`2-maquettes/2-espace-employe-ecrans/`) et les 11 écrans RH (`2-maquettes/3-espace-rh-ecrans/`) ; le prototype cliquable n'est pas la référence. Une règle du registre l'emporte sur un texte de maquette qui la contredit | Indiqué par le développeur le 2026-10-09 | ✅ |
| D-39 | **Photo de l'employé** : l'institution en conserve pour une partie des employés, sans que tous l'aient donnée. Le portail doit-il en afficher ou en collecter ? | Non au lancement : le registre n'en parle pas ; à rouvrir avec une mention d'information et un consentement si le besoin est confirmé | Modèle de données DM-08 |

## F. Valeurs du registre encore entre crochets

Le registre propose déjà une valeur ; il suffit de la confirmer.

| N° | Point | Valeur du registre | Réf. |
|---|---|---|---|
| D-34 | Nombre maximum de relances par campagne | 3 | RG-51 |
| D-35 | Heures d'envoi | 8 h – 18 h, du lundi au vendredi | RG-52 |
| D-36 | Rappel avant péremption ; délai de grâce | 30 jours ; 30 jours | RG-61, RG-62 |
| D-37 | Accusé de réception d'une demande | 2 jours ouvrables | RG-73 |

## G. À confirmer par d'autres personnes (pas par le directeur)

| Point | Qui | Réf. |
|---|---|---|
| Codes d'agence PB et RC ; liste officielle des directions ; 35 agences contre 28 ; Cap-Haïtien ; dates de rattachement | Mme Nérius, Mme Jean | B-01, B-02 |
| Grille de classification des postes | DRH | Q3 §5 |
| 364 actifs dans l'export contre ~500 employés | DRH | S-09 |
| Valeur officielle du bleu (logo `#29166F`, registre `#1E1E82`) | DRH ou communication | S-10 |

## Priorités MoSCoW

Douze priorités du chapitre 6 sont marquées ⚖ : discutables, proposées par le développeur. Le directeur peut les confirmer en bloc ou en changer certaines ; il peut aussi décider des pistes D et E (Could have, §6.10).
