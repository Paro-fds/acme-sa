# US-116 — Être prévenu de ce qui arrive dans l'espace de gestion

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D3 Certificats |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-401, EF-403 |
| **Règles** | RG-42 |
| **Décisions liées** |  |

## Récit

> En tant qu'**Agent RH**, je veux voir d'un coup d'œil les certificats déposés, les certificats en retard, les signalements et les candidatures arrivés depuis ma dernière visite, **afin de traiter chaque dossier à temps sans fouiller chaque file**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** Une cloche dans l'en-tête de l'espace de gestion indique le nombre de notifications non lues ; sur ordinateur elle ouvre une liste, sur téléphone la page Notifications.
- **CA-02** Quatre notifications : un employé a déposé un certificat ; un certificat attend depuis plus de 5 jours ouvrables (une seule fois par certificat) ; un employé signale une erreur ; un employé a postulé à un poste. Chacune ouvre l'élément concerné.
- **CA-03** Seuls l'Agent RH et l'Administrateur reçoivent les notifications ; jamais pour leurs propres certificats, signalements ou candidatures.
- **CA-04** Chaque compte a ses notifications lues et non lues ; « Tout marquer comme lu » les marque toutes.
- **CA-05** Une notification disparaît 90 jours après l'événement ; le certificat, le signalement ou la candidature restent dans leur file et le journal d'audit.

## Notes

Suggestion du directeur rapportée le 2026-10-12 (« voir quand une personne a uploadé un certificat ») et choix de l'utilisateur sur la maquette « Notifications de l'espace de gestion » : cloche et liste (point 1), aussi les retards, les signalements et les candidatures (point 4), une seule notification de retard, 90 jours de conservation. Ni email ni WhatsApp, pas de ciblage par agence (file commune, US-401) : questions ouvertes au directeur.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
