# Accueil et connexion : maquettes ↔ code actuel

| | |
|---|---|
| **Date** | 2026-10-07 |
| **Stories** | US-105 (accueil, nouvelle), US-101 (connexion) |
| **Maquettes** | `../../../2-maquettes/1-espace-employe-prototype-cliquable/ecrans/` : `accueil-public.html`, `connexion.html`, `connexion-erreur.html`, `connexion-suspendue.html` |
| **Code actuel** | `app-web-v2/frontend/src/features/auth/` (`IdentifyPage`, `PasswordPage`, `AmbiguousIdentityPage`), `routes.jsx` ; backend `app/auth/` |
| **But** | Lister ce qui change avant de toucher au code |

## 1. Le parcours, avant et après

| | Aujourd'hui | Refonte |
|---|---|---|
| `/` | Écran « Identification » : nom, prénom, date de naissance → Continuer | **Page d'accueil** (nouvelle) : 3 bénéfices, bouton « Se connecter » |
| Connexion | 2 écrans : identification, puis mot de passe (`/connexion/mot-de-passe`) | **1 seul écran** (`/connexion`) : nom, prénom, date de naissance, mot de passe |
| Première connexion | Le portail le détecte après l'identification et propose de créer le mot de passe | Lien « Première connexion ? Créer mon mot de passe » sous le formulaire |
| Homonymes | Écran `/connexion/homonyme` | Pas de maquette : écran actuel conservé |
| Mot de passe oublié | Lien qui explique de contacter l'administration | Absent de la maquette : **conservé** (US-104 réinitialise l'accès) |

## 2. Page d'accueil (US-105) : tout est nouveau

Contenu de la maquette : logo et « Institution de Microfinance — Haïti » ; titre « Votre carrière commence par un dossier complet » ; mascotte « La Penseuse » avec un message de bienvenue ; les 3 bénéfices (promotion plus rapide, repéré pour les postes vacants, votre carrière en main) ; « Une question ? Adressez-vous au service RH de votre agence » ; bouton « Se connecter » ; mention de confidentialité.

**À corriger dans la maquette avant de coder** (rester sur les dires de M. Hilaire) :

| Texte de la maquette | Problème | Proposition |
|---|---|---|
| « 35 agences interconnectées », « Réseau 35 Agences Haïti » | Le registre dit 28 agences ; le fichier reçu en liste 35 ; non tranché (B-01) | Retirer le nombre |
| « Accès réservé aux 500 collaborateurs » | 364 actifs dans l'export pour ~500 employés (S-09, non tranché) | « Accès réservé aux employés d'ACME SA » |
| « Du Cap-Haïtien aux Cayes » | Cap-Haïtien est une question ouverte du référentiel (groupe G) | Retirer |
| « Votre demande avance sans attendre », « Circuit RH accéléré » | Promesse que le portail ne tient pas seul (tension T4) | « Votre dossier est prêt quand une opportunité se présente » |
| Mascotte | Image pas encore reçue | Emplacement réservé, remplacé à réception |

## 3. Écran de connexion (US-101)

| Point | Maquette | Code actuel | À faire |
|---|---|---|---|
| Champs | 4 sur un écran, mot de passe avec « afficher / masquer » | 3, puis le mot de passe sur un 2e écran | Un seul écran ; réutiliser `TextField` et `PasswordField` |
| Appel au serveur | — | `POST /api/auth/login` accepte déjà identité + mot de passe | **Aucun changement d'API** pour la connexion |
| Date de naissance | Sélecteur de date dans `connexion.html`, champ texte dans les écrans d'erreur | Sélecteur de date du téléphone | Garder le sélecteur natif (plus sûr sur téléphone) |
| Retour | Lien « ← Accueil » en haut | Retour vers `/` | Retour vers l'accueil |
| Mascotte, logo, « Bienvenue » | Présents | Absents | À ajouter |

## 4. Messages d'erreur : un point de sécurité

La maquette affiche **un seul message** quand la connexion échoue : « Ces informations ne correspondent pas. Vérifiez l'orthographe de votre nom et votre date de naissance. »

Le serveur actuel distingue trois cas : personne inconnue (« Informations non reconnues »), mot de passe faux (« Mot de passe incorrect. Il vous reste N tentatives »), mot de passe jamais créé. Sur un écran unique, ces messages différents permettraient de **deviner qui est employé** (US-101, CA-03).

**Proposition :**

| Cas | Message affiché |
|---|---|
| Personne inconnue, mot de passe faux, mot de passe jamais créé | Le même : « Ces informations ne correspondent pas. Vérifiez votre nom, votre date de naissance et votre mot de passe. Première connexion ? Créez votre mot de passe. » |
| 5 erreurs (RG-80) | « Espace temporairement suspendu. Pour votre sécurité, réessayez dans 15 minutes. » + « Une question ? Adressez-vous au service RH de votre agence. » |

Conséquences dans le code : le nombre de tentatives restantes n'est plus affiché ; le serveur renvoie le même code d'erreur pour les trois premiers cas.

## 5. Espace suspendu

La maquette montre un bouton désactivé avec un compte à rebours (« Suspendu temporairement (14:52) »). Le serveur répond aujourd'hui `423` sans dire combien de temps il reste.

**Proposition :** ajouter au message d'erreur le nombre de secondes restantes (`retry_after`), pour afficher le compte à rebours et réactiver le bouton à la fin. Petit changement dans `AccountLocked` et le cas d'utilisation `LoginEmployee`.

## 6. Première connexion : pas de maquette

Le lien « Créer mon mot de passe » mène à un écran qui n'a pas de maquette. **Proposition :** même présentation que l'écran de connexion, avec nom, prénom, date de naissance, mot de passe et confirmation ; appel à `POST /api/auth/register`, déjà existant. Les erreurs suivent la même règle qu'au §4.

## 7. Hors de cette mise à jour

- « Avant de commencer » (consentement, 1re connexion) : US-202, après celle-ci.
- Espace RH (`/admin/connexion`) : inchangé.
- Couleur officielle du bleu (logo `#29166F` ou registre `#1E1E82`, S-10) : on garde les jetons actuels.

## Décisions

**Validées par le développeur le 2026-10-07 : les 4 propositions.** Ordre retenu : la page d'accueil (US-105) d'abord, la connexion (US-101) ensuite.

| N° | Question | Décision |
|---|---|---|
| 1 | Retirer les chiffres et lieux non confirmés de l'accueil (§2) ? | Oui |
| 2 | Un seul message d'erreur, sans nombre de tentatives restantes (§4) ? | Oui |
| 3 | Compte à rebours de la suspension, avec un petit ajout au serveur (§5) ? | Oui |
| 4 | Écran de création du mot de passe sur le modèle de la connexion (§6) ? | Oui |
