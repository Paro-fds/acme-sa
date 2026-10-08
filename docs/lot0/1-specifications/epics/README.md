# Epics et user stories de la refonte

| | |
|---|---|
| **Version** | 0.1, 2026-10-07 — première rédaction, à relire avec les maquettes puis à valider par M. Hilaire |
| **Source** | `../cahier-des-charges.md` (exigences EF, ENF), `../tableau-unique-des-regles.md` (RG), `../decisions-a-valider.md` (D) |
| **Numérotation** | Une story porte le numéro de son epic, comme les exigences : US-301 = 1re story de l'epic D3 (EF-301…). Elle est **indépendante** des US-01 → US-35 du MVP et de la V2 (`docs/epics/`) |

10 epics, 40 user stories. Chaque fichier de story contient le récit, le pourquoi, les critères d'acceptation et la Definition of Done.

## Plan par lots

Une story appartient au lot où elle est livrée ; quand un complément arrive plus tard, il est indiqué entre parenthèses.

### Démonstrateur

**But :** Montrer tôt à la direction générale ce qui se construit, sur données fictives. **Démonstration de fin :** Parcours de 5 minutes, en ligne (plan du démonstrateur).

| Story | Epic | Titre | Priorité | Complément plus tard |
|---|---|---|---|---|
| [US-001](D0-socle-et-mise-en-service/US-001-mettre-en-ligne-un-socle-deployable.md) | D0 | Mettre en ligne un socle déployable | Must | — |

### Lot 1 — Parcours « certificat »

**But :** Un employé complète son profil et dépose ses certificats. **Démonstration de fin :** Un employé au dossier complet et un au dossier incomplet, en recette.

| Story | Epic | Titre | Priorité | Complément plus tard |
|---|---|---|---|---|
| [US-101](D1-acces-et-compte/US-101-me-connecter-sans-adresse-email.md) | D1 | Me connecter sans adresse email | Must | — |
| [US-201](D2-dossier-de-l-employe/US-201-voir-mon-dossier-et-ma-progression.md) | D2 | Voir mon dossier et ma progression | Must | — |
| [US-202](D2-dossier-de-l-employe/US-202-completer-mes-coordonnees.md) | D2 | Compléter mes coordonnées | Must | — |
| [US-203](D2-dossier-de-l-employe/US-203-confirmer-ou-signaler-mon-agence-mon-poste-ma-date-d-embauch.md) | D2 | Confirmer ou signaler mon agence, mon poste, ma date d'embauche | Must (Should pour la cohérence) | — |
| [US-204](D2-dossier-de-l-employe/US-204-savoir-ce-qui-me-reste-avant-de-deposer.md) | D2 | Savoir ce qui me reste avant de déposer | Must | — |
| [US-301](D3-certificats/US-301-deposer-un-certificat-depuis-mon-telephone.md) | D3 | Déposer un certificat depuis mon téléphone | Must | antivirus et stockage chiffré au lot 3, avec US-002 |
| [US-302](D3-certificats/US-302-savoir-ce-que-mon-certificat-m-apporte.md) | D3 | Savoir ce que mon certificat m'apporte | Must (Should pour « ce que ça débloque » et l'avis) | — |
| [US-303](D3-certificats/US-303-suivre-mon-certificat.md) | D3 | Suivre mon certificat | Must | « À corriger » et redépôt au lot 2 |
| [US-501](D5-referentiel-des-unites/US-501-tenir-le-referentiel-officiel.md) | D5 | Tenir le référentiel officiel | Must (Should pour l'interface) | interface de gestion au lot 4 |
| [US-502](D5-referentiel-des-unites/US-502-rattacher-les-valeurs-inconnues.md) | D5 | Rattacher les valeurs inconnues | Must | — |
| [US-605](D6-pilotage/US-605-mesurer-si-les-employes-reviennent.md) | D6 | Mesurer si les employés reviennent | Must (Should pour l'avis) | — |
| [US-701](D7-notifications/US-701-etre-prevenu-par-le-bon-canal.md) | D7 | Être prévenu par le bon canal | Must (Should pour l'ordre des canaux) | — |
| [US-702](D7-notifications/US-702-etre-relance-sans-etre-harcele.md) | D7 | Être relancé sans être harcelé | Should | — |

### Lot 2 — Traitement RH

**But :** Les RH valident, pilotent et enregistrent les demandes. **Démonstration de fin :** File de validation et tableau de bord sur données fictives.

| Story | Epic | Titre | Priorité | Complément plus tard |
|---|---|---|---|---|
| [US-103](D1-acces-et-compte/US-103-donner-un-role-a-chaque-compte-rh.md) | D1 | Donner un rôle à chaque compte RH | Must | — |
| [US-104](D1-acces-et-compte/US-104-gerer-les-comptes-et-debloquer-un-employe.md) | D1 | Gérer les comptes et débloquer un employé | Must | — |
| [US-304](D3-certificats/US-304-garder-la-preuve-des-certificats.md) | D3 | Garder la preuve des certificats | Must | — |
| [US-305](D3-certificats/US-305-un-niveau-d-etudes-prouve.md) | D3 | Un niveau d'études prouvé | Should | — |
| [US-401](D4-validation-rh/US-401-prendre-le-dossier-suivant.md) | D4 | Prendre le dossier suivant | Must (Should pour la réaffectation) | — |
| [US-402](D4-validation-rh/US-402-examiner-et-decider.md) | D4 | Examiner et décider | Must | — |
| [US-403](D4-validation-rh/US-403-traiter-les-signalements.md) | D4 | Traiter les signalements | Must | — |
| [US-601](D6-pilotage/US-601-voir-l-etat-des-dossiers-d-un-coup-d-il.md) | D6 | Voir l'état des dossiers d'un coup d'œil | Must | — |
| [US-602](D6-pilotage/US-602-trouver-les-employes-qualifies-en-une-minute.md) | D6 | Trouver les employés qualifiés en une minute | Must | — |
| [US-603](D6-pilotage/US-603-exporter-une-liste.md) | D6 | Exporter une liste | Should | — |
| [US-604](D6-pilotage/US-604-rendre-compte-de-chaque-action.md) | D6 | Rendre compte de chaque action | Must | — |
| [US-901](D9-demandes-et-mouvements-de-carriere/US-901-enregistrer-une-demande-recue-par-lettre.md) | D9 | Enregistrer une demande reçue par lettre | Must | — |
| [US-903](D9-demandes-et-mouvements-de-carriere/US-903-controler-les-mouvements-lus-dans-les-lettres.md) | D9 | Contrôler les mouvements lus dans les lettres | Should (Must pour l'ancienneté) | ancienneté dans le poste au lot 4 |
| [US-904](D9-demandes-et-mouvements-de-carriere/US-904-reprendre-l-historique-des-demandes.md) | D9 | Reprendre l'historique des demandes | Should | — |

### Lot 3 — Mise en service

**But :** Le portail est hébergé, sécurisé et annoncé. **Démonstration de fin :** Test complet en recette ; guide RH ; message de lancement ; ouverture aux employés.

| Story | Epic | Titre | Priorité | Complément plus tard |
|---|---|---|---|---|
| [US-002](D0-socle-et-mise-en-service/US-002-heberger-la-production-en-securite.md) | D0 | Héberger la production en sécurité | Must | — |
| [US-003](D0-socle-et-mise-en-service/US-003-former-les-rh-avec-un-guide-d-une-page.md) | D0 | Former les RH avec un guide d'une page | Must | — |
| [US-102](D1-acces-et-compte/US-102-choisir-ma-double-authentification.md) | D1 | Choisir ma double authentification | Must | — |
| [US-703](D7-notifications/US-703-annoncer-le-portail-et-les-postes-ouverts.md) | D7 | Annoncer le portail et les postes ouverts | Must (Should pour le résumé) | résumé des postes au lot 4 |

### Lot 4 — Carrière et engagement

**But :** L'employé voit ses postes éligibles et suit ses demandes. **Démonstration de fin :** Un employé avec un champ périmé ; un poste publié avec indicateurs vert et orange.

| Story | Epic | Titre | Priorité | Complément plus tard |
|---|---|---|---|---|
| [US-205](D2-dossier-de-l-employe/US-205-confirmer-mes-informations-chaque-annee.md) | D2 | Confirmer mes informations chaque année | Must | — |
| [US-606](D6-pilotage/US-606-changer-une-regle-sans-developpeur.md) | D6 | Changer une règle sans développeur | Should | — |
| [US-801](D8-carriere-et-postes/US-801-voir-les-postes-auxquels-je-suis-eligible.md) | D8 | Voir les postes auxquels je suis éligible | Must | — |
| [US-802](D8-carriere-et-postes/US-802-publier-un-poste.md) | D8 | Publier un poste | Must (Should pour la confidentialité) | — |
| [US-803](D8-carriere-et-postes/US-803-ajouter-mes-formations-et-experiences.md) | D8 | Ajouter mes formations et expériences | Should | — |
| [US-902](D9-demandes-et-mouvements-de-carriere/US-902-deposer-et-suivre-ma-demande-en-ligne.md) | D9 | Déposer et suivre ma demande en ligne | Must | — |

### Lot distinct — Lettres et retour au système RH

**But :** Le portail produit les lettres et renvoie les mouvements. **Démonstration de fin :** À préciser.

| Story | Epic | Titre | Priorité | Complément plus tard |
|---|---|---|---|---|
| [US-905](D9-demandes-et-mouvements-de-carriere/US-905-produire-les-lettres-de-promotion.md) | D9 | Produire les lettres de promotion | Could (à préciser) | — |
| [US-906](D9-demandes-et-mouvements-de-carriere/US-906-renvoyer-les-mouvements-au-systeme-rh.md) | D9 | Renvoyer les mouvements au système RH | Could (à préciser) | — |

### Enchaînements à respecter

| Avant | Après | Pourquoi |
|---|---|---|
| Référentiel validé (US-501) | Lot 1 en recette | L'employé voit les libellés officiels |
| Dépôt (US-301) | Validation (US-401, US-402) | Rien à valider sans dépôt |
| Certificats validés, mouvements contrôlés (lot 2) | Éligibilité (US-801) | L'éligibilité ne compte que les données validées |
| Hébergement sécurisé (US-002) | Données réelles, ouverture aux employés | Aucune donnée réelle hors production sécurisée |
| Socle déployable (US-001) | Démonstrateur, puis chaque lot en recette | Chaque story se montre en ligne dès qu'elle est finie |

### Le démonstrateur pioche dans plusieurs lots

Parcours du démonstrateur (`../../9-demonstrateur/plan-demonstrateur.md`) : US-001 → US-101, US-201, US-202, US-301 (lot 1) → US-401, US-402 (lot 2) → US-601 (lot 2) → US-901 (lot 2) → US-801 (lot 4). Une story montrée au démonstrateur garde son statut « Pas encore » tant que sa Definition of Done n'est pas cochée.

## Epics

| Epic | Objectif | Stories | Lots |
|---|---|:---:|---|
| [D0 Socle et mise en service](D0-socle-et-mise-en-service/README.md) | Le portail tourne en ligne, sécurisé, sauvegardé, et les RH savent s'en servir. | 3 | 0, 3 |
| [D1 Accès et compte](D1-acces-et-compte/README.md) | Chacun entre dans le portail simplement, et les comptes RH sont fortement protégés. | 4 | 1, 2, 3 |
| [D2 Dossier de l'employé](D2-dossier-de-l-employe/README.md) | Chaque employé complète et confirme son dossier lui-même, en quelques minutes. | 5 | 1, 4 |
| [D3 Certificats](D3-certificats/README.md) | L'employé fait valoir ses qualifications en déposant ses certificats et suit leur sort. | 5 | 1, 2 |
| [D4 Validation RH](D4-validation-rh/README.md) | Les RH valident vite, sans conflit d'intérêts, et chaque décision se justifie. | 3 | 2 |
| [D5 Référentiel des unités](D5-referentiel-des-unites/README.md) | Chaque employé est rattaché à la bonne agence, région et direction. | 2 | 1, 4 |
| [D6 Pilotage](D6-pilotage/README.md) | La direction et les RH savent qui est qualifié, où, et où en sont les dossiers. | 6 | 1, 2, 4 |
| [D7 Notifications](D7-notifications/README.md) | L'employé est prévenu au bon moment, par le canal qu'il utilise, sans être harcelé. | 3 | 1, 3, 4 |
| [D8 Carrière et postes](D8-carriere-et-postes/README.md) | L'employé voit les postes ouverts auxquels il est éligible et ce qui lui manque. | 3 | 4 |
| [D9 Demandes et mouvements de carrière](D9-demandes-et-mouvements-de-carriere/README.md) | Les demandes de promotion et de mobilité sont enregistrées, suivies et traitées plus vite. | 6 | 2, 4, lot distinct |

## Statuts

| Statut | Signification |
|---|---|
| **Pas encore** | Aucun code écrit |
| **En cours** | Commencée |
| **Fait** | Tous les critères d'acceptation couverts par des tests verts, Definition of Done cochée |
