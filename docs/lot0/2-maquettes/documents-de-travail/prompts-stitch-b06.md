# Prompts Stitch — Maquettes du parcours « certificat » (B-06)

| | |
|---|---|
| **Version** | 1.0, 2026-10-06 |
| **Outil** | Google Stitch (stitch.withgoogle.com), mode **Mobile** |
| **Base** | Cahier des charges §5.1 (parcours E1 → E5), tableau unique des règles, décisions D-01 → D-11 validées le 2026-10-06 |
| **Étape** | Maquettes « fil de fer » : structure, textes et états. La police et la mascotte définitives viendront avec le guide de style (B-05) |

## Mode d'emploi

1. Créer un **nouveau projet** Stitch, en mode Mobile. Ne pas repartir du projet du MVP : ses couleurs (`#001038`) ne sont pas celles de la charte (Q9).
2. Coller d'abord le **prompt 0** (contexte et style), puis les prompts **un par un**, dans l'ordre. Un écran par prompt donne de meilleurs résultats.
3. Si Stitch s'écarte d'une règle, le corriger par un court message de suivi (« Le rouge ne doit pas servir à signaler une erreur ; utilise … »).
4. Exporter chaque écran (image et code) dans `2-maquettes/stitch/<nom-de-l-ecran>/`.
5. Me demander de vérifier les exports contre les règles (liste de contrôle en fin de fichier).

**Données fictives uniquement** : l'employée de démonstration s'appelle « Lucie Exemple », agence « Agence Démo », aucun vrai nom ni vrai numéro.

---

## Prompt 0 — Contexte et style (à coller en premier)

```
Je conçois les écrans mobiles d'un portail RH interne, en français, pour une institution de microfinance en Haïti (environ 500 employés, 35 agences). Le portail s'appelle « Portail carrière ACME SA ».

But : chaque employé complète son profil, puis dépose ses diplômes et certificats. Le dépôt n'est possible que lorsque le profil est complet : ce blocage est présenté comme un service (« Complétons votre profil pour valoriser votre certificat »), jamais comme une sanction.

Style :
- Conçu pour téléphone d'abord ; beaucoup d'employés ont une connexion lente : pages légères, peu d'images.
- Couleur principale bleu marine #1E1E82 (en-têtes, boutons principaux, titres).
- Rouge #CC1111 en accent seulement, avec parcimonie. Le rouge ne sert JAMAIS à signaler une erreur ou un rejet.
- Erreurs et éléments à corriger : orange foncé (#B45309) avec une icône, toujours accompagnés d'un texte.
- Succès : vert (#15803D) avec une icône et un texte. Aucun état ne repose sur la seule couleur.
- Fond blanc ou gris très clair, police sans empattement lisible (16 px minimum), zones tactiles de 44 px minimum, bouton principal dans une barre fixée en bas de l'écran.
- Ton : valorisant, rassurant, jamais culpabilisant ni menaçant. Messages d'erreur constructifs et actionnables.
- Logo « acme sa » en haut à gauche (rectangle bleu, texte rouge). Une mascotte, « La Penseuse », apparaît sur l'accueil, la connexion et les écrans d'encouragement : dessine un simple emplacement rond libellé « Mascotte », jamais sur un écran de refus.
- Contrastes suffisants, navigation possible au clavier.

L'employée de démonstration est « Lucie Exemple », Agence Démo, Chargée de crédit. Utilise uniquement ces données fictives.
```

---

## Prompt 1 — Accueil (avant connexion) · E1, D-08

```
Écran d'accueil public, avant la connexion.
- En haut : logo, puis un message court et chaleureux : « Votre carrière commence par un dossier complet ».
- Emplacement de la mascotte.
- Trois cartes de bénéfices, chacune avec une icône et un exemple concret :
  1. « Promotion plus rapide » — « Votre dossier est déjà complet et vérifié : votre demande avance sans attendre. »
  2. « Repéré pour les postes vacants » — « Les RH vous trouvent grâce à vos qualifications réelles. »
  3. « Votre carrière en main » — « Voyez votre profil, vos qualifications et les postes ouverts. »
- Bouton principal fixé en bas : « Se connecter ».
- Pas de pourcentage sur cet écran : l'employé n'est pas encore identifié.
```

## Prompt 2 — Connexion · E2, RG-80

```
Écran de connexion.
- Emplacement de la mascotte, titre « Bienvenue ».
- Champs : Nom, Prénom, Date de naissance (sélecteur de date), Mot de passe (avec bouton « Afficher »).
- Lien « Première connexion ? Créer mon mot de passe ».
- Bouton principal « Me connecter ».
- Montre aussi, sous le formulaire, l'état d'erreur : bandeau orange avec icône « Ces informations ne correspondent pas. Vérifiez l'orthographe de votre nom et votre date de naissance. »
- Et l'état bloqué : « Trop d'essais. Pour votre sécurité, réessayez dans 15 minutes. »
```

## Prompt 3 — Consentement (première connexion) · D-09, ENF-10

```
Écran affiché une seule fois, à la première connexion, avant toute saisie.
- Titre « Avant de commencer ».
- Texte court : pourquoi le portail collecte le niveau d'études et le contact d'urgence (traiter les promotions, pourvoir les postes, prévenir un proche en cas d'urgence, assurances) et qui y a accès (les RH uniquement).
- Lien « Lire la mention d'information complète ».
- Case à cocher obligatoire : « J'ai lu et j'accepte l'utilisation de ces informations. »
- Case facultative : « J'accepte de recevoir des messages WhatsApp du portail (suivi de mes certificats, rappels). »
- Bouton principal « Continuer », désactivé tant que la première case n'est pas cochée.
```

## Prompt 4 — Mon tableau de bord (progression) · E1, RG-05, RG-07

```
Écran d'accueil après connexion.
- « Bonjour Lucie » et une jauge circulaire « Votre dossier est complet à 62 % » (5 éléments sur 8).
- Carte « Il reste 3 informations à compléter avant de déposer votre certificat », avec une ligne par élément manquant et un bouton direct vers chacun : « Contact d'urgence », « Niveau d'études », « Confirmer votre poste ».
- Carte « Mes certificats » grisée avec un cadenas et le texte « Complétons votre profil pour valoriser votre certificat ».
- Emplacement de la mascotte avec un message d'encouragement : « Plus que 3 étapes ! »
- Barre de navigation en bas : Accueil, Mon profil, Mes certificats.
```

## Prompt 5 — Mon profil : coordonnées · E3, RG-02, RG-10 → RG-12, RG-15

```
Écran « Mon profil », section « Mes coordonnées ».
- En haut, rappel de la progression (barre « 62 % »).
- Nom et prénom affichés en lecture seule.
- Champs modifiables : Téléphone (format « +509 XXXX XXXX »), Adresse, Email.
- Sous l'email, une case « Je n'ai pas d'adresse email ».
- Chaque champ complet porte une coche verte ; chaque champ manquant est encadré en orange avec un message actionnable, par exemple « Ajoutez votre numéro de téléphone pour continuer ».
- Montre un champ téléphone en erreur : « Le numéro doit contenir 8 chiffres, par exemple +509 3712 3456. »
- Bouton principal fixé en bas : « Enregistrer ».
```

## Prompt 6 — Contact d'urgence et niveau d'études · E3, RG-13, RG-14

```
Écran « Mon profil », section « Contact d'urgence et études ».
- Contact d'urgence : Nom complet ; Lien avec vous (liste : Conjoint·e, Parent, Enfant, Frère / Sœur, Autre) ; Téléphone.
- Petite note : « Utilisé uniquement en cas d'urgence et pour les assurances. »
- Niveau d'études : liste déroulante avec ces niveaux, chacun avec un exemple en infobulle (icône « i ») : Primaire / Fondamental ; Secondaire ; Baccalauréat ; Formation professionnelle / Technique ; Technicien supérieur / Bac + 2 ; Licence ; Master ; Doctorat.
- Note sous le niveau : « Votre niveau sera confirmé par vos certificats validés. »
- Bouton principal « Enregistrer ».
```

## Prompt 7 — Confirmer mes informations RH · E3, RG-03, D-02

```
Écran « Mes informations RH ».
- Texte : « Ces informations viennent du service RH. Vérifiez-les : vous ne pouvez pas les modifier, mais vous pouvez signaler une erreur. »
- Trois cartes en lecture seule avec un cadenas : Agence « Agence Démo », Poste « Chargée de crédit », Date d'embauche « 12/03/2018 ».
- Sous chaque carte, deux boutons : « C'est exact » (contour vert) et « Signaler une erreur » (lien).
- Montre une carte déjà confirmée (coche verte « Confirmé le 06/10/2026 »).
- Montre aussi le panneau qui s'ouvre sur « Signaler une erreur » : rappel de la valeur actuelle, champ « Quelle est la bonne information ? », bouton « Envoyer aux RH », et la mention « Votre signalement compte comme une confirmation : il ne bloque pas votre dossier. »
```

## Prompt 8 — Dépôt verrouillé · E4, RG-07

```
Écran « Mes certificats » quand le profil n'est pas complet.
- Emplacement de la mascotte (encouragement).
- Titre « Complétons votre profil pour valoriser votre certificat ».
- Texte « Il reste 2 informations à compléter avant de déposer votre certificat : »
- Liste avec, pour chaque élément, un bouton direct : « Ajouter mon contact d'urgence → », « Confirmer mon poste → ».
- Jauge « 75 % ».
- Aucun bouton de dépôt actif, aucun rouge, aucun mot comme « refusé » ou « bloqué ».
```

## Prompt 9 — Déposer un certificat · E4, RG-20 → RG-25, RG-31, D-07

```
Écran « Déposer un certificat », profil complet.
- Zone de dépôt : « Prendre une photo » ou « Choisir un fichier » (PDF, JPG ou PNG, 5 Mo maximum).
- Aperçu du document après sélection (miniature avec bouton « Changer »).
- Champs : Type (Diplôme, Certificat, Attestation, Autre) ; Niveau (même liste que le profil, avec infobulles) ; Intitulé exact ; Établissement ; Année d'obtention ; Domaine (liste : Comptabilité, Gestion, Finance, Économie, Informatique, Droit, Agronomie, Autre), marqué obligatoire à partir de « Technicien supérieur / Bac + 2 » ; case « Diplôme obtenu à l'étranger » qui fait apparaître « Pays ».
- Bouton principal fixé en bas : « Envoyer mon certificat ».
- Lien secondaire « Ajouter un autre certificat ».
```

## Prompt 10 — Merci : confirmation après envoi · E5, EF-307, D-10

```
Écran de confirmation après l'envoi d'un certificat.
- Emplacement de la mascotte, titre « Merci, Lucie ! ».
- Récapitulatif : Licence en Sciences comptables, Université Démo, 2019.
- Statut : badge « En vérification par les RH », avec « Réponse sous 5 jours ouvrables. Vous serez prévenue par WhatsApp. »
- Carte « Ce que ce certificat débloque » : « Une fois validé, votre niveau d'études devient Licence, et vous apparaissez dans les recherches des RH pour les promotions et les postes à pourvoir. »
- Boutons : « Voir mes certificats » (principal), « Déposer un autre certificat ».
```

## Prompt 11 — Mes certificats : statuts · E5, RG-26, RG-46

```
Écran « Mes certificats » avec trois certificats, chacun dans une carte avec miniature, intitulé, établissement, année et un badge de statut avec icône et texte :
1. « Validé » (vert, coche) — Baccalauréat, Lycée Démo, 2014.
2. « En vérification » (bleu, sablier) — Licence en Sciences comptables, Université Démo, 2019.
3. « À corriger » (orange, icône crayon, jamais rouge) — Certificat en microfinance, Institut Démo, 2022 ; motif poli : « Votre document est difficile à lire. Merci de le redéposer avec une photo plus nette. » ; bouton « Redéposer ».
- En haut : « Niveau d'études validé : Baccalauréat ».
- Bouton principal fixé en bas : « Déposer un certificat ».
```

---

## Liste de contrôle d'un écran généré

| Règle | Source |
|---|---|
| Textes en français, ton valorisant ; aucun « accès refusé », « bloqué », « sanction » | Demande phase 2, phase 5 |
| Le rouge n'apparaît jamais pour une erreur ou un rejet | Q9 |
| Chaque état (erreur, succès, statut) a une icône et un texte, pas seulement une couleur | ENF-43 |
| Le verrou liste ce qui manque, avec un lien par élément | RG-07 |
| Agence, poste, date d'embauche ne sont jamais modifiables : « C'est exact » ou « Signaler une erreur » | Q1 ; RG-03 |
| L'email accepte « Je n'ai pas d'adresse email » | RG-02 |
| Pas de mascotte sur un écran de refus | Q9 |
| Bouton principal en bas, zones tactiles d'au moins 44 px, texte d'au moins 16 px | ENF-40 |
| Aucune vraie donnée d'employé | Message de lancement §5 |

Les écrans de la file de validation RH (B-07) feront l'objet d'un fichier de prompts séparé.
