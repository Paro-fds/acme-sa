# B-03 — Matrice des postes et des compétences

| | |
|---|---|
| **Source** | `matrice_competences_20261014-123448.xlsx`, **fourni par le directeur**, transmis par l'utilisateur le 2026-10-15. Le fichier indique lui-même la source `liste_postes_competences.xlsx` |
| **Base SQLite** | `matrice_competences.sqlite`, **base du directeur**, transmise le 2026-10-15 : tables `poste` (84), `competence_poste` (308), `meta` (schéma 1). Contenu **identique** au classeur ci-dessus, qui en est donc l'export. Poste sans code : identifiant `p:officier de coordination en recouvrement judiciaire` ; les autres ont l'identifiant `c:<code>` |
| **Rangement** | Racine de `app-web-v2`, hors git, en attendant la décision de l'utilisateur |
| **Données personnelles** | Aucune : départements, services, postes et compétences |

## Contenu

| Onglet | Contenu |
|---|---|
| Postes | 84 postes (codes du type `AS07`, `CA17` ; un poste sans code : « Officier de coordination en recouvrement judiciaire »), dans 12 départements et 48 services |
| Compétences | 308 lignes, de 1 à 6 compétences par poste, 284 compétences différentes |

Les colonnes « Rattachement » et « Note » sont vides.

## Rapprochements (chiffres seulement)

| Avec | Résultat |
|---|---|
| Codes de poste de l'export RH (`ACR`, `AE`…) | Aucun code commun : les deux codifications sont différentes |
| Intitulés de l'export RH | 33 postes de même intitulé, dont 18 occupés, soit 159 employés actifs sur 364 |
| Fiches de poste HTML (69, US-119) | 34 postes ont une fiche ; 50 n'en ont pas ; 35 fiches n'ont pas de poste dans la matrice |
| Directions et services de l'export (B-01 §4) | Noms différents : « Ressources humaines », « Informatique », « Finance » d'un côté, « Direction Principale DRHIT », « Direction Principale FA » de l'autre ; « Juridique », « Formation » absents de l'export |

## Questions ouvertes

1. ❓ Usage voulu : rattacher les services aux départements dans le référentiel des unités ; afficher les compétences sur un poste publié ; s'en servir comme critère de visibilité. Les deux derniers seraient de nouvelles stories (le registre ne parle pas encore de compétences).
2. ~~Lien avec la base SQLite~~ Réglé le 2026-10-15 : le classeur est l'export de la base SQLite du directeur (contenu identique).
3. ❓ Le fichier peut-il entrer dans le dépôt et sur le démonstrateur ?
4. ❓ Quelle codification de poste fait foi : celle de l'export RH ou celle de la matrice ?
