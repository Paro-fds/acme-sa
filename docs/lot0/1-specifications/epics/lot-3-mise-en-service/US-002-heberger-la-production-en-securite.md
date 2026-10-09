# US-002 — Héberger la production en sécurité

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D0 Socle et mise en service |
| **Lot** | 3 |
| **Priorité** | Must |
| **Exigences** | EF-308 (antivirus, chiffrement), ENF-01, ENF-02, ENF-04, ENF-07, ENF-20 → ENF-23 |
| **Règles** | — |
| **Décisions liées** | Questions DIT (architecture AWS) |

## Récit

> En tant qu'**Administrateur**, je veux que le portail tourne sur le compte AWS d'ACME SA, chiffré, sauvegardé et surveillé, **afin d'ouvrir le portail aux vrais employés sans risque pour leurs données**.

## Pourquoi

Sans socle fiable, aucune donnée réelle ne peut entrer (Aucune donnée réelle hors production sécurisée) et la direction ne voit rien fonctionner.

## Critères d'acceptation

- **CA-01** HTTPS uniquement, à l'adresse carriere.acmehaiti.com ; la recette est séparée, protégée et sur données fictives.
- **CA-02** Base et documents chiffrés ; chaque fichier déposé est analysé par un antivirus avant d'être accessible.
- **CA-03** Sauvegarde quotidienne de la base, conservée 30 jours ; documents versionnés.
- **CA-04** Une restauration est testée avec succès avant l'ouverture, puis à la fréquence fixée avec la DIT.
- **CA-05** Les secrets sont dans AWS Secrets Manager ; une alerte prévient si le coût mensuel dépasse le seuil fixé.
- **CA-06** Répétition de migration : la même image Docker que le démonstrateur démarre sur le sandbox AWS (RDS, S3) en ne changeant que les variables d'environnement (venu de US-001).

## Notes

Architecture : `../../../6-architecture-aws/architecture-aws.html`.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
