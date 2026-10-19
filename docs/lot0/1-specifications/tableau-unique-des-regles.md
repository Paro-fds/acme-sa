# Tableau unique des règles métier — Portail carrière ACME SA

| | |
|---|---|
| **Version** | 1.1, 2026-10-06 : chaque règle est commentée (colonne « Pourquoi ») et porte son statut (backlog B-03) |
| **Rôle** | Livrable 1 du lot 0 : « toutes les règles dans un tableau unique et commenté » (message de lancement §2.1) |
| **Référence** | Registre des décisions v1.8 (`../0-cadrage/registre-des-decisions-v1.8.md`), qui fait foi ; propositions P-xx : `cahier-des-charges.md` §12.2 |
| **Lien** | Chapitre 7 du cahier des charges (`cahier-des-charges.md`) ; les exigences EF-xx renvoient aux règles RG-xx |

Toutes les règles précises en un seul endroit. C'est ce tableau qui sera codé au lot 1, puis rendu modifiable sans code au lot 4 (EF-606).

## Lecture

| Statut | Signification | Nombre |
|---|---|:---:|
| ✅ **Décidée** | Écrite dans le registre ou la demande du directeur | 28 |
| 🟡 **À confirmer** | Valeur du registre *[entre crochets]*, pas encore tranchée | 5 |
| 🔵 **Proposée** | Proposition P-xx ou décision D-xx, validée par le développeur, à confirmer par le directeur | 16 |
| | **Total** | **49** |

La colonne **Pourquoi** explique à quoi sert la règle : c'est le commentaire demandé. La colonne **Source** renvoie à la demande initiale (« Demande »), au registre (Qx) ou à une proposition (P-xx). ❓ = valeur que personne n'a encore fixée.

## 7.1 Profil complet et verrou

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-01 | Éléments qui rendent le **profil complet** et débloquent le dépôt | 8 éléments : téléphone, adresse, email (ou « pas d'adresse »), contact d'urgence, niveau d'études, agence confirmée, poste confirmé, date d'embauche confirmée | Ce sont les informations dont les RH ont besoin pour traiter une promotion ou pourvoir un poste, et que l'employé peut fournir lui-même en quelques minutes | Q1 | ✅ |
| RG-02 | Un champ à saisir est complet… | s'il est rempli et valide (RG-10 à RG-15) ; l'email l'est aussi avec la mention « Je n'ai pas d'adresse email » | Environ un quart des employés n'ont pas d'email : ils ne doivent pas être bloqués pour cela | Q1 | ✅ |
| RG-03 | Un champ à confirmer (agence, poste, date d'embauche) est complet… | quand l'employé a coché « Ces informations sont exactes » **ou** a signalé une erreur | Ces données viennent du système RH et l'employé ne peut pas les corriger ; le bloquer pour une erreur qu'il ne peut pas réparer serait une sanction | Q1 ; **P-02** | 🔵 |
| RG-04 | Nom, prénom, formations, expériences, compétences | **N'entrent pas** dans le profil complet | Le nom et le prénom sont déjà connus et servent à se connecter ; le reste arrive avec « Ma carrière » (lot 4) et ne doit pas freiner le dépôt | Q1 | ✅ |
| RG-05 | Calcul du pourcentage | Chaque élément de RG-01 compte pour un point ; % = éléments complets ÷ 8, tronqué à l'entier (5 sur 8 = 62 %) | Un calcul simple que l'employé comprend : chaque information ajoutée fait avancer la barre | Q1 ; **P-05** | 🔵 |
| RG-06 | **Profil complet** et **dossier complet** | Profil complet = les 8 éléments (débloque le dépôt). Dossier complet = profil complet **et** au moins un certificat validé | Le dépôt ne peut pas exiger un certificat validé, sinon personne ne pourrait déposer le premier ; le tableau de bord, lui, doit compter les dossiers vraiment complets (critère de réussite n°4) | Q1, Q3 ; **P-06** | 🔵 |
| RG-07 | Verrou | Le dépôt de certificat est impossible tant que le profil n'est pas complet ; le profil reste toujours consultable ; la checklist liste chaque élément manquant avec un lien | Chaque certificat reçu arrive dans un dossier déjà propre ; le verrou est présenté comme un service, jamais comme une sanction | Demande 1.4 ; Q1 | ✅ |

## 7.2 Formats et cohérence

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-10 | Téléphone (employé et contact d'urgence) | 8 chiffres, ou +509 suivi de 8 chiffres ; espaces et tirets ignorés | Le téléphone porte le premier canal de notification (WhatsApp) : un numéro mal saisi rend l'employé injoignable | Demande phase 2 (« au bon format ») ; **P-04** | 🔵 |
| RG-11 | Email | Format d'adresse email standard | Une adresse mal formée fait échouer les envois | Demande phase 2 ; **P-04** | 🔵 |
| RG-12 | Adresse | Texte de 5 à 200 caractères | Évite les adresses vides ou d'un caractère, sans imposer un format que les adresses ne suivent pas toujours | **P-04** | 🔵 |
| RG-13 | Contact d'urgence | Nom (2 à 100 caractères), lien choisi dans une liste (Conjoint·e, Parent, Enfant, Frère / Sœur, Autre), téléphone (RG-10) | Donnée absente de l'export, utile notamment pour les assurances ; une liste de liens rend la saisie rapide sur téléphone | Q1 ; **P-07** | 🔵 |
| RG-14 | Niveau d'études du profil | Choisi parmi les niveaux de rang 1 à 8 (§7.4) ; les deux niveaux hors échelle ne sont pas proposés | Même échelle que les certificats, pour comparer le niveau déclaré et le niveau prouvé | Q3 §1, §2 | ✅ |
| RG-15 | Messages d'erreur | Constructifs, précis, actionnables (« Ajoutez votre numéro de téléphone pour continuer ») | Le message dit quoi faire, pas ce qui est interdit : l'employé avance au lieu d'abandonner | Demande phase 2 | ✅ |
| RG-16 | Date d'embauche au moins 18 ans après la date de naissance *(Should)* | Sinon : signalement automatique aux RH, sans bloquer | Repère une date probablement fausse dans le système RH ; l'employé n'y peut rien, donc on alerte les RH sans le bloquer | Demande phase 2 ; **P-02** | 🔵 |
| RG-17 | Agence connue du référentiel | Sinon : « À rattacher » pour l'administrateur, employé « Unité à confirmer », sans bloquer | Aucune valeur n'est ignorée : la responsable du référentiel la traite, sans pénaliser l'employé | Q4 §5 | ✅ |
| RG-18 | Niveau déclaré supérieur au plus haut niveau validé *(Should)* | Écart signalé aux RH | Le niveau déclaré n'est pas prouvé : l'écart indique un certificat à demander ou une erreur de saisie | Q3 §1 | ✅ |

## 7.3 Certificats

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-20 | Formats acceptés | PDF, JPG, PNG, vérifiés sur le contenu réel du fichier | Ce sont les formats d'un scan ou d'une photo de téléphone ; vérifier le contenu empêche de déguiser un fichier dangereux | Demande 1.4, phase 4 | ✅ |
| RG-21 | Taille maximale d'un fichier | 5 Mo, les photos étant réduites avant envoi (« à définir » dans la demande) | Une photo de téléphone dépasse souvent 5 Mo ; la réduire avant l'envoi ménage les connexions limitées | Demande 1.4 ; **P-08** | 🔵 |
| RG-22 | Nombre de certificats | Plusieurs ; au plus 20 par employé | Plusieurs certificats sont permis ; une limite haute évite les abus sans gêner personne | Demande 1.4 ; **P-08** | 🔵 |
| RG-23 | Champs obligatoires | Type, niveau, intitulé, établissement, année d'obtention ; pays si le diplôme est étranger ; domaine à partir du rang 5 (RG-31) | Ce sont les informations qui servent aux recherches RH et à l'éligibilité ; sans domaine fiable, la recherche « Licence en comptabilité » (critère de réussite n°1) est incomplète | Q3 §3, §4 ; **P-01** | 🔵 |
| RG-24 | Types | Diplôme, Certificat, Attestation, Autre | Les types du portail actuel, déjà connus des employés | Q3 §1 | ✅ |
| RG-25 | Année d'obtention | Pas dans le futur ; ❓ borne basse non définie | Repère les fautes de frappe évidentes | **P-08** | 🔵 |
| RG-26 | Statuts | Reçu / En vérification → Validé, ou À corriger (motif obligatoire) ; un redépôt repart en « En vérification » | L'employé sait toujours où en est son dépôt ; un rejet ouvre une correction, pas une impasse | Q2 §2 | ✅ |
| RG-27 | Conservation | Un certificat validé n'est jamais supprimé ; remplacé, il reste archivé avec son historique | Un certificat validé est une preuve : il doit rester consultable, même remplacé | Q2 §2 | ✅ |

## 7.4 Niveaux

| Rang | Niveau | Exemples (infobulle) | Compte dans le niveau d'études |
|:---:|---|---|:---:|
| 1 | Primaire / Fondamental | Certificat d'études | Oui |
| 2 | Secondaire | Classe de 3e ou diplôme équivalent | Oui |
| 3 | Baccalauréat | Bac I / Bac II (Philo) | Oui |
| 4 | Formation professionnelle / Technique | Diplôme technique, formation sectorielle | Oui |
| 5 | Technicien supérieur / Bac + 2 | | Oui |
| 6 | Licence | Bac + 3 ou 4 selon l'université | Oui |
| 7 | Master | Maîtrise, Master 1 ou 2 | Oui |
| 8 | Doctorat | Doctorat, PhD | Oui |
| — | Certification professionnelle | Comptabilité, gestion de risque, microfinance, informatique… | Non (compte dans la complétude et les compétences) |
| — | Formation continue / Attestation | Séminaire, atelier, stage avec attestation | Non (compte dans la complétude et les compétences) |

**Pourquoi des rangs :** ils permettent de comparer les niveaux entre eux (« au moins Licence ») pour les filtres RH et l'éligibilité ; le rang reste invisible pour l'employé.
**Source :** Q3 §2. **Statut : 🟡 à confirmer** : liste de départ, à aligner sur la grille de classification des postes d'ACME SA, attendue de la DRH, avant de finaliser les maquettes (Q3 §5).

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-30 | Niveau d'études du profil | Rang le plus élevé parmi les certificats **validés** ; tant qu'aucun n'est validé, le niveau déclaré par l'employé | Seule une preuve validée fait foi ; le niveau déclaré sert en attendant | Q3 §1, §4 | ✅ |
| RG-31 | Domaine | Choisi dans une liste (Comptabilité, Gestion, Finance, Informatique…, « Autre » à préciser) ; obligatoire à partir du rang 5 | Sans liste, « Compta », « comptabilité » et « Sciences comptables » seraient trois domaines différents ; en dessous de Bac + 2, la spécialité compte rarement | **P-01** | 🔵 |

## 7.5 Validation par les RH

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-40 | Délai de traitement | 5 jours ouvrables ; au-delà, alerte dans la file | Délai accepté par le directeur ; l'alerte évite qu'un dossier soit oublié | Q2 §3 | ✅ |
| RG-41 | Qui valide | Agent RH ou Administrateur ; jamais la Lecture seule | Seules les personnes désignées décident ; la Lecture seule consulte | Q2 §1 | ✅ |
| RG-42 | Séparation des tâches | Le certificat d'un Agent RH ne figure pas dans sa file : il va à l'autre Agent RH, à défaut à un Administrateur | Personne ne valide son propre diplôme | Q2 §1 | ✅ |
| RG-43 | Organisation de la file | Commune ; un dossier pris passe « en cours » au nom de l'agent ; réaffectation par un Administrateur | Aucun dossier ne reste bloqué quand une personne est absente, et deux agents ne traitent jamais le même dossier | **P-03** | 🔵 |
| RG-44 | Correction possible par le valideur | Le niveau (Q3 §4) ; aussi l'intitulé, l'établissement, l'année et le domaine, chaque correction étant tracée | L'employé peut se tromper : le valideur corrige au lieu de rejeter pour une faute de frappe | Q3 §4 ; **D-13** | 🔵 |
| RG-45 | Trace d'une décision | Valideur, date, heure, décision, motif en cas de rejet | Toute décision peut être retrouvée et justifiée (journal d'audit) | Q2 §1 | ✅ |
| RG-46 | Motifs de rejet (liste fermée, commentaire facultatif) | 1. Document illisible ou de mauvaise qualité · 2. Document incomplet · 3. Nom absent ou différent · 4. Document non reconnu · 5. Niveau non conforme · 6. Établissement ou année non identifiable · 7. Document expiré ou non valide · 8. Doublon d'un document validé · 9. Fichier endommagé ou format non conforme · 10. Autre (commentaire **obligatoire**) | Des motifs fermés rendent les rejets comparables, et le message à l'employé clair et poli | Q2 §4 | ✅ |

## 7.6 Notifications et relances

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-50 | Ordre des canaux | WhatsApp, puis email institutionnel, puis email personnel avec consentement | Le téléphone est obligatoire, donc WhatsApp touche presque tout le monde ; l'export ne compte que 2 actifs avec une adresse @acmehaiti.com (B-01) | Q7 §1 | ✅ |
| RG-51 | Rythme des relances | Entre 1 et 7 jours, puis à 14 jours ; au plus *[3]* par campagne | Assez pour rappeler, pas assez pour lasser | Q7 §3 | 🟡 |
| RG-52 | Heures d'envoi | Lundi au vendredi, *[8 h – 18 h]* | Respecter le temps personnel des employés | Q7 §3 | 🟡 |
| RG-53 | Arrêt | Dès que le dossier est complet | On ne relance pas quelqu'un qui a terminé | Q7 §3 | ✅ |

## 7.7 Péremption *(lot 4)*

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-60 | Information périmée | Non confirmée depuis 12 mois | Une information de plus d'un an peut avoir changé : déménagement, nouveau numéro | Q10 | ✅ |
| RG-61 | Rappel | *[30 jours]* avant la péremption | Laisser le temps de confirmer avant que l'information ne soit périmée | Q10 | 🟡 |
| RG-62 | Délai de grâce | *[30 jours]* ; ❓ effet à la fin du délai non précisé | Une information périmée ne bloque pas l'employé du jour au lendemain | Q10 | 🟡 |
| RG-63 | Ne se périment pas | Certificats validés, niveau d'études | Un diplôme obtenu ne change pas | Q10 | ✅ |
| RG-64 | Point de départ | La date de dernière confirmation commence au lancement | Le portail ne connaît aucune confirmation avant son lancement : la règle ne peut jouer qu'un an après, d'où le lot 4 | Q1 ; Q10 | ✅ |

## 7.8 Référentiel, éligibilité, demandes

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-70 | Code d'une unité | Stable et unique, ne change jamais | Les noms changent (renommage, fusion) ; le code garde l'historique et le lien avec l'export | Q4 §3 | ✅ |
| RG-71 | Région d'une agence | Une seule à la fois, avec dates de début et de fin | Les régions évoluent ; les dates gardent des tableaux de bord justes dans le temps. Le fichier reçu n'a pas encore de dates (B-01, R-02) | Q4 §3 | ✅ |
| RG-72 | Éligibilité *(lot 4)* | Calculée sur les seules données validées ; ancienneté dans le poste « non calculable » sans historique ; informative, ne décide jamais | Une nomination reste une décision humaine ; l'indicateur informe et encourage à déposer ses certificats | Q5 §3, §5 | ✅ |
| RG-73 | Accusé de réception d'une demande *(lot 4)* | *[2]* jours ouvrables | L'employé sait vite que sa demande est reçue | Q6 §5 | 🟡 |
| RG-74 | Conservation des demandes | Aucune demande supprimée | L'historique sert à mesurer les délais (critère de réussite n°2) et à justifier les décisions | Q6 §5 | ✅ |

## 7.9 Accès

| N° | Règle | Valeur | Pourquoi | Source | Statut |
|---|---|---|---|---|:---:|
| RG-80 | Tentatives de connexion | Blocage de 15 minutes après 5 mots de passe erronés (valeurs du portail actuel) | Empêcher de deviner un mot de passe en essayant au hasard | Demande phase 4 ; **P-09** | 🔵 |
| RG-81 | Comptes RH | Double authentification ; réseau de l'institution (les RH travaillent depuis les bureaux) | Les comptes RH voient les dossiers de tous les employés : ils sont mieux protégés | Q8 §4 | ✅ |
| RG-83 | Employés | Double authentification aussi pour les employés, avec les méthodes de RG-82 ; ❓ méthodes ouvertes aux employés et récupération sans passer à l'agence | Le dossier d'un employé est personnel : nom, date de naissance et mot de passe ne suffisent pas à le protéger | Demande du 2026-10-08 ; **P-15** | 🔵 |
| RG-82 | Méthodes de double authentification | Au choix de la personne : code par WhatsApp, code par email, ou application TOTP (Microsoft Authenticator ou équivalent) ; code à 6 chiffres, usage unique ; ❓ durée de validité | Ne dépendre ni d'un seul canal ni d'un seul appareil | **P-14** | 🔵 |
