# US-702 — Être relancé sans être harcelé

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D7 Notifications |
| **Lot** | 1 |
| **Priorité** | Should |
| **Exigences** | EF-704 |
| **Règles** | RG-51, RG-52, RG-53 |
| **Décisions liées** | D-21, D-34, D-35 |

## Récit

> En tant qu'**employé au dossier incomplet**, je veux recevoir quelques rappels positifs, **afin de terminer mon dossier sans me sentir sanctionné**.

## Pourquoi

Un quart des employés n'ont pas d'email ; WhatsApp touche presque tout le monde (Q7).

## Critères d'acceptation

- **CA-01** Rappels entre 1 et 7 jours puis à 14 jours, au plus 3.
- **CA-02** Envoyés du lundi au vendredi, de 8 h à 18 h.
- **CA-03** Plus aucun rappel dès que le dossier est complet.

## Notes

**Reportée le 2026-10-08** avec US-701 ; le déclenchement des rappels (commande planifiée ou tâche de l'API) reste à décider.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
