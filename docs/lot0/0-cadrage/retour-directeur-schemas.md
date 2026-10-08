# Analyse de conformité de l'artefact « Portail carrière : le système »

> Reçu du directeur le 2026-10-06, recopié tel quel. Porte sur la page « Portail carrière : le système » (schémas du système). Les corrections apportées sont listées à la fin.

**Refonte du portail employés, lot 0**

| Document analysé | Artefact « Portail carrière : le système » |
| :--- | :--- |
| **Références** | Registre des décisions de cadrage (Lot 0), v1.8, et message de lancement du lot 0, 6 octobre 2026 |
| **Date de l'analyse** | 6 octobre 2026 |
| **Préparé pour** | Gregory Hilaire, Directeur Principal Ressources Humaines, Informatique et Technologie |

---

## Verdict
L'artefact est fidèle au registre v1.8, mais il ne répond pas à ce que le message de lancement demandait.

---

## Ce qui est conforme
Aucune contradiction avec vos décisions n'a été trouvée.

* **Portail unique.** Une adresse, `carriere.acmehaiti.com`, sur AWS, avec deux entrées : l'espace employé et l'espace RH. Celui-ci est réservé au réseau de l'institution ou au VPN, avec double authentification (Q8).
* **Rôles.** Employé, Agent RH (Mme Nérius, R.-H. Joseph), responsable du référentiel (Mme Nérius, Mme Jean), Administrateur (G. Hilaire, M. Raymond), Lecture seule (Q2, Q4).
* **Parcours du certificat.** Connexion, profil à 8 éléments (5 obligatoires plus 3 à confirmer), verrou qui liste ce qui manque, dépôt, « En vérification », examen par l'Agent RH, puis validé ou à corriger avec motif et redépôt. Le niveau d'études est mis à jour à la validation et le résultat est notifié par WhatsApp (Q1, Q2, Q3, Q7).
* **Référentiel des unités.** L'export n'est jamais modifié, un tableau de correspondance le traduit, les valeurs inconnues vont dans « À rattacher » avec « Unité à confirmer », et le fichier agence → région porte une date de début (Q4).
* **Découpage en lots.** Il respecte le registre : référentiel et verrou au lot 1 ; file de validation, journal d'audit et mouvements extraits des lettres au lot 2 ; AWS, VPN et message de lancement au lot 3 ; postes, éligibilité, péremption et règles modifiables au lot 4 ; production des lettres et retour vers le système RH dans un lot distinct.

### Points de vigilance
Des points non tranchés sont traités comme acquis. PostgreSQL RDS est présenté comme décidé, alors que c'est une recommandation à confirmer. Le VPN, la région AWS et le prestataire WhatsApp sont aussi concernés. La consigne était de préparer une proposition par défaut sans considérer ces points comme tranchés.

---

## Ce qui manque

1. **Le lot 0.** Il n'apparaît pas dans « Ce qui arrive, et quand », ni ses 8 livrables.
2. **L'environnement de recette.** Aucune mention de `recette-carriere.acmehaiti.com`, des données fictives, ni de la règle « pas d'ouverture aux employés avant la fin du lot 3 ».
3. **Deux règles de protection des données.** La mention d'information et le consentement pour les nouvelles données personnelles (niveau d'études, contact d'urgence), et l'interdiction d'extraire ou de stocker les salaires dans les lettres.
4. **La séparation des tâches.** Un agent ne valide jamais son propre certificat.
5. **Les rôles du lot 4.** Responsable de département et Direction Générale (approbation) manquent dans la liste des rôles.
6. **Les relances.** Il manque le consentement WhatsApp, l'ordre WhatsApp, email institutionnel, email personnel, les relances à 7 et 14 jours et le résumé hebdomadaire des postes.
7. **La grille de classification des postes.** Elle conditionne les niveaux de certificat et leurs rangs (Q3), mais n'est pas présentée comme une donnée attendue de la DRH.
8. **L'accès au référentiel au lot 1.** L'espace RH n'arrive qu'au lot 2, et le document ne dit pas comment Mme Nérius gère le référentiel d'ici là.
9. **La charte graphique et le tableau unique des règles.** Ils ne sont pas évoqués.

---

## Suite donnée (2026-10-06)

Page corrigée et republiée à la même adresse (version 2) :

| Point | Correction |
|---|---|
| Vigilance | PostgreSQL, VPN, région AWS et prestataire WhatsApp marqués « [à confirmer] » partout |
| 1 | Lot 0 ajouté à « Ce qui arrive, et quand », avec ses 8 livrables |
| 2 | Section « Deux environnements » : recette sur données fictives, ouverture aux employés à la fin du lot 3 (repris au cahier des charges §11.3) |
| 3 | Mention et consentement à l'étape ② du parcours ; salaires exclus sur les lettres ; section « Règles qui s'appliquent partout » |
| 4 | Séparation des tâches à l'étape ⑥ du parcours et dans le tableau des rôles |
| 5 | Responsable de département et Direction Générale (approbation) ajoutés au schéma et au tableau des rôles, au lot 4 ; leur accès reste à préciser |
| 6 | Ordre des canaux ①②③, consentement WhatsApp, rythme des relances, résumé des postes |
| 7 | Grille de classification ajoutée au schéma et au tableau des pièces attendues |
| 8 | Proposition P-13 : fichier Excel importé par un Administrateur au lot 1 (cahier des charges §12.2) |
| 9 | Tableau unique des règles ajouté au schéma ; charte graphique dans les règles transversales |
