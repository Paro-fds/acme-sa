# Authentification PAM — modèle à reprendre

ACME SA · Plateforme ACME Multifonctions

PAM est le modèle. Une autre application reprend la même machine à états : un secret connu de l’employé, un code à usage unique envoyé par courriel, puis un cookie de session que le navigateur ne peut pas lire. Le métier (la balance, un dossier, une demande) ne commence qu’après ces trois portes.

Les fichiers à copier sont listés à la fin de ce document. `test_noyau.py` est le contrat : les parcours y sont joués sans réseau, sans SES et sans S3. Le cahier `PAM_cahier_des_charges.md` dit ce que la version complète ajoute autour de cette machine. Il ne faut pas reconstruire ce qui est déjà décrit ici.

## Ce que l’employé voit

Quatre écrans, une seule adresse. Les pages et l’API sont servies par la même fonction, donc le cookie reste sur ce site. Aucune donnée d’authentification n’est mise dans `localStorage`. L’identifiant du défi reste dans une variable mémoire : un rechargement de page le perd, et il faut recommencer.

1. Identification. Code employé et date de naissance. La date se tape en huit chiffres, jour mois année, sans barre oblique. Le 27 octobre 1990 s’écrit `27101990`. Le champ est un mot de passe. Afficher le révèle, Masquer le cache. Le navigateur ne garde que les chiffres, au plus huit.
2. Canal. Un bouton propose le courriel masqué, par exemple `z***@acmehaiti.com`. WhatsApp est affiché et désactivé, avec le motif « Indisponible ». Tant qu’aucun modèle et aucun jeton réels ne sont fournis, ce bouton ne part pas.
3. Code. Six chiffres, compte à rebours de 5 minutes, bouton Renvoyer.
4. Menu principal. Après le code, l’employé arrive sur ce menu : Balance PER, Relevé PER, Fiche de paie, et Main levée si la session est DRH. Chaque choix ouvre le document. Le bouton « Menu principal », en haut du document, ramène à cette liste. « Fermer la session » reste disponible sur les deux vues. Dans une autre application, ce menu est la liste des ressources de la personne qui vient de s’authentifier. Chaque ressource se lit avec le seul code de la session.

Sans action pendant 5 minutes (300 000 ms) sur l’écran du code ou du service, le navigateur appelle `POST /api/sortir` et revient à l’identification. Le message affiché est « Session fermée après 5 minutes sans action. » Le serveur, lui, borne la session à 15 minutes même si la personne clique.

## Porte 1 — le secret déjà connu

`POST /api/identifier` reçoit le code, la date et, s’il est demandé, le captcha. L’adresse IP vient de la passerelle (`sourceIp`), jamais d’un champ du formulaire.

Le code est compacté, mis en majuscules, et doit matcher `^[A-Z0-9]{4,16}$`. Un code illisible est remplacé par la clé unique `INCONNU`, pour que les essais absurdes partagent un seul compteur. Un code bien formé mais absent du profil, ou un employé inactif, est traité comme un échec. La réponse est toujours « Informations incorrectes ». Le client ne peut pas distinguer « code inconnu », « date fausse » et « compte inactif ».

La date saisie est lue en `JJMMAAAA`. Les séparateurs sont ignorés, mais il faut huit chiffres : `2710199` est refusé, `27101990` est le 27 octobre 1990. Le fichier des profils, lui, stocke `MM/JJ/AAAA`, comme le CSV des employés, ou `AAAA-MM-JJ`. Les deux formes sont converties en date ISO, puis comparées par HMAC, pas par une égalité directe, pour que le temps de réponse ne révèle pas la date. Une date absente du profil échoue. Une date impossible, comme le 32 octobre, échoue.

Le profil vient du CSV Vault. Les colonnes lues sont `employee_code`, `active`, `date_of_birth`, `email_address`, `telephone_number`, `first_name` et `position`. Le prénom ne sert qu’à la salutation du courriel. Le poste sert à reconnaître la DRH. Le profil est relu au plus toutes les 15 minutes. Une fonction sans état n’a pas de mémoire entre deux conteneurs : les compteurs ne vivent pas dans le processus.

## Compteurs, captcha, verrou

Chaque échec incrémente deux verrous : celui du code et celui de l’adresse IP. Les deux sont relus et réécrits à chaque essai. L’un ou l’autre suffit à bloquer.

| Échecs | Effet |
| --- | --- |
| 3 | Un captcha apparaît : « Combien font a + b ? ». a et b sont tirés entre 2 et 9. La question et la réponse restent sur le serveur, clé `IP\|code`. Le navigateur ne reçoit que le texte. |
| 5 à 9 | Verrou d’une minute. |
| 10 à 14 | Verrou de 15 minutes. |
| 15 et plus | Verrou d’une heure. |

Pendant le verrou, la réponse reste « Informations incorrectes » et le compteur n’augmente plus. À partir de 5 échecs, si le profil a un courriel, un avertissement part : des essais ont été refusés. Cet envoi est au mieux. S’il échoue, l’employé voit quand même le message habituel.

Un succès remet les deux compteurs à zéro. Le captcha déjà tiré peut rester en mémoire, mais il n’est plus exigé tant que les échecs sont sous 3.

Durées de conservation : captcha 1 heure, verrous 7 jours.

## Gel du contact

À la première identification réussie, l’empreinte HMAC du courriel et celle du téléphone sont enregistrées. Ce premier passage ne gèle personne.

Si le courriel du profil change ensuite, l’ancienne adresse reçoit un avis et le nouveau courriel ne peut pas recevoir de code pendant 72 heures. Le bouton affiche alors « Courriel — Contactez la DRH ». Un changement de téléphone prévient aussi par courriel : l’ancien numéro ne sert plus à recevoir de code. Ces avis sont au mieux. Le suivi de contact n’expire pas tout seul.

## Porte 2 — le code à usage unique

L’identification réussie ne crée pas encore le code. Elle crée un défi, `secrets.token_urlsafe(16)`, et le renvoie au navigateur. Le serveur y range le code employé, pas le code à six chiffres.

`POST /api/envoyer` reçoit le défi et le canal `email`.

- Un canal autre que `email` répond « WhatsApp est indisponible. » et n’envoie rien.
- Sans courriel valide, ou si le courriel est gelé : « Contactez la DRH. »
- Le code est tiré avec `secrets.randbelow(1_000_000)` et écrit sur six chiffres, zéros devant compris.
- Le courriel part d’abord. Le sujet est « ACME SA — Code de vérification PAM ». Le HTML vient de `pam/pam_otp_email.html`. Les emplacements sont `{{CODE}}`, `{{VALIDITE}}` (le nombre de minutes, ici 5), `{{PRENOM}}` et `{{ANNEE}}`. Un prénom entièrement en capitales est remis en casse de titre. S’il manque, la salutation est « Bonjour, ». Le prénom est échappé avant d’entrer dans le HTML. Une partie texte, sans balise, porte le même code pour les boîtes qui n’affichent pas le HTML. Le modèle est cherché à côté de `noyau.py`, puis dans le dossier parent. La publication le copie dans l’archive de la fonction.
- Seulement si l’envoi a réussi, le serveur enregistre l’empreinte HMAC du code, l’expiration et l’heure d’envoi. Le code en clair n’est jamais écrit. Un envoi refusé ne consomme ni l’attente ni un renvoi.
- 60 secondes minimum entre deux envois. Message : « Veuillez patienter avant un nouvel envoi. »
- Au-delà, au plus 3 renvois dans une fenêtre de 15 minutes. Ensuite : « Le nombre de renvois est atteint. Réessayez plus tard. » La fenêtre rouverte remet le compteur à zéro.
- Le défi lui-même expire au bout de 20 minutes dans la table.

`POST /api/verifier` compare l’empreinte du code tapé à celle qui est stockée. Trois erreurs, un code expiré, un code déjà consommé ou un défi sans code donnent le même texte : « Code incorrect ou expiré. » Le bon code n’est plus accepté après trois erreurs. Un succès marque le défi consommé : le même code ne rouvrira pas une session.

L’expéditeur est `autorapport@acmehaiti.com`, la réponse `dit@acmehaiti.com`. Le rôle doit avoir `ses:SendEmail` sur les deux identités vérifiées : le domaine `acmehaiti.com` et l’adresse d’expédition. L’adresse seule ne suffit pas. SES contrôle l’identité de l’adresse d’expédition. Le compte SES est sorti du bac à sable. Un échec d’envoi du code est montré tel quel : « Le courriel n'a pas pu être envoyé. Contactez la DIT. » Les journaux n’écrivent que le type d’exception et le code d’erreur, pas l’adresse.

Les avis de verrou, de changement de contact et de consultation restent en texte brut, sujet « ACME SA — PAM ». Ils ne passent pas par le modèle HTML. Un échec de ces avis ne change pas la réponse montrée à l’employé.

## Porte 3 — la session

Le succès du code crée un jeton `secrets.token_urlsafe(32)`, lié au code employé, valable 15 minutes. Il n’est pas mis dans le JSON. Il part dans l’en-tête de cookie :

`pam_session=<jeton>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`

Le JavaScript ne peut pas le lire. `SameSite=Strict` l’empêche d’accompagner un lien ouvert depuis un autre site. `Secure` n’est omis qu’en local sur `127.0.0.1` ou `localhost`. Les réponses portent aussi `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, une politique `default-src 'self'`, HSTS un an (`max-age=31536000; includeSubDomains`) et `Cache-Control: no-store`.

Les lectures suivantes, `GET /api/balance` dans PAM, n’envoient que le cookie, avec `credentials: "same-origin"`. Le serveur recharge la session et refuse si elle est absente ou expirée, avec « Informations incorrectes ». La clé de la ressource est calculée depuis le code de la session, jamais depuis un paramètre du client. Demander le dossier d’une autre personne répond « Accès refusé. » La session dans la table dure 16 minutes, une minute de plus que la session métier, pour que ce soit l’application qui refuse, pas une disparition silencieuse de la ligne.

`POST /api/sortir` efface la session et renvoie un cookie de même nom avec `Max-Age=0`.

Après l’ouverture, un avis part au courriel du profil : une consultation vient d’avoir lieu. Cet avis est au mieux. S’il échoue, la session est quand même ouverte.

## Où tout est écrit

Une seule table, clé `pk`, lecture cohérente. Le document est un JSON. L’attribut `expire` est le délai de disparition automatique. L’horloge est l’UTC, stockée sans fuseau. Les deux côtés d’une comparaison de dates doivent rester sans fuseau. Une comparaison entre une date naïeve et une date fuseautée lève une exception, et l’écran affiche « Service momentanément indisponible. »

| Clé | Contenu | Durée |
| --- | --- | --- |
| `DEFI#…` | défi, empreinte du code, essais, renvois | 20 min |
| `SESSION#…` | jeton, code employé, expiration | 16 min |
| `VERROU#code#…` et `VERROU#ip#…` | échecs et fin de blocage | 7 jours |
| `CAPTCHA#IP\|code` | question et réponse | 1 heure |
| `CONTACT#code` | empreintes et gels | sans délai |
| `AUDIT#horodatage#aléa` | quand, empreinte de la personne sur 16 caractères, canal, résultat, IP | sans délai |

L’audit ne contient ni le code employé en clair, ni le code à six chiffres, ni l’adresse. Chaque requête recharge le défi ou la session, travaille, puis réécrit dans un `finally`, y compris quand l’opération échoue. Deux invocations ne partagent rien d’autre que cette table.

Le secret HMAC est une chaîne aléatoire de 32 octets, gardée dans le coffre des secrets. Il ne figure pas dans le code, ni dans les journaux, ni dans le dépôt git. Le nom utilisé par PAM est `pam/otp-hmac`.

## Constantes à reprendre telles quelles

| Constante | Valeur |
| --- | --- |
| Validité du code | 5 minutes |
| Essais du code | 3 |
| Pause entre deux envois | 60 secondes |
| Renvois | 3 par fenêtre de 15 minutes |
| Session serveur | 15 minutes |
| Cookie | 900 secondes |
| Inactivité du navigateur | 5 minutes |
| Captcha à partir de | 3 échecs |
| Verrou | 1 min, puis 15 min, puis 1 h |
| Gel après changement de contact | 72 heures |
| Défi en table | 20 minutes |
| Session en table | 16 minutes |
| Captcha en table | 1 heure |
| Verrou en table | 7 jours |

## Facilités du service déjà en place

Ces facilités font partie du modèle. Une autre application les reprend au lieu de les réécrire.

Le menu principal est l’écran d’arrivée. `menuPrincipal` montre la liste et cache les documents. `ouvrirDocument` fait l’inverse et ouvre le panneau choisi. Le bouton `#retour-menu` rappelle `menuPrincipal`. Main levée n’est dans le menu, ni dans les onglets, que si `charge.drh` est vrai. La DRH est reconnue par le poste du dossier (`drh`, ou `ressource` et `humain`) ou par la liste `PAM_DRH_COURRIELS`. L’action lève le gel de 72 heures d’un autre code. Elle ne crée pas d’adresse.

La balance affichée est la dernière photo PER, centrée, suivie de `USD`.

Le relevé PER ne s’affiche qu’après une date de début et une date de fin, saisies en jour/mois/année. Le clic relit `GET /api/balance`, puis ne garde que les photos dont `date_rapport` tombe dans l’intervalle, de la plus ancienne à la plus récente. L’écran indique les mois déjà en base. Un mois absent du seau n’est pas inventé.

« Relevé en PDF » appelle `GET /api/releve-pdf`. Le navigateur qui le permet ouvre l’enregistrement : l’employé choisit le dossier. Le fichier est un PDF, pas la boîte d’impression. L’en-tête reprend celui de la fiche de paie : logo ACME à gauche (`logo_acme.jpg`, objet JPEG `/Im1`), « Direction des Ressources Humaines » à côté, « RELEVÉ PER » et la période à droite, filet indigo `#29166f` dessous. Le même en-tête est répété sur chaque page. La mention d’authentification est en bas : « Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines. » Les montants y sont libellés USD.

La fiche de paie est le HTML de `payslip.html` et `payslip.css`, logo compris, pour le mois affiché. Les autres mois sont des lignes sous la fiche. La ligne du mois affiché a le fond `#d6e8ff`. Un clic remplace la fiche et déplace ce fond. Le net montré retire le bonus accumulé (colonne AF) ; la phrase brune ne paraît que si ce bonus est positif. Le bouton « Enregistrer en PDF » de la fiche ouvre l’impression du navigateur. Le relevé, lui, produit le fichier.

## Ce qu’il faut remplacer pour une autre application

Garder la machine. Changer les quatre bords.

- Le profil. Une source qui, pour un identifiant, donne actif ou non, le secret de la première porte, et un courriel. Ici le secret est la date de naissance. Ailleurs ce peut être un autre secret déjà détenu, à condition qu’il soit comparé par HMAC et qu’un secret vide échoue.
- Le masque du courriel. Première lettre, `***`, puis le domaine. Ne jamais renvoyer l’adresse entière au navigateur.
- Le modèle HTML du code et ses quatre emplacements. Le fichier doit voyager avec le programme. Les avis de sécurité restent en texte.
- La ressource autorisée. Une fonction qui, à partir du seul code de la session, calcule la clé et refuse toute autre. Ici `pam/balances/per/{CODE}.json` pour le relevé et `pam/balances/payslip/{CODE}.json` pour la fiche. Le PDF et le menu se branchent sur ces lectures, ils ne choisissent pas un autre dossier.
- Les noms. Table, secret, cookie, expéditeur, identité d’envoi. Le cookie et les pages doivent rester sur la même origine. Un nom de domaine posé par un simple alias devant l’adresse de la passerelle casse le contrôle d’hôte et le certificat.

Les droits minimaux du rôle : lire, écrire et effacer sur la table ; lire le secret ; `ses:SendEmail` sur le domaine et sur l’adresse d’expédition ; lire l’objet métier. Pour un fichier absent, il faut aussi lister le compartiment sur le préfixe. Sans ce droit, le stockage répond par un refus au lieu d’une absence, et l’écran parle d’une panne alors que le fichier n’existe pas. Une clé absente doit produire « Aucune balance n'est disponible pour le moment. », pas « Service momentanément indisponible. »

## Parcours que les tests doivent garder

En changeant seulement les données fictives :

- Parcours complet : identification, envoi, code juste, lecture de sa seule ressource.
- Code inconnu et mauvaise date : la même réponse, les mêmes champs.
- Captcha après trois échecs, verrou qui n’incrémente plus.
- Gel de 72 heures après un changement de courriel, premier passage non gelé.
- Code faux, code expiré, code réutilisé, trois essais qui brûlent le bon code.
- Pause de 60 secondes et plafond de renvois.
- Envoi en échec qui reste réessayable : l’attente et l’empreinte ne sont pas enregistrées.
- Deux processus qui partagent le dépôt et se passent le défi, puis la session.
- Lecture du dossier d’une autre personne refusée.
- Avertissement dont l’envoi échoue : le message montré à l’employé ne change pas.
- Relevé borné par deux dates, PDF qui contient le logo et la mention d’authentification, menu principal qui revient dessus, fiche dont le mois cliqué remplace le bulletin affiché.

## Fichiers à remettre au programmeur

Remettre ce paquet, pas le dépôt entier. Il contient le modèle en service et les pièces pour le compléter. Ne pas y joindre de secret, de `.env`, de copie du coffre, ni de fichier de paie réel.

| Fichier | Rôle |
| --- | --- |
| `pam/modele_authentification.md` | Ce modus operandi. |
| `pam/PAM_cahier_des_charges.md` | Ce que la version complète ajoute encore. |
| `pam/plateforme/noyau.py` | Règles : portes, relevé, PDF, fiche, main levée. |
| `pam/plateforme/depot.py` | Table, clés, durées. |
| `pam/plateforme/serveur.py` | HTTP, cookie, SES, lecture S3, routes. |
| `pam/plateforme/statique/index.html` | Écrans, menu, onglets. |
| `pam/plateforme/statique/pam.css` | Présentation, balance centrée, mois surligné. |
| `pam/plateforme/statique/pam.js` | Parcours du navigateur. |
| `pam/plateforme/test_noyau.py` | Contrat, sans réseau. `python -m unittest test_noyau.py` depuis `pam/plateforme`. |
| `pam/plateforme/logo_acme.jpg` | Logo de l’en-tête, fiche et relevé PDF. |
| `pam/payslip.html` et `pam/payslip.css` | Modèle de la fiche de paie. |
| `pam/pam_otp_email.html` | Courriel du code. |
| `pam/pam_alerte_email.html` | Avis HTML de consultation. |
| `pam/export_shivam.py` | Découpage des rapports Shivam, un objet par employé et par mois. |
| `pam/plateforme/deploy/publier.py` | Publication de la fonction en service. Le chemin n’est pas `infra/stack.py`. |

La publication recopie dans l’archive `noyau.py`, `depot.py`, `serveur.py`, `statique/`, `logo_acme.jpg`, `payslip.html`, `payslip.css`, `pam_otp_email.html` et `pam_alerte_email.html`. Un fichier oublié dans cette liste n’est pas en service.
