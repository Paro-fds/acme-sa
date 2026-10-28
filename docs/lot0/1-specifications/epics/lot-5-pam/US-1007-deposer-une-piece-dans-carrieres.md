# US-1007 — Déposer une pièce dans Carrières

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Plan PAM §3 (étape D) ; dictionnaire de Carrières (documents, fichiers_document, journal_audit) |
| **Règles** | — |
| **Décisions liées** | D-50, D-54 |

## Récit

> En tant qu'**employé**, je veux déposer le scan d'un diplôme ou d'un certificat, qui arrive directement dans Carrières, **afin que la DRH le qualifie et le valide là où elle travaille déjà**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** La pièce entre dans `documents` au statut `a_completer`, comme un dépôt de lot : `type_document`, alignement, catégorie, poste et lieu vides, date du dépôt comme `date_document`, `imputeur_code` = code de l'employé, `chemin_stockage` = `base`.
- **CA-02** Le scan va dans `fichiers_document`, avec son type reconnu sur le contenu (PDF, JPG, PNG) ; 4 Mo au plus. L'intitulé saisi sert de titre, sinon le nom du fichier sans extension.
- **CA-03** Le même fichier (empreinte SHA-256) déposé deux fois par le même employé est refusé avec « Vous avez déjà déposé ce fichier. Il est dans vos pièces. »
- **CA-04** Un code absent de `vault_actifs` reçoit « Votre dossier n'est pas encore ouvert dans Carrières. Contactez la DRH. ». Chaque dépôt écrit `versement_document` dans `journal_audit` de Carrières.

## Notes

Plan PAM (US-1007). Q6 en attente : l'intitulé est facultatif. Côté serveur seulement (`POST /api/me/pieces`) ; l'écran de dépôt passe sur Carrières avec US-1008. Hors production sans CARRIERES_DATABASE_URL : base fictive `carrieres.db` dans ACME_DATA_DIR.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
