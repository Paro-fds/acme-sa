# US-901 — Enregistrer une demande reçue par lettre

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D9 Demandes et mouvements de carrière |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-901 (lettre), EF-902, EF-903 |
| **Règles** | RG-74 |
| **Décisions liées** | D-33 |

## Récit

> En tant qu'**Agent RH**, je veux enregistrer à réception une demande de promotion ou de mobilité reçue par lettre, **afin de mesurer et réduire le délai de traitement (critère de réussite n°2)**.

## Pourquoi

Critère de réussite n°2 : une demande traitée en quelques jours au lieu de quelques semaines.

## Critères d'acceptation

- **CA-01** Fiche : employé, date de réception, canal, type, poste visé, motivation, lettre scannée, étape, responsable.
- **CA-02** La demande suit 7 étapes, de la réception à la clôture (acceptée, refusée, reportée ou retirée) ; chaque passage est daté.
- **CA-03** Aucune demande ne peut être supprimée.
- **CA-04** Le profil de l'employé au moment de la demande est conservé.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
