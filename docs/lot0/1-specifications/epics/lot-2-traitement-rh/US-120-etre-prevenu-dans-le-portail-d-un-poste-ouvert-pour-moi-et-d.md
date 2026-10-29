# US-120 — Être prévenu dans le portail d'un poste ouvert pour moi et du sort de mes certificats

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D7 Notifications |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-703, EF-706 |
| **Règles** | RG-26, RG-72 |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé**, je veux être prévenu dans le portail dès qu'un poste s'ouvre pour moi et dès que les RH ont traité un certificat, **afin de postuler à temps et corriger vite un certificat refusé, sans avoir à surveiller chaque écran**.

## Pourquoi

Un quart des employés n'ont pas d'email ; WhatsApp touche presque tout le monde (Q7).

## Critères d'acceptation

- **CA-01** Une cloche dans l'en-tête de l'espace employé indique le nombre de notifications non lues ; sur ordinateur elle ouvre la liste, sur téléphone la page Notifications.
- **CA-02** « Nouveau poste ouvert pour vous » : pour chaque poste publié et ouvert dont l'employé remplit tous les critères, y compris s'il devient apte après la publication ; la notification disparaît quand le poste n'est plus ouvert ou que l'employé n'est plus apte. Elle mène à « Ma carrière ».
- **CA-03** « Certificat validé » et « Certificat à corriger » (avec le motif) : à chaque décision des RH sur un certificat de l'employé ; elles mènent à « Mes certificats ».
- **CA-04** Tant qu'un poste ouvert pour lui n'est pas lu, l'accueil le met en avant (« Nouveau pour vous »), avec un bouton pour voir le poste.
- **CA-05** Chaque employé a ses notifications lues et non lues ; « Tout marquer comme lu » les marque toutes ; une notification disparaît 90 jours après l'événement.

## Notes

Demande de l'utilisateur du 2026-10-14 (maquette « Postes ouverts : catalogue des postes ACME », écran C) et choix du même jour : tout employé apte, même devenu apte après la publication ; postes ouverts et décisions sur les certificats (pas encore les étapes de candidature) ; cloche et encart sur l'accueil. Comme US-116, les notifications se calculent et seul l'état « lu » est enregistré. Ni WhatsApp ni email : ils viendront quand le prestataire sera choisi (EF-701). Nouveau par rapport au registre (EF-706 prévoyait un résumé périodique au lot 4) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
