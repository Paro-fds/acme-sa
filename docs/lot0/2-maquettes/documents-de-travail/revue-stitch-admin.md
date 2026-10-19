# Revue des maquettes Stitch — Espace RH (B-07, B-16), version 1

| | |
|---|---|
| **Date** | 2026-10-07 |
| **Export revu** | `portail_rh_microfinance_ha_ti/` : 14 écrans, dont 3 en double version |
| **Référence** | `prompts-stitch-admin.md` et sa liste de contrôle ; tableau unique des règles ; décisions D-12 → D-14 |
| **Méthode** | Lecture du texte du code de chaque écran (pas des images) |

## Verdict

**La structure demandée est là** : file commune avec « En cours — Agent RH Démo 1 », retard au-delà de 5 jours ouvrables, séparation des tâches, examen en deux colonnes avec corrections tracées, les 10 motifs de rejet, les trois statuts de dossier, la recherche « au moins Licence · Comptabilité », les signalements et leurs quatre statuts, les valeurs à rattacher, les comptes rattachés à un matricule.

**Mais Stitch a beaucoup inventé**, et une partie touche des interdits du directeur. Ces écrans ne peuvent pas être montrés en l'état.

**Gravité :** 🔴 contraire à une règle ou à un interdit · 🟠 contenu inventé ou trompeur · 🟡 détail

## 1. Problèmes communs

| Gravité | Problème | Où | Règle |
|:---:|---|---|---|
| 🔴 | **Paie et salaires** : « états de paie », « Prise en compte dans le fichier de paie », « clôture de paie », « bulletin », « convention salariale », « grille de classification salariale », « grille de rémunération », « statut salarial », « Rapports d'effectifs & paie » | Connexion, Examen, Rejet, Signalements, À rattacher, Journal | Le portail ne touche jamais aux salaires (message de lancement §5) |
| 🔴 | **Synchronisation avec le système RH** : « Synchronisation Progiciel RH : Temps réel », « Prochain batch à 20:00 », « Synchronisation active avec le SI RH », « met à jour rétroactivement les contrats actifs » | Signalements, À rattacher | L'export est lu sans retour automatique (Q4 §6, D-20) |
| 🟠 | **Conformité inventée** : « Conforme BRH », « Circulaire BRH #89-B », « Directive BRH », « norme fiduciaire », « registre WORM », « horodatage NTP Banque Centrale », « FIDO2 », « habilitation Superviseur L1 », « archivage 10 ans » | Presque tous | Rien de tout cela n'est dans le registre ; une fausse référence réglementaire serait relevée par le directeur ou l'audit |
| 🟠 | **Noms de personnes plausibles** au lieu des noms « Démo » : Jean-Marc L., Jean-Baptiste Pierre, Fabienne Saint-Louis, Éric Mont-Rosier, Marie-Rose Estimé, Junior Dorcé, Mirlande Sylvain, Emmanuel Antoine, Esther Saint-Fleur, Marc-Aurèle Vincent, signataires du diplôme ; adresses « @acmesa.ht » | Tous | Données fictives explicites seulement (prompt 0) |
| 🟠 | **Vraies villes et agences** mélangées aux agences « Démo » (Les Cayes, Aquin, Jacmel, Jérémie, Port-Salut, Hinche…) et **régions qui n'existent pas chez ACME SA** (« Département de l'Ouest », « Région Artibonite ») | Tableau de bord, Employés, Signalements | Agences et régions « Démo » seulement |
| 🟠 | **Numéros de téléphone** (« +509 2816-ACME ») | Connexion | À retirer |
| 🟡 | Personne connectée incohérente : « Jean-Marc L. (Agent RH Démo 1) — Agent RH » sur certains écrans, « Administrateur — Direction Générale » sur d'autres | Tous | Un seul utilisateur de démonstration : « Administrateur Démo », rôle Administrateur |
| 🟡 | Dates en 2024 (« Nov. 2024 », « Mai 2024 ») | File, Employés, À rattacher, Comptes | Octobre 2026 |
| 🟡 | Compteurs incohérents : 418 ou 364 employés, 14 ou 27 certificats en attente, 3 ou 9 signalements | Menus et en-têtes | Mêmes chiffres partout : 364, 27, 9, 2 |

## 2. Doublons : quelle version garder

| Écran | Garder | Supprimer | Pourquoi |
|---|---|---|---|
| File de validation | `file_de_validation_des_certificats` | `file_de_validation` | La version supprimée mélange des certificats déjà validés dans la file, et remplace « Rejeter » par « Demander une correction » |
| À rattacher | `valeurs_rattacher_r_f_rentiel_organisationnel_rh` | `rattacher` | La version supprimée traite un autre sujet : des **documents** sans matricule, avec OCR et numéros d'identité (NIF/CIN). « À rattacher » concerne les **valeurs d'agence et de direction** de l'export (Q4 §5) |
| Comptes et rôles | `comptes_et_r_les_administration_espace_rh` | `comptes_et_r_les` | La version gardée a le matricule rattaché, la double authentification, le rôle « Responsable du référentiel » et la réinitialisation d'accès des employés ; l'autre invente 11 Agents RH et des « niveaux d'habilitation » |

## 3. Écran par écran

| Écran | Conforme | À corriger |
|---|---|---|
| **A1 Connexion** | Deux étapes, code à 6 chiffres, « Renvoyer le code », bandeau réseau / VPN | 🔴 « états de paie ». 🟠 Numéro d'assistance, « BRH », « TLS 1.3 », « Serveur ACME Centralisé ». 🟡 Code « par SMS » : le registre prévoit Cognito (Q8 §4) ; écrire « Code reçu par votre application d'authentification ou par email » |
| **A2 Tableau de bord** | 364 employés, 41 % de dossiers complets, 27 en attente dont 4 en retard, 6 rejetés ; trois statuts en barre ; « À traiter » ; tableau par Agence / Région / Direction | 🟠 « Objectif annuel : 85 % » : le critère de réussite est **9 sur 10 (90 %)**. 🟠 « 100 % rattachés » alors que 2 valeurs sont à rattacher. 🟠 « clôture mensuelle BRH ». 🟠 Unités « Département de l'Ouest / du Nord… » au lieu de régions Démo |
| **A3 File de validation** (version gardée) | File commune, 27 / 4 en retard, note de séparation des tâches, « Prendre le suivant », filtres, « En retard (6 j) », « En cours — Agent RH Démo 1 / 2 », « Réaffecter », traitement unitaire | 🟠 Noms réels plausibles. 🟡 Dates 2024. 🟡 Niveaux « Spécialisation Pro », « Certificat pro » : reprendre les niveaux de Q3 (Certification professionnelle) |
| **A4 Examiner un certificat** | Document à gauche ; profil, niveau déclaré et certificats validés à droite ; champs modifiables avec « Modifié par vous (Origine : …) » ; rappel pour diplôme étranger ; historique avec qui, quand, quoi | 🔴 **Liste des niveaux fausse** (« Bac+4 (Maîtrise) », « DEUG/DUT », sans Primaire, Formation professionnelle ni Doctorat) : reprendre les 8 niveaux et les 2 hors échelle de Q3 §2. 🔴 **Panneau de rejet intégré avec 4 motifs inventés** (« apostille manquante », « relevé de notes manquant »…) : un seul panneau de rejet, celui de A5, avec les 10 motifs. 🔴 « grille de classification salariale ». 🟠 Exigence d'apostille et d'attestation MENFP : non demandée (Q3 §4 dit seulement que les RH apprécient l'équivalence ; Q2 §6 exclut toute vérification auprès des établissements). 🟡 Le document fictif est très chargé (relevé de notes, mentions) : un diplôme simple suffit |
| **A5 Rejeter** | Les **10 motifs exacts** du registre, choix unique ; commentaire facultatif sauf « Autre » ; aperçu poli du message à l'employée | Seulement les problèmes communs (fond de l'écran d'examen) |
| **A6 Employés** | Recherche ; filtres agence, région, direction, statut du dossier (3 valeurs), niveau validé, domaine (bonne liste) ; « 12 employés trouvés » ; export avec mention du journal d'audit | 🔴 Bouton **« Nouveau dossier »** : les RH ne créent pas d'employés, ils viennent de l'export. 🟠 « 418 collaborateurs, 16 agences ». 🟠 Vraies agences et noms plausibles |
| **A7 Dossier d'un employé** | Lecture seule annoncée ; bandeau « consultation enregistrée dans le journal d'audit » ; profil avec « Confirmé le … » ; certificats et statuts | 🔴 Boutons **« Imprimer la fiche »** et **« Exporter en PDF d'audit »** : sortie de données personnelles non prévue (l'export est réservé à l'Administrateur et passe par la liste, D-18). 🟠 Étiquettes « Validé », « Certifié », « Vérifié » sur les données du profil : les RH ne valident pas le profil, l'employé le **confirme** ; écrire « Confirmé par l'employée le … ». 🟡 Contact d'urgence « Époux » : la liste dit « Conjoint·e » (P-07) |
| **A8 Signalements** | Origine (employé / contrôle automatique), quatre statuts conformes, panneau de traitement, valeur actuelle et valeur indiquée | 🔴 « Synchronisation Progiciel RH : Temps réel », « Prochain batch ». 🔴 Mentions salariales (« grille de rémunération », « statut salarial »). 🟠 « Lancer le scan de cohérence », « Intégrité base globale », protocole BRH et archivage 10 ans. 🟠 Mention à garder : « La correction est reportée dans le système RH, qui reste la source officielle » (elle a disparu) |
| **A9 Valeurs à rattacher** (version gardée) | Bon sujet : valeurs de l'export sans unité, colonne, nombre d'employés, « Rattacher à l'existant » / « Créer une nouvelle unité », message « Unité à confirmer », accès responsable du référentiel et Administrateurs | 🔴 « clôture de paie », « bulletin », « convention salariale », « met à jour rétroactivement les contrats ». 🔴 « Synchronisation active avec le SI RH ». 🟠 « Suggestion algorithmique (score 94 %) » : fonction non prévue. 🟠 « export RH quotidien », « Batch #2026-42 » : la fréquence de l'export n'est pas fixée |
| **A10 Comptes et rôles** (version gardée) | Rôles dont Responsable du référentiel ; matricule lié ; « Exclu d'auto-validation » ; double authentification ; section de réinitialisation d'accès des employés | 🟠 « FIDO2 / OTP », « Directive BRH #89-B », « Principe des 4 yeux (BRH) », statistiques inventées (« 0.47 incident / jour »). 🟠 Noms et emails plausibles |
| **A11 Journal d'audit** | Filtres période, personne, 8 types d'action ; tableau date, personne, action, objet, détail ; exemples conformes au prompt | 🔴 « Prise en compte dans le fichier de paie ». 🟠 « Registre WORM », « HASH », « NTP Banque Centrale », « Circulaire BRH ». 🟡 Bouton « Exporter le journal » : non demandé (D-19 non tranché) |

## 4. Messages de correction pour Stitch

### 4.1 Message global (à envoyer en premier)

```
Corrige tous les écrans de l'espace RH :
1. Le portail ne traite jamais la paie ni les salaires : retire toute mention de paie, bulletin, grille salariale, rémunération, convention salariale ou statut salarial.
2. Le portail ne se synchronise pas avec le système RH : retire « synchronisation », « temps réel », « batch », « SI RH ». Les corrections sont reportées dans le système RH par les RH, qui reste la source officielle.
3. Retire toutes les références réglementaires inventées : BRH, circulaires, directives, normes fiduciaires, WORM, hash, NTP, FIDO2, niveaux d'habilitation, durées d'archivage.
4. Données fictives seulement : employés « Lucie Exemple », « Paul Démo », « Nadia Test », « Marc Démo », « Sophie Test » ; agents « Agent RH Démo 1 », « Agent RH Démo 2 » ; utilisateur connecté « Administrateur Démo », rôle Administrateur, sur tous les écrans ; agences « Agence Démo Nord / Sud / Centre » ; régions « Région Démo 1 / 2 / 3 ». Aucune vraie ville, aucun email réel, aucun numéro de téléphone.
5. Mêmes chiffres partout : 364 employés actifs, 27 certificats en attente dont 4 en retard, 9 signalements, 2 valeurs à rattacher. Dates en octobre 2026.
```

### 4.2 Messages par écran

| Écran | Message |
|---|---|
| A1 Connexion | « Retire “états de paie”, le numéro d'assistance, “TLS”, “BRH” et “Serveur ACME Centralisé”. Le code de vérification est reçu par l'application d'authentification ou par email, pas par SMS. » |
| A2 Tableau de bord | « L'objectif de dossiers complets est de 90 % (9 employés sur 10). Retire “100 % rattachés” et “clôture mensuelle BRH”. Le tableau par unité utilise Agence Démo Nord, Sud, Centre et Région Démo 1, 2, 3. » |
| A4 Examiner | « Le niveau se choisit dans cette liste : Primaire / Fondamental ; Secondaire ; Baccalauréat ; Formation professionnelle / Technique ; Technicien supérieur / Bac + 2 ; Licence ; Master ; Doctorat ; Certification professionnelle ; Formation continue / Attestation. Supprime le panneau de rejet intégré : le bouton “Rejeter” ouvre la fenêtre de rejet avec les 10 motifs. Retire l'exigence d'apostille et d'attestation MENFP : garde seulement “Appréciez l'équivalence avant de valider”. Le diplôme affiché est un document simple, sans relevé de notes. » |
| A6 Employés | « Retire le bouton “Nouveau dossier” : les employés viennent de l'export RH. » |
| A7 Dossier | « Retire “Imprimer la fiche” et “Exporter en PDF d'audit”. Les données du profil portent “Confirmé par l'employée le …”, jamais “Validé”, “Certifié” ou “Vérifié”. Le lien du contact d'urgence est “Conjoint·e”. » |
| A8 Signalements | « Retire “Lancer le scan de cohérence”, “Intégrité base globale” et le protocole BRH. Ajoute sous le tableau : “La correction est reportée dans le système RH, qui reste la source officielle.” » |
| A9 À rattacher | « Retire “Suggestion algorithmique”, “export quotidien” et les numéros de batch : écris “Dernier export importé le 01/10/2026”. » |
| A11 Journal | « Retire le bouton “Exporter le journal”. » |

## 5. Rangement

- ✅ Fait le 2026-10-07 : les trois versions écartées (`file_de_validation/`, `rattacher/`, `comptes_et_r_les/`) sont retirées de l'export. **Les supprimer aussi dans le projet Stitch**, sinon le prochain export les ramène.
- Le dossier `whatsapp_image_…` ne contient que le logo (déjà dans `8-guide-de-style/`).
- Lors du prochain export, vérifier dans Stitch qu'on prend la **dernière version** de chaque écran.

---

# Revue 2 — 2026-10-07 (export `stitch_portail_rh_microfinance_ha_ti/`)

**Constat principal : le message global n'a été appliqué qu'à 5 écrans sur 11.** Les écrans corrigés affichent « Administrateur Démo » ; les autres affichent encore « Jean-Marc L. » et ont gardé presque tous leurs problèmes. Les trois doublons sont revenus (ils sont toujours dans le projet Stitch) : retirés à nouveau de l'export.

## État par écran

| Écran | État | Ce qui reste |
|---|:---:|---|
| A1 Connexion | 🟡 | « TLS 1.3 » (deux fois), « Serveur Centralisé d'Entreprise », code « par SMS au numéro associé » |
| A2 Tableau de bord | 🔴 Non corrigé | Objectif **85 %** (au lieu de 90 %), « 100 % rattachés », « clôture mensuelle BRH », « Département de l'Ouest / du Nord… », vraies villes (Cap-Haïtien, Les Cayes, Hinche, Gonaïves), « Novembre 2024 », Jean-Marc L. |
| A3 File de validation | ✅ | 🟡 Niveaux « Spécialisation Pro », « Certificat pro » et filtre « Certificat technique / Autre » : écrire « Certification professionnelle » |
| A4 Examiner | 🟠 | ✅ Liste des 10 niveaux, apostille retirée, diplôme simple, salaire retiré. 🔴 **Le panneau de rejet intégré est toujours là**, maintenant avec 10 motifs **différents** de RG-46 (« Divergence sur l'identité », « Suspicion de faux document »…). 🟡 « 6 ans d'anc. » pour une embauche en 2018 (8 ans) ; pays d'obtention remplacé par « Établissement conventionné / externe » ; « journal d'audit cryptographique non répudiable » |
| A5 Rejeter | 🟠 | ✅ Les 10 motifs exacts. Mais **le fond est l'ancien écran d'examen** : liste « Bac+4 (Maîtrise) / DEUG », apostille et MENFP, relevé de notes, « Cap-Haïtien », Jean-Marc L. |
| A6 Employés | ✅ | ✅ « Nouveau dossier » retiré, noms et agences Démo. 🟡 « 12 employés trouvés » mais « 1 à 5 sur 5 » ; « 16 agences » ; Lucie Exemple a le matricule EMP-0101 (EMP-0418 ailleurs) ; mises à jour datées du 24/10 |
| A7 Dossier | ✅ | ✅ Imprimer / PDF retirés, « Confirmé par l'employée », « Conjoint·e ». 🟡 « Profil complet · 1 certificat en attente » alors qu'un certificat est validé : son statut devrait être **Dossier complet** ; « En fonction depuis le 12/10/2026 » contredit l'embauche de 2018 ; la mention « Confirmé » est écrite deux fois par champ ; adresse IP en pied de page |
| A8 Signalements | 🔴 Non corrigé | « Synchronisation Progiciel RH : Temps réel », « Prochain batch à 20:00 », « calcul de paie », « cycle de paie », « grille de rémunération », vraies villes, noms plausibles, Jean-Marc L. ✅ La phrase « système RH, source officielle » est revenue (mais suivie de « et de calcul de paie ») |
| A9 À rattacher | 🔴 Non corrigé | « bulletin », « clôture de paie », « convention salariale », « met à jour rétroactivement les contrats », « Synchronisation active avec le SI RH », « BRH Compliant », « Circulaire #89-B », batchs, vraies villes, Jean-Marc L. ; menu cassé (« Signalements 3 · 4 · 5 ») |
| A10 Comptes et rôles | ✅ | ✅ BRH et FIDO2 retirés, noms et emails Démo. 🟠 Exemples du formulaire « Marie-Rose Estimé » et « @acmesa.ht » |
| A11 Journal d'audit | 🔴 Non corrigé | « fichier de paie », « incidence_paie : Échelon 3B », « Rapports d'effectifs & paie », WORM, hash, NTP, BRH, IFRS 9, noms plausibles, vraies villes, Jean-Marc L. |

## Messages pour Stitch (revue 2)

1. **Sélectionner A2, A5, A8, A9, A11 ensemble** et renvoyer le message global (§4.1).
2. Puis, écran par écran :

| Écran | Message |
|---|---|
| A1 | « Retire “TLS 1.3” et “Serveur Centralisé d'Entreprise”. Écris : “Code reçu par votre application d'authentification ou par email”. » |
| A2 | Message A2 de §4.2 (inchangé) |
| A3 | « Le niveau “Spécialisation Pro” / “Certificat pro” s'écrit “Certification professionnelle”. » |
| A4 | « Supprime complètement le panneau “Renvoi du certificat à l'agent” et ses motifs : le bouton “Rejeter pour correction” ouvre l'écran “Rejeter ce certificat”. Le champ “Pays d'obtention” propose une liste de pays. Embauche 12/03/2018 = 8 ans d'ancienneté. » |
| A5 | « Utilise comme fond l'écran “Examiner un certificat” corrigé (même liste de niveaux, sans apostille ni relevé de notes). Ne change pas la fenêtre de rejet. » |
| A6 | « Le compteur et la pagination doivent dire la même chose : “12 employés trouvés”, “1 à 5 sur 12”. Lucie Exemple a le matricule EMP-0418. » |
| A7 | « Lucie Exemple a un certificat validé : son statut est “Dossier complet”. Écris “Confirmé par l'employée le …” une seule fois par champ. Retire l'adresse IP. » |
| A8 | Message A8 de §4.2, plus : « Écris seulement : “La correction est reportée dans le système RH, qui reste la source officielle.” » |
| A9 | Message A9 de §4.2 (inchangé) |
| A10 | « Exemples du formulaire : “Agent RH Démo 3” et “agent3.demo@domaine-demo.local”. » |
| A11 | « Retire “incidence_paie” du détail de l'événement. » (le reste est couvert par le message global) |

3. **Supprimer dans le projet Stitch** les trois anciennes versions : file de validation (« Demander une correction »), « Dossiers à rattacher » (OCR), comptes et rôles (« 18 utilisateurs »).

---

# Revue 3 — 2026-10-07

**Constat principal : l'export a fait reculer 5 écrans.** Les messages de la revue 2 ont été appliqués à des **anciennes versions** des écrans, celles d'avant le message global. Dans Stitch, chaque modification crée une nouvelle version à partir de l'écran sélectionné : si l'on sélectionne une ancienne version, les corrections précédentes sont perdues. Les bonnes versions de la revue 2 sont sans doute encore dans le projet Stitch, à côté des nouvelles.

Quatre écrans n'ont pas changé du tout : A1, A2, A9 et les trois doublons (retirés à nouveau de l'export).

## État par écran

| Écran | Évolution | État |
|---|:---:|---|
| A1 Connexion | = | 🟡 Inchangé : « TLS 1.3 », « SMS », « Serveur Centralisé d'Entreprise » |
| A2 Tableau de bord | = | 🔴 Inchangé : 85 %, « BRH », « Département de l'Ouest », vraies villes, 2024, Jean-Marc L. |
| A3 File de validation | ⬇️ | 🟠 ✅ « Certification professionnelle ». Mais **reculé** : Jean-Marc L., « Port-au-Prince », noms plausibles (Junior Dorcé, Mirlande Sylvain, Jean-Baptiste Pierre, Marie-Rose Estimé), dates en **novembre 2024** |
| A4 Examiner | ↔️ | 🟠 ✅ 8 ans d'ancienneté, liste de pays, la liste des 10 motifs inventés a disparu. Mais **reculé** : relevé de notes revenu, « au Cap-Haïtien », Jean-Marc L. ; une petite fenêtre « Rejeter ce certificat » sans motifs reste dans l'écran |
| A5 Rejeter | ↔️ | 🟠 Les 10 motifs restent exacts, le relevé de notes est retiré. Mais le fond garde la **mauvaise liste de niveaux** (« Bac+4 (Maîtrise) », « Bac+8 »…), l'embauche passe à **2016** (2018 ailleurs), Jean-Marc L. |
| A6 Employés | ⬇️ | 🔴 **Reculé** : « Nouveau dossier » revenu, 418 collaborateurs, vraies agences (Les Cayes, Jacmel, Jérémie, Aquin, Port-Salut), « Région Artibonite », 10 noms plausibles, 2024, « Portail certifié BRH ». ✅ « 1 à 5 sur 12 » |
| A7 Dossier | ⬇️ | 🔴 **Reculé** : « Imprimer la fiche » et « Exporter en PDF d'audit » revenus, « norme fiduciaire », « Certifié », « Époux », numéro **+509**, adresse à Cap-Haïtien, « avancement de grade ». ✅ Statut « Dossier complet », mention « Confirmé » une seule fois, IP retirée |
| A8 Signalements | ↔️ | 🟠 ✅ Synchronisation et batch retirés, noms et agences Démo, Administrateur Démo, phrase « source officielle » sans la paie. Mais **revenu** : bloc « Protocole … Banque Centrale (BRH) » avec « statut salarial », « Port-au-Prince » et archivage 10 ans ; « Intégrité base globale : 98.4 % » ; « Système RH connecté » |
| A9 À rattacher | = | 🔴 Inchangé : bulletin, clôture de paie, convention salariale, synchronisation, BRH, batchs, vraies villes, Jean-Marc L. |
| A10 Comptes et rôles | ⬇️ | 🔴 **Reculé** : Jean-Marc L., noms plausibles, emails **@acmesa.ht**, FIDO2, « 0.47 incident / jour », vraies villes, « SMS ». ✅ Exemples du formulaire « Agent RH Démo 3 » |
| A11 Journal d'audit | ⬆️ | ✅ **Corrigé** : plus de paie, de BRH, de WORM ni de hash ; Administrateur Démo ; agents et agences Démo |

## Comment s'en sortir

1. Dans Stitch, **pour chaque écran, garder une seule version et supprimer toutes les autres.** La bonne version est celle qui affiche « **Administrateur Démo** » en haut à droite. Pour A6, A7 et A10, c'est la version d'avant les derniers messages.
2. Avant chaque message, vérifier que l'écran sélectionné affiche « Administrateur Démo ».
3. Ensuite seulement, appliquer :
   - à **A2, A3, A4, A5, A9**, ensemble : le message global (§4.1) ;
   - puis les messages par écran de la revue 2 qui ne sont pas encore faits : A1, A2, A4 (« le diplôme affiché est un document simple, sans relevé de notes »), A5 (fond = écran d'examen corrigé, embauche 12/03/2018), A8 (« Retire le bloc “Protocole d'arbitrage”, “Intégrité base globale” et “Système RH connecté” »), A9.
4. Exporter, puis vérifier qu'il y a **11 dossiers d'écran**, sans doublon.

---

# Revue 4 — 2026-10-07 (prompts v2, export `stitch_portail_rh_acme_sa_nouveau/`)

**Verdict : conforme.** 11 écrans, un par prompt, sans doublon. Le texte de chaque écran reprend celui du prompt presque mot pour mot.

| Contrôle | Résultat |
|---|---|
| Mots interdits (paie, synchronisation, BRH, TLS, SMS, vraies villes, 2024, Jean-Marc…) | ✅ Aucun |
| Cadre : « Administrateur Démo · Administrateur », menu 27 / 9 / 2 | ✅ Les 10 écrans avec menu |
| Données : noms, matricules, agences, dates | ✅ Identiques d'un écran à l'autre |
| Rouge | ✅ Seulement dans le logo |
| A4 : 10 niveaux, « Modifié par vous », historique, pas de fenêtre de rejet | ✅ |
| A5 : 10 motifs de RG-46, « Autre » exige un commentaire | ✅ |
| A6 : pas de « Nouveau dossier » ; A7 : ni impression ni export | ✅ |
| Pagination cohérente (27 → 4 pages, 12 → 3 pages, 214 → 27 pages) | ✅ |

**Détails de mise en page (à régler dans le prototype, pas besoin de régénérer) :**
- 🟡 A3 : la colonne « Action » (Traiter / Réaffecter) sort de l'image à droite ; le libellé « File de validation » passe sur deux lignes dans le menu et chevauche « Employés ».
- 🟡 A4 : la barre « Rejeter / Valider » cache le champ « Pays » sur l'image.
- 🟡 A10 : exemple d'email « adresse@domaine.fr » au lieu de « @domaine-demo.local ».
- 🟡 Les `screen.png` ne sont pas toujours à jour : seul `code.html` fait foi.

L'ancien export `stitch_portail_rh_microfinance_ha_ti/` (revues 1 à 3) peut être supprimé.
