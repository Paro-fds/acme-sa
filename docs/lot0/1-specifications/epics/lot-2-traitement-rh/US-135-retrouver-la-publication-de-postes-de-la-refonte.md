# US-135 — Retrouver la publication de postes de la refonte

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | — |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**agent RH**, je veux voir d'un coup d'œil où en est chaque poste (brouillon, publié, clôturé, pourvu), qui l'a saisi ou publié et combien de candidatures il a reçues, **afin de savoir quoi faire ensuite**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/RhPostes.dc.html`), dans le cadre d'US-127. Reprend US-802, US-119 et US-124.

## Critères d'acceptation

- **CA-01** En-tête : « Publication de postes », « N postes · N publiés · N candidatures reçues », « Saisir un poste hors catalogue » (Agent RH, Administrateur). Aucun emoji.
- **CA-02** Onglets « Postes publiés » et « Catalogue des postes ACME · N » (nombre de fiches du catalogue).
- **CA-03** Chaque poste : intitulé en lien vers sa fiche et code ; unité, puis selon le statut « du … au … » (brouillon, publié), « date limite passée le … » (clôturé) ou « pourvu le … » (pourvu) ; « saisi par vous » pour un brouillon que l'on a saisi ; pour un poste publié, « Lettre du directeur RH jointe par … » ou « Publié par … » sans lettre ; le nombre de candidatures quand il y en a ; le statut.
- **CA-04** Brouillon : « Pour publier, joignez la lettre du directeur RH. » et « Joindre la lettre et publier » (vers la fiche du poste) pour l'Agent RH et l'Administrateur ; la lettre est demandée d'abord pour décourager une publication sans autorisation ; l'Administrateur garde « publier sans lettre » sur la fiche. Rien pour la Lecture seule.
- **CA-05** À côté de la liste : « Publier un poste » en 3 étapes (Choisissez une fiche ; Complétez et cliquez « Suivant » ; Joignez la lettre et publiez) et « Clôturer ou marquer pourvu » (« Réservé à l'Administrateur, depuis la fiche du poste. »).

## Notes

Choix de l'utilisateur du 2026-10-20 : demander la lettre avant de publier, à tous ; pour l'Administrateur la lettre reste facultative. Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
