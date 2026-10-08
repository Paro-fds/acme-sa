# Message de lancement du lot 0

> Reçu du directeur le 2026-10-06, recopié tel quel. Avec le registre des décisions (`registre-des-decisions-v1.8.md`), il fixe le cadre du lot 0.

| Élément | Détail |
| :--- | :--- |
| **Objet** | Lancement du lot 0 — Refonte du portail employés |
| **De** | Gregory Hilaire, Directeur Principal Ressources Humaines, Informatique et Technologie |
| **À** | Assistant en développement du portail (DIT) |
| **Date** | 6 octobre 2026 |
| **Pièce jointe** | Registre des décisions de cadrage (Lot 0), version 1.8 |

---

Bonjour,

J’ai bien reçu ton audit du 5 octobre. Je valide le plan en quatre lots, précédé du lot 0 de cadrage. Toutes mes réponses aux questions Q1 à Q10 sont réunies dans le document joint, « Registre des décisions de cadrage (Lot 0) », version 1.8. Il sert de référence : en cas de doute, c’est lui qui fait foi.

## 1. Ce que je te demande au lot 0
Des spécifications et des maquettes, pas de développement. Le code existant est réutilisé là où il sert (connexion, lecture du CSV, contrôle des fichiers, comptes admin, tests) et retiré là où il ne sert plus. Rien n’est développé avant ma validation des spécifications et des maquettes.

## 2. Livrables attendus
1. Spécifications écrites à partir du besoin métier, avec toutes les règles dans un tableau unique et commenté.
2. Maquettes des écrans employé et administration, selon la charte (Q9). Pense à un affichage pour téléphone d’abord.
3. Modèle de données : champs obligatoires, niveaux de certificat alignés sur la grille de classification, registre des demandes, mouvements de carrière, historique des confirmations.
4. Référentiel des agences, régions et directions, avec le tableau de correspondance de l’export RH.
5. Fichier Excel d’import de l’historique des demandes, et plan d’extraction des lettres scannées avec résultats sur un échantillon de 20 à 30 lettres.
6. Architecture AWS en un schéma d’une page, avec ta proposition de base de données, l’estimation du coût mensuel, la solution VPN et la gestion du DNS.
7. WhatsApp : proposition de prestataire et de coût, textes des modèles de messages, vérification de l’envoi automatisé par le serveur email.
8. Guide de style d’une page.

## 3. Par où commencer
* **Anomalies de l’export RH :** liste distincte des agences et des directions avec les effectifs, doublons de matricule, lignes sans email, problèmes d’encodage. Ce travail est le plus rapide et conditionne le reste. Signale aussi l’écart entre les 364 employés actifs de l’export et notre effectif réel d’environ 500 personnes. C’est la livraison attendue au premier cycle.
* Modèle de données et règles (livrables 1 et 3), avec Q1 à Q3 en priorité.
* Maquettes (livrable 2) : d’abord le parcours « certificat » avec le verrou, puis la file de validation RH.
* Les autres livrables en parallèle.

## 4. Ce que je te fournirai
* L’export RH actuel.
* La grille de classification des postes (Q3).
* Le fichier de correspondance agence → région (Q4).
* Le logo, la mascotte et la police de l’institution (Q9).
* Un échantillon de lettres de promotion et de transfert scannées (Q5).

Dis-moi ce dont tu as besoin en plus. Les dates de remise suivent le rythme décrit en section 6 : tu me montres l’avancement au moins tous les 48 heures.

## 5. Règles à respecter
* **Aucune donnée réelle d’employé** dans les environnements de test. Utilise uniquement des données fictives tant que la production sécurisée n’est pas prête (Q8).
* **Salaires et rémunérations :** ne jamais les extraire ni les stocker, y compris dans les lettres scannées.
* Les points surlignés en jaune dans le registre sont des éléments encore à confirmer. Tu peux préparer une proposition par défaut pour chacun, mais ne les considère pas comme tranchés.
* Si tu constates une contradiction, un risque ou une impossibilité technique dans mes décisions, signale-le avant de continuer. Je préfère le savoir tôt.

## 6. Méthode et rythme de travail
* **Nous travaillons en méthode agile**, par cycles courts de 48 heures au plus.
* **Backlog priorisé :** tu tiens une liste unique de tout ce qu’il y a à produire (les 8 livrables et leurs sous-tâches), classée par priorité, avec une estimation pour chaque élément. Je peux la réordonner à tout moment.
* **À chaque cycle :** tu prends les éléments les plus prioritaires, tu les termines et tu me montres le résultat (maquette, règle écrite, schéma). Pas de livraison en bloc à la fin.
* **Point d’avancement toutes les 48 heures ou moins :** ce qui est fait, ce qui est prévu au prochain cycle, ce qui te bloque et les décisions dont tu as besoin de ma part. Un message court suffit.
* **Retour rapide :** je réponds aux questions bloquantes le plus vite possible, au plus tard au point suivant. Pose-les une par une, avec ta proposition par défaut.
* **Fin du lot 0 :** démonstration d’ensemble et ma validation écrite avant de passer au lot 1.
* Bilan rapide en fin de lot : ce qui a bien marché, ce qu’on change pour le lot 1.

**Interlocutrices sur place :**
* Mme Colin Nérius (Assistant DRH, responsable du référentiel) et Mme Darling Jean pour le référentiel des agences et des directions.
* Mme Nérius et Rose-Herline Joseph pour les certificats et la file de validation.
Tu peux les solliciter directement pour avancer vite. Pour les questions d’infrastructure, adresse-toi à moi.

Merci pour la qualité de ton audit. Peux-tu me confirmer la bonne réception, et m’envoyer d’ici [48 heures] ton backlog priorisé et estimé pour le lot 0, ainsi que le contenu du premier cycle ?

Cordialement,
**Gregory Hilaire**
Directeur Principal Ressources Humaines, Informatique et Technologie
