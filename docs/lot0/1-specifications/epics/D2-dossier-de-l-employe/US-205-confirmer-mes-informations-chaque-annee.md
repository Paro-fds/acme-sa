# US-205 — Confirmer mes informations chaque année

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 4 |
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

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
