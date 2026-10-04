# E05 — Administration

**Statut de l'epic :** En cours (versions minimales de US-15 et US-17 ; reste US-15 à US-22).

**Objectif :** permettre à l'administrateur de suivre l'avancement de la campagne, de retrouver rapidement un employé et de consulter ce qu'il a transmis, **sans jamais modifier un dossier**.

**Module backend :** `admin` (+ `auth` pour la connexion et la réinitialisation d'accès).
**Écrans :** `/admin/connexion`, `/admin`, `/admin/employes`, `/admin/employes/:id` — conçus en code avec le design system *ACME Enterprise Clarity* (pas de maquette Stitch).

**Deux statuts seulement** côté admin : « Mise à jour effectuée » (pastille verte) et « Mise à jour non effectuée » (pastille grise). Le brouillon n'est jamais visible par l'admin.

| Story | Titre | Priorité |
|---|---|---|
| [US-15](US-15-connexion-admin.md) | Se connecter en administrateur | MUST |
| [US-16](US-16-tableau-de-bord.md) | Voir le tableau de bord | MUST |
| [US-17](US-17-liste-employes.md) | Consulter la liste des employés | MUST |
| [US-18](US-18-rechercher-employe.md) | Rechercher un employé | MUST |
| [US-19](US-19-filtrer-statut.md) | Filtrer par statut | SHOULD |
| [US-20](US-20-consulter-dossier.md) | Consulter le dossier d'un employé | MUST |
| [US-21](US-21-consulter-documents-employe.md) | Consulter les documents d'un employé | MUST |
| [US-22](US-22-reinitialiser-acces.md) | Réinitialiser l'accès d'un employé | SHOULD |

```text
Connexion admin --> Tableau de bord --> Liste des employés --> Dossier (lecture seule)
                                          | recherche              |-- Documents
                                          | filtre statut          |-- Réinitialiser l'accès
```
