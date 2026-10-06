# Solution Design V2 — Parcours professionnel et recherche de profils (incrément 1)

| | |
|---|---|
| **Version** | 1.0 — validé le 2026-10-05 |
| **Date** | 2026-10-05 |
| **Entrée** | `docs/v2/01-prd.md` v1.2 |
| **Complète** | `docs/02-solution-design.md` v1.0 (MVP) : tout ce qui n'est pas redéfini ici reste valable (stack, sessions, format d'erreur, sécurité, tests) |
| **Sortie** | Epics E06 (`docs/v2/epics/E06-parcours/`), E07 (`docs/v2/epics/E07-recherche-profils/`) et phase 7 du plan |

| Version | Changement |
|---|---|
| 0.1 | Module `career`, parcours employé, consultation admin |
| 0.2 | PRD v1.1 : rubrique Compétences, table `career_profile` (parcours enrichi), filtre de la liste admin, carte du tableau de bord, recherche de profils ; SD-V2-03 tranché par l'utilisateur |
| 0.3 | PRD v1.2 : filtre « Poste actuel » de la recherche de profils (US-35), route `GET /api/admin/positions` |
| 1.0 | Validé par l'utilisateur le 2026-10-05, avec SD-V2-01 et SD-V2-02 |

---

## 1. Décisions d'architecture

| ID | Décision | Justification |
|---|---|---|
| AD-V2-01 | Nouveau module backend **`career`** en 4 couches, dans le même monolithe | ENF-V2-01 ; même organisation que les modules du MVP |
| AD-V2-02 | `career` **n'importe jamais** `app.update` (contrat import-linter dédié) | RM-V2-02 : le parcours ne touche ni le brouillon, ni l'envoi, ni le statut de campagne |
| AD-V2-03 | **Une seule table `career_entry`** pour les quatre rubriques, avec un champ `kind` ; les champs propres à chaque rubrique sont déclarés dans un **registre** (`career/domain/entry_kinds.py`) | Même principe que le registre des champs modifiables (AD-09) : le formulaire est généré à partir de l'API, sans dupliquer les règles ; une rubrique ou un champ s'ajoute sans nouvelle table |
| AD-V2-04 | Justificatif = **colonnes de `career_entry`** (au plus un par élément), fichier dans un **second stockage** `ACME_DATA_DIR/career/` derrière le port `FileStorage` existant | D-09 : séparé de « Mes documents » (pas de limite à 10, pas de verrou après l'envoi) ; remplaçable par S3 comme les documents (`docs/04-deploiement.md`) |
| AD-V2-05 | Contrôle des fichiers **réutilisé** : `detect_file_kind` (`document/domain/files.py`) et la taille `MAX_UPLOAD_MB` | ENF-V2-02 : une seule règle pour les formats acceptés |
| AD-V2-06 | Dates du parcours stockées comme **mois** : chaîne `AAAA-MM` dans l'API, premier jour du mois en base | D-07 : mois et année seulement |
| AD-V2-07 | Nouvelles tables créées par `create_schema()` au démarrage (aucune migration) | `create_all` n'ajoute que les tables absentes : la base du MVP est conservée telle quelle |
| AD-V2-08 | Table **`career_profile`** (une ligne par employé) : nombre d'éléments et date de dernière modification, tenus à jour **dans la même transaction** que chaque écriture du parcours | RM-V2-07 : une suppression doit aussi compter comme modification, ce que `career_entry` seule ne permet pas ; le filtre et le compteur se calculent sans parcourir tous les éléments |
| AD-V2-09 | **Recherche de profils en mémoire**, dans le module `admin`, sur les parcours des employés actifs chargés en une requête | Même choix que la recherche par nom (MVP §10.4) : 364 employés × 120 éléments au plus, largement sous la seconde (ENF-V2-04) ; une base de recherche plein texte serait disproportionnée |
| AD-V2-10 | Les statistiques de parcours ont leur **propre route** ; `GET /api/admin/statistics` (campagne) ne change pas | RM-V2-02 : la campagne et le parcours restent séparés jusque dans l'API |

## 2. Structure

```text
backend/app/career/
├── domain/
│   ├── entry_kinds.py      # registre : rubriques, champs, libellés, règles
│   ├── career_entry.py     # entité CareerEntry, Proof, validation, tri
│   ├── months.py           # Month (année, mois), parse « AAAA-MM », comparaisons
│   ├── errors.py           # erreurs métier du module
│   └── ports.py            # CareerRepository (FileStorage : port du module document)
├── application/
│   └── use_cases.py        # GetMyCareer, AddCareerEntry, UpdateCareerEntry, DeleteCareerEntry,
│                           # AttachProof, RemoveProof, GetMyProofFile, GetCareerFields
├── infrastructure/
│   └── sql_career_repository.py   # career_entry + career_profile
└── api/
    └── routes.py           # /api/me/career/*

backend/app/admin/
├── domain/profile_search.py           # correspondance des mots-clés, classement (règle pure)
└── application/
    ├── employee_career.py             # GetEmployeeCareer, GetEmployeeProofFile (US-30)
    ├── career_statistics.py           # GetCareerStatistics (US-33)
    ├── search_profiles.py             # SearchProfiles (US-34, US-35)
    └── list_positions.py              # ListPositions (US-35)
    # ListEmployees (US-17) reçoit le filtre `career` (US-32)

frontend/src/
├── api/career.js
└── features/career/
    ├── CareerPage.jsx       # /parcours : quatre rubriques + mention de visibilité (D-17)
    ├── CareerSection.jsx    # une rubrique : titre, liste, « Ajouter », état vide
    ├── CareerEntryCard.jsx  # un élément (+ justificatif) ; prop onEdit absente = lecture seule (admin)
    ├── CareerEntryPage.jsx  # /parcours/ajouter/:kind et /parcours/:id/modifier
    ├── MonthField.jsx       # mois + année (deux listes déroulantes)
    ├── ProofField.jsx       # justificatif : ajouter, voir, remplacer, retirer
    └── careerRules.js       # règles reprises du registre serveur (messages immédiats)
frontend/src/features/admin/
    ├── AdminCareer.jsx           # bloc « Parcours professionnel » du dossier (US-30)
    ├── CareerFilter.jsx          # filtre « Parcours enrichi » de la liste (US-32)
    ├── ProfileSearchPage.jsx     # /admin/profils (US-34, US-35)
    ├── PositionFilter.jsx        # choix multiple des postes actuels (US-35)
    └── ContactLinks.jsx          # liens tel: et mailto: (US-34)
```

## 3. Registre des rubriques (`entry_kinds.py`)

Codes de rubrique : `QUALIFICATION`, `TRAINING`, `EXPERIENCE`, `SKILL`. Colonnes de `career_entry` et leur sens par rubrique (PRD §6) :

| Colonne | `QUALIFICATION` (Diplômes et certifications) | `TRAINING` (Formations suivies) | `EXPERIENCE` (Expériences professionnelles) | `SKILL` (Compétences) |
|---|---|---|---|---|
| `qualification_type` | Type ✱ : `DIPLOME` / `CERTIFICATION` | — | — | — |
| `title` | Intitulé ✱ | Intitulé ✱ | Poste ✱ | Compétence ✱ (2–60) |
| `organization` | Établissement ou organisme ✱ | Organisme ✱ | Employeur ✱ | — |
| `location` | — | — | Lieu | — |
| `start_month` | Date d'obtention ✱ | Début ✱ | Début ✱ | — |
| `end_month` | Date d'expiration (certification seulement) | Fin (vide = en cours) | Fin (vide = poste actuel) | — |
| `duration_hours` | — | Durée (heures) | — | — |
| `description` | — | — | Description | — |
| `skill_level` | — | — | — | Niveau ✱ : `BASIC` (Notions) / `GOOD` (Bon niveau) / `EXPERT` (Expert) |
| Justificatif | oui | oui | oui | **non** |

### 3.1 Règles de validation

| Règle | Code d'erreur (`field` = champ concerné) |
|---|---|
| Textes : espaces de début/fin retirés ; `title`, `organization` 2–150 caractères (compétence : 2–60) ; `location` ≤ 100 ; `description` ≤ 500 ; aucun caractère de contrôle (sauf retour à la ligne dans `description`) | `422 INVALID_CAREER_FIELD` |
| Champ obligatoire vide | `422 INVALID_CAREER_FIELD` (« Ce champ est obligatoire. ») |
| Champ non prévu pour la rubrique (ex. `duration_hours` sur une expérience) | ignoré et enregistré vide |
| `start_month` : mois valide, **pas après le mois courant** | `422 INVALID_CAREER_FIELD` (« La date ne peut pas être dans le futur. ») |
| `end_month` d'une formation ou d'une expérience : ≥ `start_month` et **pas après le mois courant** (une formation qui n'est pas finie reste « en cours ») | `422 INVALID_CAREER_FIELD` |
| `end_month` d'un diplôme : interdit ; d'une certification : > `start_month` (peut être dans le futur) | `422 INVALID_CAREER_FIELD` |
| `duration_hours` : entier 1–2000 | `422 INVALID_CAREER_FIELD` |
| Compétence déjà présente chez cet employé (comparaison avec `normalize`, MVP §5.4) | `409 SKILL_ALREADY_EXISTS` (« Cette compétence figure déjà dans votre parcours. »), `field` = `title` |
| Justificatif sur une compétence | `422 PROOF_NOT_ALLOWED` |
| 30 éléments au plus **par rubrique** (D-10) | `409 CAREER_LIMIT_REACHED` (« Nombre maximum d'éléments atteint pour cette rubrique (30). ») |
| Élément inconnu **ou appartenant à un autre employé** (traité comme inexistant) | `404 CAREER_ENTRY_NOT_FOUND` |
| Rubrique inconnue | `422 INVALID_CAREER_KIND` |

Mois courant : donné par l'horloge (`Clock`), pour pouvoir être fixé dans les tests.

### 3.2 Tri (F-32)

- **Formations, expériences** : d'abord les éléments **sans fin** (en cours, poste actuel), puis `end_month` décroissant, puis `start_month` décroissant, puis date de création.
- **Diplômes et certifications** : date d'obtention décroissante.
- **Compétences** : niveau décroissant (Expert, Bon niveau, Notions), puis ordre alphabétique.

## 4. Modèle de données

```text
career_entry                                    career_profile  (AD-V2-08)
------------                                    --------------
id                  PK (UUID)                   employee_id      PK   id du CSV
employee_id         index                       entry_count      int  nombre d'éléments
kind                QUALIFICATION | TRAINING    last_changed_at  datetime
                    | EXPERIENCE | SKILL
qualification_type  DIPLOME | CERTIFICATION | null
title
organization        null (compétence)
location            null
start_month         date (1er du mois) | null (compétence)
end_month           date (1er du mois) | null
duration_hours      int | null
description         null
skill_level         BASIC | GOOD | EXPERT | null
created_at
updated_at
proof_original_name   null             justificatif (D-09, AD-V2-04)
proof_stored_name     null             <uuid>.<ext>
proof_content_type    null
proof_size_bytes      null
proof_uploaded_at     null
```

Fichier : `ACME_DATA_DIR/career/<employee_id>/<uuid>.<ext>`.

```python
class CareerRepository(Protocol):
    def list_for_employee(self, employee_id: str) -> list[CareerEntry]: ...
    def list_all(self) -> list[CareerEntry]: ...                       # recherche de profils (AD-V2-09)
    def profiles(self) -> dict[str, CareerProfile]: ...                # entry_count, last_changed_at par employé
    def count(self, employee_id: str, kind: EntryKind) -> int: ...
    def get(self, entry_id: str) -> CareerEntry | None: ...
    def add(self, entry: CareerEntry, changed_at: datetime) -> None: ...
    def save(self, entry: CareerEntry, changed_at: datetime) -> None: ...
    def delete(self, entry_id: str, changed_at: datetime) -> None: ...
```

`add`, `save` et `delete` mettent à jour `career_profile` (nombre d'éléments, `last_changed_at`) dans la même transaction.

### 4.1 Règles d'écriture

- **Modifier** un élément remplace tous ses champs (pas de mise à jour partielle) ; `kind` ne change jamais ; `updated_at` = maintenant.
- **Justificatif** : un nouveau fichier est enregistré **avant** la mise à jour de la ligne, puis l'ancien est supprimé ; en cas d'échec de la base, le nouveau fichier est supprimé (même principe qu'US-13). Ajouter, remplacer ou retirer un justificatif change `last_changed_at`.
- **Supprimer** un élément supprime la ligne puis son fichier (RM-V2-06). Un fichier déjà absent du disque n'empêche pas la suppression.
- Un employé dont le dernier élément est supprimé garde sa ligne `career_profile` avec `entry_count = 0` : il n'est plus « enrichi » (RM-V2-07).
- Aucune écriture ne lit ni ne modifie `employee_update` (AD-V2-02).

## 5. Recherche de profils (US-34, D-16)

Règle pure dans `admin/domain/profile_search.py` :

1. Le terme saisi est normalisé (`normalize`, MVP §5.4) puis découpé en **mots** ; les mots de moins de 2 caractères sont ignorés. Ni mot valable ni poste choisi → aucun résultat, et l'écran invite à saisir une compétence ou à choisir un poste.
2. Le **texte recherchable** d'un élément est la concaténation normalisée de : `title`, `organization`, `location`, `description`, et du libellé du type ou du niveau (« Diplôme », « Certification », « Expert »…).
3. Un employé correspond si **chaque mot** est contenu (« contient », saisie partielle) dans le texte recherchable d'**au moins un** de ses éléments (pas forcément le même pour tous les mots).
4. **Éléments correspondants** d'un employé : ceux qui contiennent au moins un des mots ; ils sont renvoyés pour être affichés sous son nom.
5. **Classement** : nombre d'éléments correspondants décroissant, puis nom, puis prénom (valeurs à jour). Pagination de 20, comme la liste.
6. Seuls les **employés actifs** du CSV sont retenus (RM-V2-08) : le parcours d'un employé devenu inactif est ignoré.
7. **Filtre « Poste actuel »** (US-35, D-18) : un ou plusieurs postes ; un employé est retenu si `normalize(position)` est égal à l'un des postes choisis normalisés (égalité, pas « contient » : « Agent de crédit » ne ramène pas « Agent de crédit senior »).
   - **Poste seul** : tous les employés actifs de ces postes, **avec ou sans parcours**, triés par nom puis prénom ; `matches` vide.
   - **Poste + mots-clés** : intersection des deux ; classement des points 4 et 5.

**Liste des postes** (`ListPositions`) : valeurs distinctes de `position` chez les employés actifs, regroupées par `normalize` (la première orthographe rencontrée est affichée ; les variantes d'accent ou de majuscule d'un même texte sont donc fusionnées, mais pas « Caissier » / « Caissière »), avec le nombre d'employés, triées par ordre alphabétique. Les postes vides sont ignorés.

Le cas d'utilisation `SearchProfiles` charge les employés actifs (`EmployeeRepository`), tous les éléments (`CareerRepository.list_all()`) et les valeurs à jour de téléphone et email (mêmes règles que le dossier admin : dernier envoi de la campagne, sinon CSV), puis applique la règle.

## 6. API REST

Format d'erreur et sessions inchangés (MVP §8, §10). Toutes les routes `/api/me/career/*` exigent une session employé (`current_employee`) et ne portent que sur l'employé de la session.

### 6.1 Espace employé

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/me/career/fields` | Registre : rubriques, libellés, champs, obligatoires, limites (formulaires générés) |
| GET | `/api/me/career` | Parcours : `{kinds: [{kind, label, count, limit, items}], last_changed_at}`, les quatre rubriques dans l'ordre du registre, chaque liste triée (§3.2) |
| POST | `/api/me/career/entries` | `{kind, qualification_type?, title, organization?, location?, start_month?, end_month?, duration_hours?, description?, skill_level?}` → `201` + élément |
| PUT | `/api/me/career/entries/{id}` | Mêmes champs, sans `kind` → élément |
| DELETE | `/api/me/career/entries/{id}` | `204` ; supprime aussi le justificatif |
| PUT | `/api/me/career/entries/{id}/proof` | Multipart `file` : ajoute ou remplace le justificatif → élément |
| DELETE | `/api/me/career/entries/{id}/proof` | `204` ; retire le justificatif |
| GET | `/api/me/career/entries/{id}/proof` | Fichier (`inline`, `nosniff`, `no-store`, comme les documents) |

Élément renvoyé : `{id, kind, qualification_type, title, organization, location, start_month, end_month, duration_hours, description, skill_level, created_at, updated_at, proof: {original_name, content_type, size_bytes, uploaded_at} | null}`.

Erreurs propres au justificatif : `413 FILE_TOO_LARGE`, `415 UNSUPPORTED_FILE_TYPE` (codes et messages du MVP).

### 6.2 Espace administrateur (lecture seule)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/admin/employees/{id}/career` | Parcours d'un employé actif (même forme que `GET /api/me/career`) ; `404` pour un inactif ou un inconnu (US-30) |
| GET | `/api/admin/career/entries/{id}/proof` | Fichier du justificatif ; `404` si l'employé n'est plus actif (US-30) |
| GET | `/api/admin/employees?…&career=ENRICHED` | Paramètre ajouté à la liste existante, combinable avec `search` et `status` ; avec ce filtre, tri par `career_updated_at` décroissant. Chaque employé de la réponse porte `career_updated_at` (null si parcours vide) ; la réponse ajoute `career_counts: {ENRICHED: n}` (US-32) |
| GET | `/api/admin/career/statistics` | `{enriched, enriched_last_7_days}` : employés actifs au parcours enrichi, et ceux dont `last_changed_at` date de moins de 7 jours (US-33) |
| GET | `/api/admin/positions` | `[{position, count}]` : postes actuels des employés actifs (§5, US-35) |
| GET | `/api/admin/profiles?q=&position=&position=&page=` | Recherche de profils (§5) ; `position` répétable (US-35) : `{items: [{id, display_name, position, agency_code, department, telephone_number, email_address, career_updated_at, matches: [{entry_id, kind, kind_label, title, detail}]}], total, page, page_count}` (US-34) |

Aucune route admin d'écriture sur le parcours (RM-V2-04). Ces routes entrent automatiquement dans le test paramétré `test_us15_admin_auth.py` (401 sans session, 403 avec une session employé).

## 7. Frontend

### 7.1 Routes

| Route | Écran | Maquette |
|---|---|---|
| `/parcours` | Mon parcours : quatre rubriques | aucune (design system, revue par l'utilisateur) |
| `/parcours/ajouter/:kind` | Ajout d'un élément (`kind` = `diplomes`, `formations`, `experiences`, `competences`) | aucune |
| `/parcours/:id/modifier` | Modification, justificatif, suppression | aucune |
| `/admin/employes/:id` | Bloc « Parcours professionnel » ajouté au dossier (US-30) | — |
| `/admin/employes?career=ENRICHED` | Filtre « Parcours enrichi » de la liste (US-32) | — |
| `/admin` | Carte « Parcours enrichis » (US-33) | — |
| `/admin/profils?q=&position=` | Rechercher des profils et employés d'un poste (US-34, US-35) ; lien dans la navigation admin | — |

### 7.2 Principes

- **Accès (D-12)** : carte « Mon parcours » sous « Mes documents » sur `/profil` ; lien « Mon parcours » dans le menu de l'avatar (`AccountMenu`, espace employé).
- **Mention de visibilité (D-17)** en haut de `/parcours`.
- Le formulaire est généré à partir de `GET /api/me/career/fields` ; les règles sont reprises dans `careerRules.js` pour les messages immédiats (comme `fieldRules.js`), l'API restant l'arbitre.
- **Dates** : composant `MonthField` à deux listes (mois en toutes lettres, année de 1950 à l'année courante ; jusqu'à +20 ans pour une expiration) : fonctionne de la même façon sur Android, iPhone et ordinateur, contrairement à `<input type="month">`. Affichage « juin 2021 » (`formatMonth` dans `lib/format.js`).
- Case « En cours » / « Poste actuel » qui vide et masque la date de fin.
- **Compétences** : formulaire court (compétence + niveau en trois boutons radio) ; affichées comme des étiquettes avec leur niveau.
- Bouton principal « Enregistrer » dans la barre collée en bas ; après l'enregistrement, retour à `/parcours` avec un message de confirmation. **Pas d'enregistrement automatique** : un élément n'existe qu'une fois enregistré (pas de brouillon, D-11).
- **Justificatif** : `ProofField` réutilise `resizeImage`, `upload()` (progression) et `ImagePreview` ; il devient actif sur le même écran dès que l'élément est enregistré (SD-V2-02).
- Suppression : bouton « Supprimer cet élément » en bas de la page de modification, avec confirmation.
- **Admin, dossier** : `AdminCareer` dans un `Block` titré, chargé avec le dossier ; `CareerEntryCard` sans `onEdit`.
- **Admin, liste** : `CareerFilter` (bascule « Parcours enrichi » à côté de `StatusFilter`, paramètre `?career=ENRICHED` conservé comme `?status=`) ; colonne / ligne « Parcours modifié le … ».
- **Admin, recherche de profils** : champ de recherche (300 ms, `?q=` en `replace`, comme `EmployeeSearch`) ; chaque résultat : nom, poste et agence actuels, éléments correspondants (mots trouvés mis en évidence), `ContactLinks` (« Appeler » `tel:`, « Écrire » `mailto:` ; masqués si la valeur est vide), lien « Voir le dossier ». Rappel sous le champ : « Informations déclarées par les employés, non vérifiées. » (RM-V2-03).
- **Admin, postes (US-35)** : `PositionFilter` à côté du champ de recherche : liste à cases à cocher des postes avec leur nombre d'employés, champ pour filtrer la liste, postes choisis affichés en étiquettes retirables, conservés dans l'adresse (`?position=` répété). En-tête des résultats : « N employés », pour savoir combien de personnes seront contactées.

## 8. Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `MAX_CAREER_ENTRIES_PER_KIND` | `30` | D-10 |
| `CAREER_RECENT_DAYS` | `7` | Fenêtre « ces derniers jours » de la carte du tableau de bord (D-15) |

Le dossier `ACME_DATA_DIR/career/` est créé au démarrage, comme `documents/`. `MAX_UPLOAD_MB` s'applique aussi aux justificatifs.

## 9. Contrats d'architecture (import-linter)

- `app.career` ajouté aux trois contrats existants (couches, domaine sans framework, infrastructure réservée au composition root).
- **Nouveau contrat** « Parcours indépendant de la campagne » : `app.career` ne peut pas importer `app.update` (AD-V2-02).
- `app.career.domain` peut importer `app.document.domain` (`detect_file_kind`, `FileStorage`, erreurs de fichier) et `app.shared.domain`.
- `app.admin.application` utilise `app.career` par son port `CareerRepository` et ses vues (comme pour les documents).

## 10. Sécurité

| Exigence | Mesure |
|---|---|
| RM-V2-01 | Routes employé sous `/api/me/career` ; un `id` d'un autre employé renvoie `404` (aucun indice d'existence) |
| RM-V2-04 | Aucune route admin d'écriture ; test qui vérifie que `POST/PUT/DELETE` sur les routes admin du parcours et des profils n'existent pas (`405` ou `404`) |
| RM-V2-08 | Recherche limitée aux employés actifs ; réponse construite à partir de schémas Pydantic explicites (aucune colonne exclue du CSV) ; le terme recherché n'est pas journalisé |
| RM-V2-09 | Aucun export, aucun envoi : les liens `tel:` / `mailto:` ouvrent l'application de l'administrateur |
| ENF-V2-02 | Signature + extension, 5 Mo, nom d'origine nettoyé (`display_name` du module document), fichier servi uniquement par l'API |
| ENF-07 | Le parcours n'utilise aucune donnée du CSV en dehors de l'`id` ; le test « aucune colonne exclue » de la phase 6 (`check_csv`) est étendu aux nouvelles routes |

## 11. Tests

Mêmes niveaux et conventions que le MVP (`test_us25_*.py`, `e2e/us25-*.spec.js`). Ajouts :

| Fixture pytest | Effet |
|---|---|
| `career_entry(emp, kind, **fields)` | Crée un élément du parcours de l'employé (met à jour `career_profile`) |
| `career_proof(entry, file)` | Joint un justificatif à un élément |

Horloge fixée au **2026-10-15** dans les tests de validation des dates et du compteur « 7 derniers jours ».

Jeu de parcours de test pour la recherche (US-34) : EMP-A (compétence « Analyse de crédit » Expert, diplôme « Licence en sciences comptables »), EMP-B (compétence « Anglais » Bon niveau, formation « Crédit aux PME »), EMP-E (aucun élément), EMP-I (inactif, compétence « Analyse de crédit » : ne doit **jamais** sortir).

Postes (US-35) : ceux du CSV de test (EMP-D1 et EMP-D2 partagent « Agent de recouvrement » ; EMP-H2 est « Caissière » ; EMP-I, inactif, « Analyste » ne doit pas figurer dans la liste des postes). Le cas « Caissier » / « Caissière » (deux postes distincts) et celui des variantes d'accent (fusionnées) sont vérifiés par un test unitaire avec un dépôt d'employés en mémoire : le CSV de test du MVP n'est **pas** modifié (ses comptes sont utilisés par les tests existants).

## 12. Traçabilité

| Fonctionnalités | Epic | Story | Module backend | Écrans |
|---|---|---|---|---|
| F-32 | E06 | US-25 | `career` | `/parcours`, `/profil`, menu de l'avatar |
| F-33, F-38 | E06 | US-26 | `career` | `/parcours/ajouter/diplomes`, `/parcours/:id/modifier` |
| F-34, F-38 | E06 | US-27 | `career` | `/parcours/ajouter/formations` |
| F-35, F-38 | E06 | US-28 | `career` | `/parcours/ajouter/experiences` |
| F-36 | E06 | US-29 | `career` | `/parcours/:id/modifier` |
| F-37 | E06 | US-30 | `admin`, `career` | `/admin/employes/:id` |
| F-39, F-38 | E06 | US-31 | `career` | `/parcours/ajouter/competences` |
| F-40 | E07 | US-32 | `admin`, `career` | `/admin/employes` |
| F-41 | E07 | US-33 | `admin`, `career` | `/admin` |
| F-42 | E07 | US-34 | `admin`, `career` | `/admin/profils` |
| F-43 | E07 | US-35 | `admin`, `employee` | `/admin/profils` |

## 13. Points tranchés

| ID | Question | Décision |
|---|---|---|
| SD-V2-01 | Une formation dont la fin est prévue dans le futur ? | ✅ **Validé** : **refusée** ; elle reste « en cours » et l'employé met la date de fin une fois la formation terminée (§3.1) |
| SD-V2-02 | Le justificatif peut-il être ajouté dans le même écran que la création ? | ✅ **Validé** : **en deux temps sur le même écran** : « Enregistrer » crée l'élément, puis la zone « Justificatif » devient active sans changer de page |
| SD-V2-03 | L'administrateur voit-il le parcours en dehors du dossier ? | ✅ **Tranché par l'utilisateur (2026-10-05)** : **oui**. Il doit voir les employés qui ont enrichi leur parcours (filtre de la liste + carte du tableau de bord) et trouver ceux qui ont les compétences pour un poste afin de les contacter (recherche de profils) → PRD v1.1, epic E07 |
