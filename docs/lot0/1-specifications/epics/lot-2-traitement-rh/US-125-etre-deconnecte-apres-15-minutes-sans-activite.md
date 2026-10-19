# US-125 — Être déconnecté après 15 minutes sans activité

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D1 Accès et compte |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | — |
| **Décisions liées** | — |

## Récit

> En tant qu'**employé ou compte de l'espace de gestion**, je veux être déconnecté quand je laisse l'application sans rien faire, **afin que personne ne puisse utiliser ma session sur un téléphone ou un ordinateur laissé ouvert**.

## Pourquoi

Les dossiers contiennent des données personnelles ; les comptes de gestion voient ceux de tous les employés.

## Critères d'acceptation

- **CA-01** Après 15 minutes sans activité, la session se ferme, dans l'espace employé comme dans l'espace de gestion (tous les rôles). Les deux durées restent réglables (`EMPLOYEE_SESSION_MINUTES`, `ADMIN_SESSION_MINUTES`) ; 15 par défaut.
- **CA-02** Un clic, une touche ou un défilement compte comme une activité, même sans rien enregistrer : une personne qui remplit un long formulaire n'est pas déconnectée.
- **CA-03** L'activité dans un onglet compte pour tous les onglets de l'application ouverts dans le même navigateur.
- **CA-04** À la fin du délai, sans avertissement préalable, l'écran revient à la page de connexion de son espace avec le message « Vous avez été déconnecté après 15 minutes sans activité. Reconnectez-vous. » Après la reconnexion, la personne arrive sur l'écran habituel (pas de retour à la page où elle était).
- **CA-05** Une page laissée ouverte n'interroge pas le serveur sans activité : rien ne garde une session ouverte à la place de la personne.

## Notes

Demande de l'utilisateur du 2026-10-17 (« quand la personne fait plusieurs minutes [sans] réagir dans l'app, on lui demandera de se reconnecter »). Choix du même jour : 15 minutes pour les employés et pour l'espace de gestion (au lieu de 30 et 120, `docs/02-solution-design.md` §Sécurité) ; activité = clics, saisie, défilement ; pas d'avertissement ; retour à la page de connexion. Ce qui était tapé sans être enregistré est perdu. En ligne, les variables Render `EMPLOYEE_SESSION_MINUTES` et `ADMIN_SESSION_MINUTES` se changent à la main si elles y sont définies.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
