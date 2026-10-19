# Revue des maquettes Stitch — Parcours « certificat » (B-06), version 1

| | |
|---|---|
| **Date** | 2026-10-06 |
| **Écrans revus** | 11, dans `stitch_portail_carri_re_acme_mobile/` |
| **Référence** | Liste de contrôle de `prompts-stitch-b06.md`, tableau unique des règles, décisions D-01 → D-14 |

## Verdict

La **structure est bonne** : les 11 écrans existent, dans le bon ordre, avec les bons champs et les bons états (verrou avec un lien par élément, 62 %, « C'est exact » / « Signaler une erreur », statuts Validé / En vérification / À corriger, consentement obligatoire et WhatsApp facultatif). Le ton est valorisant et la couleur principale est la bonne.

Mais Stitch a **ajouté du contenu inventé**, dont une partie contredit nos règles ou promet ce que le portail ne fera pas. Ces maquettes ne peuvent pas être montrées au directeur avant correction.

**Gravité :** 🔴 contraire à une règle ou à une décision · 🟠 contenu inventé ou trompeur · 🟡 défaut d'affichage

## 1. Problèmes communs à plusieurs écrans

| Gravité | Problème | Écrans | Règle |
|:---:|---|---|---|
| 🔴 | **Délai de « 48 h »** annoncé pour la validation | Dépôt verrouillé, Déposer | RG-40 : 5 jours ouvrables |
| 🔴 | **« Visible par les 35 agences »** : les certificats seraient visibles de tout le réseau | Accueil, Dépôt verrouillé, Déposer, Merci | Seuls les RH voient les dossiers (§4.3, ENF-03) |
| 🔴 | **Rouge utilisé pour une alerte ou une exigence** : « Format opérateur Haïti » en rouge, badge rouge « Obligatoire dès Bac+2 », icônes rouges du panneau de signalement, valeur barrée en rouge | Coordonnées, Déposer, Informations RH | Q9 : le rouge ne signale jamais une erreur |
| 🟠 | **Numéros de téléphone inventés** : « Poste 204 », « +509 2811-0000 (RH Direct) », boutons « Appeler » | Connexion, Accueil, Dépôt verrouillé, Merci, Mes certificats | Un faux numéro peut appartenir à quelqu'un : à retirer |
| 🟠 | **Rouge décoratif trop fréquent** : point rouge sur la mascotte et à côté de « Session active », « Profil 100 % », « Lucie Exemple », « Prioritaire » | Presque tous | Q9 : rouge « avec parcimonie » |
| 🟡 | **Logo incohérent** : texte « ACME » rouge sur fond bleu dans l'en-tête, vrai logo ailleurs | Tous | Utiliser partout le logo officiel |
| 🟡 | **Image de profil cassée** en haut à droite (texte « Prof ») | Tous les écrans connectés | Remplacer par les initiales « LE » |
| 🟡 | Textes coupés par des points de suspension (« Baccal… », « Dernier diplôme aca… », « Personne à préveni… ») | Accueil, Mes certificats | Le texte doit passer à la ligne |

## 2. Écran par écran

| Écran | Conforme | À corriger |
|---|---|---|
| **1. Accueil public** | 3 bénéfices avec exemples ; pas de pourcentage ; « Se connecter » en bas | 🟠 Régions inventées (« Ouest, Nord, Sud, Artibonite, Plateau Central ») : les vraies sont Métropole 1 et 2, Grand Sud 1 et 2, Bas et Haut Artibonite, Bas et Haut Plateau. 🟠 Photo d'équipe chargée depuis Internet : à retirer (pages légères, ENF-30). 🟠 « 500 collaborateurs », « Portail Mobilité », citation de la mascotte : à simplifier |
| **2. Connexion** | Champs, lien de première connexion ; erreur en orange avec icône ; blocage de 15 minutes | 🔴 Date affichée « mm/dd/yyyy » : format haïtien JJ/MM/AAAA. 🟡 Bloc « Démonstration des alertes RH » : présenter l'erreur et le blocage comme deux variantes de l'écran, pas dans l'écran. 🟡 « © 2025 » → 2026 ; « SSL » → retirer |
| **3. Avant de commencer** | Pourquoi, qui y a accès, lien vers la mention, case obligatoire, WhatsApp facultatif, bouton désactivé | 🟠 Promesses juridiques inventées (« jamais cédées ni partagées à des tiers », « protocole rigoureux ») : la mention d'information sera rédigée et validée par la DRH ; garder « Seuls les RH d'ACME SA y ont accès ». 🟡 Badge « Obligatoire » rose : utiliser le bleu |
| **4. Mon tableau de bord** | 62 %, 5 sur 8, 3 éléments avec leur bouton, dépôt verrouillé avec « Complétons votre profil… » | 🔴 Badge « Bientôt disponible » sur le dépôt : faux, il est disponible dès le profil complet ; écrire « Disponible dès votre profil complet ». 🟠 « Vos compétences de crédit sont déjà enregistrées », « Indexation RH garantie » : inventé, à retirer |
| **5. Coordonnées** | Nom et prénom en lecture seule ; téléphone en erreur avec message actionnable ; adresse manquante en orange ; case « Je n'ai pas d'adresse email » | 🔴 Email marqué « Optionnel » : il est **obligatoire**, sauf si la case est cochée (RG-01, RG-02). 🔴 « SMS » cité comme canal : les canaux sont WhatsApp et email (RG-50). 🟡 Badge « Validé » sur l'email : écrire « Complet » (« Validé » est réservé aux certificats). 🟠 « entretiens de promotion et convocations » : à retirer |
| **6. Contact d'urgence et études** | Liste de liens ; note sur les assurances ; les 8 niveaux avec infobulles ; « confirmé par vos certificats validés » | 🟠 Nom du contact « Jean Baptiste Pierre » : nom plausible d'une vraie personne ; mettre « Contact Exemple ». 🟡 Badge « À valider » : écrire « À compléter » |
| **7. Mes informations RH** | Trois cartes en lecture seule avec cadenas ; « C'est exact » / « Signaler une erreur » ; carte confirmée ; panneau de signalement avec « compte comme une confirmation » | 🔴 « Données synchronisées avec le Système d'Information RH » : faux, l'export est lu sans retour (Q4 §6). 🔴 Icônes rouges dans le panneau de signalement et sur « Confirmé ». 🟡 Libellé « Signaler une modification » sur la carte agence : uniformiser en « Signaler une erreur ». 🟠 « Réf RH #2018-09 » : à retirer |
| **8. Dépôt verrouillé** | Titre « Complétons votre profil… », « Il reste 2 informations », un bouton par élément, aucun mot « refusé » | 🔴 « Validation rapide sous 48 h » → 5 jours ouvrables. 🔴 « visibles aux 35 agences » → « visibles des RH ». 🟠 Bouton « Appeler » |
| **9. Déposer un certificat** | Photo ou fichier ; formats et 5 Mo ; 4 types ; niveau ; intitulé ; établissement ; année ; domaine obligatoire dès Bac + 2 ; pays si étranger ; « Ajouter un autre certificat » | 🔴 « Ce diplôme validera **automatiquement** votre palier Licence » : faux, ce sont les RH qui valident (RG-30). 🔴 « sous 48 h » (deux fois). 🔴 Badge rouge « Obligatoire dès Bac+2 ». 🟡 Pas d'**aperçu** du document, seulement son nom de fichier (EF-301) : montrer une miniature. 🟠 « Université d'État d'Haïti (INAGHEI) » : mettre « Université Démo ». 🟡 « Gestion & Administration » : la liste dit « Gestion » |
| **10. Merci** | Remerciement, récapitulatif, « En vérification par les RH », 5 jours ouvrables, WhatsApp, « Ce que ce certificat débloque » conforme à D-10 | 🔴 « Visible par les 35 agences ACME SA ». 🟠 Numéro « +509 2811-0000 ». 🟠 « équipes d'audit de conformité » : écrire « l'équipe RH » |
| **11. Mes certificats** | Trois statuts avec icône et texte ; « À corriger » en orange avec motif poli et « Redéposer » ; niveau validé en haut | 🔴 **Débordement horizontal** : les badges « En vérification » et « À corriger » sortent de l'écran (règle : aucun défilement horizontal). 🟠 Numéro de téléphone ; « Port-au-Prince » en orange sans raison ; « Conforme aux registres RH » |

## 3. Messages de correction à donner à Stitch

### 3.1 Message global (à envoyer en premier)

```
Corrige tous les écrans selon ces règles :
1. Le délai de validation est de 5 jours ouvrables, jamais 48 h.
2. Les certificats sont visibles uniquement par les RH d'ACME SA, jamais « par les 35 agences » ni « par le réseau ».
3. Le rouge #CC1111 ne sert jamais pour une erreur, une alerte, une exigence ou une valeur barrée : utilise l'orange foncé #B45309 avec une icône. Retire aussi les petits points rouges décoratifs (mascotte, session, profil, nom) : le rouge reste rare.
4. Supprime tous les numéros de téléphone, postes et boutons « Appeler ». Remplace-les par « Une question ? Adressez-vous au service RH de votre agence. »
5. Dans l'en-tête, utilise le logo officiel (rectangle bleu, « acme sa » en rouge) sur tous les écrans ; remplace la photo de profil par un cercle avec les initiales « LE ».
6. Aucun texte coupé par des points de suspension : le texte passe à la ligne.
7. Aucune image chargée depuis Internet (photos d'équipe) : pages légères.
8. Ne promets rien que le portail ne fait pas : pas de « synchronisé avec le système RH », pas de validation « automatique », pas d'« indexation garantie ».
```

### 3.2 Messages par écran

| Écran | Message |
|---|---|
| Accueil public | « Retire la photo d'équipe, la ligne sur les régions et la mention “Portail Mobilité”. Garde le titre, les trois bénéfices et le bouton Se connecter. » |
| Connexion | « La date de naissance s'affiche au format JJ/MM/AAAA. Retire le bloc “Démonstration des alertes RH” : fais deux variantes de l'écran, l'une avec le message d'erreur, l'autre avec le blocage de 15 minutes. Remplace “© 2025” par “© 2026” et retire “SSL”. » |
| Avant de commencer | « Remplace le bloc “Qui a accès” par : “Seuls les RH d'ACME SA ont accès à ces informations.” Retire les promesses sur les tiers et le protocole. Le badge “Obligatoire” est bleu. » |
| Tableau de bord | « Remplace le badge “Bientôt disponible” par “Disponible dès votre profil complet”. Retire “Vos compétences de crédit sont déjà enregistrées” et “Indexation RH garantie”. » |
| Coordonnées | « L'email est obligatoire, sauf si la case “Je n'ai pas d'adresse email” est cochée : retire “Optionnel”. Remplace le badge “Validé” par “Complet”. Les notifications passent par WhatsApp ou email, pas par SMS. Le texte sur Digicel et Natcom n'est pas en rouge. » |
| Contact d'urgence | « Le contact s'appelle “Contact Exemple”. Le badge du niveau d'études dit “À compléter”. » |
| Informations RH | « Retire “Données synchronisées avec le Système d'Information RH” et la référence “Réf RH”. Toutes les cartes disent “Signaler une erreur”. Aucune icône rouge : orange pour le signalement, vert pour “Confirmé”. » |
| Déposer | « Remplace “validera automatiquement votre palier Licence” par “Une fois validé par les RH, votre niveau d'études deviendra Licence”. Montre une miniature du document en aperçu. Établissement : “Université Démo”. Domaine : “Gestion”. Badge “Obligatoire dès Bac + 2” en bleu. » |
| Merci | « Remplace “Visible par les 35 agences” par “Visible par les RH pour les promotions et les postes à pourvoir”. “Les équipes d'audit de conformité” devient “l'équipe RH”. » |
| Mes certificats | « Les badges de statut restent entièrement dans l'écran, sous le titre du certificat si nécessaire. Retire “Port-au-Prince” et “Conforme aux registres RH ACME SA”. » |

## 4. Rangement

- Le dossier `whatsapp_image_2026_10_06_at_4.04.53_pm.jpeg/` contient le logo officiel, déjà rangé dans `../8-guide-de-style/logo-acme-sa.jpg` : il peut être supprimé ici.
- Le `DESIGN.md` de Stitch utilise bien `#1E1E82`, mais définit une couleur « erreur » rouge (`#ba1a1a`) et une couleur secondaire rouge (`#bc0008`) : à aligner sur le guide de style (B-05).

---

# Revue 2 — 2026-10-07

Vérification faite sur le **texte du code** de chaque écran : plusieurs images `screen.png` n'ont pas été régénérées par Stitch et montrent encore l'ancienne version (accueil public, connexion). Pour la démonstration, réexporter les images.

## Bilan

| Écran | État | Reste à corriger |
|---|:---:|---|
| Accueil public | ✅ | Image à réexporter. Détail : « 500 collaborateurs » → « les employés d'ACME SA » (l'export n'en compte que 364 actifs) |
| Connexion (écran de base) | ❌ **Non corrigé** | Bloc « Démonstration des alertes RH » encore là, « SSL », « © 2025 » : maintenant que les deux variantes existent, l'écran de base ne garde que le formulaire |
| Connexion : erreur de saisie | ✅ | — |
| Connexion : espace suspendu 15 min | ✅ | — |
| Avant de commencer | 🟠 | « assurer la prise en charge des assurances **sous 5 jours ouvrables** » : sans objet, à retirer. La fenêtre « Mention d'information » contient un texte juridique inventé (« Direction du Capital Humain », « gestion des sinistres », « responsable d'agence ») : le remplacer par « Texte de la mention d'information : à rédiger et valider par la DRH » |
| Mon tableau de bord | ✅ | — |
| Mes coordonnées | ❌ **Non corrigé** | Email toujours « (Optionnel) » et « Validé » ; « SMS » toujours cité ; « entretiens de promotion et convocations » toujours là. Ajouts faux : « Vérification sous 5 jours ouvrables », « Modifications transmises aux RH • Délai de traitement de 5 jours » : les coordonnées sont enregistrées directement, sans validation des RH (seuls les certificats et les signalements passent par les RH) |
| Contact d'urgence et études | 🟠 | **Infobulles des niveaux cassées** : 7 niveaux sur 8 affichent la phrase de confidentialité au lieu de leurs exemples (Q3 §2). Icône de coche en rouge |
| Mes informations RH | 🟠 | « Réf RH » et « synchronisé » retirés, libellés uniformes ✅. Restent des **icônes rouges** (signalement, « Confirmé ») : orange pour le signalement, vert pour la confirmation |
| Dépôt verrouillé (« Mes certificats » à 75 %) | ❌ **Non corrigé** | « visibles aux 35 agences », « sous 48 h », « Poste 204 », bouton « Appeler », « Bientôt disponible » |
| Déposer un certificat | ✅ | Détail : la liste des domaines diffère de P-01 (« Finance » manque ; « Microfinance & Banques », « Économie et Développement », « Droit des affaires »… renommés). Reprendre : Comptabilité, Gestion, Finance, Économie, Informatique, Droit, Agronomie, Autre |
| Merci | ✅ | — |
| Mes certificats (statuts) | 🟠 | Stitch a ajouté un **mini-formulaire « Ajouter un nouveau diplôme »** (intitulé et fichier seulement) : il contourne les champs obligatoires (RG-23). Le retirer : le bouton « Déposer un certificat » mène à l'écran complet. Une icône rouge |

**Effet de bord à surveiller :** pour appliquer le message global, Stitch a répété « 5 jours ouvrables » et « visible uniquement par les RH » sur presque tous les écrans, parfois hors sujet. Une fois par écran, là où c'est pertinent, suffit.

## Messages de correction (revue 2)

| Écran | Message |
|---|---|
| Connexion (base) | « Retire le bloc “Démonstration des alertes RH” et ses deux messages : ils sont maintenant dans des écrans séparés. Pied de page : “Portail Carrière ACME S.A. © 2026”, sans “SSL”. » |
| Mes coordonnées | « L'email n'est pas optionnel : retire “(Optionnel)” et écris “(Requis, ou cochez la case ci-dessous)”. Le badge “Validé” devient “Complet”. Remplace la phrase sur les SMS par “Sans email, vous recevrez les notifications par WhatsApp.” Retire “entretiens de promotion et convocations”, “Vérification sous 5 jours ouvrables”, “Traitement sous 5 jours ouvrables” et “Modifications transmises aux RH” : les coordonnées sont enregistrées immédiatement, sans validation des RH. Écris sous le bouton : “Enregistré dans votre profil.” » |
| Dépôt verrouillé | « Remplace “pour les rendre visibles aux 35 agences ACME SA” par “pour les faire valider par les RH”. Remplace “Validation rapide sous 48h” par “Examen par les RH sous 5 jours ouvrables”. Remplace “Bientôt disponible dès 100 %” par “Disponible dès votre profil complet”. Retire “Poste 204” et le bouton “Appeler” ; écris “Une question ? Adressez-vous au service RH de votre agence.” » |
| Contact d'urgence et études | « Chaque niveau garde son exemple dans l'infobulle : Primaire — certificat d'études ; Secondaire — classe de 3e ; Baccalauréat — Bac I / Bac II (Philo) ; Formation professionnelle — diplôme technique ; Technicien supérieur — Bac + 2 ; Licence — Bac + 3 ou 4 ; Master — Master 1 ou 2 ; Doctorat — PhD. Retire la phrase de confidentialité des infobulles. Coche en vert, pas en rouge. » |
| Avant de commencer | « Retire “sous 5 jours ouvrables” de la carte Contact d'urgence. Dans la fenêtre “Mention d'information”, remplace tout le texte par : “Texte de la mention d'information : à rédiger et valider par la DRH.” » |
| Mes informations RH | « Aucune icône rouge : orange pour “Signaler une erreur”, vert pour “Confirmé”. » |
| Mes certificats | « Retire le mini-formulaire “Ajouter un nouveau diplôme” : le bouton “Déposer un certificat” ouvre l'écran de dépôt complet. Aucune icône rouge. » |
| Déposer | « Liste des domaines : Comptabilité, Gestion, Finance, Économie, Informatique, Droit, Agronomie, Autre. » |
| Tous | « N'écris “5 jours ouvrables” et “visible uniquement par les RH” qu'une fois par écran, là où il est question d'un certificat ou d'un signalement. » |

---

# Revue 3 — 2026-10-07

Vérification sur le code des 13 écrans (11 écrans et 2 variantes de connexion).

**Tous les points des revues 1 et 2 sont corrigés**, sauf l'usage du rouge. Il n'y a plus de « 48 h », de « 35 agences », de numéros de téléphone, de « SMS », d'email « optionnel », de bloc de démonstration ni de mini-formulaire de dépôt. Les infobulles des niveaux, la liste des domaines et la mention d'information (renvoyée à la DRH) sont justes.

## Reste : le rouge employé comme couleur d'état

| Écran | Élément en rouge | Correction |
|---|---|---|
| Mes informations RH | Icône « Confirmé le 06/10/2026 » et icône du panneau « Signaler une erreur » | Vert pour « Confirmé », orange pour le signalement |
| Déposer un certificat | Badge « Obligatoire dès Bac+2 » sur fond rouge | Badge bleu |
| Contact d'urgence et études | Message « Section 2 enregistrée avec succès ! » avec une coche sur fond rouge | Coche verte |
| Avant de commencer | Badge « Obligatoire * » sur fond rose | Badge bleu |

**Message pour Stitch :**

```
Dernière correction : le rouge ne sert jamais à un état. Mes informations RH : icône « Confirmé » en vert, icône du signalement en orange #B45309. Déposer un certificat : badge « Obligatoire dès Bac+2 » en bleu. Contact d'urgence : la coche du message « Section 2 enregistrée avec succès » en vert. Avant de commencer : badge « Obligatoire » en bleu. Le rouge ne reste que dans le logo et sur de très rares accents décoratifs.
```

**Acceptable en l'état** (accent décoratif, à revoir avec le guide de style) : petits points rouges sur l'avatar de la mascotte et à côté de « Portail Interne », « Profil 100 % », « Lucie Exemple » ; icône du fichier PDF sur fond rose.

Après cette correction et la réexportation des images, les maquettes du parcours « certificat » sont prêtes à être montrées au directeur.

---

# Revue 4 — 2026-10-07

**Code des 13 écrans : conforme.** Les quatre usages du rouge de la revue 3 sont corrigés. Reste une petite icône rouge devant « Votre signalement compte comme une confirmation » (Mes informations RH) : ce n'est pas un état d'erreur, elle peut rester ou passer en bleu.

**Images : pas à jour.** Les fichiers `screen.png` montrent toujours la première version (photo d'équipe, « Portail Mobilité », email « Optionnel », « SMS »…). Stitch n'a pas régénéré les captures lors des exports. Avant la démonstration, il faut soit réexporter les images depuis Stitch, soit produire les captures à partir du code.

---

# Revue 5 — 2026-10-07 : correction des revues 3 et 4

**Les revues 3 et 4 étaient fausses sur le texte.** La recherche utilisée alors filtrait les fichiers avec un motif qui n'en sélectionnait aucun ; « aucun résultat » a été lu à tort comme « tout est corrigé ». Seule la vérification des couleurs était valable.

Vérification refaite sur le texte de chaque écran : **le dernier export a remis d'anciennes versions de 8 écrans**, alors que l'export précédent (revue 2) en avait corrigé plusieurs.

| Écran | État | Textes fautifs encore présents |
|---|:---:|---|
| Connexion et ses 2 variantes | ✅ | — |
| Mes coordonnées | ✅ | — |
| Contact d'urgence et études | ✅ | — |
| Accueil public | ❌ | « 35 agences », régions « Ouest, Nord… », « Portail Mobilité », photo d'équipe en image de fond |
| Tableau de bord | ❌ | « Bientôt disponible », « Poste 204 » |
| Avant de commencer | ❌ | Mention juridique inventée (« Capital Humain », « sinistres »), « 35 agences » |
| Merci | ❌ | Numéro « +509 2811-0000 » |
| Mes informations RH | ❌ | « Données synchronisées », « Réf RH », « Signaler une modification » |
| Dépôt verrouillé | ❌ | « 35 agences », « 48h », « Poste 204 », « Appeler », « Bientôt disponible » |
| Déposer un certificat | ❌ | « 35 agences », « automatiquement » |
| Mes certificats | ❌ | Numéro « +509 2811-0000 », « Port-au-Prince » |

**Cause probable :** dans Stitch, ces écrans existent en plusieurs versions et l'export a repris les premières. Il faut exporter, pour chaque écran, la dernière version (celle qui a reçu les corrections).
