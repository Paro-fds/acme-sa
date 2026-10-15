# US-113 — Retrouver mon espace sur ordinateur, avec ma photo

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 2 |
| **Priorité** | Must |
| **Exigences** | EF-201 (écran) |
| **Règles** |  |
| **Décisions liées** |  |

## Récit

> En tant qu'**employé**, je veux utiliser le portail aussi bien sur un ordinateur que sur mon téléphone, et m'y reconnaître, **afin d'avoir envie d'y revenir pour tenir mon dossier à jour**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** Sur ordinateur, un menu à gauche (Accueil, Mon dossier, Mes certificats, Mon parcours, Ma carrière ; nom, poste et « Se déconnecter » en bas), le contenu au centre et, à droite, la progression et l'aide de la page ; la barre du bas du téléphone n'y figure pas.
- **CA-02** Sur téléphone, la barre du bas reste (« Mon profil » devient « Mon dossier ») et un bouton menu (☰) ouvre toutes les rubriques, dont Mon parcours, avec « Se déconnecter ».
- **CA-03** La Penseuse est retirée des écrans employé, comme de l'accueil et de la connexion ; ses messages deviennent des conseils sobres.
- **CA-04** La photo officielle de l'employé (système RH) s'affiche dans le menu, sur Mon dossier, et dans la liste et la fiche de l'espace de gestion ; tant qu'elle n'existe pas, les initiales occupent la même place et la même taille.
- **CA-05** Sur ordinateur, les boutons d'enregistrement sont en bas du formulaire, plus dans une barre collée.

## Notes

Choix de l'utilisateur du 2026-10-12 d'après les maquettes « Espace employé sur ordinateur » et « Photo officielle » (canvas « Accueil et connexion — avant / après ») : menu à gauche, bouton menu sur téléphone. La source des photos (système du directeur) reste à préciser : le champ photo_url est exposé vide, sans import ni lien « Ma photo n'est plus à jour » pour l'instant. Aucune vraie photo hors production.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
