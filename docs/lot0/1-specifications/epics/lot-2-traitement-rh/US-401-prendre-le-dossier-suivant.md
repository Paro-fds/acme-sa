# US-401 — Prendre le dossier suivant

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | D4 Validation RH |
| **Lot** | 2 |
| **Priorité** | Must (Should pour la réaffectation) |
| **Exigences** | EF-401, EF-405, EF-406 |
| **Règles** | RG-40, RG-42, RG-43 |
| **Décisions liées** | D-12, D-14 |

## Récit

> En tant qu'**Agent RH**, je veux prendre le certificat suivant dans une file commune, **afin qu'aucun dossier ne reste bloqué quand une collègue est absente**.

## Pourquoi

Un certificat ne vaut que validé ; délai cible 5 jours ouvrables (Q2).

## Critères d'acceptation

- **CA-01** La file est commune et triée du plus ancien au plus récent ; au-delà de 5 jours ouvrables, le dossier est en alerte.
- **CA-02** Un dossier pris passe « en cours » à mon nom ; personne d'autre ne peut le traiter en même temps.
- **CA-03** Mon propre certificat n'apparaît jamais dans ma file.
- **CA-04** Un Administrateur peut réaffecter un dossier à un autre valideur.

## Definition of Done

- [ ] Chaque critère d'acceptation est couvert par un test vert
- [ ] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [ ] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [ ] Statut mis à jour ici et dans `../README.md`
