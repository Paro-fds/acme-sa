# US-402 — Examiner et décider

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D4 Validation RH |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-402, EF-403, EF-404, EF-407 |
| **Règles** | RG-44, RG-45, RG-46 |
| **Décisions liées** | D-13 |

## Récit

> En tant qu'**Agent RH**, je veux voir le document à gauche et le profil à droite, puis valider ou rejeter, **afin de décider vite et de façon justifiable**.

## Pourquoi

Un certificat ne vaut que validé ; délai cible 5 jours ouvrables (Q2).

## Critères d'acceptation

- **CA-01** Rejeter demande un des 10 motifs ; le commentaire est obligatoire pour « Autre ».
- **CA-02** Je peux corriger le niveau, l'intitulé, l'établissement, l'année et le domaine ; chaque correction est tracée.
- **CA-03** Chaque décision enregistre valideur, date, heure, décision et motif ; l'historique du dossier les montre.
- **CA-04** L'employé est notifié de la décision.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
