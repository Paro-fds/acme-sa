# US-34 — Rechercher des profils par compétences

| | |
|---|---|
| **Statut** | Pas encore |
| **Epic** | E07 Recherche de profils |
| **Priorité** | MUST |
| **PRD** | F-42, RM-V2-03, RM-V2-08, RM-V2-09, ENF-V2-04, D-16 |
| **Dépendances de code** | US-25 (`CareerRepository.list_all()`), US-31 (compétences), US-20 (valeurs à jour : `current_values`), `normalize` |
| **API** | `GET /api/admin/profiles?q=&page=` |
| **Écran** | `/admin/profils` (nouveau) ; accès : bouton « Rechercher des profils » du tableau de bord et lien du menu du compte admin |

## Récit

> En tant qu'administrateur, je veux saisir les compétences ou qualifications demandées pour un poste et obtenir la liste des employés qui les ont déclarées, avec leur téléphone et leur email, afin de les contacter.

## Règles

Règle de recherche : Solution Design §5 (`admin/domain/profile_search.py`).

- Terme normalisé, découpé en mots ; mots de moins de 2 caractères ignorés ; **tous** les mots doivent se retrouver dans le parcours de l'employé (pas forcément dans le même élément) ; « contient » (saisie partielle).
- Texte recherché par élément : intitulé, organisme / employeur, lieu, description, libellé du type ou du niveau.
- Résultats : employés **actifs** ; classés par nombre d'éléments correspondants décroissant, puis nom, prénom ; 20 par page.
- Chaque résultat : nom à jour, poste et agence actuels (CSV), éléments correspondants (rubrique + intitulé + détail court, mots trouvés mis en évidence), « Parcours modifié le … », **téléphone** et **email** à jour (dernier envoi de campagne, sinon CSV) avec liens « Appeler » (`tel:`) et « Écrire » (`mailto:`), masqués si la valeur est vide ; lien « Voir le dossier » (`/admin/employes/:id`, retour vers la recherche conservé).
- Champ : saisie avec délai de 300 ms, terme dans l'adresse (`?q=` en `replace`), comme `EmployeeSearch`.
- Sans terme valable : aucun résultat, message « Saisissez une compétence, un diplôme ou un poste occupé (ex. : crédit, anglais, comptabilité). ».
- Aucun résultat : « Aucun employé ne correspond à « … ». Essayez un mot plus court ou un synonyme. ».
- Rappel sous le champ : « Informations déclarées par les employés, non vérifiées. ».
- Pas d'export, pas d'envoi de message (RM-V2-09) ; le terme recherché n'est pas journalisé.

## Critères d'acceptation

**CA-01 — Une compétence**
Étant donné les parcours de référence P-A, P-B, P-I
Quand l'administrateur cherche « crédit »
Alors EMP-A (« Analyse de crédit ») et EMP-B (formation « Crédit aux PME ») sont listés
Et EMP-I (inactif) n'apparaît pas.

**CA-02 — Plusieurs mots**
Quand il cherche « crédit anglais »
Alors seul EMP-B est listé (« Anglais » et « Crédit aux PME » : deux éléments différents).

**CA-03 — Majuscules, accents, saisie partielle**
Quand il cherche « COMPTAB » ou « credit »
Alors les résultats sont les mêmes que pour « comptab » et « crédit ».

**CA-04 — Classement**
Étant donné EMP-A avec trois éléments contenant « crédit » et EMP-B avec un seul
Quand il cherche « crédit »
Alors EMP-A est classé avant EMP-B.

**CA-05 — Contenu d'un résultat**
Alors chaque résultat affiche le nom, le poste et l'agence actuels, les éléments correspondants avec « crédit » mis en évidence, « Parcours modifié le … », et les liens « Appeler » (`tel:` + téléphone) et « Écrire » (`mailto:` + email)
Et EMP-E, dont l'email est vide, n'aurait pas de lien « Écrire ».

**CA-06 — Valeurs à jour**
Étant donné EMP-A qui a envoyé un nouveau téléphone pendant la campagne
Alors le résultat affiche ce nouveau téléphone, et non celui du CSV
Et un brouillon non envoyé n'est jamais utilisé.

**CA-07 — Terme vide ou trop court**
Quand le terme est vide ou ne contient que des mots d'un caractère
Alors aucune liste n'est affichée, seulement le message d'invitation, et l'API renvoie `{items: [], total: 0}`.

**CA-08 — Aucun résultat**
Quand il cherche « plomberie »
Alors le message « Aucun employé ne correspond… » s'affiche.

**CA-09 — Navigation**
Quand il ouvre un dossier depuis un résultat puis revient
Alors la recherche et la page sont conservées.

**CA-10 — Sécurité et données**
Alors la route répond `401` sans session et `403` avec une session employé
Et aucune réponse ne contient de valeur d'une colonne exclue du CSV (`FAKE-SECRET-…`)
Et aucune route d'écriture n'existe sous `/api/admin/profiles`.

**CA-11 — Performance**
Étant donné 364 employés actifs ayant chacun 120 éléments (données générées)
Alors la recherche répond en moins d'une seconde.

## Tests

| ID | CA | Niveau | Fichier | Vérifie |
|---|---|---|---|---|
| T-34.1 | CA-01 → CA-04, CA-07 | Unitaire | `tests/unit/test_profile_search.py` | règle pure : mots, normalisation, « tous les mots », éléments correspondants, classement |
| T-34.2 | CA-11 | Unitaire | `tests/unit/test_profile_search_performance.py` | 364 × 120 éléments < 1 s |
| T-34.3 | CA-01 → CA-08, CA-10 | API | `tests/api/test_us34_profiles.py` | résultats, inactif exclu, valeurs à jour, pagination, colonnes exclues absentes |
| T-34.4 | CA-05, CA-07, CA-08, CA-09 | Composant | `src/features/admin/ProfileSearchPage.test.jsx`, `ContactLinks.test.jsx` | délai, adresse, mise en évidence, liens, messages |
| T-34.5 | CA-01, CA-05 | E2E | `e2e/us34-recherche-profils.spec.js` | un employé ajoute une compétence, l'admin le trouve et voit « Appeler » |

## Hors périmètre

- Recherche sur le poste actuel du CSV : US-35 (filtre dédié).
- Synonymes (« compta » ↔ « comptabilité » fonctionne par saisie partielle, pas « finance » ↔ « comptabilité »), score de correspondance, fiche de poste enregistrée.
- Export de la liste, envoi groupé d'emails ou de SMS (RM-V2-09).
