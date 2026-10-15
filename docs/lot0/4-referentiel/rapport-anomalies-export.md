# B-01 — Anomalies de l'export RH et premier rapprochement avec le fichier des agences

| | |
|---|---|
| **Version** | 0.1, 2026-10-06 (brouillon, à relire avant envoi) |
| **Sources** | Export RH `vault-employee-list_20261001-1400.csv` (1er octobre 2026) ; fichier des agences `annexe_branch.csv` reçu le 2026-10-06 |
| **Règle** | Chiffres et noms d'unités seulement, aucune donnée personnelle (S-04). Les listes nominatives (doublons, lignes sans email) ne figurent pas ici : elles seront remises à Mme Nérius seule. |
| **Rangement des fichiers sources** | Hors du dépôt git et de OneDrive : l'export reste dans `app-web\data\` ; le fichier des agences est dans `C:\acme-data-v2\referentiel\` (il contient les noms et numéros de compte des DA et DR) |

## 1. Chiffres généraux de l'export

| Constat | Valeur |
|---|---|
| Lignes | 1 198 |
| Actifs (`active = true`) | **364** |
| Inactifs | 834 |
| Inactifs sans date de départ | 12 |
| Actifs avec une date de départ | 0 |

**364 actifs contre ~500 réels (S-09) :** l'export ne permet pas d'expliquer l'écart à lui seul. Les 12 inactifs sans date de départ sont une piste, insuffisante pour ~136 personnes. ❓ Cause à confirmer avec la DRH : indicateur « actif », périmètre d'extraction, ou employés absents du système.

## 2. Qualité des données des 364 actifs

| Champ | Vides | Remarque |
|---|---:|---|
| Email | **94** (26 %) | Pas bloquant : « Je n'ai pas d'adresse email » est prévu (RG-01) |
| Responsable (`depends_on`) | 9 | |
| Matricule, téléphone, adresse, date d'embauche, date de naissance, poste, direction, agence | 0 | |

| Contrôle | Résultat |
|---|---|
| Matricules en double | **2** chez les actifs (3 sur toutes les lignes) |
| Même nom, prénom et date de naissance | **2** cas chez les actifs, sans doute les mêmes personnes, à confirmer |
| Emails en double | 0 |
| Caractères mal encodés dans les noms | 0 détecté |

**Domaines des emails des actifs :** gmail.com 163, yahoo.fr 82, yahoo.com 18, rocketmail.com 2, **acmehaiti.com 2**.
→ Presque aucun employé n'a d'email institutionnel dans l'export. Le deuxième canal de notification (« email institutionnel », RG-50) ne toucherait aujourd'hui personne. ❓ À signaler au directeur : les adresses institutionnelles existent-elles ailleurs ?

## 3. Agences : rapprochement avec le fichier des agences

Le fichier des agences compte **35 agences** réparties dans **8 régions** (Métropole 1, Métropole 2, Grand Sud 1, Grand Sud 2, Bas Artibonite, Haut Artibonite, Bas Plateau, Haut Plateau), avec un type RURAL / URBAIN.

**La colonne `agency_code` de l'export utilise les mêmes codes à 2 lettres que la colonne `CODE` du fichier.** La correspondance des agences est donc directe.

| Résultat | Actifs |
|---|---:|
| Code trouvé dans le fichier (30 agences) | 279 |
| **`PB`**, absent du fichier | **61** |
| **`RC`**, absent du fichier | **24** |
| **Total** | 364 |

### Effectif actif par code d'agence

| Code | Actifs | | Code | Actifs | | Code | Actifs |
|---|---:|---|---|---:|---|---|---:|
| PB ❓ | 61 | | CY | 12 | | BM | 8 |
| RC ❓ | 24 | | LC | 12 | | FN | 8 |
| HC | 18 | | SM | 10 | | LE | 8 |
| DM | 16 | | PN | 9 | | GM | 7 |
| PV | 16 | | TM | 9 | | LT | 7 |
| GN | 14 | | MS | 9 | | SN | 6 |
| BD | 14 | | MH | 9 | | AQ | 6 |
| PG | 14 | | CP | 9 | | LB | 5 |
| CL | 13 | | LL | 9 | | CB | 4 |
| CH | 13 | | MG | 8 | | MB | 3 |
| | | | | | | PR | 2 |
| | | | | | | AM | 1 |

**Agences du fichier sans aucun actif dans l'export :** CM Cameau, CR Croix-des-Bouquets, FM Fontamara, LN Laville Nord, LS Laville Sud. ❓ Fermées, récentes, ou employés codés ailleurs ?

### Les deux codes inconnus

| Code | Ce que montre l'export | Hypothèse, à confirmer |
|---|---|---|
| PB | 61 actifs répartis dans 14 directions et services (Direction Générale, DRHIT, Informatique, Comptabilité, Administration…) | Le siège ❓ |
| RC | 24 actifs, dont 22 au Recouvrement | Une unité centrale de recouvrement ❓ |

## 4. Directions et services (`department`)

Le fichier des agences ne contient **aucune direction ni aucun service**. L'export en compte 16 valeurs chez les actifs.

| Valeur dans l'export | Actifs | Remarque |
|---|---:|---|
| Direction Crédit | 163 | |
| Service Administration | 62 | |
| Direction Opération | 45 | |
| Service Recouvrement | 40 | |
| Direction Risques et Conformité | 14 | |
| Département Informatique Technologie | 7 | |
| Service Comptabilité | 6 | |
| Direction Générale | 6 | |
| Recouvrement | 5 | Doublon probable de « Service Recouvrement » |
| Direction Principale DRHIT | 5 | |
| Direction Audit | 3 | |
| Direction Principale MSCRD | 3 | |
| Direction Marketing | 2 | |
| Direction Principale FA | 1 | |
| Crédit | 1 | Doublon probable de « Direction Crédit » |
| Administration | 1 | Doublon probable de « Service Administration » |

❓ Libellés officiels, sigles (DRHIT, MSCRD, FA) et rattachement des services aux directions : à obtenir de Mme Nérius et Mme Jean.

## 5. Écarts entre le fichier des agences et le registre (Q4 §3)

| N° | Écart | Conséquence |
|---|---|---|
| R-01 | Pas de directions, services ni siège | Le tableau de correspondance (B-02) reste nécessaire pour ces unités |
| R-02 | Pas de date de début du rattachement agence → région | RG-71 demande des dates : ❓ date à retenir (lancement du portail ?) |
| R-03 | Aucune région nommée « Sud » : Grand Sud 1 et Grand Sud 2 | Critère de réussite n°1 à reformuler, ou regroupement de régions ❓ |
| R-04 | Cap-Haïtien rattaché au Haut Plateau, type Rural ; nom écrit « Cap-Haiten » dans `BRANCH` | À vérifier |
| R-05 | Deux libellés par agence (`BRANCH` « Branch Belladère », `AGENCES` « BELLADERE ») ; caractère parasite dans « L\`ESTERE » | ❓ Lequel est officiel ? Les accents sont absents de `AGENCES` |
| R-06 | Directeur d'agence non renseigné pour 7 agences | Postes vacants ou oubli ❓ |
| R-07 | Numéros de compte en notation scientifique (`1.23E+12`) | Excel a probablement perdu des chiffres. Sans effet sur le portail, qui ne lit pas ces colonnes |
| R-09 | Le fichier compte **35 agences** ; le registre en annonce **28** (Q4 §3) | ❓ Agences récemment ouvertes, agence mobile, points de service ? Le registre prévoyait ce point « à confirmer » |
| R-08 | Le fichier donne le responsable de chaque agence (DA) et de chaque région (DR) | Information nouvelle, liée à P-10 et au « responsable hiérarchique » du §4.2 du cahier des charges |

## 6. Questions pour Mme Nérius et Mme Jean

1. Que désignent les codes `PB` et `RC` ?
2. Les 5 agences sans actif sont-elles ouvertes ?
3. Quel libellé est officiel, `BRANCH` ou `AGENCES` ? Avec ou sans accents ?
4. Cap-Haïtien est-il bien au Haut Plateau, et rural ?
5. Quelle est la liste officielle des directions et des services, et leur rattachement ?
6. Depuis quand chaque agence est-elle dans sa région ?
7. Où trouver les adresses email institutionnelles des employés ?

## 7. Ce qui reste à faire dans B-01

- Effectifs actifs par région et par type d'agence (outil hors ligne lancé sur le poste du développeur).
- Listes nominatives des doublons et des actifs sans email, remises à Mme Nérius seule.
