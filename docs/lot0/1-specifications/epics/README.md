# Epics et user stories de la refonte

| | |
|---|---|
| **Version** | 0.1, 2026-10-07 — première rédaction, à relire avec les maquettes puis à valider par M. Hilaire |
| **Source** | `../cahier-des-charges.md` (exigences EF, ENF), `../tableau-unique-des-regles.md` (RG), `../decisions-a-valider.md` (D) |
| **Numérotation** | Une story porte le numéro de son epic, comme les exigences : US-301 = 1re story de l'epic D3 (EF-301…). Elle est **indépendante** des US-01 → US-35 du MVP et de la V2, retirées de la branche `v2` le 2026-10-08 (historique git, branche `main`) |
| **Statuts** | Cet index est la source de vérité des statuts ; le fichier de chaque story et `agent.md` §0 les reprennent |

10 epics, 45 user stories. Chaque fichier de story contient le récit, le pourquoi, les critères d'acceptation et la Definition of Done.

## Plan par lots

Une story appartient au lot où elle est livrée ; quand un complément arrive plus tard, il est indiqué entre parenthèses.

### [Démonstrateur](demonstrateur/README.md)

**But :** Montrer tôt à la direction générale ce qui se construit, sur données fictives. **Démonstration de fin :** Parcours de 5 minutes, en ligne (plan du démonstrateur).

| Story | Epic | Titre | Priorité | Complément plus tard | Statut |
|---|---|---|---|---|---|
| [US-001](demonstrateur/US-001-mettre-en-ligne-un-socle-deployable.md) | D0 | Mettre en ligne un socle déployable | Must | — | Fait |

### [Lot 1 — Parcours « certificat »](lot-1-parcours-certificat/README.md)

**But :** Un employé complète son profil et dépose ses certificats. **Démonstration de fin :** Un employé au dossier complet et un au dossier incomplet, en recette.

| Story | Epic | Titre | Priorité | Complément plus tard | Statut |
|---|---|---|---|---|---|
| [US-101](lot-1-parcours-certificat/US-101-me-connecter-sans-adresse-email.md) | D1 | Me connecter sans adresse email | Must | — | Fait |
| [US-105](lot-1-parcours-certificat/US-105-decouvrir-le-portail-avant-de-me-connecter.md) | D1 | Découvrir le portail avant de me connecter | Must | — | Fait |
| [US-201](lot-1-parcours-certificat/US-201-voir-mon-dossier-et-ma-progression.md) | D2 | Voir mon dossier et ma progression | Must | — | Fait |
| [US-202](lot-1-parcours-certificat/US-202-completer-mes-coordonnees.md) | D2 | Compléter mes coordonnées | Must | — | Fait |
| [US-203](lot-1-parcours-certificat/US-203-confirmer-ou-signaler-mon-agence-mon-poste-ma-date-d-embauch.md) | D2 | Confirmer ou signaler mon agence, mon poste, ma date d'embauche | Must (Should pour la cohérence) | — | Fait |
| [US-204](lot-1-parcours-certificat/US-204-savoir-ce-qui-me-reste-avant-de-deposer.md) | D2 | Savoir ce qui me reste avant de déposer | Must | — | Fait |
| [US-206](lot-1-parcours-certificat/US-206-retirer-l-ancien-parcours-de-mise-a-jour.md) | D2 | Retirer l'ancien parcours de mise à jour | Must | — | Fait |
| [US-207](lot-1-parcours-certificat/US-207-aligner-l-espace-employe-sur-les-ecrans-valides.md) | D2 | Aligner l'espace employé sur les écrans validés | Must | — | Fait |
| [US-301](lot-1-parcours-certificat/US-301-deposer-un-certificat-depuis-mon-telephone.md) | D3 | Déposer un certificat depuis mon téléphone | Must | antivirus et stockage chiffré au lot 3, avec US-002 | Fait |
| [US-302](lot-1-parcours-certificat/US-302-savoir-ce-que-mon-certificat-m-apporte.md) | D3 | Savoir ce que mon certificat m'apporte | Must (Should pour « ce que ça débloque » et l'avis) | — | Fait |
| [US-303](lot-1-parcours-certificat/US-303-suivre-mon-certificat.md) | D3 | Suivre mon certificat | Must | « À corriger » et redépôt au lot 2 ; notification avec US-701 | Fait |
| [US-501](lot-1-parcours-certificat/US-501-tenir-le-referentiel-officiel.md) | D5 | Tenir le référentiel officiel | Must (Should pour l'interface) | interface de gestion au lot 4 | Fait |
| [US-502](lot-1-parcours-certificat/US-502-rattacher-les-valeurs-inconnues.md) | D5 | Rattacher les valeurs inconnues | Must | — | Fait |
| [US-605](lot-1-parcours-certificat/US-605-mesurer-si-les-employes-reviennent.md) | D6 | Mesurer si les employés reviennent | Must (Should pour l'avis) | — | Fait |
| [US-701](lot-1-parcours-certificat/US-701-etre-prevenu-par-le-bon-canal.md) | D7 | Être prévenu par le bon canal | Must (Should pour l'ordre des canaux) | — | Pas encore |
| [US-702](lot-1-parcours-certificat/US-702-etre-relance-sans-etre-harcele.md) | D7 | Être relancé sans être harcelé | Should | — | Pas encore |

### [Lot 2 — Traitement RH](lot-2-traitement-rh/README.md)

**But :** Les RH valident, pilotent et enregistrent les demandes. **Démonstration de fin :** File de validation et tableau de bord sur données fictives.

| Story | Epic | Titre | Priorité | Complément plus tard | Statut |
|---|---|---|---|---|---|
| [US-103](lot-2-traitement-rh/US-103-donner-un-role-a-chaque-compte-rh.md) | D1 | Donner un rôle à chaque compte RH | Must | — | Pas encore |
| [US-104](lot-2-traitement-rh/US-104-gerer-les-comptes-et-debloquer-un-employe.md) | D1 | Gérer les comptes et débloquer un employé | Must | — | Pas encore |
| [US-304](lot-2-traitement-rh/US-304-garder-la-preuve-des-certificats.md) | D3 | Garder la preuve des certificats | Must | — | Pas encore |
| [US-305](lot-2-traitement-rh/US-305-un-niveau-d-etudes-prouve.md) | D3 | Un niveau d'études prouvé | Should | — | Pas encore |
| [US-401](lot-2-traitement-rh/US-401-prendre-le-dossier-suivant.md) | D4 | Prendre le dossier suivant | Must (Should pour la réaffectation) | — | Pas encore |
| [US-402](lot-2-traitement-rh/US-402-examiner-et-decider.md) | D4 | Examiner et décider | Must | — | Pas encore |
| [US-403](lot-2-traitement-rh/US-403-traiter-les-signalements.md) | D4 | Traiter les signalements | Must | — | Pas encore |
| [US-601](lot-2-traitement-rh/US-601-voir-l-etat-des-dossiers-d-un-coup-d-il.md) | D6 | Voir l'état des dossiers d'un coup d'œil | Must | — | Pas encore |
| [US-602](lot-2-traitement-rh/US-602-trouver-les-employes-qualifies-en-une-minute.md) | D6 | Trouver les employés qualifiés en une minute | Must | — | Pas encore |
| [US-603](lot-2-traitement-rh/US-603-exporter-une-liste.md) | D6 | Exporter une liste | Should | — | Pas encore |
| [US-604](lot-2-traitement-rh/US-604-rendre-compte-de-chaque-action.md) | D6 | Rendre compte de chaque action | Must | — | Pas encore |
| [US-901](lot-2-traitement-rh/US-901-enregistrer-une-demande-recue-par-lettre.md) | D9 | Enregistrer une demande reçue par lettre | Must | — | Pas encore |
| [US-903](lot-2-traitement-rh/US-903-controler-les-mouvements-lus-dans-les-lettres.md) | D9 | Contrôler les mouvements lus dans les lettres | Should (Must pour l'ancienneté) | ancienneté dans le poste au lot 4 | Pas encore |
| [US-904](lot-2-traitement-rh/US-904-reprendre-l-historique-des-demandes.md) | D9 | Reprendre l'historique des demandes | Should | — | Pas encore |

### [Lot 3 — Mise en service](lot-3-mise-en-service/README.md)

**But :** Le portail est hébergé, sécurisé et annoncé. **Démonstration de fin :** Test complet en recette ; guide RH ; message de lancement ; ouverture aux employés.

| Story | Epic | Titre | Priorité | Complément plus tard | Statut |
|---|---|---|---|---|---|
| [US-002](lot-3-mise-en-service/US-002-heberger-la-production-en-securite.md) | D0 | Héberger la production en sécurité | Must | — | Pas encore |
| [US-003](lot-3-mise-en-service/US-003-former-les-rh-avec-un-guide-d-une-page.md) | D0 | Former les RH avec un guide d'une page | Must | — | Pas encore |
| [US-102](lot-3-mise-en-service/US-102-choisir-ma-double-authentification.md) | D1 | Choisir ma double authentification | Must | — | En cours |
| [US-106](lot-3-mise-en-service/US-106-proteger-mon-acces-par-une-double-authentification.md) | D1 | Protéger mon accès par une double authentification | Must | — | Pas encore |
| [US-703](lot-3-mise-en-service/US-703-annoncer-le-portail-et-les-postes-ouverts.md) | D7 | Annoncer le portail et les postes ouverts | Must (Should pour le résumé) | résumé des postes au lot 4 | Pas encore |

### [Lot 4 — Carrière et engagement](lot-4-carriere-et-engagement/README.md)

**But :** L'employé voit ses postes éligibles et suit ses demandes. **Démonstration de fin :** Un employé avec un champ périmé ; un poste publié avec indicateurs vert et orange.

| Story | Epic | Titre | Priorité | Complément plus tard | Statut |
|---|---|---|---|---|---|
| [US-205](lot-4-carriere-et-engagement/US-205-confirmer-mes-informations-chaque-annee.md) | D2 | Confirmer mes informations chaque année | Must | — | Pas encore |
| [US-503](lot-4-carriere-et-engagement/US-503-gerer-le-referentiel-a-l-ecran.md) | D5 | Gérer le référentiel à l'écran | Should | — | Pas encore |
| [US-606](lot-4-carriere-et-engagement/US-606-changer-une-regle-sans-developpeur.md) | D6 | Changer une règle sans développeur | Should | — | Pas encore |
| [US-801](lot-4-carriere-et-engagement/US-801-voir-les-postes-auxquels-je-suis-eligible.md) | D8 | Voir les postes auxquels je suis éligible | Must | — | Pas encore |
| [US-802](lot-4-carriere-et-engagement/US-802-publier-un-poste.md) | D8 | Publier un poste | Must (Should pour la confidentialité) | — | Pas encore |
| [US-803](lot-4-carriere-et-engagement/US-803-ajouter-mes-formations-et-experiences.md) | D8 | Ajouter mes formations et expériences | Should | — | Pas encore |
| [US-902](lot-4-carriere-et-engagement/US-902-deposer-et-suivre-ma-demande-en-ligne.md) | D9 | Déposer et suivre ma demande en ligne | Must | — | Pas encore |

### [Lot distinct — Lettres et retour au système RH](lot-distinct-lettres-et-systeme-rh/README.md)

**But :** Le portail produit les lettres et renvoie les mouvements. **Démonstration de fin :** À préciser.

| Story | Epic | Titre | Priorité | Complément plus tard | Statut |
|---|---|---|---|---|---|
| [US-905](lot-distinct-lettres-et-systeme-rh/US-905-produire-les-lettres-de-promotion.md) | D9 | Produire les lettres de promotion | Could (à préciser) | — | Pas encore |
| [US-906](lot-distinct-lettres-et-systeme-rh/US-906-renvoyer-les-mouvements-au-systeme-rh.md) | D9 | Renvoyer les mouvements au système RH | Could (à préciser) | — | Pas encore |

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

Un epic regroupe les stories d'un même bloc fonctionnel, souvent sur plusieurs lots ; chaque story indique son epic dans son en-tête.

| Epic | Objectif | Pourquoi | Stories |
|---|---|---|---|
| D0 Socle et mise en service | Le portail tourne en ligne, sécurisé, sauvegardé, et les RH savent s'en servir. | Sans socle fiable, aucune donnée réelle ne peut entrer (Aucune donnée réelle hors production sécurisée) et la direction ne voit rien fonctionner. | [US-001](demonstrateur/US-001-mettre-en-ligne-un-socle-deployable.md), [US-002](lot-3-mise-en-service/US-002-heberger-la-production-en-securite.md), [US-003](lot-3-mise-en-service/US-003-former-les-rh-avec-un-guide-d-une-page.md) |
| D1 Accès et compte | Chacun entre dans le portail simplement, et les comptes RH sont fortement protégés. | Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés. | [US-101](lot-1-parcours-certificat/US-101-me-connecter-sans-adresse-email.md), [US-102](lot-3-mise-en-service/US-102-choisir-ma-double-authentification.md), [US-103](lot-2-traitement-rh/US-103-donner-un-role-a-chaque-compte-rh.md), [US-104](lot-2-traitement-rh/US-104-gerer-les-comptes-et-debloquer-un-employe.md), [US-105](lot-1-parcours-certificat/US-105-decouvrir-le-portail-avant-de-me-connecter.md), [US-106](lot-3-mise-en-service/US-106-proteger-mon-acces-par-une-double-authentification.md) |
| D2 Dossier de l'employé | Chaque employé complète et confirme son dossier lui-même, en quelques minutes. | Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet. | [US-201](lot-1-parcours-certificat/US-201-voir-mon-dossier-et-ma-progression.md), [US-202](lot-1-parcours-certificat/US-202-completer-mes-coordonnees.md), [US-203](lot-1-parcours-certificat/US-203-confirmer-ou-signaler-mon-agence-mon-poste-ma-date-d-embauch.md), [US-204](lot-1-parcours-certificat/US-204-savoir-ce-qui-me-reste-avant-de-deposer.md), [US-205](lot-4-carriere-et-engagement/US-205-confirmer-mes-informations-chaque-annee.md), [US-206](lot-1-parcours-certificat/US-206-retirer-l-ancien-parcours-de-mise-a-jour.md), [US-207](lot-1-parcours-certificat/US-207-aligner-l-espace-employe-sur-les-ecrans-valides.md) |
| D3 Certificats | L'employé fait valoir ses qualifications en déposant ses certificats et suit leur sort. | Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH. | [US-301](lot-1-parcours-certificat/US-301-deposer-un-certificat-depuis-mon-telephone.md), [US-302](lot-1-parcours-certificat/US-302-savoir-ce-que-mon-certificat-m-apporte.md), [US-303](lot-1-parcours-certificat/US-303-suivre-mon-certificat.md), [US-304](lot-2-traitement-rh/US-304-garder-la-preuve-des-certificats.md), [US-305](lot-2-traitement-rh/US-305-un-niveau-d-etudes-prouve.md) |
| D4 Validation RH | Les RH valident vite, sans conflit d'intérêts, et chaque décision se justifie. | Un certificat ne vaut que validé ; délai cible 5 jours ouvrables (Q2). | [US-401](lot-2-traitement-rh/US-401-prendre-le-dossier-suivant.md), [US-402](lot-2-traitement-rh/US-402-examiner-et-decider.md), [US-403](lot-2-traitement-rh/US-403-traiter-les-signalements.md) |
| D5 Référentiel des unités | Chaque employé est rattaché à la bonne agence, région et direction. | Sans libellés officiels, les recherches et tableaux de bord par région sont faux (critère n°1). | [US-501](lot-1-parcours-certificat/US-501-tenir-le-referentiel-officiel.md), [US-502](lot-1-parcours-certificat/US-502-rattacher-les-valeurs-inconnues.md), [US-503](lot-4-carriere-et-engagement/US-503-gerer-le-referentiel-a-l-ecran.md) |
| D6 Pilotage | La direction et les RH savent qui est qualifié, où, et où en sont les dossiers. | Critère de réussite n°1 : une liste de candidats qualifiés en une minute ; décisions traçables. | [US-601](lot-2-traitement-rh/US-601-voir-l-etat-des-dossiers-d-un-coup-d-il.md), [US-602](lot-2-traitement-rh/US-602-trouver-les-employes-qualifies-en-une-minute.md), [US-603](lot-2-traitement-rh/US-603-exporter-une-liste.md), [US-604](lot-2-traitement-rh/US-604-rendre-compte-de-chaque-action.md), [US-605](lot-1-parcours-certificat/US-605-mesurer-si-les-employes-reviennent.md), [US-606](lot-4-carriere-et-engagement/US-606-changer-une-regle-sans-developpeur.md) |
| D7 Notifications | L'employé est prévenu au bon moment, par le canal qu'il utilise, sans être harcelé. | Un quart des employés n'ont pas d'email ; WhatsApp touche presque tout le monde (Q7). | [US-701](lot-1-parcours-certificat/US-701-etre-prevenu-par-le-bon-canal.md), [US-702](lot-1-parcours-certificat/US-702-etre-relance-sans-etre-harcele.md), [US-703](lot-3-mise-en-service/US-703-annoncer-le-portail-et-les-postes-ouverts.md) |
| D8 Carrière et postes | L'employé voit les postes ouverts auxquels il est éligible et ce qui lui manque. | Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes. | [US-801](lot-4-carriere-et-engagement/US-801-voir-les-postes-auxquels-je-suis-eligible.md), [US-802](lot-4-carriere-et-engagement/US-802-publier-un-poste.md), [US-803](lot-4-carriere-et-engagement/US-803-ajouter-mes-formations-et-experiences.md) |
| D9 Demandes et mouvements de carrière | Les demandes de promotion et de mobilité sont enregistrées, suivies et traitées plus vite. | Critère de réussite n°2 : une demande traitée en quelques jours au lieu de quelques semaines. | [US-901](lot-2-traitement-rh/US-901-enregistrer-une-demande-recue-par-lettre.md), [US-902](lot-4-carriere-et-engagement/US-902-deposer-et-suivre-ma-demande-en-ligne.md), [US-903](lot-2-traitement-rh/US-903-controler-les-mouvements-lus-dans-les-lettres.md), [US-904](lot-2-traitement-rh/US-904-reprendre-l-historique-des-demandes.md), [US-905](lot-distinct-lettres-et-systeme-rh/US-905-produire-les-lettres-de-promotion.md), [US-906](lot-distinct-lettres-et-systeme-rh/US-906-renvoyer-les-mouvements-au-systeme-rh.md) |

## Statuts

| Statut | Signification |
|---|---|
| **Pas encore** | Aucun code écrit |
| **En cours** | Commencée |
| **Fait** | Tous les critères d'acceptation couverts par des tests verts, Definition of Done cochée |
