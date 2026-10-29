# US-1026 — Lever le gel de 72 heures d'un employé depuis l'espace de gestion

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Version du directeur du 2026-10-29 (`PAM_pour_Skin`) : `noyau.py` (`main_levee`), `serveur.py` (`/api/main-levee`), `modele_authentification.md` (« Facilités du service ») |
| **Règles** | — |
| **Décisions liées** | D-64 |

## Récit

> En tant qu'**agent RH**, je veux lever le gel de 72 heures qui bloque l'accès d'un employé après un changement de contact, **afin qu'il puisse se reconnecter sans attendre trois jours, une fois le changement vérifié**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Dans le dossier de l'employé (bloc « Accès »), un gel en cours se voit (« Gel de 72 heures en cours : contact changé récemment ») et « Lever le gel » le lève après confirmation ; sans gel, pas de bouton. Réservé aux comptes de gestion qui peuvent débloquer un accès (refusé en lecture seule, comme US-22).
- **CA-02** Les règles du directeur : seul un employé actif ; le gel du courriel et celui du numéro sont levés, l'adresse du dossier n'est pas modifiée ; sans gel : « Aucun gel en cours pour ce code. » (et « Aucun gel en cours, et ce dossier n'a pas d'adresse de courriel utilisable. » si le dossier n'en a pas) ; l'action est tracée au journal d'audit.
- **CA-03** Après la levée, l'employé reçoit l'avis HTML (US-1025) « La DRH a levé le gel de votre accès à PAM. Vous pouvez demander un code de vérification. » ; l'écran dit « Gel levé. Un code peut de nouveau être envoyé à l'adresse du dossier. », ou « Gel levé. Ce dossier n'a toujours pas d'adresse de courriel utilisable. »

## Notes

Décision D-64 (choix de l'utilisateur du 2026-10-29) : dans l'espace de gestion RH plutôt que dans la session PAM d'un employé de la DRH, comme le directeur.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
