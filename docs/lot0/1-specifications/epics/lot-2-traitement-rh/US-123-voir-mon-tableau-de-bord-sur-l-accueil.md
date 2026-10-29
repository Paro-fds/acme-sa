# US-123 — Voir mon tableau de bord sur l'accueil

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-201, EF-805, EF-902 |
| **Règles** | RG-07 |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**employé**, je veux voir dès l'accueil mes postes ouverts, mes certificats, ma candidature et mon dossier, avec leurs chiffres et leurs dates, **afin de savoir en deux secondes où j'en suis et ce que je peux faire maintenant**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** L'en-tête montre la date du jour, « Bonjour » et le prénom, une phrase qui dit un fait réel (nombre de postes ouverts pour moi, ou informations qui restent), le poste et l'agence ; « Déposer un certificat » à droite quand le dossier est complet.
- **CA-02** Quatre tuiles chiffrées, chacune avec un lien : postes ouverts pour moi, certificats validés sur déposés (avec ceux en examen), étape de ma candidature en cours sur 7, dossier en pourcentage ; la tuile de candidature n'apparaît que si une candidature est en cours.
- **CA-03** « Postes ouverts pour vous » liste les postes publiés dont je remplis tous les critères, avec le nombre de critères et le temps restant avant la date limite ; en tableau sur ordinateur, en cartes sur téléphone.
- **CA-04** « À ne pas manquer » montre les dates limites de ces postes et la date de ma prochaine confirmation annuelle, les plus proches d'abord.
- **CA-05** « Vos diplômes travaillent pour vous » invite à ajouter un diplôme ; « Mon parcours en chiffres » donne mon ancienneté, mon plus haut diplôme validé et le nombre d'éléments de mon parcours, avec un lien vers « Ma carrière » ; aucun grade n'est affiché.
- **CA-06** Dossier incomplet : la tuile du dossier passe en premier avec ce qui manque, chaque élément menant à son écran ; les tuiles des certificats et des postes disent qu'elles se débloquent après le dossier.
- **CA-07** « Nouveau pour vous » (US-120) et la demande de confirmation annuelle (US-205) restent en tête quand elles s'appliquent.

## Notes

Maquette « Accueil employé : version tableau de bord » validée par l'utilisateur (« cette maquette peut marcher », revue le 2026-10-15 : « faisons-le comme dans la maquette »), sans grade depuis US-122. Choix du 2026-10-15 : « Mon parcours en chiffres » gardé sans grade ; la candidature reste une tuile ; les étapes de candidature restent celles d'US-902. « Postes occupés » n'existe pas dans les données : remplacé par le nombre d'éléments du parcours déclaré (US-114). Les données viennent des API existantes (profil, postes, certificats, candidatures, parcours, confirmation annuelle). Le ton des accroches est à faire valider par les RH : elles ne promettent aucun poste.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
