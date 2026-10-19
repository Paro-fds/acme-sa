# agent.md — Consignes pour les agents qui travaillent sur ce projet

**Portail carrière ACME SA** : refonte du portail des dossiers employés demandée par M. Hilaire (DRH).
Web **mobile d'abord**. Langue du projet et de l'interface : **français**. Le code se fait ici (`app-web-v2`, branche `v2`).

## 0. Où en est le projet ? (à lire en premier)

> Mise à jour le 2026-10-17. Source de vérité des statuts : `docs/lot0/1-specifications/epics/README.md`.

| Story | Statut | Où on en est |
|---|---|---|
| US-105 Accueil | **Fait** | — |
| US-101 Connexion en un écran | **Fait** | — |
| US-001 Socle déployable | **Fait** | En ligne : Vercel (site) → Render `https://acme-sa.onrender.com` (API, Docker) → Supabase (PostgreSQL, stockage S3) ; chaque push sur `v2` redéploie. Dépôt signé → US-301 ; répétition AWS → US-002 |
| US-102 Double authentification RH | **En cours** (avancée, D-42) | Écrans, règles et TOTP faits ; envoi réel WhatsApp/email en attente de la DIT (D-41) ; `MFA_METHODS` dit quelles méthodes sont ouvertes |
| US-106 Double authentification employés | Pas encore | Exigence du 2026-10-08 (D-41, P-15) |
| US-501 Référentiel des unités | **Fait** | Import Excel (`app/referential`, écran `/admin/referentiel`). Interface au lot 4 → US-503 |
| US-201 Voir mon dossier et ma progression | **Fait** | `app/employee/domain/completion.py` : 8 éléments (RG-01), tronqué à l'entier (5/8 = 62 %) ; affectation en libellés officiels, « Unité à confirmer » sinon |
| US-202 Compléter mes coordonnées | **Fait** | Module `app/dossier`, écrans `features/dossier/` (`/avant-de-commencer`, `/profil/coordonnees`, `/profil/contact-etudes`). Une information compte seulement saisie ou confirmée. Mention d'information à valider (D-43) |
| US-203 Confirmer ou signaler agence, poste, date d'embauche | **Fait** | Section 3/3 `/profil/informations-rh` ; confirmation datée ou signalement (table `error_report`, traité au lot 2 par US-403) ; signalement automatique si embauche avant 18 ans (RG-16) |
| US-204 Savoir ce qui me reste avant de déposer | **Fait** | `/certificats` fermé tant que le profil n'est pas complet, liste de ce qui reste avec un lien par élément ; `completion.is_complete` |
| US-206 Retirer l'ancien parcours de mise à jour | **Fait** | Plus de routes `/api/me/update/*` ni `/api/me/documents/*` ; `/mise-a-jour/*` et `/documents` ramènent à `/profil` ; les écrans RH du MVP lisent toujours les envois passés |
| US-301 Déposer un certificat | **Fait** | Module `app/certificate` : dépôt signé direct au stockage (S3, ou route locale en `local`), contenu réel contrôlé, 5 Mo, 20 au plus, nom aléatoire. Domaines à valider (D-45). Démonstrateur : dépôt direct vers Supabase et lecture vérifiés le 2026-10-13 (avant, Render tournait en `STORAGE_BACKEND=local` sur un disque effacé à chaque redémarrage) |
| US-302 Savoir ce que mon certificat m'apporte | **Fait** | `/certificats/merci` : récapitulatif, « Reçu », ce que ça débloque, avis en un clic (D-46) |
| US-303 Suivre mon certificat | **Fait** | Statuts dans « Mes certificats ». « À corriger » et redépôt au lot 2 ; notification avec US-701 |
| US-502 Rattacher les valeurs inconnues | **Fait** | Bloc « À rattacher » de `/admin/referentiel`, avec le nombre d'employés ; disparaît après import de la correspondance |
| US-605 Mesurer si les employés reviennent | **Fait** | Journal `employee_login` ; carte « Engagement des employés » du tableau de bord RH (`GET /api/admin/engagement`) |
| US-207 Aligner l'espace employé sur les écrans validés | **Fait** | Écrans validés par M. Hilaire = `2-espace-employe-ecrans/` et `3-espace-rh-ecrans/` (D-47). Accueil `/accueil` (écran 06) après la connexion, « Avant de commencer » d'abord à la première connexion ; en-tête « Portail Carrière » et barre du bas ; identité en lecture seule (08) ; écrans 07, 11, 12, 13 alignés ; niveau d'études validé en tête de « Mes certificats » |
| US-107 Aligner la connexion RH sur l'écran validé | **Fait** | Écran A01 : `RhLoginCard` (carte, logo, étapes `LoginStep`), étape 2 sur la même carte (`mfa/MfaStep.jsx`) ; code en 6 cases (`mfa/CodeBoxes.jsx` : un seul champ invisible sous les cases, `one-time-code`, collage) ; « Renvoyer le code » pour WhatsApp/email seulement ; « Mot de passe oublié ? » → voir un Administrateur. `/admin/double-authentification` reste pour un écran RH ouvert avant le code. US-102 reste au lot 3 (envoi des codes, réseau) |
| US-103 Donner un rôle à chaque compte RH | **Fait** | 4 rôles (`ADMIN`, `AGENT_RH`, `REFERENTIAL`, `READONLY`). Dépendances d'autorisation API (`require_admin`, `require_not_readonly`, `require_roles`). Traçabilité des changements (`admin_role_change`). Sélecteur et création sur `/admin/administrateurs`. |
| US-802 Publier un poste (lot 4) | **Fait** | Module `app/job` (fiche, critères structurés pour US-801, statuts datés et signés, trace des critères modifiés après publication, journal d'audit `JOB_OPENING`) ; migration 0014 ; écrans `/admin/postes` (`features/admin/openings/`). Agent RH et Administrateur saisissent ; l'Administrateur seul publie, clôture, marque pourvu. Poste confidentiel (EF-807, Should) reporté |
| US-801 Voir les postes auxquels je suis éligible | En cours | Fait : « Ma carrière » (`/carriere`, `features/openings/MyOpeningsPage.jsx`) montre les postes publiés et ouverts aux seuls employés aptes (`GET /api/me/openings`, `ListMyOpenings`, règle `app/job/domain/eligibility.py`, unités par `ResolveUnitCodes`). Ancienneté dans le poste = date d'embauche (EF-907). Reste à décider : indicateur orange (CA-01, CA-02) et intérêt (CA-04) |
| US-205 Confirmer mes informations chaque année | **Fait** | `app/dossier/domain/freshness.py` (12 mois, rappel 30 jours avant), `GetFreshness`, `ConfirmStillAccurate` ; `GET /api/me/dossier/freshness`, `POST /api/me/dossier/still-accurate` ; carte `features/dashboard/StillAccurateCard.jsx` sur l'Accueil. Rien n'est bloqué ; l'envoi du rappel attend US-701 |
| US-902 Déposer et suivre ma demande en ligne | **Fait** (candidature à un poste seulement) | Domaine `app/job/domain/application.py` (circuit en 7 étapes, retrait), `SqlApplicationRepository`, migration 0015 ; `POST /api/me/openings/{id}/apply`, `/api/me/applications` (+ `/withdraw`), `/api/admin/openings/{id}/applications`, `/api/admin/applications/{id}/step` et `/close` ; audit `JOB_APPLICATION` ; CV facultatif (`/api/me/applications/cv-uploads`, même stockage que les certificats, `GET /api/admin/applications/{id}/cv` tracé `DOCUMENT_VIEW`) et profil figé (`EmployeeEligibility.snapshot`). Écrans : « Ma carrière » (`MyOpeningsPage`), section Candidatures de la fiche du poste (`OpeningApplications.jsx`). Demande spontanée plus tard |
| US-108 Aligner l'espace RH sur les écrans validés (lot 2) | **Fait** | Cadre commun `features/admin/AdminLayout.jsx` (écran A02 : « Nom · Rôle », « Se déconnecter », menu, titre et `subtitle` de `Page`), compteurs réels `GET /api/admin/menu-counts` (`GetMenuCounts`), nom affiché `display_name` de `/api/admin/me` ; jetons `rh-*` dans `index.css`, aucune couleur écrite dans les écrans RH ; filtres d'unités tirés du référentiel (`features/admin/useUnits.js`). A06 = recherche US-602 paginée (statut du MVP retiré, choix du 2026-10-11) ; A07 = dossier V2 (`GET /api/admin/employees/{id}/dossier`) ; A09 = « Valeurs à rattacher » avec l'import à côté (D-27, saisie à l'écran avec US-503) ; A10 = comptes à gauche, « Créer un compte » à droite. Droits par rôle (choix du 2026-10-11) : `features/admin/roles.js` (menu, liens, bouton d'accès) et côté serveur `require_validator`, `require_case_reader`, `require_referential_editor`, `require_admin` (`app/auth/api/dependencies.py`) ; test `tests/api/test_us108_droits_par_role.py`. E2E : `e2e/us108-espace-rh.spec.js`. Retirés des menus le 2026-10-13 : « À rattacher » (écran joignable par le tableau de bord et la fiche de poste) ; du menu du compte, « Administrateurs », « Référentiel » et « Ma double authentification » (`/admin/securite` joignable par son adresse) |
| US-109 Charger les pages sans texte d'icône (lot 2) | **Fait** | Police d'icônes réduite aux icônes du portail (12 Ko au lieu de 4 Mo) : `npm run icons` (`frontend/scripts/icons.mjs`) écrit `public/fonts/material-symbols.woff2` et `src/lib/icons.json` ; préchargée dans `index.html` ; règle `.material-symbols-outlined` dans `index.css` (couche de base : les tailles des écrans s'appliquent), icône invisible jusqu'à `icons-ready` (`src/lib/icons.js`). **Nouvelle icône dans un écran → `npm run icons`**, sinon `icons.test.js` échoue |
| US-110 Refaire l'accueil et la connexion pour donner envie (lot 2) | **Fait** | Maquettes « Après 3 » (canvas claude.ai « Accueil et connexion — avant / après ») : photo de l'équipe `src/assets/equipe-acme.jpg`, en-tête `components/PublicHeader.jsx`, `features/home/HomePage.jsx` (ce que vous y gagnez, trois étapes, ni mascotte ni chiffre), `features/auth/LoginPage.jsx` (« C'est votre première fois ? » d'abord, mot de passe oublié sans clic), date en 3 cases `features/auth/BirthDateField.jsx` (aussi à la création du mot de passe ; e2e : `fillIdentity` dans `e2e/auth.js`). À confirmer par M. Hilaire, et droit à l'image des personnes de la photo |
| US-111 Refaire la connexion de l'espace de gestion (lot 2) | **Fait** | « Espace de gestion » remplace « Espace RH » / « Portail RH » (connexion et en-tête `AdminLayout`). `features/admin/GestionLoginLayout.jsx` (panneau bleu à gauche, bandeau sur téléphone, « Étape n sur 2 ») remplace `RhLoginCard` ; `AdminLoginPage`, `mfa/MfaLoginPage` ; titre de l'étape 2 : `mfaStepTitle` (`mfa/MfaStep.jsx`). Message reçu en arrivant = information. À confirmer par M. Hilaire |
| US-112 Me connecter à l'espace de gestion sans code (lot 2) | **Fait** | Réglage `ADMIN_MFA_REQUIRED` (`app/config.py`, **false** par défaut) : coupé, `LoginAdmin` ouvre la session complète (204, `complete_login` de `admin_mfa.py`) ; allumé, US-102 inchangée. `GET /api/auth/admin-options`, `AdminMeOut.mfa_required` ; frontend `mfa/useMfaRequired.js` (étape et code masqués, menu et écran des comptes sans double authentification). Tests backend : `conftest` force `true` ; `test_us112_*` le coupe. E2E : serveur à `false`, `us102` sauté. Bandeau « Démonstration · données fictives » supprimé (`DemoBanner`, `lib/env.js`) |
| US-113 Retrouver mon espace sur ordinateur, avec ma photo (lot 2) | **Fait** | `components/EmployeeLayout.jsx` (via `Page account`) : ordinateur = menu à gauche + prop `aside` (colonne de droite) ; téléphone = barre du bas (`employeeNav.js`, « Mon dossier ») + bouton ☰ (tiroir rendu hors de l'en-tête à cause du `backdrop-blur`). `lib/useIsDesktop.js` place les blocs sans les dupliquer (tests : `lib/testViewport.js`, `setDesktop`). `components/Avatar.jsx` (photo sinon initiales), `components/Tip.jsx` remplace `Mascot` (supprimé). `photo_url` (vide) dans le profil, la liste et la fiche RH |
| US-114 Retracer mon parcours dans Ma carrière (lot 2) | **Fait** | « Mon parcours » supprimé (menu, menu du compte, Mon dossier ; `/parcours/*` → `/carriere`). `features/career/timeline.js` (`buildTimeline` : entrée chez ACME depuis `hire_date`, certificats non archivés validés ou en examen, parcours US-25 déjà saisi ; compétences à part ; `filterEvents` ; `visibleFilters` : filtres Formations et Expériences seulement s'il y a un élément, en attendant US-803 ; filtre des certificats nommé « Hors ACME », choix du 2026-10-13) et `CareerTimeline.jsx` (« Aujourd’hui », filtres, frise ; chargement séparé des postes). `MyOpeningsPage` : frise à gauche, postes et candidatures dans `aside` « Postes et candidatures » sur ordinateur. Anciens postes chez ACME : source inconnue (à demander au directeur) |
| US-115 Choisir qui verra un poste (lot 2) | **Fait** | `Criteria.domains` et `Criteria.unit_codes` (tuples) remplacent `domain` et `unit_code` ; tables `job_opening_domain` et `job_opening_unit` (migration 0016, reprise des anciennes valeurs ; colonnes retirées par ALTER TABLE direct, le mode batch casse les clés étrangères sur SQLite). `eligibility.audience` (critères appliqués l'un après l'autre) ; `PreviewAudience` + `EmployeeEligibility.all_candidates()` (3 lectures) + `ResolveUnitCodes.execute_many` ; `POST /api/admin/openings/audience` (Agent RH, Administrateur). Écran : `features/admin/openings/audienceParts.jsx` (`UnitPicker`, `DomainChecks`, `useAudience` 300 ms, `AudiencePreview` avec avertissement si personne) |
| US-116 Être prévenu de ce qui arrive dans l'espace de gestion (lot 2) | **Fait** | Notifications calculées (pas stockées) à partir des certificats, signalements de l'employé et candidatures : `admin/domain/notifications.py` (`late_at` = 6e jour ouvrable, `visible` = 90 jours sans ses propres dossiers, `ReadState`), `admin/application/notifications.py` (`GetNotifications`, `MarkNotificationRead`, `MarkAllNotificationsRead`). Seul le « lu » est enregistré : table `admin_notification_read` (migration 0017, clé `*` = « tout lu » jusqu'à `read_at`). Routes `/api/admin/notifications` (Agent RH, Administrateur). Écran : `features/admin/notifications/` (`NotificationBell` dans `AdminLayout` : liste sur ordinateur, lien vers `/admin/notifications` sur téléphone ; `NotificationsPage`) ; accès `notifications` dans `roles.js` |
| US-117 Créer un poste sans le référentiel (lot 2) | **Fait** | Choix du 2026-10-13 (option B, démonstration) : référentiel vide → « Unité du poste » en texte libre (120 caractères, `validate_fields` de `app/job/domain/opening.py`), pas de « Visible seulement par… » (`hasReferential` dans `OpeningFormPage.jsx`), poste proposé à tous les aptes. Dès l'import du référentiel, liste officielle comme avant. Exception à US-802 à faire noter par M. Hilaire |
| US-118 Voir le fichier de mon certificat (lot 1) | **Fait** | Demande du 2026-10-13 : `GET /api/me/certificates/{id}/file` (`GetMyCertificateFile` : propriétaire seulement, sinon `CERTIFICATE_NOT_FOUND` ; archivé compris ; fichier absent du stockage → 404 `CERTIFICATE_FILE_MISSING` au lieu d'une erreur 500). Bouton « Voir le fichier » (nouvel onglet) dans `CertificateList.jsx`, `certificateFileUrl()` dans `api/certificates.js` |
| US-119 Publier un poste à partir du catalogue des postes ACME (lot 2) | **Fait** | Demande du 2026-10-14 : catalogue des 69 fiches de poste (`app/job/infrastructure/fiches-de-poste.json`, produit par `python -m app.tools.import_job_profiles` depuis `postes/` et `postes/postes_et_domaines.md` ; à refaire depuis la base SQLite du directeur quand elle arrivera). `GET /api/admin/job-profiles[/{code}]` (`ListJobProfiles`, `GetJobProfile` ; domaines de diplôme proposés : `DIPLOMA_DOMAINS` de `app/job/domain/catalogue.py`, ❓ à valider par la DRH). Onglet « Catalogue des postes ACME » (`?onglet=catalogue`, `JobCatalogue.jsx`), saisie pré-remplie `/admin/postes/nouveau?fiche=<code>`, `profile_code` sur le poste (migration 0018), rubriques vues par l'employé (`ProfileSections.jsx`). Après un ajout d'icône : `npm run icons`. Exception au registre à faire noter par M. Hilaire |
| US-120 Être prévenu dans le portail d'un poste ouvert pour moi et du sort de mes certificats (lot 2) | **Fait** | Demande du 2026-10-14 : notifications calculées (`app/job/domain/notifications.py`, `GetMyNotifications`) : « Nouveau poste ouvert pour vous » (tout employé apte, même plus tard) et « Certificat validé / à corriger » ; lectures dans le registre des RH sous `employee:<id>` (`reader_id`). `GET /api/me/notifications`, `POST …/read-all`, `POST …/{key}/read`. Cloche `features/notifications/EmployeeNotificationBell.jsx` (menu de gauche sur ordinateur, en-tête sur téléphone → `/notifications`), encart `NewForYouCard.jsx` sur l'accueil. Ni WhatsApp ni email (EF-701). Exception au registre à faire noter par M. Hilaire |
| US-121 Publier un poste à partir de la matrice des postes du directeur (lot 2) | **Fait** | Choix du 2026-10-15 : la base SQLite du directeur (`matrice_competences.sqlite`, racine du projet) est la source du catalogue (84 postes, code de la matrice, département, service, compétences) ; les descriptions HTML complètent les postes de même intitulé (40) ; `python -m app.tools.import_job_profiles` régénère `fiches-de-poste.json`. Le département remplace le domaine (`DIPLOMA_DOMAINS` par département, ❓ DRH). « Publier ce poste » pré-remplit le code ; sans description, la mission reprend les compétences. `features/openings/ProfileCompetences.jsx`. Exception au registre à faire noter par M. Hilaire |
| US-122 Saisir un poste sans grade (lot 2) | **Fait** | Demande du 2026-10-15 : « Grade visé » et « Grade minimum » retirés du formulaire ; grade visé facultatif côté serveur (`validate_fields`), plus affiché (liste, fiche RH, « Ma carrière ») ; un poste déjà saisi garde son grade en base ; un poste modifié perd son ancien critère de grade. ❓ Gestion des grades à demander à la DRH. Écart avec US-802 à faire noter par M. Hilaire |
| US-123 Voir mon tableau de bord sur l’accueil (lot 2) | **Fait** | Maquette « Accueil employé : version tableau de bord » validée le 2026-10-15, sans grade. `features/dashboard/EmployeeHomePage.jsx` + `homeParts.jsx` : en-tête (date, phrase factuelle, « Déposer un certificat »), tuiles « Vos chiffres » (postes, certificats, candidature en cours, dossier ; dossier incomplet : dossier d’abord, autres « Après le dossier »), postes ouverts (tableau sur ordinateur, cartes sur téléphone, temps restant), « À ne pas manquer » et « Vos diplômes travaillent pour vous » (colonne de droite `asideLabel="Dates et diplômes"`), « Mon parcours en chiffres » (ancienneté, plus haut diplôme validé, éléments du parcours). Aucune nouvelle API : chaque donnée facultative est chargée avec `optional()`. « Postes occupés » remplacé par les éléments du parcours. Ancres de « Ma carrière » : `#postes-ouverts` et `#mes-candidatures` (`useScrollToHash` dans `MyOpeningsPage.jsx`) ; les tuiles, les postes de l’accueil et la notification « Nouveau poste » (`CAREER_LINK`) y mènent directement. Ton des accroches à faire valider par les RH |
| US-124 Publier un poste avec la lettre du directeur RH (lot 2) | **Fait** | Demande du 2026-10-17 : l'Agent RH publie seul en joignant la lettre du directeur RH (PDF/JPG/PNG, contrôlée, 5 Mo) ; l'Administrateur publie avec ou sans lettre ; clôture et « Pourvu » restent à l'Administrateur. Domaine `HrLetter`, `JobOpening.publish(..., letter_required=)` ; `PublishOpening`, `RequestLetterUpload`, `ReceiveLetterUpload`, `GetOpeningLetter` (consultation tracée `JOB_OPENING`) ; clé `job-letters/<id>` dans le stockage des certificats (`container.letter_storage`, dépôt local par `/api/admin/openings/letter-uploads`) ; migration 0019 (colonnes `letter_*` de `job_opening`). Écran : `openings/PublishPanel.jsx`, section « Lettre du directeur RH » de la fiche. Menu « Postes à pourvoir », titre « Publication de postes » (`OPENINGS_TITLE`), sans sous-titre, bouton « Saisir un poste hors catalogue ». Écart avec US-802 à faire noter par M. Hilaire |
| US-125 Être déconnecté après 15 minutes sans activité (lot 2) | **Fait** | Demande du 2026-10-17 : 15 minutes sans activité (employés et gestion, `EMPLOYEE_SESSION_MINUTES` / `ADMIN_SESSION_MINUTES`, 15 par défaut ; 30 et 120 avant). `lib/useIdleLogout.js`, branché dans `Page` (`account` ou `account="admin"`) : clics, saisie, défilement ; activité partagée entre onglets (`localStorage` `acme-last-activity`) ; signalée au serveur au plus une fois par minute (`POST /api/auth/keep-alive`, `/api/admin/auth/keep-alive`) ; durées lues par `GET /api/auth/session-options`. Appels dans `api/session.js` (pas `auth.js`, que beaucoup de tests simulent). Pas d'avertissement ; retour à la connexion avec un message. E2E : `page.clock` (`e2e/us125-inactivite.spec.js`). En ligne : variables Render à changer à la main si elles y sont définies. Tout test qui avance l'horloge de 15 minutes ou plus avec une session ouverte la voit expirer |
| US-126 Trouver un poste et préparer sa publication plus clairement (lot 2) | **Fait** | Demande du 2026-10-19 : recherche du catalogue rangée en trois groupes (l'intitulé commence par la recherche, puis chaque mot cherché commence un mot, puis contient), alphabétiques chacun : `features/admin/openings/catalogueSearch.js` (`searchProfiles`). Formulaire d'un nouveau poste : « Suivant » au lieu de « Enregistrer le brouillon » (mène à la fiche, où se joint la lettre, US-124) ; modification : « Enregistrer » |
| US-701, US-702 Notifications et rappels | Pas encore | **Reportées** le 2026-10-08 : prestataire non choisi (D-41) ; déclenchement des rappels à décider |

**Prochaine action :** lot 4, priorités Must seulement (choix du 2026-10-11), dans l'ordre US-802 (faite) → **US-801** (en cours : les aptes voient le poste ; orange et intérêt à décider) → US-205 (faite) → US-902 (faite, candidature à un poste). Stories Must du lot 4 terminées, sauf US-801 (orange et intérêt à décider). Une story à la fois, Spec-Driven Development, tests après chaque story.

À savoir :
- **Code hérité** du MVP et de la V2 : modules `update` et `document` (sans route employé depuis US-206, lus par les écrans RH du MVP), écrans RH du MVP, `career` (`/parcours`, D-44) : à remplacer par des stories (`docs/01-prd.md` §7). Ne pas l'étendre.
- Tests API d'un profil complet : `complete_profile(client)` (`tests/conftest.py`) ; dépôt : `_deposit(client)` (`tests/api/test_us301_depot.py`).
- Connexion RH : le mot de passe ouvre une session « en attente du code » (`ADMIN_MFA`) ; aucun réglage ne désactive la double authentification. Tests API : `rh_login()` (`tests/conftest.py`) ; tests E2E : `e2e/admin.js`.
- Les codes WhatsApp/email ne s'affichent à l'écran qu'avec `APP_ENV=local` ; en ligne, jamais.
- Le démonstrateur ne reçoit que du travail du projet : rien de « spécial démo ». Chaque push sur `v2` le met à jour : ne pousser que des tests verts.
- `TEST_POSTGRES_URL` fait tourner toute la suite sur PostgreSQL.
- Écran admin : `Page account="admin"` et `useLoader(load, { loginPath: '/admin/connexion' })`. Le test paramétré `test_us15_admin_auth.py` couvre toute nouvelle route `/api/admin/*` (401 sans session, 403 avec session employé).
- Écran employé d'une section du profil : `useDossierSection()` (`features/dossier/`) gère le chargement, le passage par « Avant de commencer » et les erreurs de champ.

## 1. Méthode : Spec-Driven Development

Les spécifications font foi. Ordre de lecture :

| Document | Rôle |
|---|---|
| `docs/lot0/0-cadrage/registre-des-decisions-v1.8.md` | **Fait foi** en cas de contradiction |
| `docs/01-prd.md` | Le quoi et le pourquoi, en court, avec les renvois au cahier des charges |
| `docs/lot0/1-specifications/` | Cahier des charges (EF, ENF), tableau unique des règles (RG), décisions (D) |
| `docs/lot0/1-specifications/epics/` | Index des stories (**statuts**), une story par fichier : récit, critères d'acceptation (CA-xx), Definition of Done |
| `docs/02-solution-design.md` | Le comment : architecture, modules, données, API, sécurité, **règles de Clean Architecture** (§3) |
| `docs/03-plan-implementation.md` | Ordre de réalisation, démonstrateur, jeu de test, Definition of Done commune |
| `docs/lot0/2-maquettes/2-espace-employe-ecrans/`, `3-espace-rh-ecrans/` | Écrans **validés par M. Hilaire** (D-47) : la référence ; une règle du registre l'emporte sur un texte d'écran |

Ne pas changer une règle métier ou une décision sans l'accord de l'utilisateur. Toute nouvelle demande devient une nouvelle story. S'en tenir aux mots du directeur : citer la source, mettre le reste en question ouverte (❓).

## 2. Travailler story par story

**Une seule story à la fois.** Ne pas commencer la suivante avant que la courante soit « Fait » et que l'utilisateur ait validé.

Les fichiers de story, les README des epics et l'index sont **générés** par `docs/lot0/1-specifications/epics/generer_stories.py` (listes `EPICS`, `S` et dictionnaire `STATUS`) : on ne les modifie jamais à la main ; on change le générateur, puis on le relance.

1. Passer son statut à **En cours** (générateur, puis §0 de ce fichier).
2. Relire la story : critères d'acceptation, règles, maquette. **Poser toutes les questions ouvertes à l'utilisateur dès maintenant**, pas à la fin.
3. Écrire les tests de la story (**avant** le code), nommés d'après la story et le critère (`test_us202_*.py`, `test_ca04_*`).
4. Domaine + cas d'utilisation → tests unitaires verts (ports simulés en mémoire).
5. Infrastructure + route API + migration Alembic, câblage dans `backend/app/container.py` → tests API verts.
6. Écran React → tests composant verts ; vérifier à 390 px et 1280 px.
   Pendant les étapes 4 à 6, ne lancer que les tests de la story et ceux du code touché.
7. Lancer **toute** la suite (§5), **une seule fois**, à la fin : tout doit être vert. Playwright seulement si un écran ou un parcours a changé.
8. En une seule passe : Definition of Done cochée, statut **Fait** (générateur, puis §0), `docs/02-solution-design.md` si l'architecture a changé.
9. S'arrêter et présenter le résultat à l'utilisateur, en court : ce qui a été fait, les tests, où en sont l'**epic** et le **lot**, ce qui reste à décider. Annoncer un epic ou un lot terminé. **Ne pas commiter : l'utilisateur s'en charge.**

| Statut | Signification |
|---|---|
| **Pas encore** | Aucun code écrit |
| **En cours** | Commencée |
| **Fait** | Tous les critères d'acceptation couverts par des tests verts, Definition of Done cochée |

## 3. Architecture

Monolithe modulaire, 3 tiers, **Clean Architecture** : règles complètes dans `docs/02-solution-design.md` §3, modules dans §4. L'essentiel :

- Chaque module backend a 4 couches : `domain` → `application` → `infrastructure` / `api`. Le domaine et l'application n'importent aucun framework.
- `backend/app/container.py` est le **seul** endroit qui instancie l'infrastructure.
- Un module n'utilise un autre que par ses ports ou ses cas d'utilisation.
- Erreurs métier : `code` stable et `message` en français, traduites en HTTP dans `app/shared/api/errors.py`.
- Vérifié par import-linter (`tests/test_architecture.py`) : un nouveau module s'ajoute aux contrats de `backend/pyproject.toml`.
- Frontend : jamais de `fetch` dans un composant ; tout passe par `frontend/src/api/`.

## 4. Règles métier et sécurité à ne jamais enfreindre

- L'export RH est en **lecture seule** ; seuls les employés actifs et les colonnes de la liste blanche sont lus. Dates du CSV : **MM/JJ/AAAA**.
- **Aucune colonne exclue** (bancaire, dettes, licenciement, références, pièce d'identité…) dans l'API ou les journaux. Le CSV de test met `FAKE-SECRET-…` dans ces colonnes : les tests le vérifient.
- **Aucune donnée réelle d'employé** hors de la production sécurisée : démonstrateur et recette sur données fictives. Ne jamais copier le vrai export.
- Un employé n'accède à ses données que par `/api/me/*`.
- Mots de passe : Argon2, jamais renvoyés ni journalisés. Secrets seulement dans `backend/.env` ou chez l'hébergeur, jamais dans le dépôt.
- Aucune saisie dans le dossier de l'employé avant son consentement (US-202).

## 5. Commandes

```powershell
# Backend (depuis backend/)
.venv\Scripts\python -m pytest            # tests unitaires, API et contrats d'architecture
.venv\Scripts\lint-imports                # contrats d'architecture seuls
.venv\Scripts\alembic revision --autogenerate -m "..." --rev-id 000N   # nouvelle migration

# Frontend (depuis frontend/)
npm test                                  # tests unitaires et composants (Vitest)
npx playwright test                       # tests bout en bout (mobile 390 px, CSV fictif)

# Outils (depuis backend/)
python -m app.tools.create_admin          # premier compte RH
python -m app.tools.check_csv             # contrôle d'un export sans afficher aucune donnée (docs/guide-demarrage.md)
```

## 6. Données et environnement

- Tests : uniquement le CSV fictif `backend/tests/fixtures/employees_test.csv` et les fixtures de `backend/tests/conftest.py` (`docs/03-plan-implementation.md` §4).
- Données locales : `C:\acme-data-v2`, **hors OneDrive**. Le vrai export n'est jamais versionné ni utilisé dans les tests.
- Configuration : `backend/.env` (non versionné), modèle dans `backend/.env.example` (aucun secret).
- Démonstrateur : `docs/lot0/9-demonstrateur/` ; référentiel à importer par `/admin/referentiel` : le provisoire d'ACME (`C:cme-data-v2
eferentiel
eferentiel-provisoire-2026-10-15.xlsx`, autorisé sur le démonstrateur depuis le 2026-10-15) ou le fictif `backend/demo/referentiel-fictif.xlsx`.

## 7. Conventions

- Textes d'interface et messages d'erreur en français, près de l'élément concerné, qui disent quoi faire (RG-15).
- Mobile d'abord : zones tactiles ≥ 44 px, texte ≥ 16 px, aucun défilement horizontal, bouton principal dans la barre collée en bas.
- Couleurs et styles uniquement via les jetons Tailwind de `frontend/src/index.css`.
- Ne pas commiter ni pousser : l'utilisateur gère git.
