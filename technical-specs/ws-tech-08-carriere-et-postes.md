---
created: 2026-10-17T21:00:00Z
updated: 2026-10-17T21:00:00Z
---

# ws-tech-08 — Carrière et postes

**Workstream :** epic D8 « Carrière et postes » (`docs/lot0/1-specifications/epics/`).
**Stories closes :** US-802, US-115, US-117, US-119, US-121, US-122, US-124 (espace de gestion) ; US-902 (candidature), US-120 (notification « Nouveau poste »). **En cours :** US-801 (indicateur orange et intérêt à décider).
**Code :** module backend `app/job` (4 couches) ; frontend `features/admin/openings/` (gestion) et `features/openings/` (employé).

## 1. Carte du module

| Couche | Fichier | Contient |
|---|---|---|
| domain | `opening.py` | `JobOpening`, `Criteria`, `OpeningFields`, `validate_fields`, `HrLetter`, statuts |
| domain | `eligibility.py` | `Candidate`, `missing()` (apte ou non, et pourquoi), `audience()` (aperçu pendant la saisie) |
| domain | `application.py` | `JobApplication`, circuit en 7 étapes, `CvFile` |
| domain | `catalogue.py` | `JobProfile`, `DIPLOMA_DOMAINS`, résumé du niveau demandé |
| domain | `notifications.py` | notifications de l'employé, calculées |
| application | `use_cases.py` | un cas par action (`CreateOpening`, `PublishOpening`, `ListMyOpenings`, `ApplyToOpening`…) |
| infrastructure | `sql_opening_repository.py`, `sql_application_repository.py` | tables `job_opening*`, `job_application*` |
| infrastructure | `json_job_profile_catalogue.py` + `fiches-de-poste.json` | catalogue en lecture seule |
| api | `routes.py` | `/api/admin/openings`, `/api/admin/job-profiles`, `/api/admin/applications`, `/api/me/openings`, `/api/me/applications`, `/api/me/notifications` |

Migrations : 0014 (postes), 0015 (candidatures), 0016 (plusieurs unités et domaines), 0017 (notifications lues), 0018 (`profile_code`), 0019 (lettre du directeur RH).

## 2. Invariants à ne pas casser

1. **Un poste ne s'efface jamais, une étape non plus.** `job_opening_step` et `job_opening_criteria_change` sont en ajout seul : `_append_children` n'écrit que les lignes au-delà de celles déjà en base (comptées). Réécrire l'historique d'un `JobOpening` en mémoire n'a donc aucun effet en base ; ne pas « corriger » cela en effaçant puis réinsérant.
2. **Statuts :** `DRAFT → PUBLISHED → CLOSED → FILLED` (on peut aussi passer de `PUBLISHED` à `FILLED`). Toute autre transition lève `OpeningTransitionRefused` (409). Un poste `CLOSED` ou `FILLED` ne se modifie plus (`OpeningLocked`).
3. **Un critère modifié après publication est tracé** (avant/après en phrases, auteur, date) et inscrit au journal d'audit. Les phrases viennent de `Criteria.describe()` et sont stockées en texte : changer ce texte ne touche que les traces à venir, jamais les anciennes.
4. **Rôles (vérifiés dans `api/routes.py`, pas dans le domaine) :**

   | Action | Administrateur | Agent RH | Lecture seule |
   |---|---|---|---|
   | Consulter postes, catalogue, candidatures, CV, lettre | oui | oui | oui |
   | Saisir, modifier, aperçu d'audience | oui | oui | non |
   | Publier | oui, lettre facultative | oui, **lettre obligatoire** | non |
   | Clôturer, marquer pourvu | oui | non | non |
   | Faire avancer ou clôturer une candidature | oui | oui | non |

   Le Responsable du référentiel n'a aucun accès aux postes. Côté écran, le même tableau est dans `features/admin/roles.js` et `openingParts.jsx` (`canEdit`, `isAdministrator`) ; les deux doivent rester d'accord.
5. **La lettre du directeur RH (US-124) est jointe à la publication et ne change plus.** `JobOpening.publish()` refuse un poste qui n'est pas brouillon *avant* de regarder la lettre ; `PublishOpening` ne lit le fichier déposé que si le poste est un brouillon. `UpdateOpening` ne touche pas à `letter`.
6. **Éligibilité sur les seules données validées** (EF-805) : certificats `VALIDATED` et non archivés, données de l'export RH. Un certificat « Reçu » ou « À corriger » ne compte jamais.
7. **Un poste n'apparaît à l'employé que s'il est apte à tous les critères** (`missing()` vide) et que le poste est publié et ouvert (`opens_on ≤ aujourd'hui ≤ closes_on`, `EmployeeEligibility.is_open`). `ListMyOpenings`, `ApplyToOpening` et la notification « Nouveau poste » appliquent la même règle : en changer une sans les autres crée des postes visibles auxquels on ne peut pas postuler.
8. **Une candidature n'est jamais supprimée** (RG-74). Une seule candidature non clôturée par employé et par poste. Le profil figé (`profile_snapshot`) ne se recalcule jamais.
9. **Le CV et la lettre sont des fichiers contrôlés sur leur contenu réel** (`detect_kind` sur les premiers octets), pas sur le type annoncé par le navigateur. Un fichier refusé est effacé du stockage.

## 3. Contrats de données

### Critères (`Criteria`)

| Champ | Type | Règle |
|---|---|---|
| `min_level` | code de `shared/domain/levels.py` ou rien | seulement les niveaux `on_scale` |
| `domains` | tuple de codes de domaines de certificat | rangés dans l'ordre de `DOMAINS`, sans doublon ; `AUTRE` exclu |
| `min_years_in_institution`, `min_years_in_position` | entier 0 → 50 ou rien | ancienneté dans le poste = depuis la date d'embauche (EF-907) tant que l'historique des mouvements n'existe pas |
| `min_grade` | chaîne de 1 ou 2 chiffres ou rien | plus proposé à l'écran (US-122), gardé pour les postes anciens |
| `unit_codes` | tuple de codes du référentiel | dans l'ordre choisi, sans doublon ; un employé est rattaché si l'une de ses unités y est |

**Niveau et domaine vont ensemble :** un **même** certificat validé doit atteindre le niveau **et** appartenir à l'un des domaines (`_has_certificate`). Ne pas séparer en « un certificat de niveau X » + « un certificat du domaine Y ».

### Fiche (`OpeningFields`, contrôlée par `validate_fields`)

- `code` : mis en majuscules, `^[A-Z0-9][A-Z0-9_-]{1,19}$`, unique (`OpeningCodeTaken`, 409).
- `title` ≤ 120, `mission` ≤ 2000 caractères, dates obligatoires et `closes_on ≥ opens_on`.
- `unit_code` : **code du référentiel**, sauf si le référentiel est vide : alors **texte libre** ≤ 120 caractères (US-117). L'affichage passe toujours par `units.get(code, code)` : un texte libre s'affiche tel quel.
- `target_grade` : facultatif (US-122).
- `profile_code` : code d'une fiche du catalogue (US-119), vérifié par `_check_profile`, ou rien pour un poste hors catalogue.

### Lettre du directeur RH (US-124)

- Colonnes `letter_key`, `letter_name`, `letter_content_type`, `letter_size_bytes`, `letter_at`, `letter_actor_id`, `letter_actor_name` de `job_opening` ; toutes vides ou toutes remplies.
- Clé de stockage : `job-letters/<32 caractères hexadécimaux>` (`letter_key()`), dans le **même stockage que les certificats** (S3 en ligne, `certificates_dir` en local).
- Envoi en 3 temps, comme un certificat :
  1. `POST /api/admin/openings/letter-uploads {content_type, size_bytes}` → `{upload_id, method, url, headers}` ;
  2. le navigateur envoie le fichier à `url` (S3 signé en ligne ; en local, `PUT /api/admin/openings/letter-uploads/{upload_id}`) ;
  3. `POST /api/admin/openings/{id}/publish {letter_upload_id, letter_name}` (corps facultatif pour l'Administrateur).
- Lecture : `GET /api/admin/openings/{id}/letter`, `Cache-Control: private, no-store`, inscrite au journal d'audit (`JOB_OPENING`, « Consultation de la lettre du directeur RH du poste … »).
- Erreurs : `HR_LETTER_REQUIRED` (422, `field: "letter"`), `HR_LETTER_NOT_FOUND` (404), plus celles du dépôt de certificat (type, taille, dépôt introuvable).

### Candidature

- Étapes : `RECEIVED → DRH_REVIEW → MANAGER → EVALUATION → DRH_DECISION → DG_APPROVAL → CLOSED`. Les RH avancent vers **n'importe quelle étape suivante** (l'évaluation peut être sautée), jamais en arrière.
- Suites de clôture : `ACCEPTED`, `REFUSED`, `POSTPONED` (RH) ; `WITHDRAWN` (employé seul).
- Référence affichée : `CAND-<id sur 5 chiffres>`. CV : clé `certificates/<employee_id>/<upload_id>`.

### Catalogue

- `fiches-de-poste.json` est **produit**, jamais modifié à la main : `python -m app.tools.import_job_profiles` (depuis `backend/`) le régénère à partir de `matrice_competences.sqlite` (source de vérité, US-121) et des descriptions HTML de `postes/postes` (complément par intitulé, US-119).
- Fichier absent → catalogue vide ; la saisie hors catalogue reste possible.

### Notifications de l'employé

Calculées à chaque lecture ; seul l'état « lu » est stocké (`admin_notification_read`, lecteur `employee:<id>`). Clés stables : `opening:<id>`, `certificate:<id>:<statut>`. Changer le format d'une clé fait réapparaître comme non lues toutes les notifications déjà lues.

## 4. Décisions peu évidentes (ne pas « corriger »)

| Décision | Pourquoi | Ce qu'il ne faut pas faire |
|---|---|---|
| Les rôles sont vérifiés dans la couche api, pas dans le domaine | le domaine ne connaît que `Actor(id, name)` ; la règle US-124 entre par `letter_required` | ne pas ajouter le rôle à `Actor` pour « simplifier » |
| Le stockage local des lettres est une **deuxième instance** de `LocalCertificateStorage` (`container.letter_storage`) | l'adresse de dépôt local est fixée par instance ; celle des certificats demande une session employé | ne pas réutiliser `certificate_storage` pour les lettres en local : le dépôt répondrait 401 à un compte RH |
| Clé de lettre sans identifiant de compte (`job-letters/<id>`) | un identifiant de compte RH n'est pas sûr dans un chemin ; l'identifiant aléatoire de 128 bits suffit, et seuls les comptes RH qui saisissent peuvent déposer | ne pas reprendre `storage_key(employee_id, …)` |
| Colonnes retirées de `job_opening` par `ALTER TABLE` direct (0016) | le mode « batch » d'Alembic recrée la table et casse les clés étrangères sur SQLite | pour **retirer** une colonne, ne pas utiliser `batch_alter_table` ; pour en **ajouter**, il convient (0018, 0019) |
| Visibilité par unités : le poste est montré à tous si aucune unité n'est choisie | US-117 : sans référentiel, aucun employé n'a d'unité | ne pas exiger une unité dans `Criteria` |
| `DIPLOMA_DOMAINS` (département → domaines) est une **proposition** ❓ | à valider par la DRH (2026-10-15) | ne pas la présenter comme une règle validée |
| Le grade n'est plus saisi mais reste en base | US-122 : gestion des grades inconnue, à demander à la DRH | ne pas supprimer les colonnes `target_grade`, `min_grade` |

## 5. Tests

- Domaine (`tests/unit/`) : `test_us802_poste.py`, `test_us801_eligibilite.py`, `test_us115_audience.py`, `test_us117_poste_sans_referentiel.py`, `test_us119_catalogue.py`, `test_us121_matrice_postes.py`, `test_us122_poste_sans_grade.py`, `test_us124_lettre_directeur_rh.py`, `test_us902_candidature.py`.
- API : `tests/api/test_us802_postes.py` (fixtures `agent_client`, `readonly_client`, `_create`, référentiel fictif importé automatiquement), `test_us124_lettre_directeur_rh.py` (`_upload_letter`), `test_us902_candidatures.py` (`_upload_cv`).
- Toute nouvelle route `/api/admin/*` est couverte d'office par `test_us15_admin_auth.py` (401 sans session, 403 avec une session employé).
- Écran : `features/admin/openings/Openings.test.jsx`, `JobCatalogue.test.jsx` ; E2E `e2e/us802-postes.spec.js` (l'Administrateur joint une lettre : la base E2E n'a pas de compte Agent RH).
