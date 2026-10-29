# US-119 — Publier un poste à partir du catalogue des postes ACME

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D8 Carrière et postes |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-803, EF-804 |
| **Règles** | RG-72 |
| **Décisions liées** | — |

## Récit

> En tant qu'**Agent RH**, je veux choisir un poste dans le catalogue des descriptions de poste d'ACME et le publier sans réécrire son texte, **afin de publier vite un poste complet et précis, et que l'employé sache exactement ce qu'on attend de lui**.

## Pourquoi

Besoin 3 : une raison de participer. Critère n°3 : les employés reviennent d'eux-mêmes.

## Critères d'acceptation

- **CA-01** « Postes ouverts » a deux onglets : « Postes publiés » (l'écran actuel) et « Catalogue des postes ACME », la liste de toutes les descriptions de poste, avec leur domaine et le niveau demandé (« Non précisé » si la fiche n'en donne pas).
- **CA-02** Le catalogue se filtre par mots de l'intitulé et par domaine ; chaque fiche s'ouvre en aperçu (description, missions, qualifications, expérience, conditions d'exercice, qualités attendues) sans quitter la liste.
- **CA-03** « Publier ce poste » (Agent RH ou Administrateur) ouvre le formulaire de saisie pré-rempli : intitulé, mission (la description de la fiche), domaines de diplôme proposés à partir du domaine de la fiche, niveau minimum suggéré par la fiche ; tout reste modifiable et le poste suit le circuit habituel (brouillon, publication par un Administrateur).
- **CA-04** L'unité, les dates, le grade visé et les autres critères se saisissent comme avant ; seuls les employés qui remplissent tous les critères voient le poste (US-801, US-115).
- **CA-05** L'employé qui voit le poste lit la fiche complète, rubrique par rubrique, en plus de la mission et des critères.
- **CA-06** Un poste saisi hors catalogue (« Saisir un poste ») fonctionne comme avant.

## Notes

Demande de l'utilisateur du 2026-10-14 (maquette « Postes ouverts : catalogue des postes ACME », écrans A, B et D, validée pour la démonstration au directeur). Source : les 70 descriptions de poste d'ACME transmises par l'utilisateur (dossier postes/) et son tableau poste → domaine ; importées par app/tools/import_job_profiles.py, à remplacer par la base SQLite du directeur quand elle sera fournie. Les vraies fiches entrent dans le dépôt et la démo en ligne (choix de l'utilisateur du 2026-10-14 ; aucune donnée de personne). Domaines de diplôme proposés par domaine de fiche : proposition du développeur, à valider par la DRH. Hors périmètre : la notification aux employés (story suivante), le domaine métier des employés, le nombre d'employés par poste (correspondance avec le fichier RH en cours). Nouveau par rapport au registre : à faire noter par M. Hilaire, comme US-117.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
