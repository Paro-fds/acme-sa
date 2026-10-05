# Scénario de test — Portail employés ACME SA (MVP)

**Objectif :** vérifier, en conditions réelles, les 7 critères de succès du PRD (§9) : un employé met à jour son dossier depuis son téléphone **sans aide**, et l'administration suit la campagne **sans pouvoir modifier un dossier**.

| | |
|---|---|
| **Participants** | Le directeur (testeur) et un observateur (qui ne guide pas) |
| **Durée prévue** | 45 minutes environ |
| **Matériel** | Le téléphone du directeur ; un ordinateur pour l'administration ; un document à joindre (diplôme ou attestation en PDF, ou une photo prise sur le moment) |
| **Lieu** | Même Wi-Fi que la machine qui fait tourner le portail |

> **Règle pour l'observateur :** ne pas expliquer l'écran, ne pas montrer où toucher. Si le testeur demande de l'aide, répondre seulement après 30 secondes de recherche, noter la demande dans la fiche (§4) et dire la phrase la plus courte possible.

---

## 1. Préparation (observateur, la veille)

- [ ] Répétition générale faite avec ce scénario, puis base remise à zéro (`docs/guide-demarrage.md` §6)
- [ ] Contrôle du CSV : `python -m app.tools.check_csv` → « tout est conforme » (`docs/guide-demarrage.md` §2)
- [ ] Portail lancé (`.\run.ps1`), machine branchée sur le secteur, mise en veille désactivée
- [ ] Adresse du portail notée sur une carte : `http://<adresse>:8000` (employé) et `http://<adresse>:8000/admin/connexion` (administration)
- [ ] Ouverture de l'adresse vérifiée depuis un autre téléphone sur le même Wi-Fi
- [ ] Mot de passe administrateur définitif connu de l'observateur
- [ ] Vérifié dans le CSV que le directeur figure parmi les employés actifs, avec sa date de naissance exacte
- [ ] Fiche d'observation imprimée (§4), chronomètre prêt

---

## 2. Déroulé

### Partie A — L'employé met à jour son dossier (critère 1)

**Consigne donnée au directeur, telle quelle :**

> « Voici l'adresse du portail. Retrouvez votre dossier, corrigez au moins deux informations — par exemple votre téléphone et votre adresse —, joignez un document, puis envoyez votre mise à jour. Je ne peux pas vous aider : faites comme si vous étiez seul. »

L'observateur lance le chronomètre quand le directeur ouvre l'adresse.

| # | Ce que fait le testeur | Résultat attendu | OK ? |
|---|---|---|---|
| A1 | Saisit son nom, son prénom et sa date de naissance | Le portail le reconnaît et lui demande de **créer** un mot de passe | |
| A2 | Crée son mot de passe (8 caractères minimum) | Il arrive sur son dossier : nom, poste, agence affichés | |
| A3 | Choisit « Oui, mettre à jour mon dossier » | Étape 1 « Informations » | |
| A4 | Modifie au moins deux champs (téléphone, email, adresse, nom ou prénom) | Les champs modifiés sont signalés ; un numéro mal saisi affiche un message près du champ | |
| A5 | Passe à l'étape « Documents » et joint un document (PDF, ou photo prise avec le téléphone) | Le document apparaît avec son type, son nom et sa taille | |
| A6 | Passe à l'étape « Vérification » | Les anciennes et nouvelles valeurs sont côte à côte ; le document est listé | |
| A7 | Envoie sa mise à jour | Écran de confirmation ; son dossier indique « Mise à jour effectuée » | |

L'observateur arrête le chronomètre à l'écran de confirmation.

| # | Action (facultative) | Résultat attendu | OK ? |
|---|---|---|---|
| A8 | Sur son profil, « Modifier à nouveau », corriger un champ puis renvoyer | L'étape 1 reprend les valeurs envoyées ; après le nouvel envoi, le profil affiche la correction (US-24) | |

### Partie B — Reprise d'une démarche interrompue (critère 2)

Avec la deuxième personne (un autre employé réel du CSV, qui n'a pas encore fait sa mise à jour), sur son téléphone :

| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| B1 | S'identifier, créer le mot de passe, choisir « Oui », modifier un champ | « Brouillon enregistré automatiquement à HH:MM » s'affiche | |
| B2 | Fermer complètement le navigateur, attendre 2 minutes | — | |
| B3 | Rouvrir l'adresse, s'identifier avec le mot de passe | Le dossier propose « Reprendre la mise à jour » ; la modification de B1 est toujours là | |
| B4 | Ne pas envoyer : laisser la démarche en brouillon | (sert à la partie D) | |

### Partie C — Un homonyme n'accède pas au dossier d'un autre (critère 3)

| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| C1 | Sur un téléphone déconnecté, saisir le nom et le prénom du directeur avec **une autre date de naissance** | « Informations non reconnues. Vérifiez votre saisie. » ; aucune donnée affichée | |
| C2 | Si le contrôle du CSV a signalé des identités en double : saisir l'une d'elles | « Contactez l'administration » ; aucun dossier n'est ouvert | |
| C3 | Saisir l'identité du directeur avec un mauvais mot de passe 5 fois | Après la 5ᵉ erreur, la connexion est bloquée 15 minutes | |

Les cas d'homonymes (mêmes nom et prénom, dates différentes) sont aussi couverts par les tests automatiques de US-01.

### Partie D — L'administration suit la campagne (critères 4, 5, 6)

Sur l'ordinateur, puis sur un téléphone :

| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| D1 | Se connecter à `/admin/connexion` | Tableau de bord : total, mises à jour effectuées, non effectuées, progression | |
| D2 | Lire les chiffres | La mise à jour du directeur est comptée dans « effectuées » ; le brouillon de la partie B est compté dans « non effectuées » | |
| D3 | Ouvrir la liste et taper les premières lettres du nom du directeur dans la recherche (chronométrer) | Son dossier apparaît en quelques secondes, avec « Mise à jour effectuée » | |
| D4 | Rechercher par matricule, puis sans accents ou en minuscules | Le même dossier est retrouvé | |
| D5 | Filtrer par « Non effectuée » | La deuxième personne (brouillon) apparaît ; aucune de ses valeurs de brouillon n'est visible | |
| D6 | Ouvrir le dossier du directeur | Date du dernier envoi ; chaque changement en « Ancienne → Nouvelle » (valeur d'origine → valeur du dernier envoi) | |
| D7 | Dans le bloc « Documents », toucher « Voir » | Le PDF s'ouvre dans un nouvel onglet, ou la photo s'affiche en plein écran avec un bouton de fermeture | |
| D8 | Revenir à la liste | La recherche et le filtre sont conservés | |

### Partie E — L'administration ne peut pas modifier un dossier (critère 7)

| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| E1 | Chercher, dans le dossier du directeur, un moyen de modifier une valeur ou de supprimer un document | Aucun champ de saisie, aucun bouton de modification ou de suppression ; badge « Lecture seule » | |
| E2 | Bloc « Accès » : « Réinitialiser l'accès », puis **Annuler** | Rien ne change (« Compte activé ») | |
| E3 | (Facultatif, sur le compte de la deuxième personne) « Réinitialiser l'accès », puis confirmer | Message « Accès réinitialisé… » ; à sa prochaine connexion, elle crée un nouveau mot de passe et retrouve son brouillon intact | |

La réinitialisation de l'accès est la **seule** action possible : elle efface le mot de passe, jamais les données du dossier. L'absence de toute autre route d'écriture est aussi vérifiée par les tests automatiques (US-20, US-21).

---

## 3. Grille des critères de succès (PRD §9)

| # | Critère | Étapes | Validé ? | Remarque |
|---|---|---|---|---|
| 1 | Le directeur, sur son téléphone, retrouve son dossier, modifie au moins deux champs, ajoute un document et soumet **sans aide** | A1 → A7, aucune demande d'aide | | |
| 2 | Une démarche interrompue (brouillon) peut être reprise plus tard sans perte | B1 → B3 | | |
| 3 | Un homonyme n'accède jamais au dossier d'un autre employé | C1, C2 | | |
| 4 | L'administrateur voit la mise à jour soumise apparaître dans les statistiques et la liste | D2, D3 | | |
| 5 | L'administrateur retrouve un employé précis via la recherche en quelques secondes | D3, D4 | | |
| 6 | L'administrateur consulte les anciennes / nouvelles valeurs et ouvre les documents transmis | D6, D7 | | |
| 7 | L'administrateur ne dispose d'aucun moyen de modifier un dossier | E1, E2 | | |

**Le MVP est validé si les 7 critères sont validés.**

---

## 4. Fiche d'observation

| | |
|---|---|
| Date et heure | |
| Testeur | |
| Téléphone (marque, modèle, navigateur) | |
| Connexion | Wi-Fi local / tunnel |

### Temps

| Mesure | Valeur |
|---|---|
| Parcours employé complet (ouverture de l'adresse → confirmation, partie A) | ___ min ___ s |
| Recherche d'un employé par l'administration (D3) | ___ s |

### Demandes d'aide (hypothèse H3)

| Heure | Étape | Question posée | Réponse donnée |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

**Nombre total de demandes d'aide :** ___

### Envoi de documents (hypothèse H5)

| Document (type, PDF ou photo) | Taille approximative | Envoyé du premier coup ? | Problème rencontré |
|---|---|---|---|
| | | | |
| | | | |

### Identification et homonymes (hypothèse H4)

| Cas | Résultat observé |
|---|---|
| Identification du directeur (A1) | Reconnu du premier coup / après ___ essais |
| Mauvaise date de naissance (C1) | |
| Identité en double (C2) | |

### Incidents

| Heure | Étape | Ce qui s'est passé | Gravité (bloquant / gênant / mineur) |
|---|---|---|---|
| | | | |
| | | | |

### Hésitations remarquées (sans demande d'aide)

| Étape | Ce qui a fait hésiter |
|---|---|
| | |
| | |

---

## 5. Questions de fin (5 minutes)

1. Qu'est-ce qui vous a semblé le plus simple ? Le plus difficile ?
2. Y a-t-il un mot ou un écran que vous n'avez pas compris ?
3. Un employé de l'agence la moins à l'aise avec le téléphone y arriverait-il seul ? Qu'est-ce qui l'en empêcherait ?
4. Côté administration, manque-t-il une information pour suivre la campagne ?
5. Seriez-vous prêt à ouvrir le portail à tous les employés après les corrections notées ?

---

## 6. Après le test

- Sauvegarder `ACME_DATA_DIR` (`docs/guide-demarrage.md` §4) avant toute remise à zéro.
- Reporter les incidents et les hésitations dans de nouvelles stories : les spécifications validées ne se modifient pas sans l'accord de l'utilisateur (agent.md §1).
