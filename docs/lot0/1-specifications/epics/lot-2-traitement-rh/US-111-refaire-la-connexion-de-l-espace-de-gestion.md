# US-111 — Refaire la connexion de l'espace de gestion

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-104 (écran) |
| **Règles** | RG-80, RG-81, RG-82 |
| **Décisions liées** | D-47, D-42 |

## Récit

> En tant que **personne des RH, administrateur ou membre de la direction**, je veux me connecter sur un écran sobre et soigné qui me concerne, **afin d'entrer dans l'outil de gestion avec confiance**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** L'espace s'appelle « Espace de gestion » (connexion et en-tête des écrans intérieurs) : il sert aux Agents RH, aux Administrateurs, au Responsable du référentiel et à la direction (Lecture seule).
- **CA-02** Sur ordinateur, un panneau bleu de la charte à gauche (logo, « Espace de gestion », à qui il s'adresse, mention du réseau ou du VPN) et le formulaire à droite ; sur téléphone, le panneau devient un bandeau en haut.
- **CA-03** Deux étapes, chacune avec son écran épuré : « Étape 1 sur 2 · Connexion » (identifiant, mot de passe), puis « Étape 2 sur 2 · Vérification » (code à 6 chiffres) ; les règles de US-102 et US-107 sont inchangées.
- **CA-04** Un message reçu en arrivant (« Vous devez être connecté », session expirée) s'affiche en information, jamais comme une erreur.
- **CA-05** « Mot de passe oublié ? » donne sa réponse sans clic : demander à un Administrateur de réinitialiser l'accès.

## Notes

Choix de l'utilisateur du 2026-10-11 d'après la maquette « Connexion RH et Administrateur » (canvas « Accueil et connexion — avant / après ») : sobre mais soigné, des personnes haut placées l'utiliseront ; « Espace de gestion » plutôt qu'« Espace RH » (A01). À confirmer par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
