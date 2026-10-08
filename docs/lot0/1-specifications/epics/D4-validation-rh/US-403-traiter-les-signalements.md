# US-403 — Traiter les signalements

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D4 Validation RH |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-408 |
| **Règles** | RG-03, RG-16 |
| **Décisions liées** | D-20 |

## Récit

> En tant qu'**Agent RH**, je veux traiter dans une file les erreurs signalées par les employés, **afin que le système RH soit corrigé et le dossier assaini**.

## Pourquoi

Un certificat ne vaut que validé ; délai cible 5 jours ouvrables (Q2).

## Critères d'acceptation

- **CA-01** Chaque signalement montre le champ, l'ancienne valeur, le motif et la date.
- **CA-02** Je le clôture avec une suite donnée ; l'employé en est informé.
- **CA-03** Les signalements automatiques (dates incohérentes) arrivent dans la même file.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
