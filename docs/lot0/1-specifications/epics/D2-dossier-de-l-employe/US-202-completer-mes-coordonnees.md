# US-202 — Compléter mes coordonnées

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-202, EF-205 (formats), EF-208, EF-209 |
| **Règles** | RG-02, RG-10 → RG-15 |
| **Décisions liées** | D-05, D-06, D-09 |

## Récit

> En tant qu'**employé**, je veux saisir ou confirmer mon téléphone, mon adresse, mon email, mon contact d'urgence et mon niveau d'études, **afin que les RH puissent me joindre et connaître mon niveau**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** Avant de saisir une nouvelle donnée, il lit la mention d'information (pourquoi, qui y a accès) et donne son consentement, une seule fois.
- **CA-02** Un format invalide affiche, près du champ, un message qui dit quoi faire.
- **CA-03** « Je n'ai pas d'adresse email » rend le champ email complet.
- **CA-04** Le lien du contact d'urgence se choisit dans une liste.
- **CA-05** Chaque information enregistrée ou confirmée garde sa date de confirmation.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
