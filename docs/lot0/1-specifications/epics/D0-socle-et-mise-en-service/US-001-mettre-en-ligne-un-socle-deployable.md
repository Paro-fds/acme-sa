# US-001 — Mettre en ligne un socle déployable

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D0 Socle et mise en service |
| **Lot** | 0 (démonstrateur) |
| **Priorité** | Must |
| **Exigences** | ENF-50, ENF-52, ENF-53 |
| **Règles** | — |
| **Décisions liées** | D-40 (démonstrateur) |

## Récit

> En tant que **développeur**, je veux déployer automatiquement depuis GitHub une application dans un conteneur Docker, avec PostgreSQL et un stockage compatible S3, réglée par variables d'environnement, **afin de montrer tôt le portail à la direction et passer ensuite sur AWS en changeant la configuration, pas le code**.

## Pourquoi

Sans socle fiable, aucune donnée réelle ne peut entrer (Aucune donnée réelle hors production sécurisée) et la direction ne voit rien fonctionner.

## Critères d'acceptation

- **CA-01** Un envoi sur la branche de démonstration met l'application en ligne sans action manuelle.
- **CA-02** La base est PostgreSQL et les fichiers sont dans un stockage compatible S3, dès le démonstrateur.
- **CA-03** Aucune adresse, aucun secret n'est écrit dans le code : tout passe par des variables d'environnement.
- **CA-04** Un bandeau « Démonstration · données fictives » figure sur chaque écran hors production.
- **CA-05** Seul un jeu de données fictif est chargé ; aucun import de vrai CSV n'est possible hors production.

## Notes

Voir `../../../9-demonstrateur/plan-demonstrateur.md`.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
