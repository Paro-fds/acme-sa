# US-131 — Retrouver « Ma carrière » de la refonte

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

> En tant qu'**employé**, je veux voir mon parcours en une frise claire, les postes ouverts pour moi en un coup d'œil et où en est ma candidature, **afin de savoir quoi viser et où j'en suis**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/MaCarriere.dc.html`), dans le cadre d'US-127.

## Critères d'acceptation

- **CA-01** En-tête : « Ma carrière », « Votre parcours, de vos études à aujourd'hui, les postes ouverts pour vous et le suivi de vos candidatures. », et un bandeau illustré « Chaque étape de votre parcours compte pour la suivante. ». Aucun emoji.
- **CA-02** « Mon parcours » : les filtres à côté du titre ; une frise avec la date à gauche de chaque élément. En tête, « Aujourd'hui » : le poste, l'agence et l'ancienneté (dans « Tout » et « Chez ACME »). Chaque élément : son titre, « Chez ACME » ou « Hors ACME » et sa nature, sa source (Système RH, Validé par les RH, En cours d'examen, Déclaré par vous). Compétences et mention de visibilité inchangées (US-114).
- **CA-03** « Postes ouverts pour vous · N » : chaque poste en petite carte (intitulé, unité, « reste N jours » (au-delà de 90 jours, « jusqu'au » et la date), « N critères sur N » ou « Ouvert à tous », « Candidature envoyée » s'il y a lieu). « Voir le poste et postuler » déplie la carte sur place : date limite, mission, compétences, rubriques de la fiche, critères et « Postuler » (US-801, US-119, US-902).
- **CA-04** Une adresse `/carriere#poste-<id>` ouvre la carte de ce poste et y descend ; « Voir le poste et postuler » de l'accueil (US-128) y mène.
- **CA-05** « Mes candidatures » : pour une candidature en cours, les 7 étapes du circuit (« Reçue et enregistrée », « Étude par la DRH », « Consultation du responsable du département », « Évaluation, si nécessaire », « Décision de la DRH », « Approbation de la Direction Générale », « Clôture ») : les étapes passées avec leur date, l'étape en cours « En cours depuis le … », les suivantes à venir ; puis « Retirer ma candidature » (US-902). Une candidature clôturée montre son issue.
- **CA-06** Sur ordinateur, postes et candidatures dans la colonne de droite ; sur téléphone, sous le parcours.

## Notes

Choix de l'utilisateur du 2026-10-19 : « Voir le poste et postuler » déplie la carte sur place. Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
