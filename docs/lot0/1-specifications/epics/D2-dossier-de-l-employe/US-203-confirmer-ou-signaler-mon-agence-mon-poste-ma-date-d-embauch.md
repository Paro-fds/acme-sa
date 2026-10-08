# US-203 — Confirmer ou signaler mon agence, mon poste, ma date d'embauche

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 1 |
| **Priorité** | Must (Should pour la cohérence) |
| **Exigences** | EF-203, EF-204, EF-205 (cohérence) |
| **Règles** | RG-03, RG-16 |
| **Décisions liées** | D-02, D-20 |

## Récit

> En tant qu'**employé**, je veux confirmer mon agence, mon poste et ma date d'embauche, ou signaler une erreur, sans pouvoir les modifier, **afin que le système RH soit corrigé à la source**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** Ces champs ne sont jamais modifiables par l'employé.
- **CA-02** « Ces informations sont exactes » enregistre la date de confirmation.
- **CA-03** « Signaler une erreur » demande un motif et enregistre la date, l'ancienne valeur et le motif.
- **CA-04** Confirmé ou signalé, le champ compte comme complet.
- **CA-05** Une date d'embauche moins de 18 ans après la naissance crée un signalement automatique aux RH, sans bloquer l'employé.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
