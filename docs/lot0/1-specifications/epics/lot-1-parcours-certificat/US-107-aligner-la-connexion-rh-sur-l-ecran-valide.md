# US-107 — Aligner la connexion RH sur l'écran validé

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-104 (écran) |
| **Règles** | RG-80, RG-81, RG-82 |
| **Décisions liées** | D-47, D-42 |

## Récit

> En tant que **personne des RH**, je veux me connecter à l'espace RH sur l'écran que la direction a validé, **afin de retrouver dans le portail l'écran qui a été montré et approuvé**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** La connexion RH reprend l'écran A01 : carte blanche sur fond bleu marine, logo, « Espace RH », et la mention « Espace réservé au réseau de l'institution ou au VPN » sous la carte.
- **CA-02** Les deux étapes sont sur la même carte : 1 « Identifiants » (identifiant, mot de passe, « Continuer »), puis 2 « Vérification de sécurité », qui s'ouvre sans changer d'écran une fois le mot de passe vérifié.
- **CA-03** Le code se saisit dans 6 cases, une par chiffre ; un code collé ou proposé par le téléphone remplit les 6 cases ; « Valider » ouvre l'espace RH.
- **CA-04** « Renvoyer le code » n'apparaît que pour un code envoyé par WhatsApp ou par email ; avec une application d'authentification, rien n'est à renvoyer.
- **CA-05** « Mot de passe oublié ? » affiche « Demandez à un Administrateur de réinitialiser votre accès » : aucune réinitialisation en libre-service (EF-105).
- **CA-06** À la première connexion, ou après une réinitialisation, l'étape 2 devient « Protégez votre compte » sur la même carte ; les règles de US-102 sont inchangées (méthodes ouvertes, code faux, suspension, message unique).

## Notes

Demande de l'utilisateur du 2026-10-09 : aligner la connexion RH sur l'écran A01 validé par M. Hilaire (D-47) et la placer au lot 1. US-102 reste au lot 3, « En cours », jusqu'au choix du service d'envoi des codes (D-41).

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
