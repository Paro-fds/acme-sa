# Plan d'implémentation — Portail carrière ACME SA (refonte)

| | |
|---|---|
| **Version** | 2.1, 2026-10-09 : lot 1 réalisé, sauf US-701 et US-702 reportées |
| **Rôle** | L'ordre de réalisation, le démonstrateur, le jeu de test et la Definition of Done commune |
| **Statuts** | **Aucun statut ici.** Ils sont à un seul endroit : l'index des epics (`lot0/1-specifications/epics/README.md`), repris dans chaque fichier de story et dans `agent.md` §0 |
| **Remplace** | Les plans du MVP (phases 0 → 6) et de la V2 (phases 7 → 10), retirés de la branche `v2` le 2026-10-08 |

## 1. Principes

1. **Une story à la fois**, livrée de bout en bout : domaine, API, écran, tests. La suivante commence après validation de l'utilisateur.
2. **Tests d'abord**, écrits à partir des critères d'acceptation.
3. **Questions au début de la story**, jamais à la fin.
4. **Chaque story finie se voit en ligne** : un push sur `v2` met le démonstrateur à jour. On ne pousse que des tests verts.
5. **Le démonstrateur ne reçoit que du travail du projet** : rien de « spécial démo ».
6. **Clean Architecture vérifiée automatiquement** (`02-solution-design.md` §3).

Le cycle détaillé d'une story (étapes, tests ciblés puis suite complète une fois, mise à jour des statuts, compte rendu) est dans `agent.md` §2.

## 2. Ordre de réalisation

L'ordre suit les lots (`01-prd.md` §5) et les enchaînements de l'index des epics. Dans un lot, on prend d'abord ce qui débloque la suite.

| Lot | Ordre proposé pour ce qui reste | Pourquoi |
|---|---|---|
| 1 | US-701 → US-702, **reportées le 2026-10-08** : prestataire d'envoi non choisi (D-41, livrable 7), déclenchement des rappels à décider ; elles apportent aussi la notification de US-303 (CA-03) | Le reste du lot 1 est fait (2026-10-09) |
| 2 | US-103 → US-104 → US-401 → US-402 → US-304 → US-305 → US-403 → US-601 → US-602 → US-603 → US-604 → US-901 → US-903 → US-904 | Les rôles d'abord : la validation en dépend |
| 3 | US-002 → US-106 → fin de US-102 → US-003 → US-703 | L'hébergement sécurisé précède toute donnée réelle |
| 4 | US-205, US-503, US-606, US-801, US-802, US-803, US-902 | À ordonner au début du lot |

La double authentification RH (US-102, lot 3) a été avancée pour le démonstrateur (D-42) : elle reste « En cours » jusqu'au choix du service d'envoi des codes (D-41).

## 3. Démonstrateur

| | |
|---|---|
| **Adresse** | API `https://acme-sa.onrender.com` ; site sur Vercel |
| **Branche** | `v2` : chaque push redéploie le site, l'image Docker et les migrations |
| **Données** | Fictives uniquement : CSV fictif, référentiel fictif à importer depuis l'écran « Référentiel » (`backend/demo/referentiel-fictif.xlsx`) |
| **Parcours montré** | `lot0/9-demonstrateur/plan-demonstrateur.md` |
| **Mise en ligne** | `lot0/9-demonstrateur/mise-en-ligne-pas-a-pas.md` |

## 4. Jeu de test commun

### 4.1 Employés fictifs

Fichier `backend/tests/fixtures/employees_test.csv`, entièrement fictif, avec les 54 colonnes de l'export réel. Les colonnes exclues contiennent `FAKE-SECRET-…` pour vérifier qu'elles ne sortent jamais. Dates au format MM/JJ/AAAA.

| Réf. | id | Nom | Prénom | Naissance | Actif | Particularité |
|---|---|---|---|---|---|---|
| EMP-A | 1001 | JOSEPH | Jean | 03/15/1996 | oui | Cas nominal, toutes les données remplies ; agence PV |
| EMP-H1 | 1002 | PIERRE | Marie | 07/02/1990 | oui | Homonyme de EMP-H2 ; rattachée à un service |
| EMP-H2 | 1003 | PIERRE | Marie | 11/20/1985 | oui | Homonyme de EMP-H1 ; agence « À rattacher » (PB) |
| EMP-D1 | 1004 | LOUIS | Paul | 01/10/1988 | oui | Doublon complet de EMP-D2 |
| EMP-D2 | 1005 | LOUIS | Paul | 01/10/1988 | oui | Doublon complet de EMP-D1 |
| EMP-I | 1006 | CHARLES | Anne | 05/05/1992 | **non** | Employé inactif |
| EMP-E | 1007 | ÉTIENNE | Rosé | 09/30/1979 | oui | Accents, pas d'email, direction vide |
| EMP-B | 1008 | BAPTISTE | Marc | 12/01/2000 | oui | Second employé pour les tests d'isolation |

Compte RH de test : `admin` / `Admin-Test-2026`. Les tests bout en bout partagent une base : chaque test a son propre employé (liste dans `frontend/e2e/start-server.mjs`).

### 4.2 Fixtures pytest (`backend/tests/conftest.py`)

| Fixture ou aide | Effet |
|---|---|
| `client`, `container`, `settings` | Application avec base et dossier de fichiers temporaires, CSV de test |
| `clock` | Horloge simulée que le test fait avancer (attention : la session expire après 30 minutes) |
| `account(emp, password)` | Crée le compte d'un employé |
| `employee_client(emp)` | Client déjà connecté en tant que l'employé |
| `admin_client`, `admin_session` | Client et session RH complets (mot de passe et second facteur) |
| `rh_login(client, username, password)` | Connexion RH complète par l'API, avec l'application TOTP |
| `draft`, `submitted` | Mise à jour du MVP en brouillon ou envoyée (code hérité) |
| `career_entry`, `career_reference`, `frozen_clock` | « Mon parcours » (code hérité de la V2) |
| `tests/referential.py` : `workbook()` | Classeur Excel du référentiel de test |

## 5. Definition of Done commune

Chaque story a sa propre Definition of Done dans son fichier. S'y ajoutent, pour toutes :

- [ ] Chaque critère d'acceptation est couvert par au moins un test automatisé ; toute la suite passe (backend, écrans ; bout en bout si un écran ou un parcours a changé).
- [ ] L'écran suit le prototype validé (ou les écrans RH), à 390 px et à 1280 px : zones tactiles ≥ 44 px, texte ≥ 16 px, aucun défilement horizontal.
- [ ] Messages en français, près de l'élément concerné, qui disent quoi faire (RG-15).
- [ ] Aucune colonne exclue de l'export dans l'API ni dans les journaux.
- [ ] Contrats d'architecture verts ; un changement de schéma a sa migration Alembic.
- [ ] `02-solution-design.md` mis à jour si la story ajoute un module, une table, une route ou une variable.

## 6. Risques d'implémentation

| Risque | Parade |
|---|---|
| Le code hérité du MVP et de la V2 entre en conflit avec la refonte (deux façons de modifier ses coordonnées) | Retrait par stories dédiées (`01-prd.md` §7) |
| Hébergement gratuit lent ou en veille (Render) au moment d'une démonstration | Ouvrir l'adresse de l'API quelques minutes avant |
| Le dépôt signé (US-301) est refusé par le stockage du démonstrateur (règle CORS de Supabase Storage, adresse signée PUT) | Essayer un dépôt sur le démonstrateur après le push ; régler la règle CORS du compartiment si besoin |
| Décisions en attente (D-41, D-43, D-44, D-45) | Elles ne bloquent pas le lot 1 ; les poser à chaque point avec le directeur |
| Une donnée réelle arrive sur une plateforme gratuite | Refus au démarrage hors `local` sans base dédiée ; CSV fictif imposé en démonstration et en recette |
