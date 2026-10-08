# US-302 — Savoir ce que mon certificat m'apporte

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D3 Certificats |
| **Lot** | 1 |
| **Priorité** | Must (Should pour « ce que ça débloque » et l'avis) |
| **Exigences** | EF-307, EF-607 (avis) |
| **Règles** | — |
| **Décisions liées** | D-10 |

## Récit

> En tant qu'**employé**, je veux voir, après l'envoi, un remerciement, un récapitulatif, le statut et ce que ce certificat débloque, **afin d'avoir envie de continuer**.

## Pourquoi

Besoin 2 : des qualifications prouvées. Sans certificat validé, personne n'apparaît dans les recherches des RH.

## Critères d'acceptation

- **CA-01** L'écran affiche le récapitulatif et le statut « Reçu ».
- **CA-02** Il explique ce que le certificat apporte : niveau validé, apparaître dans les recherches des RH pour les promotions et les postes.
- **CA-03** Une question en un clic recueille son avis ; elle peut être ignorée.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
