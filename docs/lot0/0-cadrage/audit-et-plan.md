# Refonte du portail employés : audit et plan

| | |
|---|---|
| **Version** | 0.1, à valider par la Direction RH / DIT |
| **Date** | 2026-10-05 |
| **Objet** | Livrable 1 de la demande de refonte : état des lieux, écarts, plan priorisé |

## 1. En bref

- Le portail fonctionne et il est sécurisé pour un test. Il a été pensé comme une **campagne de mise à jour** : l'employé vérifie ses coordonnées, et peut, s'il le souhaite, joindre des documents. **Rien ne l'incite à le faire et rien ne lie le certificat à un dossier complet.** C'est l'écart principal.
- Une partie de « Ma carrière » est **déjà en développement** (V2 : diplômes, formations, expériences, compétences, recherche de profils par compétence). Elle devient la base de la refonte.
- Plusieurs demandes changent des **règles fixées au départ** : administration en lecture seule, pas de validation des documents, pas d'export. Elles sont reprises ci-dessous comme des décisions à confirmer.
- Le portail tourne aujourd'hui **sur le poste du développeur**, derrière une adresse Cloudflare **temporaire**. C'est acceptable pour un test, pas pour 500 employés.
- Proposition : **4 lots**, chacun livré, testé et validé avant le suivant. Le lot 1 (parcours « certificat » avec le verrou) répond au cœur de la demande.

## 2. L'existant

| Sujet | État actuel |
|---|---|
| **Technique** | Python (FastAPI) pour le serveur, base SQLite, interface React pensée pour le téléphone. Code organisé en modules indépendants, ~590 tests automatiques côté serveur, ~285 côté interface, 13 tests de parcours complets. |
| **Source des données** | Export CSV du système RH (1 198 lignes, 364 employés actifs), **lu sans jamais être modifié**. Les corrections des employés sont gardées à part dans la base du portail, avec l'ancienne et la nouvelle valeur. |
| **Données utilisées** | 12 colonnes affichées (matricule, nom, prénom, sexe, date de naissance, agence, direction, poste, grade, niveau, nature du contrat, date d'embauche) dont **5 modifiables** (nom, prénom, téléphone, email, adresse). Les colonnes sensibles (bancaires, prêts, licenciement, pièce d'identité…) ne sont **jamais chargées**. |
| **Connexion employé** | Nom + prénom + date de naissance, puis création d'un mot de passe (8 caractères minimum) ; blocage 15 minutes après 5 erreurs. |
| **Connexion administration** | Comptes enregistrés dans la base, mot de passe de 12 caractères minimum, mot de passe provisoire à changer. |
| **Rôles** | Employé et Administrateur (un seul niveau, en lecture seule sur les dossiers ; peut réinitialiser l'accès d'un employé et gérer les comptes admin). |
| **Parcours employé** | Identification → profil → « Voulez-vous mettre à jour votre dossier ? » → coordonnées → documents **facultatifs** (Diplôme, Certificat, Attestation, Autre ; PDF, JPG, PNG, 5 Mo) → vérification → envoi. Possibilité de modifier à nouveau. |
| **Parcours administration** | Tableau de bord (mis à jour / non mis à jour, % d'avancement), liste avec recherche et filtre, dossier et documents en lecture seule. |
| **Fichiers envoyés** | Type vérifié sur le contenu réel du fichier (pas seulement l'extension), noms de fichiers aléatoires, stockage hors du dossier de l'application. |
| **En développement (V2, pas en service)** | « Mon parcours » : diplômes et certifications avec justificatif, formations, expériences, compétences. Côté administration : recherche de profils par compétence et par poste. 1 story sur 11 terminée. |

## 3. Écarts avec les objectifs

| Demande | Aujourd'hui | Écart |
|---|---|---|
| Page d'accueil avec les 3 bénéfices et la progression du dossier | Page de connexion directe | **À créer** |
| Profil avec champs manquants ou périmés signalés | Profil affiché, champs modifiables indiqués | Pas de notion de champ **obligatoire**, **manquant** ou **périmé** |
| Champs RH : agence, poste, date d'embauche, niveau d'études, contact d'urgence | Agence, poste et date d'embauche affichés en lecture seule | **Niveau d'études et contact d'urgence n'existent pas dans l'export RH** ; agence et poste viennent du système RH (voir Q1) |
| Verrou : téléversement possible seulement avec un profil complet | Documents facultatifs, indépendants du profil | **À créer** (cœur de la demande) |
| Plusieurs certificats avec titre, établissement, année, niveau, aperçu | Documents typés sans ces informations ; V2 en cours avec titre, établissement, date | Ajouter le **niveau** et l'**aperçu avant envoi** à la V2 |
| Statut « en vérification » puis « validé » | Aucun statut | **À créer** |
| File de validation RH (Valider / Rejeter avec motif, historique) | Administration en lecture seule | **Change une règle validée** |
| Tableau de bord : % de dossiers complets, certificats reçus / en attente / rejetés, par agence et direction | Mis à jour / non mis à jour | **À étendre** |
| Filtres (agence, statut, niveau d'études) et export Excel/CSV | Filtre par statut, pas d'export | **À créer** (l'export avait été écarté en V2) |
| Rôles Administrateur, Agent RH, Lecture seule | Un seul rôle admin | **À créer** |
| Journal d'audit (modifications, consultations de documents) | Anciennes et nouvelles valeurs gardées ; consultations non tracées | **À compléter** |
| Règles de validation configurables sans code | — | **À créer** (proposé au lot 4, voir §5) |
| Relances par email ou message | Aucun envoi | **À créer** ; demande un service d'envoi (Q7) |
| Postes ouverts, éligibilité, demandes de promotion | Aucune donnée | **Nouveau domaine** ; demande une source (Q5, Q6) |
| Consentement et mention d'information | Mention de visibilité dans la V2 seulement | **À créer** |
| Énumération et tentatives de connexion | Blocage après 5 mots de passe erronés | Ajouter une limite sur l'**étape d'identification** |
| Chiffrement au repos, analyse des fichiers, sauvegardes | Non | **À mettre en place** avec l'hébergement |
| Hébergement stable | Poste du développeur + tunnel temporaire | **Prérequis** avant le lancement |

## 4. Recommandations

1. **Garder la connexion actuelle.** « Matricule + date de naissance » est plus faible : les matricules se devinent, une date de naissance se connaît, et 3 matricules sont en double dans l'export. « Email + code » exclurait les employés sans email (un quart des lignes de l'export n'en ont pas) et demande un service d'envoi. La connexion actuelle (nom, prénom, date de naissance puis mot de passe choisi) reste simple et plus sûre.
2. **Un verrou transparent.** Le profil reste toujours consultable ; seul le téléversement du certificat attend un profil complet, avec un message du type « Complétons votre profil pour valoriser votre certificat ». L'employé voit la liste exacte de ce qui manque et un bouton vers chaque champ.
3. **Faire revenir les corrections dans le système RH.** Aujourd'hui les corrections restent dans le portail. Pour que le dossier soit vraiment assaini, il faut un **export des corrections validées** à réimporter dans le système RH (format à convenir avec la DIT).
4. **Règles dans le code d'abord, configurables ensuite.** Le lot 1 fixe les règles dans un tableau unique, lisible et commenté. Les rendre modifiables depuis l'administration (lot 4) a plus de sens une fois qu'elles sont stables.
5. **Péremption plus tard.** La date de dernière confirmation n'existe pas encore : elle commence au lancement. Une règle « non confirmé depuis 12 mois » ne joue donc pas avant un an ; elle peut attendre le lot 4.
6. **Héberger avant de lancer.** Serveur interne ou machine dédiée, nom de domaine de l'institution, tunnel Cloudflare **nommé** (ou accès par le réseau interne), disque chiffré (BitLocker), sauvegarde quotidienne de la base et des fichiers. SQLite suffit pour 500 employés.
7. **Conserver les données.** Toutes les évolutions **ajoutent** des tables ou des colonnes ; rien n'est supprimé. Les documents déjà reçus restent attachés à leur employé.

## 5. Plan priorisé

Chaque lot se termine par une démonstration et votre validation avant le lot suivant.

| Lot | Contenu | Livrables de la demande |
|---|---|---|
| **0. Cadrage** | **Nouvelles spécifications écrites à partir du besoin métier** (PRD, Solution Design, epics), sans reprendre les décisions du MVP et de la V2 ; réponses aux questions du §6 ; maquettes des écrans employé et administration. Le code existant est ensuite réutilisé là où il sert (connexion, lecture du CSV, contrôle des fichiers, comptes admin, tests) et retiré là où il ne sert plus | 2 |
| **1. Parcours « certificat »** | Page d'accueil (3 bénéfices, progression « dossier complet à 60 % ») ; règles de complétude ; checklist et verrou ; certificats multiples (titre, établissement, année, niveau, aperçu) repris de la V2 ; statut du certificat ; consentement et mention d'information | 3, 4, 5 (employés complet / incomplet) |
| **2. Traitement RH** | File de validation (visionneuse, Valider / Rejeter avec motifs, historique) ; tableau de bord enrichi (dossiers complets, certificats par statut, par agence et direction) ; filtres et export ; rôles Administrateur / Agent RH / Lecture seule ; journal d'audit ; export des corrections pour le système RH | 3, 4 |
| **3. Mise en service** | Hébergement stable, sauvegardes, chiffrement, limite sur l'identification ; test complet ; guide RH d'une page ; message de lancement aux employés | 6 |
| **4. Carrière et engagement** | « Ma carrière » complète (formations, expériences, compétences, déjà commencées) ; postes ouverts et éligibilité ; demandes de promotion ; relances ; règles configurables ; péremption et « Ces informations sont-elles toujours exactes ? » | 5 (employé avec champ périmé) |

**Effet sur la V2 en cours :** son développement est **en pause**. Les diplômes et certifications deviennent le centre du lot 1 ; formations, expériences, compétences et recherche de profils passent au lot 4. Trois règles de la V2 sont à revoir : pas de validation des justificatifs, administration en lecture seule, pas d'export.

## 6. Décisions qui vous appartiennent

Elles seront posées **une à une**, dans cet ordre, au lot 0.

| N° | Question |
|---|---|
| **Q1** | Quels champs sont **obligatoires** pour débloquer le certificat ? Niveau d'études et contact d'urgence n'existent pas dans l'export RH : faut-il les ajouter dans le portail ? Agence, poste et date d'embauche viennent du système RH : l'employé peut-il les **signaler comme faux** (à vérifier par les RH) plutôt que les modifier ? |
| **Q2** | **Qui valide** les certificats, et quelle est la liste des **motifs de rejet** ? |
| **Q3** | Quels **niveaux** de certificat (ex. Bac, Licence, Master, certification professionnelle) ? |
| **Q4** | Liste **officielle** des agences et des directions (l'export contient des codes d'agence et des noms de direction parfois mal encodés) ? |
| **Q5** | **Postes ouverts** : qui les saisit, et quels critères définissent l'éligibilité (diplôme, niveau, ancienneté, agence) ? |
| **Q6** | **Demandes de promotion** : existe-t-il un processus aujourd'hui, et doit-il passer par le portail ? |
| **Q7** | **Relances** : serveur email de l'institution, SMS ou WhatsApp ? |
| **Q8** | **Hébergement** : serveur interne disponible ? nom de domaine ? |
| **Q9** | **Charte graphique** : logo et couleurs de l'institution. |
| **Q10** | **Durée de péremption** d'une information (12 mois proposé). |

## 7. Prochaine étape

Valider ce plan (ou le modifier), puis répondre à **Q1**.
