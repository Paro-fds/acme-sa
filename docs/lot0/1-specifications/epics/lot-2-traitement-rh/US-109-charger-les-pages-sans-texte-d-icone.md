# US-109 — Charger les pages sans texte d'icône

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | — |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé**, je veux voir des écrans propres dès leur ouverture, même avec une connexion lente, **afin d'avoir confiance dans le portail et avoir envie de l'utiliser**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** Pendant le chargement, aucune icône ne s'affiche jamais sous forme de texte (« rocket_launch », « login »…) : la place de l'icône reste vide le temps qu'elle arrive.
- **CA-02** Le portail ne télécharge que les icônes qu'il affiche, et les demande en priorité : quelques dizaines de Ko au lieu de 4 Mo.
- **CA-03** Une icône ajoutée dans un écran sans être ajoutée aux icônes du portail fait échouer les tests.

## Notes

Demande de l'utilisateur du 2026-10-11 (« quand la page se charge, les icônes apparaissent comme du texte »). Cause : la police Material Symbols complète (4 Mo, toutes les icônes) ; au-delà de 3 s le navigateur montre le nom de l'icône. Correction : police réduite aux icônes utilisées (`npm run icons`), servie par le portail et préchargée.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
