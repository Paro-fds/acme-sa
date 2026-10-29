# US-106 — Protéger mon accès par une double authentification

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D1 Accès et compte |
| **Lot** | 3 |
| **Priorité** | Must |
| **Exigences** | EF-104 |
| **Règles** | RG-82, RG-83 |
| **Décisions liées** | D-41, P-14, P-15 |

## Récit

> En tant qu'**employé**, je veux confirmer ma connexion avec un code, en plus de mon nom, ma date de naissance et mon mot de passe, **afin que personne d'autre ne puisse ouvrir mon dossier, même en connaissant mes informations**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** À sa première connexion, après la création de son mot de passe, l'employé enregistre une méthode avant d'ouvrir son dossier.
- **CA-02** Il choisit parmi les méthodes ouvertes : WhatsApp, email ou application d'authentification (mêmes règles de code que US-102) ; un employé sans email n'est jamais bloqué.
- **CA-03** À chaque connexion suivante, le code de sa méthode est demandé ; le message d'échec reste unique (US-101).
- **CA-04** 5 codes faux suspendent l'accès 15 minutes, avec le même compte à rebours que la connexion.
- **CA-05** Téléphone perdu : le service RH réinitialise sa double authentification (avec US-104) ; il en choisit une nouvelle à la connexion suivante.
- **CA-06** Il change de méthode depuis son compte, après confirmation avec la méthode actuelle.
- **CA-07** Chaque connexion et chaque changement de méthode sont tracés, sans jamais écrire le code.

## Notes

Demande du 2026-10-08 (développeur) : « les employés aussi doivent faire une double authentification » ; elle remplace « employés : non au lancement » (D-41), à faire confirmer par M. Hilaire. ❓ P-15 : méthodes ouvertes aux employés (beaucoup n'ont pas d'email ; WhatsApp a un coût par message à l'échelle de tous les employés) et récupération sans passage à l'agence. Le domaine et les écrans de US-102 se réutilisent.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
