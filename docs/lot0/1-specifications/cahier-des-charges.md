# Cahier des charges — Portail carrière ACME SA

| | |
|---|---|
| **Version** | 0.4, 2026-10-06 : tous les chapitres rédigés ; brouillon complet à soumettre au directeur |
| **Rôle** | Livrable 1 du lot 0 : spécifications écrites à partir du besoin métier |
| **Référence** | Registre des décisions v1.8 (`../0-cadrage/registre-des-decisions-v1.8.md`), **qui fait foi**. Ce cahier le reprend et le détaille ; il ne s'en écarte que par une proposition explicite au directeur (§12.2). |
| **Suite** | Cahier des charges → epics (blocs fonctionnels) → user stories (testables) → lots (ordre de livraison) |

## 1. Contexte et problème

ACME SA est une institution de microfinance d'environ 500 employés, répartis dans 28 agences et au siège, en Haïti. Un premier portail (MVP) permettait aux employés de mettre à jour leurs coordonnées et de joindre des documents.

**Problème :** il fonctionne comme un simple formulaire d'envoi. Rien ne donne envie à l'employé de l'utiliser, et les certificats reçus arrivent dans des dossiers qui peuvent être incomplets ou faux.

## 2. Objectifs et critères de réussite

### 2.1 Le besoin en une phrase

> Obtenir de chaque employé un **dossier complet, vérifié et à jour**, avec ses **certificats validés**, pour que les RH décident vite et bien des promotions, des mobilités et des postes vacants, en donnant à l'employé une **vraie raison personnelle**, et du plaisir, à le faire.

### 2.2 Trois besoins qui s'emboîtent

| # | Besoin | Pour qui | Sans lui… |
|---|---|---|---|
| 1 | **Des données fiables** : complètes, cohérentes, confirmées par l'employé | Institution, RH | Les décisions RH reposent sur des dossiers faux ou vides |
| 2 | **Des qualifications prouvées** : certificats vérifiés par les RH | RH, direction | On ne sait pas qui est qualifié pour quel poste |
| 3 | **Une raison de participer** : l'employé voit ce qu'il y gagne | Employé | Personne n'utilise l'application |

Le **verrou** relie les trois : pour faire valoir ses qualifications (2), qui lui ouvrent des opportunités (3), l'employé doit d'abord avoir un dossier propre (1). Le verrou est présenté comme un service, jamais comme une sanction.

**Leçon du MVP :** il traitait le besoin 1 sans le besoin 3, donc sans motivation, et ne traitait pas le besoin 2.

### 2.3 Critères de réussite (dans 6 mois)

Classés par importance (choix du 2026-10-06) :

| # | Critère | Mesure | Appui dans le registre |
|---|---|---|---|
| 1 | Un agent RH trouve **en une minute** tous les employés titulaires d'une Licence en comptabilité dans la région Sud | Temps pour obtenir la liste ; seuls les certificats validés comptent | Q3, Q4 |
| 2 | Une demande de promotion est traitée **en quelques jours** au lieu de quelques semaines | Délai entre réception de la demande et décision | Q6 |
| 3 | Les employés **ouvrent l'application d'eux-mêmes** pour voir les postes ouverts | Part des employés qui se connectent dans le mois sans relance | Q5 |
| 4 | **9 employés actifs sur 10** ont un dossier complet | % de dossiers complets au tableau de bord | Q1 |
| + | L'employé **prend plaisir** à utiliser l'application | Question en un clic après le dépôt ; profil complété en moins de 10 minutes sur téléphone | Q9 |
| + | L'application **réduit le temps de traitement et les erreurs** côté RH | Délai de validation d'un certificat ; taux de rejet en baisse | Q2 |

### 2.4 Tensions repérées

| N° | Tension | Où on en est |
|---|---|---|
| T1 | Le domaine est facultatif (Q3) : la recherche « comptabilité » raterait une partie des employés | **Tranché** : P-01 |
| T2 | Les postes ouverts n'arrivent qu'au lot 4 : quel aimant pendant les lots 1 à 3 ? | **Tranché** : A, B, C couvertes ; D et E en Could have (§6.10) |
| T3 | « 9 actifs sur 10 » : sur 364 ou sur ~500 ? | Attend l'analyse de l'export (cycle 1) |
| T4 | Le portail ne maîtrise qu'une partie du délai de promotion, et le délai actuel est inconnu | À discuter |

## 3. Périmètre

### 3.1 Dans le périmètre

Le détail est aux chapitres 5 et 6 ; le découpage en lots vient du plan validé (`../0-cadrage/audit-et-plan.md` §5) et du registre.

| Lot | Contenu | Source |
|---|---|---|
| **0. Cadrage** | Spécifications, maquettes, modèle de données, référentiel des unités, import de l'historique des demandes et test d'extraction des lettres, architecture AWS, WhatsApp, guide de style | Message de lancement §2 |
| **1. Parcours « certificat »** | Accueil et progression, connexion, profil complété et confirmé, verrou et checklist, dépôt de certificats, statut, consentement, référentiel des unités | Demande phase 1 ; Q1, Q3, Q4, Q9 |
| **2. Traitement RH** | File de validation, signalements, rôles, tableau de bord, liste, filtres et export, journal d'audit, registre des demandes reçues par lettre, contrôle des mouvements extraits | Demande phase 3 ; Q2, Q5 §7, Q6 |
| **3. Mise en service** | Hébergement AWS (recette et production), sécurité, sauvegardes, message de lancement, guide RH | Demande phase 4 ; Q7, Q8 |
| **4. Carrière et engagement** | « Ma carrière », postes ouverts et éligibilité, demandes en ligne, péremption, règles et listes modifiables sans code, interface du référentiel | Demande phase 1.6 ; Q3 §4, Q4 §5, Q5, Q6, Q10 |
| **Lot distinct** | Production des lettres de promotion par le système et export des mouvements vers le système RH | Q5 §6, étape B |

### 3.2 Hors périmètre

| Exclu | Source |
|---|---|
| Vérification des certificats auprès des établissements émetteurs | Q2 §6 |
| Double validation d'un certificat (revue si des erreurs apparaissent après le lancement) | Q2 §6 |
| Validation groupée au lancement | Q2 §5 |
| Évaluations de performance et compétences déclarées dans le calcul automatique d'éligibilité (examinées par les RH) | Q5 §3 |
| Décision automatique d'une nomination : l'éligibilité reste informative | Q5 §5 |
| Publication d'un poste par un responsable hiérarchique | Q5 §1 |
| Modification de l'export RH, qui reste en lecture seule | Q4 §6 |
| Correction de noms d'unités directement dans le code | Q4 §6 |
| Outils WhatsApp non officiels | Q7 §2 |
| Extraction ou stockage des salaires et rémunérations, y compris dans les lettres scannées | Message de lancement §5 ; Q5 §6 |
| Données réelles d'employés dans les environnements de test | Message de lancement §5 ; Q8 §2 |

## 4. Personas et rôles

Ce chapitre ne contient **que ce que le directeur a écrit**, dans sa demande initiale (« Demande ») ou dans le registre (Q1 à Q10). Rien n'est supposé. Ce qu'il n'a pas dit figure en questions ouvertes (§4.2).

### 4.1 Les personas

#### P1 — L'employé
- **Qui :** les employés de l'institution, « ~500 employés, 28 agences, Haïti » (Demande). Le portail concerne les employés actifs. Les Agents RH et les Administrateurs sont aussi des employés (Q2, séparation des tâches).
- **Situation :** « beaucoup d'employés utiliseront leur téléphone, parfois avec une connexion limitée : pages légères » (Demande, phase 5). « Environ un quart des lignes de l'export n'en ont pas [d'email] » (Q1). WhatsApp est le canal prioritaire (Q7).
- **Ce qu'il y gagne :** « traitement plus rapide des demandes de promotion et de mobilité », être « repéré en interne grâce à ses qualifications réelles » pour les postes vacants, « participation active à sa gestion de carrière : visibilité sur son profil, ses qualifications, les postes ouverts auxquels il est éligible et ses prochaines étapes possibles » (Demande, objectif affiché).
- **Comment lui parler :** « valorisant, rassurant, jamais culpabilisant ni menaçant » (Demande, phase 5) ; le blocage est « présenté comme un service rendu », il « ne doit jamais ressembler à une sanction ni être trompeur » (Demande, objectif réel) ; messages « constructifs, précis et actionnables » (Demande, phase 2).
- **Ce qu'il fait :** complète et confirme son dossier (Q1), dépose ses certificats (Q3), suit leur statut (Q2), voit les postes ouverts et son éligibilité (Q5), dépose et suit ses demandes (Q6), confirme ses informations chaque année (Q10).

#### P2 — L'Agent RH
- **Qui :** Mme Colin Nérius (Assistant DRH, Branche Formation Gestion de Carrières) et Rose-Herline Joseph (Assistant RH), « avec les mêmes droits et privilèges. D'autres Agents RH pourront être désignés par la suite » (Q2).
- **Ce qu'il fait :** valide ou rejette les certificats, avec « document à gauche, informations du profil à droite » (Q2) ; peut corriger le niveau (Q3) ; apprécie l'équivalence des diplômes étrangers (Q3) ; saisit les postes ouverts (Q5) ; contrôle les mouvements de carrière extraits des lettres (Q5) ; enregistre les demandes reçues par lettre (Q6) ; traite les signalements d'erreur (Q1, lot 2).
- **Objectif fixé :** traitement d'un certificat « sous 5 jours ouvrables » ; au-delà, alerte dans la file (Q2).

#### P3 — Le responsable du référentiel
- **Qui :** Mme Colin Nérius, « responsable du référentiel à la DRH, assistée de Mme Darling Jean » (Q4).
- **Ce qu'il fait :** tient le référentiel des agences, régions et directions ; « toute modification (ouverture, fermeture, fusion ou renommage d'une unité) passe par la responsable du référentiel. La DIT ne la modifie pas seule » ; valide le tableau de correspondance ligne par ligne ; modifie la composition des régions (Q4).

#### P4 — L'Administrateur
- **Qui :** « Gregory Hilaire, DRH, suppléé par M. Sinior Raymond, son supérieur hiérarchique » (Q2).
- **Ce qu'il fait :** « peut aussi valider ou rejeter, réaffecter un dossier, gérer les comptes et réinitialiser l'accès d'un employé » (Q2) ; voit la liste « À rattacher » (Q4) ; valide les postes avant publication et peut marquer un poste « confidentiel » avec un motif (Q5).

#### P5 — La Lecture seule
- **Qui :** « par exemple la Direction Générale ou l'audit » (Q2).
- **Ce qu'il fait :** « consulte les dossiers et les tableaux de bord, sans valider » (Q2).

### 4.2 Les acteurs dont le rôle dans le système reste à préciser

Le registre les cite dans les circuits, sans dire s'ils utilisent le portail.

| Acteur | Ce que dit le registre | Question ouverte |
|---|---|---|
| **Responsable hiérarchique / de département** | Exprime un besoin de poste, sans publier (Q5) ; est consulté sur une demande : « Disponibilité confirmée » ou « Pas de disponibilité » (Q6, étape 3) ; être informé d'une demande est un point à confirmer (Q6) | A-t-il un accès au portail, ou les RH saisissent-elles sa réponse ? |
| **Évaluateur** | Évalue la ressource si nécessaire : « Positive » ou « Négative » (Q6, étape 4) | Qui est-ce (responsable, RH, comité) ? Saisit-il lui-même ? |
| **Direction Générale** | Approuve ou non une demande (Q6, étape 6) ; peut avoir le rôle Lecture seule (Q2) | Approuve-t-elle dans le portail ou sur papier, saisi ensuite par les RH ? |
| **DIT** | Héberge et exploite (Q8) ; ne modifie pas le référentiel seule (Q4) | Utilisateur du portail, ou seulement de l'infrastructure ? |

### 4.3 Champ d'action de chaque rôle

✅ autorisé par le registre · ❌ interdit ou hors du rôle décrit · ❓ le registre ne le dit pas, à demander au directeur · *(lot)* quand la fonction arrive.

| Action | Employé | Agent RH | Resp. référentiel | Administrateur | Lecture seule |
|---|:---:|:---:|:---:|:---:|:---:|
| Voir et compléter **son propre** dossier | ✅ | ✅ (comme employé) | ✅ (comme employé) | ✅ (comme employé) | ✅ (comme employé) |
| Confirmer ou signaler une erreur sur agence, poste, date d'embauche | ✅ | — | — | — | — |
| Déposer ses certificats (si dossier complet) | ✅ | ✅ (comme employé) | ✅ (comme employé) | ✅ (comme employé) | ✅ (comme employé) |
| Consulter les dossiers des employés | ❌ | ✅ | ❓ | ✅ | ✅ |
| Valider ou rejeter un certificat, corriger son niveau | ❌ | ✅ sauf le sien | — | ✅ | ❌ |
| Réaffecter un dossier à un autre valideur | ❌ | ❌ (avis du 2026-10-06, D-14) | — | ✅ | ❌ |
| Traiter les signalements d'erreur *(lot 2)* | ❌ | ✅ | — | ❓ | ❌ |
| Modifier le référentiel des agences, régions, directions | ❌ | ❌ | ✅ | ✅ | ❌ |
| Rattacher une valeur inconnue de l'export (« À rattacher ») | ❌ | ❌ | ✅ | ✅ | ❌ |
| Saisir un poste ouvert *(lot 4)* | ❌ | ✅ | — | ❓ | ❌ |
| Publier un poste, le marquer confidentiel *(lot 4)* | ❌ | ❌ | — | ✅ | ❌ |
| Voir les postes publiés et son éligibilité *(lot 4)* | ✅ | ✅ | ✅ | ✅ | ✅ |
| Déposer une demande de promotion ou de mobilité *(lot 4)* | ✅ | ✅ (comme employé) | ✅ (comme employé) | ✅ (comme employé) | ✅ (comme employé) |
| Enregistrer une demande reçue par lettre | ❌ | ✅ | — | ❓ | ❌ |
| Contrôler les mouvements de carrière extraits des lettres *(lot 2)* | ❌ | ✅ | — | ❓ | ❌ |
| Voir les tableaux de bord | ❌ | ❓ | ❓ | ✅ | ✅ |
| Exporter des listes | ❌ | ❓ | ❓ | ❓ | ❓ |
| Gérer les comptes et réinitialiser l'accès d'un employé | ❌ | ❌ | ❌ | ✅ | ❌ |
| Consulter le journal d'audit *(lot 2)* | ❌ | ❓ | ❓ | ❓ | ❓ |

**Règles transversales :**
- Un employé ne voit que **ses propres** données.
- Un Agent RH ne valide **jamais son propre** certificat : le dossier va automatiquement à l'autre Agent RH, ou à défaut à un Administrateur (Q2).
- Toute consultation de dossier et toute décision sont tracées (Q2, lot 2).
- Les comptes Agent RH, Administrateur et Lecture seule ont la double authentification et ne sont accessibles que depuis le réseau de l'institution ou par VPN (Q8).

## 5. Parcours clés

Même règle qu'au chapitre 4 : chaque étape cite sa source (« Demande » = demande initiale du directeur, Qx = registre). Quand la demande initiale et le registre diffèrent, **le registre l'emporte** ; l'écart est noté. Ce qui n'est écrit nulle part est une question ouverte (§5.2 et §5.4).

### 5.1 Parcours de l'employé

#### E1 — Découvrir le portail *(lot 1)*
- Page d'accueil : « message court, chaleureux et professionnel en français », les **3 bénéfices** (promotion, postes vacants, carrière) « avec des icônes et des exemples concrets », et un **indicateur de progression** (« Votre dossier est complet à 60 % ») (Demande, phase 1.1).
- La mascotte « La Penseuse » est présente sur la page de connexion et les écrans d'accueil et d'encouragement (Q9).

#### E2 — Se connecter *(lot 1)*
- Nom, prénom, date de naissance, mot de passe (Q8 §4).
- *Écart :* la demande initiale proposait « matricule + date de naissance, ou email professionnel + code » ; le registre retient la connexion actuelle.

#### E3 — Compléter et confirmer son profil *(lot 1)*
- Le portail affiche les informations RH de l'employé ; les champs manquants sont « signalés visuellement » (Demande, phase 1.3).
- **À saisir ou confirmer** (Q1) : téléphone ; adresse ; email, ou « Je n'ai pas d'adresse email » ; contact d'urgence (nom, lien, téléphone) ; niveau d'études, choisi dans la liste des niveaux (Q3).
- **À confirmer sans modifier** (Q1) : agence, poste, date d'embauche → « Ces informations sont exactes » ou « Signaler une erreur ». Un signalement est enregistré avec date, ancienne valeur et motif, puis traité par les RH (lot 2).
  - *Écart :* la demande initiale disait « l'employé peut corriger ou compléter chaque champ directement » ; le registre interdit de modifier ces trois champs.
- **Hors verrou** : nom et prénom (Q1).
- Le pourcentage « Votre dossier est complet à X % » est calculé à partir de ces champs (Q1).
- Contrôles de cohérence cités : date d'embauche postérieure à la date de naissance + 18 ans, agence existante dans la liste officielle, email et téléphone au bon format, niveau d'études compatible avec le certificat (Demande, phase 2).
- Messages « constructifs, précis et actionnables » : « Ajoutez votre numéro de téléphone pour continuer » plutôt que « Accès refusé » (Demande, phase 2).
- Mention d'information et consentement pour les nouvelles données (contact d'urgence, niveau d'études) : pourquoi on collecte, qui y a accès (Q1). Consentement WhatsApp recueilli dans le profil (Q7).

#### E4 — Déposer un certificat *(lot 1)*
- **Verrou :** le dépôt ne se débloque que si le profil est complet. Tant qu'il est bloqué : « Il reste 2 informations à compléter avant de téléverser votre certificat », avec un bouton direct vers chaque champ concerné. Le profil reste toujours consultable (Demande, phase 1.4 ; Q1).
- Formats PDF, JPG, PNG ; « taille maximale à définir » ; **aperçu avant envoi** ; **plusieurs certificats** possibles (Demande, phase 1.4).
- Champs d'un certificat (Q3 §3) : type (Diplôme, Certificat, Attestation, Autre) ; niveau, avec des exemples en infobulle (Q3 §5) ; intitulé exact ; établissement ; année d'obtention ; domaine ou spécialité (facultatif selon Q3, voir P-01) ; pays pour un diplôme étranger (Q3 §4).

#### E5 — Suivre son certificat *(lot 1, validation au lot 2)*
- Après l'envoi : message de remerciement, récapitulatif, statut, et « ce que ce certificat débloque (éligibilité à certains postes, etc.) » (Demande, phase 1.5).
- Statuts (Q2) : **Reçu / En vérification** dès l'envoi → **Validé**, ou **À corriger** avec le motif, formulé poliment, et la possibilité de redéposer un document corrigé.
- « L'employé voit toujours l'état de son dépôt » (Q2) ; il est notifié des changements de statut, par WhatsApp en priorité (Q7).
- Son niveau d'études est recalculé à partir du plus élevé validé ; s'il a déclaré plus haut que ses certificats validés, l'écart est signalé aux RH (Q3).
- Un certificat validé n'est jamais supprimé ; en cas de remplacement, l'ancien reste archivé (Q2).

#### E6 — « Ma carrière » *(lot 4)*
- Version simple : qualifications enregistrées, postes internes ouverts auxquels l'employé est éligible, état de ses demandes de promotion (Demande, phase 1.6).
- Chaque poste porte un indicateur **vert** (éligible) ou **orange** (pas encore), avec ce qui manque (« Il vous manque : un certificat de niveau Licence validé »). Seuls les certificats validés comptent. L'indicateur n'empêche jamais de manifester son intérêt (Q5 §4).

#### E7 — Déposer une demande de promotion ou de mobilité *(lot 4)*
- Dépôt en ligne, demande spontanée autorisée sans poste ouvert ; accusé de réception sous *[2]* jours ouvrables ; suivi dans « Mes demandes » ; aucune demande supprimée (Q6).

#### E8 — Être relancé et revenir *(lots 1 à 4)*
- Notifications de statut ; relances automatiques entre 1 et 7 jours puis à 14 jours, au plus *[3]* par campagne ; heures ouvrables du lundi au vendredi *[8 h – 18 h]* ; **arrêt dès que le dossier est complet** ; résumé périodique des postes ouverts (Q7).
- À partir du lot 4 : une information non confirmée depuis 12 mois est périmée ; rappel *[30 jours]* avant ; confirmation en un clic, « Ces informations sont-elles toujours exactes ? » ; les certificats validés et le niveau d'études ne se périment pas (Q10 ; Demande, phase 2).

### 5.2 Questions ouvertes sur le parcours de l'employé

Ni la demande initiale ni le registre n'y répondent.

| N° | Question | Pourquoi elle compte |
|---|---|---|
| QP-01 | La page d'accueil (E1) est-elle vue **avant** la connexion ? Si oui, elle ne peut pas afficher le pourcentage de l'employé, qui n'est pas encore identifié. | Place de l'indicateur de progression. **Avis du 2026-10-06 : accueil avant la connexion avec les 3 bénéfices ; pourcentage après la connexion** (D-08) |
| QP-02 | **Quand** l'employé donne-t-il son consentement (première connexion, ou au moment de saisir les nouvelles données) ? | Ordre des écrans de E2 et E3. **Avis du 2026-10-06 : à la première connexion, avant de saisir les nouvelles données** (D-09) |
| QP-03 | Quelle **taille maximale** pour un fichier ? (« à définir », Demande) | Règle de dépôt (E4). **Avis du 2026-10-06 : 5 Mo**, voir P-08 (D-07) |
| QP-04 | Que montre « **ce que ce certificat débloque** » avant le lot 4, quand il n'y a pas encore de postes ouverts ni d'éligibilité ? (rejoint T2) | Message de E5, motivation de l'employé. **Avis du 2026-10-06 : le niveau d'études validé, et le fait d'apparaître dans les recherches des RH pour les promotions et les postes à pourvoir** (D-10) |
| QP-05 | Si un contrôle de cohérence échoue sur une donnée que l'employé **ne peut pas modifier** (date d'embauche moins de 18 ans après la naissance, agence inconnue), que se passe-t-il ? Le dossier est-il bloqué, ou un signalement part-il aux RH sans bloquer l'employé ? | Un employé ne doit pas être bloqué par une erreur qu'il ne peut pas corriger. **Avis du 2026-10-06 : option B**, voir P-02 |
| QP-06 | Le dépôt d'une demande par le portail est-il **réservé aux profils complets** ? (point à confirmer du registre, Q6) | Extension du verrou aux demandes (E7) |

### 5.3 Parcours des RH

#### R1 — Valider un certificat *(Agent RH ou Administrateur, lot 2)*
- Une **file de validation** ; un dossier qui attend depuis plus de **5 jours ouvrables** y apparaît en alerte ; pas de validation groupée, chaque document est examiné individuellement (Q2).
- Une **visionneuse** : document à gauche, informations du profil à droite (Q2).
- **Valider**, ou **Rejeter** en choisissant un des 10 motifs ; commentaire facultatif, obligatoire pour « Autre » (Q2).
- Le valideur peut **corriger le niveau** déclaré (Q3) ; il apprécie l'équivalence d'un diplôme étranger (Q3).
- **Séparation des tâches** : le certificat d'un Agent RH va automatiquement à l'autre Agent RH, ou à défaut à un Administrateur (Q2). L'Administrateur peut **réaffecter** un dossier (Q2).
- Chaque décision enregistre le valideur, la date, l'heure et le motif ; un **historique** par dossier montre qui a fait quoi et quand ; les consultations sont tracées dans le journal d'audit (Q2).
- Hors périmètre : vérification auprès des établissements, double validation (Q2).

#### R2 — Traiter un signalement d'erreur *(Agent RH, lot 2)*
- Au lot 1, les signalements sur agence, poste et date d'embauche sont seulement enregistrés (date, ancienne valeur, motif) ; au lot 2, ils alimentent la file de traitement RH (Q1).

#### R3 — Tenir le référentiel des unités *(responsable du référentiel, lots 0 et 1)*
- Extraire de l'export les agences et directions avec leurs effectifs, repérer les anomalies, produire le tableau de correspondance (valeur trouvée, libellé officiel proposé, effectif), le faire valider ligne par ligne ; aucune valeur sans correspondance (Q4 §4).
- Importer le fichier agence → région fourni par la DRH, avec une date de début ; le portail garde l'historique ; le fichier peut être remplacé à chaque changement (Q4 §4).
- Une valeur inconnue à l'import va dans une liste **« À rattacher »** visible de l'administrateur ; l'employé concerné est classé « Unité à confirmer » (Q4 §5).
- Au lot 1, le référentiel est un fichier ou une table modifiable par la responsable, son assistante et les Administrateurs ; une interface de gestion peut attendre le lot 4 (Q4 §5).

#### R4 — Enregistrer et suivre une demande de promotion *(Agent RH, lots 2 et 4)*
- Pendant la transition, l'Agent RH enregistre à réception la demande reçue par lettre, avec la lettre scannée en pièce jointe (Q6 §2) *(voir le point S-01 du backlog : salaires dans les lettres)*.
- Circuit en 7 étapes : réception et enregistrement → étude par la DRH → consultation du responsable du département → évaluation si nécessaire → décision de la DRH → approbation de la Direction Générale → clôture (acceptée, refusée, reportée ou retirée) (Q6 §3).
- Fiche : employé, date de réception, canal, type, poste visé, motivation, pièce jointe, statut et étape, décision, profil au moment de la demande, responsable du traitement (Q6 §4).

#### R5 — Contrôler les mouvements de carrière extraits des lettres *(Agent RH, lot 2)*
- Un module lit les lettres de promotion, de transfert et de nomination (OCR) et propose un mouvement de carrière ; **rien n'est enregistré sans validation humaine** : l'Agent RH voit le PDF d'un côté, les champs extraits de l'autre, corrige et valide ; les informations salariales sont ignorées et jamais stockées (Q5 §6). Qui numérise les lettres existantes : voir QR-07.

#### R6 — Publier un poste ouvert *(Agent RH puis Administrateur, lot 4)*
- L'Agent RH saisit le poste ; l'Administrateur le valide avant publication ; statuts Brouillon, Publié, Clôturé, Pourvu, avec date et auteur ; un poste peut être marqué « confidentiel » par un Administrateur, avec un motif tracé ; toute modification d'un critère après publication est tracée (Q5).

#### R7 — Piloter *(Administrateur ; Lecture seule en consultation)*
- **Tableau de bord** : nombre d'employés, % de dossiers complets, certificats reçus / en attente / rejetés, répartition par agence et par direction (Demande, phase 3.1), et par région (Q4 §5).
- **Liste des employés** avec filtres (agence, statut du dossier, niveau d'études) et **export Excel / CSV** (Demande, phase 3.2) ; affichage, filtres et exports avec les libellés officiels uniquement (Q4 §5).
- **Relances** avec des modèles de messages positifs (Demande, phase 3.5 ; Q7).
- **Journal d'audit** : qui a modifié quoi et quand, qui a consulté quel document (Demande, phase 3.6 ; Q2).
- **Gestion des rôles** : Administrateur, Agent RH, Lecture seule (Demande, phase 3.7 ; Q2).
- **Gestion des règles** sans toucher au code (Demande, phase 3.4) : au lot 1, les règles et la liste des niveaux sont écrites dans le tableau unique ; elles deviennent modifiables au lot 4 (Q3 §4).

### 5.4 Questions ouvertes sur les parcours des RH

| N° | Question | Pourquoi elle compte |
|---|---|---|
| QR-01 | La file de validation est-elle **commune** aux deux Agents RH (chacune prend le dossier suivant), ou chaque dossier est-il **attribué** à une personne ? (Q2 parle de « réaffecter un dossier », ce qui suppose une attribution) | Forme de l'écran de la file (maquette B-07). **Avis du 2026-10-06 : file commune**, voir P-03 |
| QR-02 | Lors de la validation, l'Agent RH peut-il corriger **d'autres informations** que le niveau (intitulé, établissement, année, domaine) ? | Q3 ne cite que le niveau. **Avis du 2026-10-06 : oui (intitulé, établissement, année, domaine), chaque correction étant tracée** (D-13) |
| QR-03 | Une fois un signalement traité, comment la correction arrive-t-elle dans le **système RH** (l'export reste en lecture seule) ? Le portail affiche-t-il la valeur corrigée avant le prochain export ? | Sans retour vers le système RH, le dossier n'est jamais vraiment assaini |
| QR-04 | Les relances sont-elles **automatiques** (Q7) ou **lancées par un Administrateur** sous forme de campagne (Demande, phase 3.5 : « génération de rappels ») ? | Qui déclenche, et quand |
| QR-05 | Quelles valeurs pour le filtre **« statut du dossier »** (complet / incomplet ? avec les statuts des certificats ?) | Liste et tableau de bord |
| QR-06 | Qui peut **exporter**, et quelles colonnes l'export contient-il ? Un export de données personnelles est sensible. | Sécurité, rôles (§4.3) |
| QR-07 | Les lettres de promotion, de transfert et de nomination sont « classées dans les dossiers des employés » (Q5 §6), donc sur papier, alors que le module d'extraction lit des « lettres PDF ». **Qui numérise les lettres existantes, combien y en a-t-il, et pour quand ?** | Sans numérisation du stock, aucun mouvement de carrière n'est récupéré (R5) : l'ancienneté dans le poste repart de la date d'embauche (règle de calcul, Q5 §6). Travail ponctuel : à terme, le portail produit les lettres (étape B). L'échantillon de 20 à 30 lettres du livrable 5 est une pièce attendue du lot 0 (message de lancement) |

## 6. Exigences fonctionnelles par domaine

Chaque domaine deviendra un **epic** ; chaque exigence (EF) deviendra une ou plusieurs **user stories**. Même règle : une source par ligne. Le lot vient du plan validé et du registre.

**Priorité (MoSCoW)**, appréciée **à l'intérieur du lot** de l'exigence :

| Priorité | Règle |
|---|---|
| **Must have** | Le directeur l'exige explicitement et le lot ne tient pas sans |
| **Should have** | Le directeur l'exige, mais le lot reste utile sans, ou il a dit lui-même que cela « peut attendre » |
| **Could have** | Idée du brainstorming, qui ne vient pas du directeur (§6.10 : pistes D et E) |
| **Won't have** (pour l'instant) | Exclu par le directeur : voir §3.2 |

⚖ = cas discutable : priorité proposée et validée par le développeur le 2026-10-06, à confirmer par le directeur, à qui appartient la priorité finale.

### D1 — Accès et compte

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-101 | L'employé se connecte avec nom, prénom, date de naissance et mot de passe | Q8 §4 | 1 | Must |
| EF-102 | Le nombre de tentatives de connexion est limité ; les matricules ne peuvent pas être énumérés | Demande phase 4 | 1 | Must |
| EF-103 | Trois rôles RH : Administrateur, Agent RH, Lecture seule, avec les droits du §4.3 | Demande 3.7 ; Q2 | 2 | Must |
| EF-104 | Les comptes RH ont la double authentification, avec une méthode au choix de la personne : code par WhatsApp, code par email, ou application TOTP (Microsoft Authenticator ou équivalent) ; ils ne sont accessibles que depuis le réseau de l'institution | Q8 §4 ; **P-14** (RG-82) | 3 | Must |
| EF-105 | L'Administrateur gère les comptes et réinitialise l'accès d'un employé | Q2 §1 | 2 | Must |

### D2 — Dossier de l'employé

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-201 | L'employé voit ses informations RH, avec les libellés officiels des unités | Demande 1.3 ; Q4 §5 | 1 | Must |
| EF-202 | Il saisit ou confirme : téléphone, adresse, email ou « Je n'ai pas d'adresse email », contact d'urgence (nom, lien, téléphone), niveau d'études | Q1 | 1 | Must |
| EF-203 | Il confirme agence, poste et date d'embauche, ou signale une erreur, sans pouvoir les modifier | Q1 | 1 | Must |
| EF-204 | Un signalement est enregistré avec la date, l'ancienne valeur et le motif | Q1 | 1 | Must |
| EF-205 | Formats et cohérence sont contrôlés, avec des messages actionnables ; un échec sur une donnée non modifiable crée un signalement sans bloquer (P-02) | Demande phase 2 ; P-02 | 1 | Must (formats) · Should ⚖ (cohérence) |
| EF-206 | « Votre dossier est complet à X % », calculé à partir des champs obligatoires | Demande 1.1 ; Q1 | 1 | Must |
| EF-207 | Verrou : le dépôt de certificat attend un profil complet ; checklist « Il reste N informations… » avec un lien vers chaque champ | Demande 1.4 ; Q1 | 1 | Must |
| EF-208 | Mention d'information et consentement pour les nouvelles données | Demande phase 4 ; Q1 | 1 | Must |
| EF-209 | La date de dernière confirmation de chaque information est conservée (historique des confirmations) | Message de lancement §2.3 ; Q10 | 1 | Must |
| EF-210 | Une information non confirmée depuis 12 mois est périmée ; rappel avant ; confirmation en un clic | Demande phase 2 ; Q10 | 4 | Must |

### D3 — Certificats

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-301 | L'employé dépose un ou plusieurs certificats en PDF, JPG ou PNG, avec aperçu avant envoi ; taille maximale à définir (QP-03) | Demande 1.4 | 1 | Must |
| EF-302 | Pour chacun : type, niveau (exemples en infobulle), intitulé, établissement, année, domaine (P-01), pays si diplôme étranger | Q3 §3, §4, §5 | 1 | Must |
| EF-303 | L'employé voit toujours le statut : Reçu / En vérification, Validé, À corriger | Q2 §2, §3 | 1 | Must |
| EF-304 | Après un rejet, il voit le motif, formulé poliment, et peut redéposer | Q2 §2, §4 | 2 | Must |
| EF-305 | Un certificat validé n'est jamais supprimé ; un certificat remplacé reste archivé avec son historique | Q2 §2 | 2 | Must |
| EF-306 | Le niveau d'études est recalculé à partir du plus élevé validé ; un niveau déclaré supérieur est signalé aux RH | Q3 §1, §4 | 2 | Should ⚖ |
| EF-307 | Après l'envoi : remerciement, récapitulatif, statut et « ce que ce certificat débloque » (QP-04) | Demande 1.5 | 1 | Must (confirmation) · Should ⚖ (« ce que ça débloque ») |
| EF-308 | Fichiers protégés : vérification du type, analyse antivirus, noms aléatoires, stockage chiffré | Demande phase 4 ; Q8 §3 | 1 et 3 | Must |

### D4 — Validation RH

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-401 | File de validation commune (P-03) ; alerte au-delà de 5 jours ouvrables ; un document à la fois | Q2 §3, §5 ; P-03 | 2 | Must |
| EF-402 | Visionneuse : document à gauche, profil à droite | Q2 §5 | 2 | Must |
| EF-403 | Valider, ou Rejeter avec un des 10 motifs (commentaire obligatoire pour « Autre ») | Q2 §4 | 2 | Must |
| EF-404 | Le valideur peut corriger le niveau et apprécie l'équivalence d'un diplôme étranger | Q3 §4 | 2 | Must |
| EF-405 | Un Agent RH ne valide jamais son propre certificat : il va à l'autre Agent RH ou à un Administrateur | Q2 §1 | 2 | Must |
| EF-406 | L'Administrateur peut réaffecter un dossier | Q2 §1 | 2 | Should ⚖ |
| EF-407 | Historique par dossier : valideur, date, heure, décision, motif | Q2 §1, §5 | 2 | Must |
| EF-408 | Les signalements d'erreur alimentent une file de traitement RH | Q1 | 2 | Must |

### D5 — Référentiel des unités

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-501 | Un référentiel unique des agences, régions, directions, services et siège : code stable, libellé officiel, type, rattachement, statut avec dates, anciens libellés | Q4 §3 | 1 | Must |
| EF-502 | Un tableau de correspondance relie chaque valeur de l'export à une unité officielle | Q4 §1, §4 | 0 et 1 | Must |
| EF-503 | Le rattachement agence → région est importé avec une date de début ; le portail garde l'historique | Q4 §3, §4 | 1 | Must |
| EF-504 | Une valeur inconnue va dans « À rattacher » ; l'employé concerné est « Unité à confirmer » | Q4 §5 | 1 | Must |
| EF-505 | Le référentiel est modifiable par la responsable, son assistante et les Administrateurs ; interface de gestion au lot 4 | Q4 §5 | 1 et 4 | Must (table) · Should (interface) |

### D6 — Pilotage

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-601 | Tableau de bord : nombre d'employés, % de dossiers complets, certificats reçus / en attente / rejetés, par agence, région et direction | Demande 3.1 ; Q4 §5 | 2 | Must |
| EF-602 | Liste des employés avec filtres : agence, statut du dossier (QR-05), niveau d'études | Demande 3.2 | 2 | Must |
| EF-603 | Recherche des employés par niveau validé, domaine et unité (critère de réussite n°1) | §2.3 ; Q3 ; Q4 ; P-01 | 2 | Must ⚖ |
| EF-604 | Export Excel / CSV (qui, quelles colonnes : QR-06) | Demande 3.2 | 2 | Should ⚖ |
| EF-605 | Journal d'audit : qui a modifié quoi et quand, qui a consulté quel document | Demande 3.6 ; Q2 §1 | 2 | Must |
| EF-606 | Règles et listes (champs obligatoires, niveaux) modifiables sans toucher au code | Demande 3.4 ; Q3 §4 | 4 | Should |
| EF-607 | Le portail enregistre chaque connexion d'un employé et sa réponse à la question en un clic après un dépôt, pour mesurer les critères de réussite | §2.3 (critères 3 et « plaisir ») ; modèle de données DM-09 | 1 | Must ⚖ (connexions) · Should ⚖ (avis) |

### D7 — Notifications

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-701 | Canaux par ordre de priorité : WhatsApp (API officielle de Meta, modèles approuvés), email institutionnel, email personnel avec consentement | Q7 §1, §2 | 1 | Should ⚖ (au lot 1) |
| EF-702 | Consentement WhatsApp recueilli dans le profil | Q7 §2 | 1 | Must |
| EF-703 | Notifications de changement de statut (certificat, demande) | Q7 §3 | 1 et 4 | Must |
| EF-704 | Relances : entre 1 et 7 jours puis à 14 jours, au plus *[3]* ; heures ouvrables *[8 h – 18 h]* du lundi au vendredi ; arrêt dès que le dossier est complet ; modèles positifs (QR-04) | Demande 3.5 ; Q7 §3 | 1 | Should ⚖ |
| EF-705 | Message de lancement aux employés | Q7 §3 | 3 | Must |
| EF-706 | Résumé périodique des postes ouverts | Q7 §3 | 4 | Should |

### D8 — Carrière et postes

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-801 | « Ma carrière » : qualifications, postes ouverts éligibles, état des demandes | Demande 1.6 | 4 | Must |
| EF-802 | Formations, expériences et compétences, sans effet sur le verrou | Q1 (hors verrou) | 4 | Should ⚖ |
| EF-803 | L'Agent RH saisit un poste ; l'Administrateur le valide avant publication ; statuts Brouillon, Publié, Clôturé, Pourvu, avec date et auteur | Q5 §1 | 4 | Must |
| EF-804 | Fiche d'un poste : intitulé et code, unité, grade visé, mission, critères, dates d'ouverture et limite | Q5 §2 | 4 | Must |
| EF-805 | Éligibilité calculée sur les seules données validées : niveau minimum, domaine, ancienneté dans l'institution, grade, ancienneté dans le poste, unité | Q5 §3 | 4 | Must |
| EF-806 | Indicateur vert / orange avec ce qui manque ; il n'empêche jamais de manifester son intérêt (marqué « hors critères ») | Q5 §4, §5 | 4 | Must |
| EF-807 | Poste confidentiel, visible des seules personnes ciblées, avec motif tracé | Q5 §5 | 4 | Should ⚖ |

### D9 — Demandes et mouvements de carrière

| N° | Exigence | Source | Lot | Priorité |
|---|---|---|---|---|
| EF-901 | Registre des demandes alimenté par deux voies : portail et lettre enregistrée par l'Agent RH | Q6 §2 | 2 et 4 | Must |
| EF-902 | Circuit en 7 étapes, de la réception à la clôture | Q6 §3 | 2 | Must |
| EF-903 | Fiche de demande (champs de Q6 §4) ; aucune demande supprimée | Q6 §4, §5 | 2 | Must |
| EF-904 | L'employé dépose une demande en ligne, spontanée ou non, reçoit un accusé de réception et la suit dans « Mes demandes » | Q6 §2, §5 | 4 | Must |
| EF-905 | Import de l'historique des demandes depuis un fichier Excel | Message de lancement §2.5 | 2 | Should ⚖ |
| EF-906 | Extraction des mouvements de carrière depuis les lettres scannées, toujours validée par un Agent RH ; salaires jamais extraits ni stockés | Q5 §6 | 2 | Should ⚖ |
| EF-907 | Ancienneté dans le poste = aujourd'hui moins la date d'effet du dernier mouvement, ou la date d'embauche | Q5 §6 | 4 | Must |

### 6.10 Donner envie de revenir avant le lot 4 (tension T2)

| Piste | Source | Statut |
|---|---|---|
| A. Progression du dossier et mascotte qui encourage | Demande 1.1 ; Q9 | Déjà couverte (EF-206) |
| B. Suivi du certificat avec notification à chaque changement | Q2 ; Q7 | Déjà couverte (EF-303, EF-703) |
| C. « Ce que ce certificat débloque » | Demande 1.5 | Couverte (EF-307), contenu à préciser (QP-04) |
| D. Fiche de qualifications téléchargeable par l'employé | Idée du brainstorming | **Could have** (avis du 2026-10-06), à proposer au directeur |
| E. Liste simple des postes ouverts dès le lot 2, sans éligibilité | Idée du brainstorming | **Could have** (avis du 2026-10-06), à proposer au directeur ; changerait l'ordre des lots |

## 7. Tableau unique des règles métier

Les 49 règles (RG-01 à RG-81) sont dans un document à part, pour être lues, commentées et validées seules : **`tableau-unique-des-regles.md`**, dans ce même dossier. Chaque règle y porte sa valeur, son commentaire (« Pourquoi »), sa source et son statut (décidée, à confirmer, proposée).

## 8. Données

Ce chapitre dit **quelles données** le portail utilise, **d'où elles viennent**, **qui les saisit**, **à quel point elles sont sensibles** et **combien de temps on les garde**. Le détail technique (tables, champs, types) relève du livrable 3, modèle de données (`../3-modele-de-donnees/`, backlog B-04 et B-10).

**Sensibilité :** 🟢 faible (référence, sans donnée personnelle) · 🟠 personnelle · 🔴 personnelle sensible (document, donnée sur un tiers ou historique de carrière).

### 8.1 Données lues dans l'export RH (lecture seule)

Le portail lit l'export sans jamais le modifier (Q4 §6). Il ne garde que les **employés actifs** et une **liste blanche de colonnes** (P-11).

| Donnée | Utilisée pour | Modifiable dans le portail ? | Sensibilité | Source |
|---|---|---|:---:|---|
| Matricule, nom, prénom, date de naissance | Identification et connexion | Non | 🟠 | Q8 §4 ; Q1 (hors verrou) |
| Sexe, grade, nature du contrat | Affichage du dossier ; grade pour l'éligibilité (lot 4) | Non | 🟠 | Demande 1.3 ; Q5 §3 |
| Agence (code), direction | Rattachement aux unités officielles par le tableau de correspondance | Non : confirmée ou signalée | 🟠 | Q1 ; Q4 |
| Poste, date d'embauche | Profil complet ; ancienneté (lot 4) | Non : confirmés ou signalés | 🟠 | Q1 ; Q5 §3 |
| Téléphone, email, adresse | Valeurs de départ, que l'employé confirme ou corrige | Oui, par l'employé | 🟠 | Q1 |
| Indicateur « actif » | Choisir les employés concernés | Non | 🟠 | Audit §2 ; B-01 |
| **Colonnes jamais chargées** : bancaires, prêts et dettes, licenciement et préavis, pièce d'identité, références, épargne retraite | — | — | 🔴 | **P-11** ; Demande phase 4 |

### 8.2 Données collectées par le portail

| Donnée | Qui la saisit | Lot | Sensibilité | Source |
|---|---|:---:|:---:|---|
| Téléphone, adresse, email corrigés ; mention « Je n'ai pas d'adresse email » | Employé | 1 | 🟠 | Q1 |
| Contact d'urgence : nom, lien, téléphone | Employé | 1 | 🔴 (donnée sur un tiers) | Q1 ; P-07 |
| Niveau d'études déclaré | Employé | 1 | 🟠 | Q1 ; Q3 §1 |
| **Confirmations** : pour chaque information, date de la dernière confirmation | Employé | 1 | 🟠 | Message de lancement §2.3 ; Q10 |
| **Signalements** : champ, ancienne valeur, motif, date, suite donnée | Employé, puis Agent RH | 1 et 2 | 🟠 | Q1 |
| **Consentements** : mention d'information lue, WhatsApp, email personnel, avec leur date | Employé | 1 | 🟠 | Q1 ; Q7 §1, §2 |
| **Certificats** : fichier, type, niveau, intitulé, établissement, année, domaine, pays | Employé | 1 | 🔴 | Q3 §3 ; P-01 |
| **Décisions de validation** : valideur, date, heure, décision, motif, niveau corrigé | Agent RH, Administrateur | 2 | 🟠 | Q2 §1 ; Q3 §4 |
| **Messages envoyés** : canal, modèle, date, résultat | Portail | 1 | 🟠 | Q7 §3 |

### 8.3 Données de référence

| Donnée | Qui la tient | Lot | Sensibilité | Source |
|---|---|:---:|:---:|---|
| Référentiel des unités : code, libellé officiel, type, rattachement, statut et dates, anciens libellés | Responsable du référentiel | 1 | 🟢 | Q4 §2, §3 |
| Tableau de correspondance : valeur de l'export → unité | Responsable du référentiel | 0 et 1 | 🟢 | Q4 §1, §4 |
| Rattachement agence → région, avec dates de début et de fin | Responsable du référentiel | 1 | 🟢 | Q4 §3 |
| Responsable de chaque agence et région (DA, DR) | Responsable du référentiel | 1 | 🟠 (nom d'un employé) | **P-10** |
| Niveaux et rangs, types de documents, motifs de rejet, domaines, liens du contact d'urgence | Administrateur (sans code au lot 4) | 1 | 🟢 | Q2 §4 ; Q3 ; P-01 ; P-07 |
| Règles du tableau unique (seuils, délais, formats) | Administrateur (sans code au lot 4) | 1 | 🟢 | Message de lancement §2.1 ; EF-606 |

### 8.4 Données des lots 2 à 4

| Donnée | Qui la saisit | Lot | Sensibilité | Source |
|---|---|:---:|:---:|---|
| **Comptes RH** : rôle, rattachement au matricule de la personne | Administrateur | 2 | 🟠 | Q2 §1 ; S-05 |
| **Journal d'audit** : qui a modifié quoi et quand, qui a consulté quel document | Portail | 2 | 🟠 | Demande 3.6 ; Q2 §1 |
| **Demandes** : champs de la fiche (employé, date de réception, canal, type, poste visé, motivation, pièce jointe, étape, décision, profil au moment de la demande, responsable du traitement) | Agent RH (lettre), employé (lot 4) | 2 et 4 | 🔴 | Q6 §4 |
| **Mouvements de carrière** : type (promotion, transfert, nomination), date d'effet ; ❓ autres champs à fixer en B-10 | Agent RH, après extraction | 2 | 🔴 | Q5 §6 |
| **Postes ouverts** : champs de la fiche, statut et son historique, confidentialité et motif | Agent RH, Administrateur | 4 | 🟢 (🟠 si confidentiel) | Q5 §1, §2, §5 |
| **Manifestations d'intérêt** : employé, poste, « hors critères » | Employé | 4 | 🟠 | Q5 §5 |

### 8.5 Ce qui n'est jamais stocké

| Donnée | Source |
|---|---|
| Salaires et rémunérations, y compris ceux qui figurent dans les lettres scannées | Message de lancement §5 ; Q5 §6 |
| Colonnes exclues de l'export (§8.1) | P-11 |
| Données réelles d'employé en recette ou en développement | Message de lancement §5 ; Q8 §2 |
| Lettre d'origine non masquée : le portail ne garde que les champs extraits et validés, et une référence à la lettre ou une copie sans montants | **S-01**, à valider par le directeur |

### 8.6 Conservation

| Donnée | Durée | Source |
|---|---|---|
| Certificat validé | Jamais supprimé ; s'il est remplacé, l'ancien reste archivé avec son historique | Q2 §2 |
| Demande | Jamais supprimée | Q6 §5 |
| Employés d'une unité devenue inactive | Restent visibles dans l'historique | Q4 §5 |
| Sauvegardes de la base | 30 jours | Q8 §3 |
| Documents | Versionnés : une version écrasée ou supprimée se récupère | Q8 §3 |
| ❓ Dossier d'un employé qui quitte l'institution (inactif dans un nouvel export) | Non défini | À poser au directeur |
| ❓ Certificat rejeté et jamais redéposé ; journal d'audit ; messages envoyés | Non défini | À poser au directeur |

### 8.7 Qui voit quoi

Les droits de chaque rôle sont au §4.3. Deux principes s'appliquent à toutes les données : un employé ne voit que son propre dossier (ENF-03), et toute consultation d'un document par les RH est tracée (EF-605).

### 8.8 Qualité des données de départ

Constats de l'export du 1er octobre 2026 (B-01, `../4-referentiel/rapport-anomalies-export.md`), sans aucune donnée personnelle :

| Constat | Effet sur le portail |
|---|---|
| 364 actifs pour ~500 employés réels | ❓ Cause à confirmer avec la DRH ; tant qu'elle ne l'est pas, ~136 employés ne pourraient pas se connecter |
| 94 actifs sans email (26 %), 2 avec une adresse @acmehaiti.com | La mention « pas d'adresse » est indispensable (RG-02) ; l'email institutionnel ne touche presque personne (RG-50) |
| 2 matricules en double chez les actifs | À corriger dans le système RH avant le lancement ; le portail ne doit pas créer deux comptes pour une personne |
| Codes d'agence PB (61 actifs) et RC (24) absents du fichier des agences ; 16 noms de direction, dont 3 doublons | Sans correspondance validée, 85 employés seraient « Unité à confirmer » (RG-17) |

## 9. Exigences non fonctionnelles

Ce que le portail doit garantir, quelle que soit la fonction. Même règle qu'aux chapitres précédents : une source par ligne, ❓ quand le directeur n'a pas tranché, **P-xx** pour nos propositions (§12.2).

### 9.1 Sécurité

| N° | Exigence | Source | Lot |
|---|---|---|---|
| ENF-01 | HTTPS uniquement : certificat ACM, CloudFront en frontal | Demande phase 4 ; Q8 §1 | 3 |
| ENF-02 | Chiffrement au repos des documents et de la base | Demande phase 4 ; Q8 §3 | 3 |
| ENF-03 | Accès restreints par rôle (§4.3) ; un employé ne voit que son propre dossier | Demande phase 4 ; Q2 §1 | 1 et 2 |
| ENF-04 | Fichiers déposés : type vérifié sur le contenu, analyse antivirus, noms aléatoires, espace S3 privé, liens temporaires | Demande phase 4 ; Q8 §3 | 1 et 3 |
| ENF-05 | Protection contre l'énumération des matricules ; tentatives de connexion limitées (RG-80) | Demande phase 4 | 1 |
| ENF-06 | Comptes RH : double authentification au choix (WhatsApp, email ou application TOTP, P-14) ; administration accessible depuis le réseau de l'institution | Q8 §4 | 3 |
| ENF-07 | Secrets (mots de passe de service, clés) dans AWS Secrets Manager, jamais dans le code | Q8 §4 | 3 |
| ENF-08 | Journal d'audit des modifications, décisions et consultations de documents (EF-605) | Demande 3.6 ; Q2 §1 | 2 |

### 9.2 Données personnelles

| N° | Exigence | Source | Lot |
|---|---|---|---|
| ENF-10 | Consentement explicite et mention d'information : pourquoi on collecte, qui y a accès | Demande phase 4 ; Q1 (points à intégrer) | 1 |
| ENF-11 | Salaires et rémunérations jamais extraits ni stockés, y compris dans les lettres scannées (S-01) | Message de lancement §5 ; Q5 §6 | 2 |
| ENF-12 | Aucune donnée réelle d'employé en test ; la recette n'utilise que des données fictives | Message de lancement §5 ; Q8 §2 | Tous |
| ENF-13 | Seules les colonnes de l'export utiles au portail sont lues ; les colonnes bancaires, de prêts, de licenciement et de pièce d'identité ne sont jamais chargées | **P-11** | 1 |

### 9.3 Sauvegarde et continuité

| N° | Exigence | Source | Lot |
|---|---|---|---|
| ENF-20 | Sauvegarde quotidienne de la base, conservée 30 jours | Q8 §3 | 3 |
| ENF-21 | Documents versionnés : un fichier écrasé ou supprimé par erreur se récupère | Q8 §3 | 3 |
| ENF-22 | Tests de restauration ; ❓ fréquence à fixer | Q8 (points ouverts) | 3 |
| ENF-23 | ❓ Disponibilité attendue (heures de service, tolérance aux coupures) : non définie | — | 3 |

### 9.4 Performance et volumétrie

| N° | Exigence | Source | Lot |
|---|---|---|---|
| ENF-30 | Pages légères : beaucoup d'employés utilisent leur téléphone, parfois avec une connexion limitée | Demande phase 5 | 1 |
| ENF-31 | Seuils chiffrés : chaque page pèse moins de 500 Ko hors documents, et s'affiche en moins de 5 secondes sur une connexion 3G | **P-12** | 1 |
| ENF-32 | Volumétrie : ~500 employés (364 actifs dans l'export), 35 agences dans le fichier reçu (28 selon le registre), 8 régions, jusqu'à 20 certificats par employé (P-08) | Demande (contexte) ; Q4 §3 ; B-01 | 1 |
| ENF-33 | Un employé complète son profil en moins de 10 minutes sur téléphone | §2.3 (critère « plaisir ») | 1 |

### 9.5 Ergonomie, ton et accessibilité

| N° | Exigence | Source | Lot |
|---|---|---|---|
| ENF-40 | Interface en français, sobre, moderne ; conçue pour le téléphone d'abord | Demande phase 5 ; Q9 | 1 |
| ENF-41 | Ton valorisant et rassurant, jamais culpabilisant ni menaçant ; le verrou est présenté comme un service | Demande (objectif réel), phase 5 | 1 |
| ENF-42 | Messages d'erreur constructifs, précis, actionnables (RG-15) | Demande phase 2 | 1 |
| ENF-43 | Accessibilité de base : contrastes, tailles de police, navigation au clavier ; un indicateur ne repose jamais sur la seule couleur (S-07) | Demande phase 5 ; Q5 §4 | 1 |
| ENF-44 | Charte : bleu marine `#1E1E82` principal ; rouge `#CC1111` en accent, jamais pour une erreur ou un rejet ; mascotte « La Penseuse » sur la connexion, l'accueil et les encouragements, absente des refus | Q9 | 1 |

### 9.6 Maintenabilité

| N° | Exigence | Source | Lot |
|---|---|---|---|
| ENF-50 | Code lisible et commenté, documentation courte pour la maintenance (le directeur développe en Python et VBA) | Demande (contraintes) | Tous |
| ENF-51 | Toutes les règles dans un tableau unique et commenté (§7), rendu modifiable sans code au lot 4 | Message de lancement §2.1 ; Demande phase 2 ; Q3 §4 | 1 et 4 |
| ENF-52 | Migration non destructive : les données existantes sont conservées | Demande (contraintes) | 1 |
| ENF-53 | Réutiliser le code qui fonctionne (connexion, lecture du CSV, contrôle des fichiers, comptes admin, tests), retirer ce qui ne sert plus | Message de lancement §1 ; Demande (contraintes) | 1 |

## 10. Contraintes

### 10.1 Méthode et gouvernance

| N° | Contrainte | Source |
|---|---|---|
| C-01 | Rien n'est développé avant la validation des spécifications et des maquettes par le directeur | Message de lancement §1 |
| C-02 | Rien n'est modifié en production sans plan présenté et validé | Demande (contraintes) |
| C-03 | Méthode agile : cycles de 48 heures au plus, backlog unique priorisé et estimé que le directeur peut réordonner, point d'avancement à chaque cycle | Message de lancement §6 |
| C-04 | Les décisions sont demandées une à une, avec une proposition par défaut ; une contradiction ou un risque est signalé avant de continuer | Message de lancement §5, §6 |
| C-05 | Chaque lot se termine par une démonstration et une validation écrite avant le suivant | Message de lancement §6 ; plan validé |
| C-06 | Le registre des décisions fait foi ; les points *[entre crochets]* ne sont pas tranchés | Message de lancement §5 ; registre |

### 10.2 Données et organisation

| N° | Contrainte | Source |
|---|---|---|
| C-10 | L'export RH reste en lecture seule ; les corrections passent par le tableau de correspondance, jamais par le code | Q4 §6 |
| C-11 | Le référentiel des unités appartient à Mme Colin Nérius, assistée de Mme Darling Jean ; la DIT ne le modifie pas seule | Q4 §2 |
| C-12 | Les certificats sont validés par Mme Nérius et Rose-Herline Joseph ; d'autres Agents RH pourront être désignés | Q2 §1 |
| C-13 | Questions d'infrastructure : au directeur ; référentiel et certificats : directement aux interlocutrices | Message de lancement §6 |
| C-14 | Constats de l'export (B-01) : 26 % des actifs sans email, 2 seulement avec une adresse @acmehaiti.com ; 364 actifs pour ~500 employés réels | B-01 |

### 10.3 Technique

| N° | Contrainte | Source |
|---|---|---|
| C-20 | Hébergement sur le compte AWS d'ACME SA, à l'adresse `carriere.acmehaiti.com` ; recette sur `recette-carriere.acmehaiti.com`, protégée par mot de passe | Q8 §1, §2 |
| C-21 | Région AWS *[us-east-2]*, à confirmer par la DIT | Q8 §1 |
| C-22 | Base PostgreSQL gérée (RDS) recommandée, *[à confirmer]* | Q8 §3 ; Q8 (points ouverts) |
| C-23 | WhatsApp uniquement par l'API officielle de Meta, avec des modèles de messages approuvés à l'avance | Q7 §2 |
| C-24 | Le portail actuel (MVP) tourne sur le poste du développeur avec le vrai export ; son accès Internet est à couper hors démonstration (S-03) | Audit §1 ; S-03 |

### 10.4 Dépendances : ce que le portail attend d'autres personnes

| Pièce | Fournie par | Nécessaire pour | État |
|---|---|---|---|
| Export RH | Directeur | Lot 1 | ✅ Reçu (1er octobre 2026) |
| Fichier agence → région | DRH | EF-503 | ✅ Reçu le 2026-10-06, sans dates ni directions (B-01 §5) |
| Liste officielle des directions et services, codes PB et RC | Mme Nérius | EF-501, EF-502 | ❓ Demandée |
| Grille de classification des postes | DRH | RG-30, maquettes | ❓ Attendue |
| Logo, mascotte, police | Directeur | Guide de style, maquettes | ❓ Attendus |
| Échantillon de 20 à 30 lettres et environnement sécurisé | Directeur, DIT | Test d'extraction (S-02) | ❓ Attendus |
| Région AWS, Cognito, VPN, DNS | DIT | Lot 3 | ❓ Attendus |
| Prestataire et budget WhatsApp | Directeur | EF-701 | ❓ À décider |

## 11. Plan de livraison

Chaque domaine D1 à D9 devient un **epic** ; chaque exigence, une ou plusieurs **user stories**. Le tableau ci-dessous range les 62 exigences du chapitre 6 par lot. Les priorités sont celles du chapitre 6 ; ⚖ = à confirmer par le directeur.

### 11.1 Vue d'ensemble

| Lot | But | Epics touchés | Must | Should | Démonstration de fin de lot |
|---|---|---|:---:|:---:|---|
| **0. Cadrage** | Spécifications et maquettes validées | — | — | — | Démonstration d'ensemble et validation écrite (B-20) |
| **1. Parcours « certificat »** | Un employé complète son profil et dépose ses certificats | D1, D2, D3, D5, D7 | 23 | 4 | Un employé au dossier complet et un au dossier incomplet (Q1) |
| **2. Traitement RH** | Les RH valident, pilotent et enregistrent les demandes | D1, D3, D4, D6, D9 | 18 | 5 | File de validation et tableau de bord sur données fictives |
| **3. Mise en service** | Le portail est hébergé, sécurisé et annoncé | D1, D3, D7 | 3 | — | Test complet en recette ; guide RH d'une page ; message de lancement |
| **4. Carrière et engagement** | L'employé voit ses postes éligibles et suit ses demandes | D2, D5, D6, D7, D8, D9 | 10 | 5 | Un employé avec un champ périmé (Demande, livrable 5) |
| **Lot distinct** | Lettres produites par le portail, mouvements renvoyés au système RH | D9 | — | — | Q5 §6, étape B |

Une exigence répartie sur deux lots compte dans chacun d'eux.

### 11.2 Détail par lot

**Lot 1 — Parcours « certificat »**

| Epic | Must | Should |
|---|---|---|
| D1 Accès | EF-101, EF-102 | |
| D2 Dossier | EF-201 → EF-204, EF-205 (formats), EF-206 → EF-209 | EF-205 (cohérence) ⚖ |
| D3 Certificats | EF-301 → EF-303, EF-307 (confirmation), EF-308 (type, noms aléatoires) | EF-307 (« ce que ça débloque ») ⚖ |
| D5 Référentiel | EF-501 → EF-504, EF-505 (table) | |
| D7 Notifications | EF-702, EF-703 (certificat) | EF-701 ⚖, EF-704 ⚖ |

**Lot 2 — Traitement RH**

| Epic | Must | Should |
|---|---|---|
| D1 Accès | EF-103, EF-105 | |
| D3 Certificats | EF-304, EF-305 | EF-306 ⚖ |
| D4 Validation | EF-401 → EF-405, EF-407, EF-408 | EF-406 ⚖ |
| D6 Pilotage | EF-601 → EF-603, EF-605 | EF-604 ⚖ |
| D9 Demandes | EF-901 (lettre), EF-902, EF-903 | EF-905 ⚖, EF-906 ⚖ |

**Lot 3 — Mise en service**

| Epic | Must |
|---|---|
| D1 Accès | EF-104 |
| D3 Certificats | EF-308 (antivirus, stockage chiffré) |
| D7 Notifications | EF-705 |
| Hors epic | Exigences non fonctionnelles du lot 3 (ENF-01, 02, 06, 07, 20 → 23) ; guide RH d'une page (Demande, livrable 6) |

**Lot 4 — Carrière et engagement**

| Epic | Must | Should |
|---|---|---|
| D2 Dossier | EF-210 | |
| D5 Référentiel | | EF-505 (interface) |
| D6 Pilotage | | EF-606 |
| D7 Notifications | EF-703 (demande) | EF-706 |
| D8 Carrière | EF-801, EF-803 → EF-806 | EF-802 ⚖, EF-807 ⚖ |
| D9 Demandes | EF-901 (portail), EF-904, EF-907 | |

**Could have, à proposer au directeur :** pistes D (fiche de qualifications) et E (postes ouverts dès le lot 2), §6.10.

### 11.3 Enchaînements à respecter

| Avant | Après | Pourquoi |
|---|---|---|
| Référentiel validé (B-02) | Lot 1 | L'employé voit les libellés officiels (EF-201) ; aucune valeur sans correspondance (Q4 §4) |
| Grille de classification | Maquettes du lot 1 | Les niveaux et leurs rangs y sont alignés (Q3 §5) |
| Lot 1 (certificats déposés) | Lot 2 (validation) | Rien à valider sans dépôt |
| Lot 2 (certificats validés, mouvements extraits) | Lot 4 (éligibilité) | L'éligibilité ne compte que les données validées (Q5 §3) ; l'ancienneté dans le poste vient des mouvements (Q5 §6) |
| Lot 3 (hébergement) | Données réelles | Aucune donnée réelle hors production sécurisée (message de lancement §5) |

**Ouverture aux employés : à la fin du lot 3, pas avant** (analyse de conformité du directeur, 2026-10-06, `../0-cadrage/retour-directeur-schemas.md`). Les lots 1 et 2 sont démontrés en recette, sur données fictives.

## 12. Glossaire, décisions et propositions

### 12.1 Glossaire

| Terme | Définition | Source |
|---|---|---|
| **À rattacher** | Liste, visible de l'administrateur, des valeurs de l'export sans correspondance dans le référentiel | Q4 §5 |
| **Administrateur** | Rôle RH : valide, réaffecte, gère les comptes, réinitialise l'accès d'un employé | Q2 §1 |
| **Agent RH** | Rôle RH qui valide les certificats et traite les signalements et les demandes | Q2 §1 |
| **Ancienneté dans le poste** | Aujourd'hui moins la date d'effet du dernier mouvement de carrière, ou la date d'embauche | Q5 §6 |
| **Certificat** | Terme générique pour tout document de qualification déposé ; son *type* est Diplôme, Certificat, Attestation ou Autre | Q3 §1 |
| **Checklist** | Liste de ce qui manque pour débloquer le dépôt, avec un lien vers chaque champ | Demande 1.4 |
| **Confirmation** | Geste de l'employé qui atteste qu'une information est exacte ; sa date est conservée | Q1 ; Q10 |
| **DA / DR** | Directeur d'agence / directeur régional, tels que nommés dans le fichier des agences | Fichier des agences (B-01 §5) |
| **Domaine** | Spécialité d'un certificat (comptabilité, informatique…) | Q3 §3 ; P-01 |
| **Dossier complet** | Profil complet et au moins un certificat validé | **P-06** |
| **Éligibilité** | Indicateur vert / orange calculé sur les données validées ; informatif, ne décide jamais | Q5 §3 → §5 |
| **Export RH** | Fichier CSV extrait du système RH, lu sans jamais être modifié | Q4 §6 |
| **File de validation** | Liste des certificats en attente de décision des RH | Q2 §5 ; P-03 |
| **Hors critères** | Marque d'une manifestation d'intérêt d'un employé non éligible | Q5 §5 |
| **Lecture seule** | Rôle qui consulte dossiers et tableaux de bord sans valider (Direction Générale, audit) | Q2 §1 |
| **Mouvement de carrière** | Promotion, transfert ou nomination, avec sa date d'effet | Q5 §6 |
| **Niveau / rang** | Place d'un certificat sur l'échelle commune (rangs 1 à 8, plus deux niveaux hors échelle) | Q3 §2 |
| **Niveau d'études du profil** | Rang le plus élevé parmi les certificats validés ; à défaut, le niveau déclaré | Q3 §1 |
| **Péremption** | État d'une information non confirmée depuis 12 mois (lot 4) | Q10 |
| **Poste confidentiel** | Poste ouvert visible des seules personnes ciblées, avec motif tracé | Q5 §5 |
| **Profil complet** | Les 8 éléments de RG-01 remplis ou confirmés ; débloque le dépôt | Q1 ; P-06 |
| **Recette** | Environnement d'essai, sur données fictives uniquement | Q8 §2 |
| **Référentiel des unités** | Table officielle des agences, régions, directions, services et siège | Q4 §1, §3 |
| **Registre des demandes** | Liste centralisée des demandes de promotion et de changement de poste | Q6 §2 |
| **Responsable du référentiel** | Mme Colin Nérius, assistée de Mme Darling Jean | Q4 §2 |
| **Séparation des tâches** | Un Agent RH ne valide jamais son propre certificat | Q2 §1 |
| **Signalement** | Déclaration par l'employé d'une erreur sur une donnée qu'il ne peut pas modifier | Q1 |
| **Tableau de correspondance** | Table qui relie chaque valeur de l'export à une unité officielle | Q4 §1, §4 |
| **Unité à confirmer** | Statut d'un employé dont l'agence ou la direction est « À rattacher » | Q4 §5 |
| **Verrou** | Le dépôt de certificat attend un profil complet | Demande (objectif réel) ; Q1 |
| *Méthode* — **Epic, user story, MoSCoW, lot, cycle** | Domaine fonctionnel ; besoin testable d'un utilisateur ; priorité Must / Should / Could / Won't ; étape de livraison validée ; période de travail de 48 heures au plus | Message de lancement §6 ; §6 |

### 12.2 Propositions à faire au directeur

Elles modifient ou précisent le registre : elles ne s'appliquent qu'après son accord. **P-01 à P-09 : validées par le développeur le 2026-10-06, à soumettre au directeur. P-10 à P-13 : proposées le 2026-10-06, à valider par le développeur.**

| N° | Proposition | Raison |
|---|---|---|
| P-01 | Le **domaine** d'un certificat est **choisi dans une liste** (Comptabilité, Gestion, Finance, Économie, Informatique, Droit, Agronomie…, « Autre » à préciser) et devient **obligatoire à partir du niveau Technicien supérieur (Bac + 2)** ; facultatif en dessous | Critère de réussite n°1 : sans domaine fiable et normalisé, la recherche par spécialité est incomplète (« Compta », « comptabilité », « Sciences comptables » seraient trois domaines) |
| P-02 | Si un contrôle de cohérence échoue sur une donnée que l'employé **ne peut pas modifier** (date d'embauche, agence, poste), le portail **ne bloque pas** l'employé : il crée automatiquement un **signalement pour les RH**, traité comme un signalement d'erreur (Q1) | La demande veut un blocage « jamais une sanction » ; bloquer l'employé pour une erreur qu'il ne peut pas corriger en serait une (QP-05) |
| P-03 | La file de validation est **commune** aux Agents RH : chacune prend le dossier suivant, qui passe « en cours » à son nom pour éviter un double traitement ; l'Administrateur peut **réaffecter** un dossier ; le certificat d'un Agent RH n'apparaît jamais dans sa propre file (Q2) | Simple, et aucun dossier ne reste bloqué quand une personne est absente (QR-01) |
| P-04 | Formats : téléphone = 8 chiffres ou +509 suivi de 8 chiffres ; email au format standard ; adresse de 5 à 200 caractères | « Au bon format » (Demande) n'est pas chiffré (RG-10 à RG-12) |
| P-05 | Pourcentage : chacun des 8 éléments du profil compte pour un point | « Calculé à partir de ces champs » (Q1) ne dit pas comment (RG-05) |
| P-06 | Distinguer **profil complet** (8 éléments, débloque le dépôt) et **dossier complet** (profil complet et au moins un certificat validé) | Q1 fait du profil complet la condition du dépôt, donc il ne peut pas inclure le certificat ; mais Q3 dit que certifications et attestations « comptent dans la complétude du dossier », et le critère n°4 vise des dossiers complets (RG-06) |
| P-07 | Lien du contact d'urgence choisi dans une liste : Conjoint·e, Parent, Enfant, Frère / Sœur, Autre | Données comparables, saisie rapide sur téléphone (RG-13) |
| P-08 | Fichier de 5 Mo au plus (photos réduites avant envoi), 20 certificats au plus par employé, année d'obtention pas dans le futur | Valeurs « à définir » (Demande 1.4 ; QP-03) |
| P-09 | Blocage de 15 minutes après 5 mots de passe erronés | Reprend le portail actuel ; la demande ne chiffre pas la limite (RG-80) |
| P-10 | Le référentiel garde, pour chaque agence et chaque région, son **responsable** (directeur d'agence, directeur régional) | Le fichier des agences les fournit déjà ; le circuit des demandes consulte « le responsable du département concerné » (Q6 §3) et l'information du responsable hiérarchique reste à trancher (Q6, points ouverts ; §4.2) |
| P-11 | Le portail ne lit de l'export que les colonnes dont il a besoin ; les colonnes bancaires, de prêts, de licenciement et de pièce d'identité ne sont jamais chargées (liste blanche du portail actuel) | « Accès restreints » et données « sensibles » (Demande phase 4) ; l'export contient ces colonnes (ENF-13) |
| P-12 | Chaque page pèse moins de 500 Ko hors documents et s'affiche en moins de 5 secondes sur une connexion 3G | « Pages légères » (Demande phase 5) n'est pas chiffré (ENF-31) |
| P-15 | Les **employés** ont aussi une double authentification (RG-83, US-106), alors que D-41 la réservait aux comptes RH au lancement. Restent à fixer : les méthodes ouvertes aux employés (beaucoup n'ont pas d'email ; WhatsApp coûte par message) et la récupération d'un téléphone perdu | Demande du développeur, 2026-10-08 ; à confirmer par M. Hilaire |
| P-14 | La double authentification des comptes RH laisse **chaque personne choisir sa méthode** : code par WhatsApp, code par email, ou application TOTP (Microsoft Authenticator ou équivalent). La technologie (Cognito seul, ou Cognito et un développement pour WhatsApp) reste à choisir avec la DIT | Demande du développeur, 2026-10-07 : ne dépendre ni d'un seul canal ni d'un seul appareil ; Q8 ne cite que Cognito et SES |
| P-13 | Au lot 1, la responsable du référentiel tient le référentiel et le tableau de correspondance dans un **fichier Excel** ; un Administrateur l'importe à chaque modification ; l'import refuse un fichier incohérent (code en double, agence sans région) et produit la liste « À rattacher », envoyée à la responsable | Q4 §5 prévoit « un fichier ou une table modifiable » au lot 1 sans dire comment, alors que l'espace RH n'arrive qu'au lot 2 (analyse de conformité, point 8) |
