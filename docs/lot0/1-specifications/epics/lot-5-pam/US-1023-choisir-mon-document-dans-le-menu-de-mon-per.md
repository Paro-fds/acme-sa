# US-1023 — Choisir mon document dans le menu de « Mon PER »

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Version du directeur du 2026-10-29 (`PAM_pour_Skin`) : `modele_authentification.md` (étape 4 « Menu principal », « Facilités du service »), `index.html` (`#menu-principal`, `#retour-menu`), `pam.js` (`menuPrincipal`, `ouvrirDocument`, balance « … USD »), `pam.css` (`#montant` centré) |
| **Règles** | — |
| **Décisions liées** | D-61 |

## Récit

> En tant qu'**employé**, je veux choisir dans un menu la balance, le relevé ou la fiche de paie, **afin de d'ouvrir directement le document que je cherche**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** « Mon PER » est un menu : « Balance PER », « Relevé PER », « Fiche de paie » ; chaque choix ouvre sa page (`/per/balance`, `/per/releve`, `/per/fiche`) ; « Menu principal », en haut de chaque page, ramène au menu ; « Mon PER » reste surligné dans le menu de l'application.
- **CA-02** « Balance PER » montre la dernière photo, centrée : le montant suivi de « USD » (« 121.480,75 USD »), puis « Septembre 2026 · mise à jour le 30/09/2026 » ; sans balance : « Aucune balance n'est disponible pour le moment. »
- **CA-03** « Relevé PER » et « Fiche de paie » montrent, chacun sur sa page, le relevé (US-1012) et la fiche (US-1022) ; « Une question sur votre PER ou votre paie ? Adressez-vous à la DRH. » sur chaque page.

## Notes

Choix de l'utilisateur du 2026-10-29 : menu dans « Mon PER », à notre apparence (cartes), même logique que le directeur. Répond à Q19 pour la balance : USD (la fiche de paie reste en HTG). Main levée hors de ce menu : espace de gestion RH (D-64, US-1026). Les comptes et intérêts de US-1012 ne sont plus sur la balance, comme chez le directeur.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
