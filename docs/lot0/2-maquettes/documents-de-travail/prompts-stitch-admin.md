# Prompts Stitch — Maquettes de l'espace RH (B-07 et B-16)

| | |
|---|---|
| **Version** | 2.0, 2026-10-07 — on recommence à zéro (la version 1 a donné trop d'inventions : voir `revue-stitch-admin.md`, revues 1 à 3) |
| **Outil** | Google Stitch, mode **Web** (ordinateur, 1440 px) : les RH travaillent sur poste fixe, depuis le réseau de l'institution ou par VPN (Q8 §4) |
| **Base** | Cahier des charges §5.3 (parcours RH R1 → R7), §4.3 (droits) ; tableau unique des règles §7.5 ; décisions D-12 → D-14 validées le 2026-10-06 |
| **Lot** | Écrans du **lot 2** (traitement RH), sauf A1 (lot 3) |

## Ce qui change par rapport à la version 1

| Problème de la version 1 | Réponse de la version 2 |
|---|---|
| Stitch a ajouté des textes, des chiffres, des règlements (BRH, paie, synchronisation) | Chaque prompt dit **tous** les textes de l'écran et se termine par « N'ajoute aucun autre texte » et la liste des interdits |
| Noms, villes et chiffres différents d'un écran à l'autre | Une **fiche de données** unique, recopiée dans chaque prompt |
| Le prompt 0 a été oublié au fil des écrans | Plus de prompt 0 : chaque prompt est **complet à lui seul** (bloc commun en tête) |
| Les messages de correction ont été appliqués à d'anciennes versions, les corrections se sont perdues | **Aucun message de correction** : un écran raté est supprimé et régénéré avec le même prompt |

## Mode d'emploi

1. **Supprimer l'ancien projet Stitch** de l'espace RH (ou le renommer « ancien — ne pas utiliser »).
2. Créer un **nouveau projet** Stitch, mode **Web**.
3. Pour chaque écran, dans l'ordre A3, A4, A5, puis A2, A6, A7, A8, A9, A10, A11, A1 :
   - coller le **bloc commun**, puis le **prompt de l'écran**, dans le même message ;
   - si le résultat contient une erreur : **supprimer l'écran** et recoller le même message. Ne pas envoyer de message de correction ;
   - si l'écran est bon : ne plus y toucher.
4. Avant l'export : vérifier qu'il y a **exactement 11 écrans** dans le projet, un par prompt, et aucun autre.
5. Exporter dans `2-maquettes/stitch-admin-v2/`, puis me demander la revue.

---

## Bloc commun (à coller en tête de chaque prompt)

```
CONTEXTE
Espace RH (administration) d'un portail interne en français, pour ACME SA, une institution de microfinance. Écran d'ordinateur, 1440 px de large. Toutes les données sont fictives.

STYLE
- Bleu marine #1E1E82 : en-tête, menu, boutons principaux, titres. Fond blanc, gris très clair pour les zones.
- Rouge #CC1111 : uniquement dans le logo. Jamais pour une erreur, un retard ou un rejet.
- États : orange #B45309 avec une icône (« En retard », « À corriger », « À rattacher ») ; vert #15803D avec une icône (« Validé ») ; bleu avec une icône (« En vérification », « En cours »). Toujours une icône et un texte.
- Police sans empattement, texte de 14 à 16 px, tableaux aérés.

CADRE IDENTIQUE SUR TOUS LES ÉCRANS
- En haut à gauche : le logo texte « acme sa » et « Portail RH ».
- En haut à droite : « Administrateur Démo · Administrateur » et le lien « Se déconnecter ». Rien d'autre.
- Menu latéral gauche, dans cet ordre : Tableau de bord ; File de validation (27) ; Employés ; Signalements (9) ; À rattacher (2) ; Comptes et rôles ; Journal d'audit. Rien d'autre dans le menu.
- Pas de pied de page.
- Date du jour : 07/10/2026.

DONNÉES (n'utilise que celles-ci)
- Employés : Lucie Exemple (EMP-0418), Paul Démo (EMP-0204), Nadia Test (EMP-0311), Marc Démo (EMP-0127), Sophie Test (EMP-0562), Rose Exemple (EMP-0233), Jean Test (EMP-0389).
- Personnes RH : Administrateur Démo, Agent RH Démo 1, Agent RH Démo 2, Référentiel Démo, Lecture Démo.
- Agences : Agence Démo Nord, Agence Démo Sud, Agence Démo Centre. Régions : Région Démo 1, Région Démo 2. Directions : Direction Démo des Opérations, Direction Démo du Crédit, Direction Démo du Recouvrement.
- Emails : prenom.nom@domaine-demo.local. Téléphones : « 00 00 00 00 ».

INTERDIT
N'écris jamais : paie, salaire, rémunération, bulletin, grille, échelon ; synchronisation, temps réel, batch, SI RH ; BRH, Banque centrale, circulaire, norme, conformité réglementaire, WORM, hash, chiffrement, TLS, FIDO2, SMS ; aucune ville, aucun département ni pays réel (sauf « Haïti » si l'écran le demande) ; aucun nom de personne autre que ceux de la liste ; aucune année avant 2026 sauf les années de diplôme indiquées ; aucune adresse IP ; aucun pourcentage, compteur, statistique ou bouton qui n'est pas demandé.
```

---

## A3 — File de validation · EF-401, EF-405, D-12, RG-40 → RG-43

```
[Bloc commun]

ÉCRAN : « File de validation des certificats ». Le menu « File de validation » est actif.

En haut :
- Titre « File de validation des certificats », sous-titre « 27 certificats en attente · 4 en retard ».
- Note discrète avec une icône d'information : « Vos propres certificats n'apparaissent pas dans votre file : ils sont traités par un autre valideur. »
- Bouton principal à droite : « Prendre le suivant ».

Filtres sur une ligne : Agence (Toutes) ; Niveau déclaré (Tous) ; Type de document (Tous : Diplôme, Certificat, Attestation) ; case à cocher « En retard seulement ».

Tableau, trié du plus ancien au plus récent. Colonnes : Employé ; Agence ; Certificat ; Niveau déclaré ; Déposé le ; Délai ; Statut ; Action.
1. Paul Démo · EMP-0204 | Agence Démo Sud | Licence en Finance · Diplôme | Licence | 24/09/2026 | 9 j ouvrables | « En retard (9 j) » orange, icône horloge | Traiter
2. Nadia Test · EMP-0311 | Agence Démo Centre | Master en Audit · Diplôme | Master | 25/09/2026 | 8 j ouvrables | « En retard (8 j) » | Traiter
3. Rose Exemple · EMP-0233 | Agence Démo Nord | Licence en Gestion · Diplôme | Licence | 28/09/2026 | 7 j ouvrables | « En retard (7 j) » | Traiter
4. Jean Test · EMP-0389 | Agence Démo Sud | Technicien supérieur en Comptabilité · Diplôme | Technicien supérieur / Bac + 2 | 29/09/2026 | 6 j ouvrables | « En retard (6 j) » | Traiter
5. Lucie Exemple · EMP-0418 | Agence Démo Nord | Licence en Sciences comptables · Diplôme | Licence | 03/10/2026 | 3 j ouvrables | « En cours — Agent RH Démo 1 » bleu, icône personne | Réaffecter
6. Marc Démo · EMP-0127 | Agence Démo Nord | Comptabilité en microfinance · Certificat | Certification professionnelle | 05/10/2026 | 2 j ouvrables | « En cours — Agent RH Démo 2 » | Réaffecter
7. Sophie Test · EMP-0562 | Agence Démo Sud | Licence en Économie · Diplôme | Licence | 06/10/2026 | 1 j ouvrable | « Nouveau » | Traiter

Sous le tableau : « 1 à 7 sur 27 » et la pagination.

Pas de case à cocher par ligne, pas de validation groupée, pas de panneau latéral.
N'ajoute aucun autre texte, chiffre ou bouton.
```

## A4 — Examiner un certificat · EF-402 → EF-404, EF-407, D-13

```
[Bloc commun]

ÉCRAN : « Examiner un certificat ». Le menu « File de validation » est actif.

En haut : fil d'Ariane « File de validation › Lucie Exemple » ; titre « Licence en Sciences comptables » ; à droite, « Déposé il y a 3 jours ouvrables » et l'état « En cours — Agent RH Démo 1 » (bleu, icône personne).

Colonne gauche (60 %) : l'aperçu du document, avec les boutons zoom, rotation et « Page 1 / 1 ». Le document est un diplôme simple, une seule page, avec seulement ces lignes : « Université Démo » ; « Diplôme de Licence » ; « Sciences comptables » ; « décerné à Lucie Exemple » ; « Session 2019 » ; un cachet rond gris sans texte. Pas de relevé de notes, pas de signature nommée.

Colonne droite (40 %), trois blocs :
1. « L'employée » : Lucie Exemple · EMP-0418 ; Chargée de crédit · Agence Démo Nord ; Embauchée le 12/03/2018 ; Profil complet ; Niveau déclaré : Licence ; Certificats déjà validés : Baccalauréat (2014).
2. « Informations du certificat » (modifiables par le valideur) :
   - Type : liste « Diplôme / Certificat / Attestation », valeur « Diplôme ».
   - Niveau : liste dans cet ordre exact : Primaire / Fondamental ; Secondaire ; Baccalauréat ; Formation professionnelle / Technique ; Technicien supérieur / Bac + 2 ; Licence ; Master ; Doctorat ; Certification professionnelle ; Formation continue / Attestation. Valeur « Licence », avec sous le champ « Modifié par vous — valeur d'origine : Baccalauréat ».
   - Intitulé : « Licence en Sciences comptables ».
   - Établissement : « Université Démo ».
   - Année : « 2019 ».
   - Domaine : « Comptabilité ».
   - Pays : « Haïti ».
3. Onglet « Historique » : « Déposé par l'employée — 03/10/2026 09:12 » ; « Pris en charge par Agent RH Démo 1 — 06/10/2026 14:05 » ; « Niveau modifié par Agent RH Démo 1 : Baccalauréat → Licence — 06/10/2026 14:09 ».

Petite note sous le bloc 2, icône d'information : « Diplôme étranger : appréciez l'équivalence avant de valider. »

Barre d'actions fixée en bas à droite : « Rejeter » (bouton contour orange) et « Valider » (bouton vert plein).

Ne dessine pas la fenêtre de rejet sur cet écran : elle est sur un autre écran.
N'ajoute aucun autre texte, chiffre ou bouton.
```

## A5 — Rejeter un certificat · EF-403, RG-46

```
[Bloc commun]

ÉCRAN : fenêtre « Rejeter ce certificat », au centre, au-dessus d'un fond gris foncé uni (ne dessine pas l'écran d'examen derrière).

Contenu de la fenêtre :
- Titre « Rejeter ce certificat » ; sous-titre « Lucie Exemple · Licence en Sciences comptables ».
- « Motif du rejet (un seul) » : boutons radio, dans cet ordre exact :
  1. Document illisible ou de mauvaise qualité (sélectionné)
  2. Document incomplet (pages manquantes)
  3. Nom de l'employé absent ou différent de celui du dossier
  4. Document non reconnu comme diplôme, certificat ou attestation
  5. Niveau déclaré non conforme au document
  6. Établissement ou année non identifiable
  7. Document expiré ou non valide
  8. Doublon d'un document déjà validé
  9. Fichier endommagé ou format non conforme
  10. Autre
- Champ « Commentaire pour l'employée (facultatif, obligatoire si “Autre”) », vide.
- Encadré gris « Message envoyé à l'employée » : « Bonjour Lucie, votre document “Licence en Sciences comptables” n'a pas pu être validé : il est difficile à lire. Merci de le redéposer avec une photo plus nette. »
- Boutons : « Annuler » (texte) et « Confirmer le rejet » (orange plein).

N'ajoute aucun autre texte, chiffre ou bouton.
```

## A2 — Tableau de bord · EF-601, D-22

```
[Bloc commun]

ÉCRAN : « Tableau de bord ». Le menu « Tableau de bord » est actif.

En haut : titre « Tableau de bord » ; à droite, filtre de période « Octobre 2026 ».

Ligne de 4 cartes :
1. « Employés actifs » : 364.
2. « Dossiers complets » : 41 % (149 sur 364), barre de progression, et sous la barre « Objectif : 90 % ».
3. « Certificats en attente » : 27, et en dessous « 4 en retard (plus de 5 jours ouvrables) » en orange avec une icône horloge.
4. « Rejetés ce mois » : 6.

Bloc « Répartition des dossiers » : une barre horizontale empilée en trois parties avec la légende en texte : Profil incomplet 127 (35 %) ; Profil complet 88 (24 %) ; Dossier complet 149 (41 %). Sous la légende : « Dossier complet : profil complet et au moins un certificat validé. »

Bloc « À traiter », trois liens : « 4 certificats en retard → File de validation » ; « 9 signalements d'erreur → Signalements » ; « 2 valeurs à rattacher → À rattacher ».

Bloc « Par unité », avec un sélecteur à trois onglets Agence / Région / Direction (Agence actif). Tableau, colonnes : Unité ; Employés ; Dossiers complets ; Certificats reçus ; En attente ; Rejetés.
- Agence Démo Nord | 142 | 44 % | 98 | 11 | 2
- Agence Démo Sud | 128 | 40 % | 76 | 9 | 3
- Agence Démo Centre | 94 | 38 % | 48 | 7 | 1
- Total | 364 | 41 % | 222 | 27 | 6

N'ajoute aucun autre texte, chiffre ou bouton.
```

## A6 — Employés · EF-602, EF-603, EF-604

```
[Bloc commun]

ÉCRAN : « Employés ». Le menu « Employés » est actif.

En haut : titre « Employés », sous-titre « 364 employés actifs » ; à droite, bouton « Exporter » (Excel, CSV) avec, juste en dessous, « Chaque export est enregistré dans le journal d'audit. »

Ligne de recherche : champ « Rechercher par nom ou matricule ».

Filtres sur une ligne : Agence ; Région ; Direction ; Statut du dossier (Profil incomplet, Profil complet, Dossier complet) ; Niveau validé (au moins…) ; Domaine (Comptabilité, Gestion, Finance, Économie, Informatique, Droit, Agronomie, Autre).

Filtres actifs, en étiquettes : « Niveau validé : au moins Licence » ; « Domaine : Comptabilité » ; lien « Tout effacer ». Résultat : « 12 employés ».

Tableau, colonnes : Nom ; Matricule ; Agence ; Poste ; Statut du dossier ; Niveau validé ; Domaine ; Dernière mise à jour.
- Paul Démo | EMP-0204 | Agence Démo Sud | Analyste crédit | Dossier complet (vert, icône) | Licence | Comptabilité | 02/10/2026
- Nadia Test | EMP-0311 | Agence Démo Centre | Comptable | Dossier complet | Master | Comptabilité | 30/09/2026
- Rose Exemple | EMP-0233 | Agence Démo Nord | Chargée de crédit | Dossier complet | Licence | Comptabilité | 29/09/2026
- Marc Démo | EMP-0127 | Agence Démo Nord | Contrôleur interne | Profil complet (bleu, icône) | Licence | Comptabilité | 25/09/2026
- Sophie Test | EMP-0562 | Agence Démo Sud | Caissière | Profil incomplet (orange, icône) | Licence | Comptabilité | 18/09/2026

Sous le tableau : « 1 à 5 sur 12 » et la pagination.

Pas de bouton pour créer un employé.
N'ajoute aucun autre texte, chiffre ou bouton.
```

## A7 — Dossier d'un employé (consultation) · §4.3, EF-605

```
[Bloc commun]

ÉCRAN : « Dossier de Lucie Exemple », en lecture seule. Le menu « Employés » est actif.

En haut : lien « ← Employés » ; bandeau gris discret avec une icône œil : « Votre consultation de ce dossier est enregistrée dans le journal d'audit. »

En-tête : Lucie Exemple · EMP-0418 ; Chargée de crédit · Agence Démo Nord ; état « Dossier complet » (vert, icône) ; « Profil : 100 % ».

Bloc « Profil », une ligne par élément, avec la valeur puis en gris « Confirmé par l'employée le … » (une seule fois par ligne) :
- Téléphone : 00 00 00 00 — confirmé le 01/10/2026
- Email : lucie.exemple@domaine-demo.local — confirmé le 01/10/2026
- Adresse : 12, rue Démo, Ville Démo — confirmée le 01/10/2026
- Contact d'urgence : Paul Démo · Conjoint·e · 00 00 00 00 — confirmé le 01/10/2026
- Niveau d'études déclaré : Licence — confirmé le 01/10/2026
- Agence : Agence Démo Nord — confirmée le 01/10/2026
- Poste : Chargée de crédit — confirmé le 01/10/2026
- Date d'embauche : 12/03/2018 — confirmée le 01/10/2026

Bloc « Certificats » :
- Baccalauréat (2014) — « Validé » (vert, icône) — validé le 02/10/2026 par Agent RH Démo 2 — lien « Voir le document »
- Licence en Sciences comptables (2019) — « En vérification » (bleu, icône) — pris en charge par Agent RH Démo 1 — lien « Voir le document »

Bloc « Signalements » :
- 28/09/2026 — Agence — « Clos — valeur exacte » — « La valeur actuelle est juste. »

Aucun bouton de modification, d'impression ou d'export sur cet écran.
N'ajoute aucun autre texte, chiffre ou bouton.
```

## A8 — Signalements d'erreur · EF-408, D-20

```
[Bloc commun]

ÉCRAN : « Signalements d'erreur ». Le menu « Signalements » est actif.

En haut : titre « Signalements d'erreur » ; sous-titre « Erreurs signalées par les employés sur une donnée qu'ils ne peuvent pas modifier, et contrôles automatiques de cohérence. »

Filtres : Statut (Tous, Nouveau, En cours, Corrigé — en attente du système RH, Clos — valeur exacte) ; Origine (Toutes, Signalé par l'employé, Contrôle automatique) ; Agence.

Tableau, colonnes : Date ; Employé ; Champ ; Valeur actuelle ; Valeur indiquée ; Origine ; Statut.
- 06/10/2026 | Lucie Exemple · Agence Démo Nord | Poste | Chargée de crédit | Chargée de crédit principale | Signalé par l'employé | Nouveau
- 05/10/2026 | Paul Démo · Agence Démo Sud | Date d'embauche | 12/05/2005 | — | Contrôle automatique : embauche avant 18 ans | Nouveau
- 02/10/2026 | Nadia Test · Agence Démo Centre | Agence | Agence Démo Centre | Agence Démo Sud | Signalé par l'employé | En cours
- 30/09/2026 | Marc Démo · Agence Démo Nord | Poste | Caissier | Comptable | Signalé par l'employé | Corrigé — en attente du système RH
- 28/09/2026 | Lucie Exemple · Agence Démo Nord | Agence | Agence Démo Nord | Agence Démo Sud | Signalé par l'employé | Clos — valeur exacte
Sous le tableau : « 1 à 5 sur 9 ».

Panneau de traitement à droite, pour la première ligne :
- « Lucie Exemple · Poste » ; « Valeur actuelle : Chargée de crédit » ; « Valeur indiquée : Chargée de crédit principale » ; « Précision de l'employée : “J'ai changé de poste en août.” »
- Décision, deux boutons radio : « La valeur indiquée est juste » ; « La valeur actuelle est juste ».
- Champ « Commentaire ».
- Bouton « Enregistrer la décision ».
- En bas du panneau, icône d'information : « La correction est reportée dans le système RH, qui reste la source officielle. »

N'ajoute aucun autre texte, chiffre, bloc ou bouton.
```

## A9 — Valeurs à rattacher · EF-504, RG-17

```
[Bloc commun]

ÉCRAN : « Valeurs à rattacher ». Le menu « À rattacher » est actif.

En haut : titre « Valeurs à rattacher » ; sous-titre « Valeurs de l'export RH qui ne correspondent à aucune unité du référentiel. » ; étiquette « Accès : responsable du référentiel et Administrateurs ».

Bandeau orange clair avec une icône : « Les employés concernés voient “Unité à confirmer” sur leur dossier jusqu'au rattachement. »

Tableau, colonnes : Valeur trouvée ; Colonne de l'export ; Employés concernés ; Première apparition ; Action.
- « Dir. Recouv. » | Direction | 18 | 01/10/2026 | Rattacher
- « Code ZZ » | Agence | 3 | 01/10/2026 | Rattacher

Panneau à droite, pour la première ligne :
- « Dir. Recouv. · 18 employés ».
- Deux choix : « Rattacher à une unité existante » (sélectionné) avec une liste : Direction Démo des Opérations ; Direction Démo du Crédit ; Direction Démo du Recouvrement ; ou « Créer une nouvelle unité » (nom, type Agence ou Direction).
- Bouton « Valider le rattachement » et lien « Annuler ».
- Sous le bouton : « Ce rattachement est enregistré dans le journal d'audit. »

N'ajoute aucun autre texte, chiffre, bloc ou bouton.
```

## A10 — Comptes et rôles · EF-103, EF-105, S-05

```
[Bloc commun]

ÉCRAN : « Comptes et rôles », réservé à l'Administrateur. Le menu « Comptes et rôles » est actif.

En haut : titre « Comptes et rôles » ; bouton « Créer un compte ».

Tableau des comptes RH, colonnes : Nom ; Email ; Rôle ; Matricule rattaché ; Double authentification ; Dernière connexion ; Statut.
- Administrateur Démo | admin.demo@domaine-demo.local | Administrateur | EMP-0001 | Activée | 07/10/2026 08:30 | Actif
- Agent RH Démo 1 | agent1.demo@domaine-demo.local | Agent RH | EMP-0002 | Activée | 06/10/2026 14:05 | Actif
- Agent RH Démo 2 | agent2.demo@domaine-demo.local | Agent RH | EMP-0003 | Activée | 06/10/2026 10:20 | Actif
- Référentiel Démo | referentiel.demo@domaine-demo.local | Responsable du référentiel | EMP-0004 | Activée | 02/10/2026 09:00 | Actif
- Lecture Démo | lecture.demo@domaine-demo.local | Lecture seule | EMP-0005 | Activée | 15/09/2026 16:40 | Désactivé

Fenêtre ouverte « Créer un compte », à droite : champs Nom ; Email ; Rôle (Administrateur, Agent RH, Responsable du référentiel, Lecture seule) ; Matricule de la personne, avec l'aide « Sert à ne jamais lui proposer ses propres certificats. » ; boutons « Annuler » et « Créer le compte ».

Section en bas « Accès des employés » : champ « Rechercher un employé (nom ou matricule) » ; résultat « Lucie Exemple · EMP-0418 · Agence Démo Nord » ; bouton « Réinitialiser son accès ». Sous le bouton : « L'employée devra créer un nouveau mot de passe. L'action est enregistrée dans le journal d'audit. »

N'ajoute aucun autre texte, chiffre, bloc ou bouton.
```

## A11 — Journal d'audit · EF-605

```
[Bloc commun]

ÉCRAN : « Journal d'audit », en lecture seule. Le menu « Journal d'audit » est actif.

En haut : titre « Journal d'audit » ; sous-titre « Toutes les actions des RH sur le portail. »

Filtres : Période (Octobre 2026) ; Personne (Toutes, Administrateur Démo, Agent RH Démo 1, Agent RH Démo 2) ; Type d'action (Consultation d'un dossier, Consultation d'un document, Validation, Rejet, Réaffectation, Export, Modification du référentiel, Gestion des comptes).

Tableau, du plus récent au plus ancien, colonnes : Date et heure ; Personne ; Action ; Employé ou objet ; Détail.
- 06/10/2026 14:12 | Agent RH Démo 1 | Validation | Lucie Exemple | Licence en Sciences comptables — niveau corrigé : Licence
- 06/10/2026 14:05 | Agent RH Démo 1 | Consultation d'un document | Lucie Exemple | Licence en Sciences comptables (2019)
- 06/10/2026 10:20 | Agent RH Démo 2 | Rejet | Marc Démo | Motif : Document illisible ou de mauvaise qualité
- 05/10/2026 16:40 | Administrateur Démo | Export | Liste des employés | 12 employés · filtre Domaine : Comptabilité
- 05/10/2026 11:34 | Administrateur Démo | Gestion des comptes | Lucie Exemple | Accès réinitialisé
- 04/10/2026 09:15 | Administrateur Démo | Modification du référentiel | « Dir. Recouv. » | Rattachée à Direction Démo du Recouvrement
- 03/10/2026 17:05 | Administrateur Démo | Réaffectation | Nadia Test | De Agent RH Démo 2 à Agent RH Démo 1
- 02/10/2026 08:30 | Agent RH Démo 2 | Consultation d'un dossier | Paul Démo | —
Sous le tableau : « 1 à 8 sur 214 » et la pagination.

Aucun bouton de suppression, de modification ou d'export.
N'ajoute aucun autre texte, chiffre, bloc ou bouton.
```

## A1 — Connexion RH avec double authentification · EF-104, ENF-06 *(lot 3)*

```
[Bloc commun]

ÉCRAN : « Connexion à l'espace RH ». Exception au cadre commun : pas de menu latéral, pas de nom en haut à droite. Une carte blanche au centre d'un fond bleu marine.

Dans la carte :
- Logo « acme sa », titre « Espace RH ».
- Étape 1 : champs « Identifiant » et « Mot de passe », lien « Mot de passe oublié ? », bouton « Continuer ».
- Étape 2, affichée en dessous comme si l'étape 1 était faite : « Saisissez le code de vérification reçu par votre application d'authentification ou par email. » ; 6 cases pour les chiffres ; lien « Renvoyer le code » ; bouton « Valider ».
- Sous la carte, petit texte avec une icône de cadenas : « Espace réservé au réseau de l'institution ou au VPN. »

N'ajoute aucun autre texte, chiffre ou bouton.
```

---

## Liste de contrôle d'un écran RH

| Règle | Source |
|---|---|
| Aucun mot de la liste « INTERDIT » | Message de lancement §5 (salaires), Q4 §6 (pas de retour vers le système RH), revues 1 à 3 |
| « Administrateur Démo · Administrateur » en haut à droite ; menu avec 27, 9, 2 | Fiche de données |
| Seulement les noms, agences, régions et directions de la fiche | Message de lancement §5 (données fictives) |
| Le rouge n'est jamais un état (erreur, retard, rejet) | Q9 |
| Chaque état a une icône et un texte | ENF-43 |
| File commune ; un dossier « en cours » porte le nom de l'agent ; réaffectation par l'Administrateur seul | D-12, D-14 |
| Un agent ne voit jamais son propre certificat dans sa file | Q2 §1, RG-42 |
| Un document à la fois, pas de validation groupée | Q2 §5 |
| Rejet avec l'un des 10 motifs de RG-46 ; « Autre » exige un commentaire ; une seule fenêtre de rejet (A5) | RG-46 |
| Le valideur peut corriger niveau, intitulé, établissement, année, domaine ; chaque correction est tracée | D-13, RG-44 |
| Liste des 10 niveaux de Q3 §2 | Q3 §2 |
| Alerte au-delà de 5 jours ouvrables | RG-40 |
| Les RH ne modifient jamais les données de l'employé ; pas d'impression ni d'export depuis un dossier | Q1, §4.3 |
| Export réservé à l'Administrateur, depuis la liste des employés, et tracé | D-18 (proposition) |
| Exactement 11 écrans dans le projet avant l'export | Revues 2 et 3 |
