# US-04 — Se déconnecter

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | E01 Identification |
| **Priorité** | MUST |
| **PRD** | F-07 |
| **Dépendances de code** | Sessions |
| **API** | `POST /api/auth/logout` |
| **Écran** | Menu de l'avatar dans l'en-tête (tous les écrans connectés) |

## Récit

> En tant qu'employé, je veux me déconnecter afin que personne ne puisse accéder à mon dossier depuis mon téléphone ou un appareil partagé.

## Critères d'acceptation

**CA-01 — Déconnexion**
Étant donné EMP-A connecté
Quand il choisit « Se déconnecter » dans le menu de l'avatar
Alors la session est supprimée en base
Et le cookie est effacé
Et il revient à l'écran d'identification avec le message « Vous êtes déconnecté. ».

**CA-02 — Ancien cookie inutilisable**
Étant donné le cookie de la session supprimée
Quand il est réutilisé sur `/api/me/profile`
Alors la réponse est `401`.

**CA-03 — Retour arrière du navigateur**
Étant donné l'employé déconnecté
Quand il utilise le bouton retour du navigateur
Alors aucune donnée de son dossier n'est affichée et il est renvoyé vers l'identification.

**CA-04 — Brouillon conservé**
Étant donné EMP-A avec un brouillon
Quand il se déconnecte puis se reconnecte
Alors son brouillon est intact.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-04.1 | CA-01, CA-02 | API | `tests/api/test_us04_logout.py` | session supprimée, cookie effacé, ancien cookie → 401 |
| T-04.2 | CA-04 | API | `tests/api/test_us04_logout.py` | brouillon toujours présent après reconnexion |
| T-04.3 | CA-01, CA-03 | Composant | `src/components/AppHeader.test.jsx` | menu avatar, redirection, données effacées du cache client |
| T-04.4 | CA-01 | Composant | `src/features/auth/IdentifyPage.test.jsx` | « Vous êtes déconnecté. » affiché comme information |
| T-04.5 | CA-01, CA-02, CA-03 | E2E | `e2e/us04-deconnexion.spec.js` | déconnexion par le menu, cookie supprimé, retour arrière et `/profil` sans données |

## Hors périmètre

- Déconnexion de tous les appareils.
