# US-133 — Retrouver la file de validation et l'examen de la refonte

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D4 Validation RH |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | RG-26 |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**agent RH**, je veux voir d'un coup d'œil ce qui est en retard et ce que j'ai déjà pris, puis examiner un certificat avec le document et la déclaration côte à côte, **afin de décider vite et juste**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/RhFileValidation.dc.html` et `RhExamen.dc.html`), dans le cadre d'US-127.

## Critères d'acceptation

**File de validation**

- **CA-01** En-tête : le titre du cadre « File de validation des certificats » (un seul titre), « N certificats attendent une décision. Délai : 5 jours ouvrables après le dépôt. », « Prendre le suivant » (administrateur et agent RH). Aucun emoji.
- **CA-02** Trois compteurs : « en retard », « dans le délai », « pris par vous ».
- **CA-03** Filtres : Agence, Type de document, Délai (Tous, En retard, Dans le délai) ; le filtre « Niveau déclaré » et la case « En retard seulement » sont retirés.
- **CA-04** Le tableau, du plus ancien au plus récent : Employé (nom, matricule, agence), Document (type et intitulé), Niveau déclaré, Déposé le, Délai (« En retard · N j » ou « Jour N sur 5 »), Pris par (« Non assigné », « Vous » ou le compte), « Examiner ». Sur téléphone, des cartes. 20 par page avec « Précédent » et « Suivant », et « 1 à 20 sur N, du plus ancien au plus récent ».

**Examen d'un certificat**

- **CA-05** En-tête : l'intitulé, « Déposé par … le … · pris par vous » (ou le compte, ou « non assigné »), « Jour N sur 5 · décision avant le … » (ou « En retard · N j »).
- **CA-06** À gauche le document (nom du fichier, taille, « Ouvrir en grand ») ; à droite l'employé (initiales, nom, matricule, poste, agence ; « Profil complet » (la maquette dit « Dossier complet », qui suppose déjà un certificat validé), « Niveau validé : … », « N certificats déjà validés »).
- **CA-07** « Ce que l'employé a déclaré » : Type, Année, Niveau, Domaine, Établissement, Intitulé, corrigeables ; les listes viennent du serveur.
- **CA-08** « Votre décision » : « Valider » et « Rejeter… » (motif obligatoire dans la liste, commentaire pour l'employé) dans la page, et « L'employé est prévenu dans le portail. Un rejet demande un motif, choisi dans la liste. ». L'« Historique du traitement » est retiré (il reste dans le journal d'audit).

## Notes

Choix de l'utilisateur du 2026-10-19 : filtre « Niveau déclaré » retiré ; historique retiré de l'examen. Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
