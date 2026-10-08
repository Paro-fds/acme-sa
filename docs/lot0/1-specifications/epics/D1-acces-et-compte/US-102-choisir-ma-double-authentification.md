# US-102 — Choisir ma double authentification

| | |
|---|---|
| **Statut** | En cours |
| **Epic** | D1 Accès et compte |
| **Lot** | 3 |
| **Priorité** | Must |
| **Exigences** | EF-104 |
| **Règles** | RG-81, RG-82 |
| **Décisions liées** | D-41, P-14 |

## Récit

> En tant qu'**Agent RH, Administrateur ou Lecture seule**, je veux choisir comment recevoir mon second facteur : code par WhatsApp, code par email, ou application d'authentification (Microsoft Authenticator ou autre application TOTP), **afin de protéger les dossiers de tous les employés sans dépendre d'un seul canal**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** À sa première connexion, un compte RH enregistre au moins une méthode avant d'accéder à l'espace RH.
- **CA-02** WhatsApp ou email : un code à 6 chiffres, à usage unique, valable quelques minutes (durée à fixer).
- **CA-03** Application : la personne scanne un QR code une fois, puis saisit le code à 6 chiffres renouvelé toutes les 30 secondes.
- **CA-04** Elle change de méthode depuis son compte, après confirmation avec la méthode actuelle.
- **CA-05** Téléphone perdu : un Administrateur réinitialise sa double authentification ; elle en choisit une nouvelle à la connexion suivante.
- **CA-06** L'espace RH ne s'ouvre que depuis le réseau des bureaux.
- **CA-07** Chaque connexion, réussie ou non, et chaque changement de méthode sont tracés.

## Notes

Technologie à choisir avec la DIT : Cognito gère l'email et les applications TOTP ; WhatsApp demande un développement en plus. Employés : pas de double authentification au lancement (D-41, à confirmer).

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
