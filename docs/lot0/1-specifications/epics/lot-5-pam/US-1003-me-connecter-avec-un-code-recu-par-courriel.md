# US-1003 — Me connecter avec un code reçu par courriel

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 (WhatsApp : US-1004 ; contact récent : US-1005) |
| **Priorité** | Must |
| **Exigences** | Doc PAM (parcours, sécurité, canal e-mail) |
| **Règles** | RG-80 |
| **Décisions liées** | D-55, D-56 |

## Récit

> En tant qu'**employé**, je veux me connecter avec mon code employé et ma date de naissance, puis un code à 6 chiffres reçu sur mon courriel, **afin que personne d'autre que moi n'entre dans mon espace, même en connaissant mon code et ma date de naissance**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Écran 1 : code employé et date de naissance. Un code inconnu ou inactif et une date fausse reçoivent le même message, « Informations incorrectes. », avec le même délai de réponse minimal.
- **CA-02** Après 5 échecs pour un même code (date fausse ou code à 6 chiffres faux), l'accès est verrouillé 15 minutes, puis le double à chaque nouveau verrouillage, 24 heures au plus ; une connexion réussie remet à zéro. L'écran dit quand réessayer.
- **CA-03** Écran 2 : l'employé voit son courriel masqué, celui de Vault ; il ne peut saisir aucune autre adresse. Sans courriel : « Contactez la DRH », et aucun code n'est envoyé.
- **CA-04** Le code a 6 chiffres tirés au hasard cryptographique ; il est valable 5 minutes, à usage unique, avec 3 essais ; seule son empreinte HMAC (clé secrète) est conservée ; il est lié à la session d'identification et au canal.
- **CA-05** « Renvoyer » : 60 secondes entre deux envois, 3 renvois au plus par 15 minutes ; un nouveau code invalide le précédent.
- **CA-06** Code juste : la session employé s'ouvre (accueil, ou « Avant de commencer » à la première connexion) et la connexion est inscrite au journal (US-605).
- **CA-07** Le courriel du code contient le code, sa durée et « Ne partagez jamais ce code, même avec ACME » ; un courriel prévient l'employé après chaque connexion réussie et chaque verrouillage. Aucun ne contient de lien, de code employé ni de nom complet.
- **CA-08** Plus de mot de passe employé : la création du mot de passe, la connexion par mot de passe et leurs écrans sont retirés. Côté gestion, « Réinitialiser l'accès » devient « Débloquer l'accès » : il lève le verrouillage et ferme les sessions de l'employé.
- **CA-09** Les journaux techniques ne contiennent ni code employé, ni date de naissance, ni code reçu ; le courriel y est masqué.
- **CA-10** Envoi par Amazon SES (`SES_SENDER`). Sur le poste du développeur, aucun courriel ne part et le code s'affiche à l'écran. Ailleurs, sans SES, aucun code ne part et l'écran dit que la connexion est momentanément impossible (démonstrateur fermé aux employés, choix du 2026-10-27).

## Notes

Doc PAM (G. Hilaire, 2026-10-27). Choix du 2026-10-27 : démonstrateur fermé aux employés tant que SES n'est pas branché ; « Débloquer l'accès » ; verrouillage de 15 minutes, doublé à chaque fois. Le CAPTCHA après 3 échecs et la limitation par adresse IP sont tenus par AWS WAF (recette, US-002). Les codes sont conservés en base (schéma du portail) : le démonstrateur n'a pas DynamoDB ; l'adaptateur DynamoDB du plan viendra avec la recette AWS.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
