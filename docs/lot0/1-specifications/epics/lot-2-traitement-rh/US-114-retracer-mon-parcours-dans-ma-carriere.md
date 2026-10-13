# US-114 — Retracer mon parcours dans Ma carrière

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D2 Dossier de l'employé |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | EF-201 (écran) |
| **Règles** |  |
| **Décisions liées** | D-17 |

## Récit

> En tant qu'**employé**, je veux voir mon parcours en une frise, de mes études à mon poste d'aujourd'hui, à côté des postes ouverts, **afin de comprendre d'où je viens et ce qui peut m'ouvrir un nouveau poste**.

## Pourquoi

Besoin 1 : des données fiables. Critère de réussite n°4 : 9 actifs sur 10 au dossier complet.

## Critères d'acceptation

- **CA-01** En haut de « Ma carrière », « Aujourd'hui » : poste, agence et ancienneté chez ACME SA (depuis la date d'embauche du système RH).
- **CA-02** La frise va du plus récent au plus ancien, par année : entrée chez ACME SA (système RH), certificats déposés (« Validé par les RH » ou « En cours d'examen » ; un certificat à corriger ou remplacé n'y figure pas), diplômes, formations et expériences déjà saisis (« Déclaré par vous ») ; les compétences s'affichent en étiquettes sous la frise.
- **CA-03** Des filtres réduisent la frise : Tout, Chez ACME, Hors ACME (certificats ; nom choisi le 2026-10-13), et Formations, Expériences seulement s'il y en a (2026-10-13).
- **CA-04** Les postes ouverts et les candidatures restent sur la page, à droite sur ordinateur, sous la frise sur téléphone ; les candidatures ne sont pas dans la frise.
- **CA-05** « Mon parcours » disparaît du menu, du menu du compte et de Mon dossier ; l'adresse /parcours mène à « Ma carrière ».

## Notes

Suggestion du directeur rapportée le 2026-10-12 (« une sorte de timeline pour retracer le parcours de l'employé ») et choix de l'utilisateur (maquette « Ma carrière en frise » du canvas) : « enlever Mon parcours, laissons seulement Ma carrière ». Le portail ne connaît que le poste actuel et la date d'embauche : les anciens postes chez ACME viendront quand la source sera connue (à demander au directeur, peut-être les mouvements lus dans les lettres, US-903). Les RH gardent l'affichage actuel du parcours sur la fiche employé. Ajouter des formations ou des expériences depuis le portail reste hors périmètre.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
