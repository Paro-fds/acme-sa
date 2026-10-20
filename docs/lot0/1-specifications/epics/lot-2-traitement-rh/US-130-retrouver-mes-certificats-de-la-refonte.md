# US-130 — Retrouver « Mes certificats » de la refonte

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D3 Certificats |
| **Lot** | 2 |
| **Priorité** | Should |
| **Exigences** | — |
| **Règles** | RG-26 |
| **Décisions liées** | D-47 |

## Récit

> En tant qu'**employé**, je veux voir où en est chacun de mes certificats, savoir ce que les RH me demandent de corriger et le renvoyer corrigé, **afin que mes diplômes comptent vite pour les postes qui me sont proposés**.

## Pourquoi

Refonte visuelle du 2026-10-19 (`docs/lot0/2-maquettes/4-refonte-2026-10-19/MesCertificats.dc.html`), dans le cadre d'US-127. Le redépôt d'un certificat « À corriger », annoncé au lot 2 par US-303, s'appuie sur le remplacement d'US-304.

## Critères d'acceptation

- **CA-01** En-tête : « Mes certificats », « Déposez vos diplômes et attestations. Les RH les vérifient, puis ils comptent pour les postes qui vous sont proposés. », « Déposer un certificat » (sauf au maximum de certificats, où un message le dit), et un bandeau illustré « Chaque diplôme validé peut vous ouvrir de nouveaux postes. ». Aucun emoji.
- **CA-02** « Niveau d'études validé » avec le niveau (ou « Aucun pour l'instant ») et « Établi par vos certificats validés par les RH ».
- **CA-03** Des filtres « Tous », « Validés », « En cours d'examen » (Reçu ou En vérification), « À corriger », chacun avec son nombre ; un certificat remplacé n'apparaît que dans « Tous », marqué « Archivé (remplacé) ».
- **CA-04** Chaque certificat : intitulé, type, niveau, année, « déposé le … », sa pastille. En cours d'examen : l'avancement « Reçu → En cours d'examen → Décision » et « Réponse des RH sous 5 jours ouvrables, au plus tard le … » (5 jours ouvrables après le dépôt). Validé : « Validé par les RH le … » et « Voir le fichier ».
- **CA-05** À corriger : « Message des RH : » avec le motif choisi par les RH et, s'il y en a un, leur commentaire ; un bouton « Corriger et renvoyer ».
- **CA-06** « Corriger et renvoyer » ouvre le dépôt déjà rempli avec les informations du certificat (le fichier est à choisir de nouveau) et rappelle le message des RH ; l'envoi crée un nouveau certificat « Reçu » et l'ancien reste archivé comme preuve (US-304 CA-02). Seul un certificat « À corriger » non archivé se renvoie ainsi.
- **CA-07** À droite sur ordinateur (en bas sur téléphone) : « Comment ça marche » (3 étapes), « Fichiers acceptés » (PDF, JPG ou PNG, la taille maximale), « Une question sur vos documents ? ».
- **CA-08** L'API de l'employé donne, pour chaque certificat, la date de décision, le motif et le commentaire des RH quand il est à corriger, et la date limite de réponse tant qu'il est en examen ; jamais le nom de l'agent RH.
- **CA-09** Inchangé : tant que le dossier est incomplet, la liste de ce qui reste avant de déposer (US-204).

## Notes

Choix de l'utilisateur du 2026-10-19 : le renvoi se fait dans cette story ; le message des RH montre le motif et le commentaire. Écarts avec les écrans validés (D-47) : à faire noter par M. Hilaire.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
