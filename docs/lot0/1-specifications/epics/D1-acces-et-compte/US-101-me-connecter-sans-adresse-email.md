# US-101 — Me connecter sans adresse email

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 1 |
| **Priorité** | Must |
| **Exigences** | EF-101, EF-102 |
| **Règles** | RG-80 |
| **Décisions liées** | D-30 |

## Récit

> En tant qu'**employé**, je veux me connecter avec mon nom, mon prénom, ma date de naissance et mon mot de passe, **afin d'accéder à mon dossier même sans email (un quart des employés n'en ont pas)**.

## Pourquoi

Un employé sans email doit pouvoir entrer ; les comptes RH voient les dossiers de tous les employés.

## Critères d'acceptation

- **CA-01** Étant donné un employé actif de l'export, quand il saisit des informations exactes, alors il arrive sur son accueil.
- **CA-02** Après 5 mots de passe erronés, l'espace est suspendu 15 minutes, et le message dit quand réessayer.
- **CA-03** Le message d'erreur est le même, que la personne existe ou non : on ne peut pas deviner qui est employé.
- **CA-04** Un employé inactif dans l'export ne peut pas se connecter.
- **CA-05** Nom, prénom, date de naissance et mot de passe sur un seul écran ; « Première connexion ? Créer mon mot de passe » mène à la création du mot de passe.
- **CA-06** Pendant la suspension, un compte à rebours indique le temps restant ; le bouton se réactive à la fin.

## Notes

Comparaison avec le code actuel et décisions à prendre : `ecarts-accueil-et-connexion.md`.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
