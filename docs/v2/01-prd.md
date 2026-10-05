# PRD V2 — Parcours professionnel (gestion de carrière, incrément 1)

| | |
|---|---|
| **Entreprise** | ACME SA |
| **Document** | Product Requirements Document — V2, incrément 1 |
| **Version** | 1.2 — validé le 2026-10-05 (D-07 → D-18) |
| **Date** | 2026-10-05 |
| **Source** | `cahier_des_charges_portail_employes.md` v1.1 (§5 JTBD secondaire, §18, §19), `docs/01-prd.md` v1.0 (MVP) |
| **Prérequis** | MVP terminé (US-01 → US-24). **Aucun code V2 avant le test du directeur** (phase 6 du MVP). |
| **Méthode** | Spec-Driven Development : ce PRD → Solution Design V2 → epics E06, E07 → plan d'implémentation |

### Historique

| Version | Date | Changement |
|---|---|---|
| 1.0 | 2026-10-05 | Parcours de l'employé (3 rubriques), consultation par l'admin ; D-07 → D-12 validées |
| 1.1 | 2026-10-05 | Demande de l'utilisateur : l'administration doit **repérer les employés qui ont enrichi leur parcours** et **trouver ceux qui ont les compétences pour un poste**, afin de les contacter. Ajouts : rubrique « Compétences », filtre et compteur « parcours enrichi », recherche de profils (epic E07) |
| 1.2 | 2026-10-05 | Demande de l'utilisateur : l'administration doit aussi pouvoir **contacter tous les employés qui occupent un même poste**. Ajout : filtre « Poste actuel » dans la recherche de profils (F-43, US-35, D-18) |

---

## 1. Problème

Le MVP permet à l'employé de mettre son dossier à jour pendant une **campagne**. Ses documents (diplômes, certificats…) y sont de simples fichiers joints : ils ne disent ni quel diplôme, ni quand, ni où il a été obtenu. Ils ne peuvent plus être modifiés une fois la mise à jour envoyée.

L'employé n'a donc aucun endroit pour **tenir son parcours professionnel à jour** au fil du temps, et ACME SA n'a aucune vue structurée des qualifications de ses employés. Quand un poste est à pourvoir, l'administration ne peut pas savoir **quels employés ont les compétences requises**, ni lesquels se sont formés ou ont obtenu un nouveau diplôme.

> **JTBD employé (cahier des charges §5)** — Quand j'obtiens un nouveau diplôme, certificat ou document professionnel, je veux pouvoir l'ajouter à mon profil afin de conserver mon parcours professionnel à jour.

> **JTBD administration (v1.1, v1.2)** — Quand un poste est à pourvoir, ou qu'une information concerne un métier, je veux trouver rapidement les employés qui ont les compétences ou les qualifications demandées, ou qui occupent ce poste, et voir ceux qui ont récemment enrichi leur parcours, afin de les contacter.

## 2. Objectif de l'incrément

> Donner à chaque employé un espace **« Mon parcours »**, disponible **à tout moment**, où il déclare ses diplômes et certifications, ses formations, ses expériences professionnelles et ses compétences ; permettre à l'administration de les **consulter en lecture seule**, de **repérer les parcours enrichis** et de **rechercher les profils** correspondant à un poste, ou les employés qui **occupent** un poste, pour les **contacter**.

## 3. Décisions déjà prises (2026-10-05)

| Question | Décision |
|---|---|
| Rubriques | **Diplômes et certifications**, **Formations suivies**, **Expériences professionnelles**, **Compétences** (ajoutée en v1.1) |
| Historique interne ACME (postes, grades, agences successifs) | **Hors incrément** : le CSV ne donne que la situation actuelle |
| Qui saisit ? | **L'employé** ; l'administration **consulte** (lecture seule, comme en V1) |
| Validation par l'administration | **Non** : pas de statut « validé / refusé », pas de circuit d'approbation |
| Quand ? | **À tout moment**, indépendamment de la campagne de mise à jour (brouillon, envoi, statut `UPDATED` / `NOT_UPDATED` inchangés) |
| Recherche de profils (v1.1) | **Par mots-clés** dans tout le parcours (compétences, diplômes, formations, expériences) |
| Parcours enrichis (v1.1) | **Filtre** dans la liste des employés (avec date de dernière modification) et **compteur** au tableau de bord |
| Postes (v1.2) | L'administration peut aussi retrouver **tous les employés d'un même poste actuel** (poste du CSV) pour les contacter |
| Contact (v1.1) | **Téléphone et email** dans les résultats, avec liens pour appeler ou écrire ; **aucun export**, **aucun envoi** de message par le portail |
| Calendrier | Spécifications maintenant ; code **après** le test du directeur |

## 4. Utilisateurs

- **Employé** (persona Jean Joseph) : vient d'obtenir un certificat ; veut l'ajouter depuis son téléphone, avec la photo du justificatif, sans attendre une campagne. Il sait que son parcours peut lui ouvrir un nouveau poste.
- **Administrateur** : en consultant un dossier, veut voir les qualifications et l'expérience de l'employé, et ouvrir les justificatifs. Quand un poste est à pourvoir, veut la liste des employés qui ont les compétences demandées, avec de quoi les appeler ; veut aussi pouvoir joindre d'un coup tous les employés d'un même poste (ex. tous les caissiers).

## 5. Périmètre fonctionnel

Deux epics, numérotation à la suite du MVP :

- **E06 — Parcours professionnel** (côté employé, et consultation dans le dossier admin) ;
- **E07 — Recherche de profils** (côté administration).

| ID | Fonctionnalité | Priorité |
|---|---|---|
| F-32 | L'employé ouvre « Mon parcours » depuis son profil : quatre rubriques, éléments triés, message d'accueil quand une rubrique est vide, mention de la visibilité (D-17) | MUST |
| F-33 | **Diplômes et certifications** : ajouter, modifier, supprimer un élément (cf. §6) | MUST |
| F-34 | **Formations suivies** : ajouter, modifier, supprimer un élément | MUST |
| F-35 | **Expériences professionnelles** : ajouter, modifier, supprimer un élément | MUST |
| F-36 | Joindre **un justificatif** facultatif à un élément (PDF, JPG, PNG ; photo depuis le téléphone), le voir, le remplacer, le retirer | SHOULD |
| F-37 | L'administrateur consulte le parcours d'un employé dans son dossier (`/admin/employes/:id`), en lecture seule, et ouvre les justificatifs | MUST |
| F-38 | Validation des champs (obligatoires, longueurs, cohérence des dates) avec messages clairs près du champ | MUST |
| F-39 | **Compétences** : ajouter, modifier, supprimer une compétence avec son niveau (D-13) | MUST |
| F-40 | Liste des employés (admin) : filtre **« Parcours enrichi »**, date de dernière modification du parcours, tri du plus récent (D-14) | MUST |
| F-41 | Tableau de bord : carte **« Parcours enrichis »** (nombre d'employés, dont ceux des 7 derniers jours) menant à la liste filtrée (D-15) | SHOULD |
| F-42 | **Recherche de profils** par mots-clés dans le parcours ; chaque résultat montre ce qui correspond, le poste et l'agence actuels, le **téléphone** et l'**email** (liens d'appel et d'écriture) et mène au dossier (D-16) | MUST |
| F-43 | Filtre **« Poste actuel »** dans la recherche de profils : un ou plusieurs postes choisis dans la liste des postes du CSV ; seul, il donne **tous** les employés actifs de ces postes (avec ou sans parcours) ; combinable avec les mots-clés (D-18) | MUST |

### 5.1 Découpage en stories

| Epic | Story | Titre | Fonctionnalités | Priorité |
|---|---|---|---|---|
| E06 | US-25 | Consulter son parcours | F-32 | MUST |
| E06 | US-26 | Gérer ses diplômes et certifications | F-33, F-38 | MUST |
| E06 | US-27 | Gérer ses formations | F-34, F-38 | MUST |
| E06 | US-28 | Gérer ses expériences professionnelles | F-35, F-38 | MUST |
| E06 | US-29 | Joindre un justificatif à un élément du parcours | F-36 | SHOULD |
| E06 | US-30 | Consulter le parcours d'un employé (admin) | F-37 | MUST |
| E06 | US-31 | Gérer ses compétences | F-39, F-38 | MUST |
| E07 | US-32 | Filtrer les employés au parcours enrichi | F-40 | MUST |
| E07 | US-33 | Voir les parcours enrichis au tableau de bord | F-41 | SHOULD |
| E07 | US-34 | Rechercher des profils par compétences | F-42 | MUST |
| E07 | US-35 | Trouver les employés d'un même poste | F-43 | MUST |

Ordre proposé : US-25 + US-26 forment le **squelette** (écran, API, base, admin minimal). US-27, US-28 et US-31 réutilisent le même mécanisme, puis US-30, US-34, US-35, US-32, US-33 et enfin US-29.

## 6. Contenu des rubriques (validé, D-08 ; Compétences : D-13)

Champs marqués ✱ : obligatoires.

**Diplômes et certifications**

| Champ | Exemple | Remarque |
|---|---|---|
| Type ✱ | Diplôme / Certification | |
| Intitulé ✱ | Licence en sciences comptables | 2–150 caractères |
| Établissement ou organisme ✱ | Université d'État d'Haïti | 2–150 caractères |
| Date d'obtention ✱ | 06/2021 | Mois et année ; pas dans le futur |
| Date d'expiration | 06/2027 | Certification seulement ; postérieure à l'obtention |

**Formations suivies**

| Champ | Exemple | Remarque |
|---|---|---|
| Intitulé ✱ | Lutte contre le blanchiment | 2–150 caractères |
| Organisme ✱ | ACME SA (interne) | 2–150 caractères |
| Début ✱ | 03/2025 | Mois et année ; pas dans le futur |
| Fin | 04/2025 | Vide = en cours ; postérieure ou égale au début |
| Durée (heures) | 24 | Entier de 1 à 2 000 |

**Expériences professionnelles**

| Champ | Exemple | Remarque |
|---|---|---|
| Poste ✱ | Caissier | 2–150 caractères |
| Employeur ✱ | Banque XYZ | 2–150 caractères |
| Lieu | Cap-Haïtien | 0–100 caractères |
| Début ✱ | 01/2016 | Mois et année ; pas dans le futur |
| Fin | 12/2019 | Vide = poste actuel ; postérieure ou égale au début |
| Description | Accueil, opérations de caisse | 0–500 caractères |

**Compétences** (v1.1, D-13)

| Champ | Exemple | Remarque |
|---|---|---|
| Compétence ✱ | Analyse de crédit | 2–60 caractères ; une même compétence n'est pas saisie deux fois (sans tenir compte des majuscules ni des accents) |
| Niveau ✱ | Notions / Bon niveau / Expert | |

Pas de justificatif pour une compétence : elle se prouve par les diplômes, formations et expériences.

## 7. Règles métier

| ID | Règle |
|---|---|
| RM-V2-01 | Le parcours appartient à l'employé (`employee_id` = `id` du CSV) ; il n'est accessible que par `/api/me/*` côté employé. |
| RM-V2-02 | Le parcours est **indépendant de la campagne** : il ne modifie ni le brouillon, ni l'envoi, ni le statut `UPDATED` / `NOT_UPDATED`, ni les statistiques de la campagne. |
| RM-V2-03 | Ce que l'employé enregistre est **déclaratif** : le portail ne certifie rien (pas de validation officielle des diplômes, cahier §20). Les résultats de recherche le rappellent. |
| RM-V2-04 | L'administration **ne modifie jamais** le parcours (RM-10 inchangée). La recherche de profils est une consultation. |
| RM-V2-05 | Le CSV reste en lecture seule ; le parcours est enregistré dans la base du portail. |
| RM-V2-06 | La suppression d'un élément supprime aussi son justificatif (après confirmation). |
| RM-V2-07 | Un parcours est **enrichi** s'il contient au moins un élément. Sa **date de dernière modification** change à chaque ajout, modification, suppression ou changement de justificatif (D-14). |
| RM-V2-08 | La recherche de profils ne porte que sur les **employés actifs** et ne montre que des données déjà visibles par l'administration (parcours, poste, agence, téléphone et email à jour). Le filtre par poste s'appuie sur la colonne `position` du CSV, déjà affichée (liste blanche inchangée). |
| RM-V2-09 | Le contact se fait **hors du portail** (appel, email depuis l'appareil de l'administrateur) ; le portail n'envoie aucun message et n'exporte aucune liste. |

## 8. Exigences non fonctionnelles

Toutes les ENF du MVP s'appliquent (mobile-first, français, sécurité, Clean Architecture…). En plus :

| ID | Exigence |
|---|---|
| ENF-V2-01 | Nouveau module backend `career` en 4 couches ; il n'utilise les autres modules que par leurs ports ou cas d'utilisation (contrats import-linter mis à jour). |
| ENF-V2-02 | Justificatifs : mêmes contrôles que les documents (extension **et** signature, 5 Mo, redimensionnement des photos), servis uniquement par l'API après contrôle de session. |
| ENF-V2-03 | Écrans sans maquette Stitch : construits avec les composants et jetons existants, **avec une revue visuelle par l'utilisateur** (écrans employé). |
| ENF-V2-04 | Recherche de profils : réponse en moins d'une seconde pour les 364 employés actifs ; insensible aux majuscules et aux accents, saisie partielle acceptée (comme F-25). |

## 9. Hors périmètre de l'incrément 1

- Historique interne ACME (postes, grades, agences successifs).
- Validation ou refus par l'administration ; certification des diplômes.
- Langues (comme rubrique à part : une langue peut être saisie comme compétence), CV généré, export PDF.
- Fiches de poste enregistrées dans le portail, score de correspondance automatique.
- Filtres structurés dans la recherche (années d'expérience, certification encore valide…), filtre par agence ou par département.
- Regroupement automatique des variantes d'un même poste (ex. « Caissier » / « Caissière ») : l'administrateur coche les deux (D-18).
- Export de la liste des résultats ; envoi de messages (email, SMS) par le portail.
- Rappels d'expiration des certifications (notifications).
- Statistiques sur les qualifications au-delà de la carte « Parcours enrichis ».
- Reprise automatique des documents déjà envoyés pendant la campagne (cf. D-09).

## 10. Critères de succès

1. Depuis son téléphone, un employé ajoute un diplôme avec la photo du justificatif en moins de 2 minutes, **sans aide**.
2. Il modifie ou supprime un élément à tout moment, y compris après avoir envoyé sa mise à jour de campagne.
3. L'administrateur voit le parcours dans le dossier de l'employé et ouvre le justificatif ; il n'a aucun moyen de le modifier.
4. Le statut de campagne d'un employé et les statistiques de la campagne ne changent pas quand il modifie son parcours.
5. Un employé ne peut jamais voir ni modifier le parcours d'un autre.
6. Pour un poste donné (ex. « crédit »), l'administrateur obtient **en moins d'une minute** la liste des employés concernés et appelle l'un d'eux depuis le résultat.
7. L'administrateur voit, depuis le tableau de bord, les employés qui ont enrichi leur parcours, les plus récents en premier.
8. L'administrateur obtient la liste de **tous** les employés actifs d'un poste (ex. « Caissier » et « Caissière »), avec leur téléphone et leur email.

## 11. Décisions

| ID | Question | Décision (validée le 2026-10-05) |
|---|---|---|
| **D-07** | Précision des dates du parcours ? | ✅ **Validé** : **Mois et année** (`MM/AAAA`) : les employés se souviennent rarement du jour exact. |
| **D-08** | Les champs du §6 conviennent-ils ? | ✅ **Validé** : champs du §6 tels quels ; un champ ajouté plus tard fera l'objet d'une nouvelle story. |
| **D-09** | Lien avec les documents envoyés pendant la campagne (« Mes documents ») ? | ✅ **Validé** : **Aucun lien dans l'incrément 1** : le justificatif est rangé avec l'élément du parcours, pas dans « Mes documents ». Cela évite de mélanger les règles de la campagne (10 documents, suppression bloquée après envoi) avec un espace modifiable à tout moment. |
| **D-10** | Nombre maximal d'éléments ? | ✅ **Validé** : **30 par rubrique**, un justificatif par élément : assez pour tout le monde et protège le disque. |
| **D-11** | Visibilité pour l'administration ? | ✅ **Validé** : **Immédiate** : il n'y a pas de brouillon ; chaque élément affiche « Ajouté le / Modifié le ». |
| **D-12** | Accès à « Mon parcours » ? | ✅ **Validé** : Une carte « Mon parcours » sur le profil, à côté de « Mes documents », et une entrée dans le menu de l'avatar. |
| **D-13** | Champs d'une compétence ? | ✅ **Validé** : intitulé libre (2–60 caractères) + niveau à 3 choix (**Notions / Bon niveau / Expert**) ; pas de liste imposée de compétences (une liste fermée serait plus propre pour la recherche, mais ACME devrait la fournir et la tenir à jour). |
| **D-14** | Qu'est-ce qu'un « parcours enrichi » ? | ✅ **Validé** : au moins un élément dans le parcours ; la liste admin affiche la **date de dernière modification** et, avec ce filtre, trie du plus récent au plus ancien (RM-V2-07). |
| **D-15** | Que compte la carte du tableau de bord ? | ✅ **Validé** : « **N** parcours enrichis », avec « dont **X** ces 7 derniers jours » ; un clic ouvre la liste filtrée et triée. |
| **D-16** | Comment se fait la recherche de profils ? | ✅ **Validé** : un **écran dédié** « Rechercher des profils » (`/admin/profils`), distinct de la recherche par nom de la liste. Plusieurs mots = **tous** doivent se retrouver dans le parcours (ex. « crédit anglais »). Les mots-clés portent sur ce que l'employé a déclaré ; le poste actuel (CSV) a son propre filtre (D-18). Résultats : employés dont le parcours a le plus d'éléments correspondants en premier, puis par nom. |
| **D-17** | L'employé doit-il savoir que l'administration peut le contacter à partir de son parcours ? | ✅ **Validé** : **oui**, une phrase en haut de « Mon parcours » : « Votre parcours est visible par l'administration d'ACME SA, qui peut vous contacter pour des opportunités internes. » |
| **D-18** | Comment retrouver les employés d'un même poste ? | ✅ **Validé** : dans l'écran « Rechercher des profils », un filtre **« Poste actuel »** à **choix multiple**, alimenté par les postes distincts des employés actifs du CSV (avec le nombre d'employés par poste, et un champ pour filtrer cette liste). Choix multiple, parce que le CSV écrit parfois un même métier de plusieurs façons (« Caissier », « Caissière ») : le portail ne les fusionne pas lui-même. Poste seul → tous les employés de ces postes, par nom ; poste + mots-clés → ceux de ces postes dont le parcours correspond. |

## 12. Documents suivants

Tous dans `docs/v2/` :

1. `02-solution-design.md` : module `career`, tables, API, écrans ; mis à jour pour la v1.1 (recherche, compétences, parcours enrichis).
2. `epics/E06-parcours/` (US-25 → US-31) et `epics/E07-recherche-profils/` (US-32 → US-35) au format habituel (critères Étant donné / Quand / Alors, tests T-xx.y).
3. `03-plan-implementation.md` : **phase 7**, à démarrer après le test du directeur.
