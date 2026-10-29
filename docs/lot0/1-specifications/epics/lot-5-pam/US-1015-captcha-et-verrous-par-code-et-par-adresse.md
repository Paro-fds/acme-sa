# US-1015 — Captcha et verrous par code et par adresse

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | pam/pam/modele_authentification.md (compteurs, captcha, verrou) |
| **Règles** | — |
| **Décisions liées** | D-60 |

## Récit

> En tant qu'**employé**, je veux que les essais répétés sur mon code soient freinés, d'où qu'ils viennent, **afin que personne ne trouve ma date de naissance à force d'essais**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Chaque échec de l'identification compte pour le code tapé et pour l'adresse IP vue par le serveur ; un code illisible compte sous « INCONNU ». L'un ou l'autre compteur suffit à bloquer.
- **CA-02** À 3 échecs, un calcul « Combien font a + b ? » (a et b de 2 à 9) est demandé ; la réponse reste sur le serveur ; un calcul faux compte comme un échec.
- **CA-03** 5 à 9 échecs : verrou d'une minute ; 10 à 14 : 15 minutes ; 15 et plus : une heure. Pendant le verrou, la réponse reste « Informations incorrectes. » et le compteur n'augmente plus. Un succès remet les deux compteurs à zéro.
- **CA-04** À partir de 5 échecs, un avis part au courriel du dossier ; s'il échoue, la réponse ne change pas. Un code à 6 chiffres faux ne verrouille pas (3 erreurs le brûlent). « Débloquer l'accès » remet le compteur du code à zéro.

## Notes

Modèle d'authentification du directeur (2026-10-28). Remplace le verrouillage progressif d'US-1003 (15 minutes doublées) et son compte à rebours. Sur AWS derrière CloudFront, l'adresse est à lire dans l'en-tête de CloudFront (story de déploiement).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
