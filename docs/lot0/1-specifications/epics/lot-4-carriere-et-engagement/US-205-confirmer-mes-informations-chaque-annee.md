# US-205 — Confirmer mes informations chaque année

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 4 (envoi du rappel avec US-701) |
| **Priorité** | Must |
| **Exigences** | EF-210 |
| **Règles** | RG-60 → RG-64 |
| **Décisions liées** | D-36 |

## Récit

> En tant qu'**employé**, je veux confirmer en un clic que mes informations sont toujours exactes, **afin que mon dossier reste à jour sans tout ressaisir**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** Une information non confirmée depuis 12 mois est périmée ; un rappel arrive 30 jours avant.
- **CA-02** « Ces informations sont-elles toujours exactes ? » : Oui met à jour toutes les dates de confirmation.
- **CA-03** Certificats validés et niveau d'études ne se périment jamais.

## Notes

Choix de l'utilisateur du 2026-10-11 : une information périmée est signalée sans rien bloquer (le profil reste complet, le dépôt reste ouvert) ; l'effet à la fin du délai de grâce (RG-62) reste une question pour la DRH. Le rappel 30 jours avant partira par WhatsApp ou email avec US-701 : l'API en donne déjà la date (`reminder_on`). Dans le portail, l'Accueil montre « Ces informations sont-elles toujours exactes ? » avec les informations périmées, « Oui, toujours exactes » (toutes les dates de confirmation, aucune valeur changée) et « Non, je corrige » (Mon profil). Se périment : téléphone, adresse, email, contact d'urgence, agence, poste, date d'embauche ; une information signalée aux RH attend leur réponse et ne se périme pas.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
