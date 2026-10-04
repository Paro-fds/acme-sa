# E01 — Identification

**Objectif :** permettre à un employé actif d'accéder à son dossier de façon sécurisée : vérification de son identité (nom, prénom, date de naissance), puis mot de passe créé à la première connexion.

**Module backend :** `auth` (s'appuie sur `employee` pour la référence CSV).
**Écrans :** `/`, `/connexion/mot-de-passe`, `/connexion/homonyme`.

| Story | Titre | Priorité |
|---|---|---|
| [US-01](US-01-verifier-identite.md) | Vérifier son identité | MUST |
| [US-02](US-02-creer-mot-de-passe.md) | Créer son mot de passe | MUST |
| [US-03](US-03-se-connecter.md) | Se connecter avec son mot de passe | MUST |
| [US-04](US-04-se-deconnecter.md) | Se déconnecter | MUST |

```text
Nom + Prénom + Date de naissance            (US-01)
        |
        +-- aucun employé actif ---------> « Informations non reconnues »
        +-- plusieurs dossiers ----------> « Contactez l'administration »
        |
        v
  Un seul employé actif
        +-- pas de mot de passe ---------> Créer un mot de passe   (US-02)
        +-- mot de passe existant -------> Saisir le mot de passe  (US-03)
                                                   |
                                                Profil ---> Déconnexion (US-04)
```
