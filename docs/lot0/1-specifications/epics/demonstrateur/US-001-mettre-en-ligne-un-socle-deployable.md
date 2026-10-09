# US-001 — Mettre en ligne un socle déployable

| | |
|---|---|
| **Statut** | Fait |
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
- **CA-06** Hébergement gratuit : site sur Vercel (ou équivalent), API en conteneur sur Render (ou équivalent), base sur Supabase utilisé seulement comme PostgreSQL, fichiers dans un compartiment privé de Supabase Storage, par son interface S3 (liens signés à courte durée) ; aucune fonction propre à ces services (Supabase Auth, accès direct du navigateur à la base, fonctions Vercel, client Supabase dans le navigateur).
- **CA-07** Le schéma de la base est créé par des migrations Alembic ; les fichiers passent par un port `FileStorage`.
- **CA-08** La même image démarre sur une autre base PostgreSQL en ne changeant que les variables d'environnement (répétition locale sur PostgreSQL 17).

## Notes

Voir `../../../9-demonstrateur/plan-demonstrateur.md`, `../../../9-demonstrateur/deploiement-gratuit-et-migration-aws.md` et `../../../9-demonstrateur/mise-en-ligne-pas-a-pas.md`. En ligne depuis le 2026-10-08 : site https://….vercel.app (Vercel), API https://acme-sa.onrender.com (Render), base et fichiers Supabase (us-west-2), déploiement automatique depuis la branche `v2`. Déplacés le 2026-10-08, AWS étant pour plus tard : le dépôt signé, directement dans le stockage, va à US-301 ; la répétition de migration sur le sandbox AWS va à US-002.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
