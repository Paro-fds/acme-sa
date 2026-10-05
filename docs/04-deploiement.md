# Déploiement en production — Portail employés ACME SA

| | |
|---|---|
| **Statut** | Proposition à valider (2026-10-05) |
| **Pour** | Équipe informatique d'ACME SA, direction |
| **Remplace** | AD-02 du Solution Design (« exécution sur la machine du développeur, pas de déploiement cloud ») une fois validé |
| **Prérequis** | MVP terminé (US-01 → US-24), test du directeur réalisé (`docs/scenario-test-directeur.md`) |

Ce document décrit comment passer du MVP, qui tourne sur le poste du développeur, à un service hébergé par ACME SA :
sur ses serveurs, sous son nom de domaine, avec les documents dans un **bucket S3**, les données dans **sa base SQL**
et une liste d'employés **mise à jour régulièrement**.

Il distingue ce qui est **prêt aujourd'hui** de ce qui demande **un peu de développement** (§3), puis donne la procédure
d'installation (§5 à §9). Les décisions encore ouvertes sont regroupées au §11.

---

## 1. Architecture cible

```text
             Téléphones des employés, poste de l'administration
                                │  HTTPS (443)
                                ▼
        portail.<domaine-acme>  ── DNS (enregistrement A ou CNAME)
                                │
┌───────────────────────── Serveur ACME (Windows Server ou Linux) ─────────────────────────┐
│                                                                                          │
│   Proxy inverse HTTPS  (IIS + URL Rewrite/ARR, ou Caddy)   certificat TLS du domaine    │
│            │ http://127.0.0.1:8000                                                       │
│            ▼                                                                             │
│   Portail ACME (service)  = FastAPI + interface compilée (un seul processus)             │
│      ├── base applicative ─────────────► base SQL ACME (comptes, mises à jour, sessions)  │
│      ├── documents ────────────────────► bucket S3 privé (diplômes, attestations…)       │
│      └── référence employés (lecture) ─► fichier vault (CSV) mis à jour régulièrement,   │
│                                          ou directement la base SQL des employés         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

Principes inchangés par rapport au MVP :

- **Un seul service** sert l'API (`/api/*`) et l'interface (`/`) : pas de CORS, une seule adresse.
- La **source des employés reste en lecture seule** : le portail ne modifie jamais le fichier vault ni la base RH ; il enregistre les mises à jour **à côté**, dans sa propre base.
- **Liste blanche de colonnes** : seules les colonnes autorisées sont lues (PRD §7.2). Les colonnes sensibles (bancaire, dettes, pièce d'identité…) n'entrent jamais dans le portail.
- L'administration reste en **lecture seule** sur les dossiers (sauf réinitialisation d'accès et gestion des comptes admin).

---

## 2. Choix du serveur

Les deux options fonctionnent avec le même code. Choisir celle que l'équipe informatique maintient déjà.

| | **Windows Server** (2019 ou plus récent) | **Linux** (Ubuntu 22.04/24.04, Debian 12…) |
|---|---|---|
| Lancement du portail | Service Windows (WinSW ou NSSM) autour d'`uvicorn` | Service `systemd`, ou conteneur Docker |
| HTTPS | IIS (URL Rewrite + ARR) ou Caddy pour Windows | Caddy ou Nginx (+ Certbot) |
| Familiarité de l'équipe | Outils déjà utilisés par le MVP (`run.ps1`, PowerShell) | Plus léger, standard pour Python |
| **Recommandation** | Si ACME exploite déjà des Windows Server | Si un serveur Linux est disponible |

Dimensionnement pour ~400 employés : **2 vCPU, 4 Go de RAM, 20 Go de disque** suffisent largement (les documents sont dans S3, pas sur le serveur).

---

## 3. Ce qui est prêt, ce qui reste à développer

L'architecture du code (Clean Architecture) a été prévue pour ces changements : chaque élément à remplacer est déjà derrière une interface.
Les évolutions ci-dessous touchent uniquement la couche **infrastructure** et le fichier `container.py`, sans changer les règles métier.

| Élément | Aujourd'hui (MVP) | En production | Travail |
|---|---|---|---|
| Service web, interface, règles métier, sécurité des sessions | ✅ | inchangé | aucun |
| HTTPS, cookie `Secure`, `/api/docs` fermée | ✅ derrière un proxy (testé avec le tunnel) | proxy inverse du serveur | configuration (§6) |
| Comptes administrateurs | ✅ en base (US-23), premier compte en console | inchangé | aucun |
| **Documents** | disque local (`LocalFileStorage`) | **bucket S3** | **Story US-25** : adaptateur `S3FileStorage` (interface `FileStorage` existante) |
| **Base applicative** | SQLite (`portail.db`), adresse fixée dans `config.py` | **base SQL ACME** (SQL Server, PostgreSQL ou MySQL) | **Story US-26** : paramètre `DATABASE_URL`, pilote, migrations de schéma (Alembic) |
| **Liste des employés** | CSV lu **au démarrage** | vault mis à jour régulièrement | **Story US-27** : rechargement automatique sans redémarrage, avec contrôle avant prise en compte |
| Lecture directe des employés depuis la base SQL (option) | — | vue SQL en lecture seule | **Story US-28 (option)** : adaptateur `SqlEmployeeRepository` (interface `EmployeeRepository` existante) |
| Journaux, supervision | console | fichiers journaux, sonde de disponibilité | **Story US-29** : journaux structurés sans donnée personnelle, rotation ; `/api/health` existe déjà |

Ordre conseillé : US-26 (base) → US-25 (S3) → US-27 (rafraîchissement) → US-29 (journaux) ; US-28 seulement si ACME préfère la base au fichier vault.
Chaque story suit la méthode du projet (critères d'acceptation, tests avant le code) et doit être validée avant d'être commencée.

---

## 4. Données et flux

### 4.1 Liste des employés (référence)

Deux sources possibles, **une seule active à la fois** :

| Source | Fonctionnement | Avantages | Points d'attention |
|---|---|---|---|
| **A. Fichier vault** (recommandé au départ) | L'export `vault-employee-list_*.csv` est déposé dans un dossier du serveur (partage réseau ou tâche planifiée). Le portail détecte le nouveau fichier, le **contrôle** (colonnes, dates, encodage, nombre d'actifs) puis le prend en compte sans redémarrer (US-27). | Aucun accès à la base RH depuis le portail ; même format que le MVP, déjà contrôlé (`app.tools.check_csv`) | Fréquence d'export à définir ; un fichier invalide est refusé et l'ancien reste en service |
| **B. Base SQL des employés** (option US-28) | Le portail lit une **vue SQL** créée par l'équipe informatique, limitée aux colonnes autorisées et aux employés actifs, avec un compte **en lecture seule**. | Toujours à jour, plus de fichier | Le compte SQL ne doit voir **que** la vue (jamais les tables RH complètes) |

Dans les deux cas :

- La colonne `id` doit **rester stable** d'un export à l'autre : les mises à jour y sont rattachées.
- Un employé passé à `active = false` disparaît du portail ; ses données saisies restent conservées.
- Les valeurs envoyées par les employés **ne sont pas réécrites** dans la source : l'administration les reporte dans le SIRH à partir du dossier (« Ancienne → Nouvelle »). Un export automatique vers le SIRH serait une story à part.

Vue SQL proposée pour l'option B (à adapter aux noms réels des tables) :

```sql
-- Compte : portail_lecture (droit SELECT sur cette vue uniquement)
CREATE VIEW portail_employes AS
SELECT id, employee_code, last_name, first_name, gender, date_of_birth,
       agency_code, department, position, grade, level, contract_nature, date_of_hire,
       telephone_number, email_address, address_line_1, active
FROM   <table_employes>
WHERE  active = 1;
```

### 4.2 Base applicative (comptes, mises à jour, sessions)

- Une **base dédiée** au portail (par exemple `portail_acme`) sur le serveur SQL d'ACME, avec un compte qui n'a des droits **que sur cette base**.
- Tables créées et mises à jour par les migrations (US-26) : `employee_account`, `admin_account`, `session`, `employee_update`, `employee_change`, `employee_submitted_change`, `document`.
- Les mots de passe y sont stockés **uniquement en hash Argon2** ; les sessions, en hash du jeton.
- Reprise des données du MVP : si des mises à jour ont été saisies pendant le test, elles peuvent être copiées de `portail.db` vers la nouvelle base (outil de migration à prévoir dans US-26) ; sinon, on démarre avec une base vide.

### 4.3 Documents (bucket S3)

Le bucket peut être chez AWS ou sur un stockage **compatible S3** installé chez ACME (MinIO, NetApp, Ceph…) : le même adaptateur fonctionne avec les deux (paramètre `S3_ENDPOINT_URL`).

| Réglage | Valeur |
|---|---|
| Nom | par exemple `acme-portail-documents` |
| Accès public | **bloqué** (Block Public Access activé) ; aucune URL publique |
| Chiffrement | côté serveur (SSE-S3 ou SSE-KMS) |
| Versionnement | activé (protection contre les suppressions accidentelles) |
| Région | à choisir (§11) ; données personnelles et pièces justificatives |
| Clés | `<employee_id>/<uuid>.<ext>` (comme aujourd'hui sur disque) |
| Droits du compte du portail | `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` sur `arn:aws:s3:::acme-portail-documents/*` **uniquement** |

Les fichiers continuent de **passer par le portail** : chaque téléchargement vérifie la session (employé propriétaire ou administrateur) avant de lire l'objet dans S3. Aucun lien direct vers le bucket n'est donné au navigateur.

Politique IAM minimale (AWS) :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::acme-portail-documents/*"
    }
  ]
}
```

---

## 5. Préparation du serveur

1. **DNS** : créer `portail.<domaine-acme>` (enregistrement A vers l'adresse publique du serveur, ou CNAME vers le répartiteur existant).
2. **Pare-feu** : ouvrir **443** (et 80 pour la redirection vers HTTPS et la validation du certificat) vers le proxy ; le port **8000 reste fermé** depuis l'extérieur (écoute sur `127.0.0.1` seulement).
3. **Logiciels** :
   - Python **3.12 ou plus récent** ;
   - le proxy inverse (IIS + URL Rewrite + ARR, ou Caddy/Nginx) ;
   - le pilote ODBC de la base si SQL Server (« ODBC Driver 18 for SQL Server »).
   - Node.js **n'est pas nécessaire** sur le serveur : l'interface est compilée à l'avance (§8).
4. **Compte de service** dédié (par exemple `svc-portail-acme`), sans droits d'administrateur, propriétaire du dossier d'installation.
5. **Dossier d'installation** : `D:\portail-acme\` (Windows) ou `/opt/portail-acme/` (Linux), **hors** de tout dossier synchronisé (OneDrive, partages utilisateurs).

---

## 6. HTTPS (proxy inverse)

Le portail écoute en HTTP sur `127.0.0.1:8000` ; le proxy reçoit le HTTPS et transmet les requêtes en ajoutant l'en-tête `X-Forwarded-Proto: https`.
Uvicorn fait confiance à ces en-têtes quand ils viennent de `127.0.0.1` : le cookie de session passe alors automatiquement en `Secure`.

### Option 1 — Caddy (Windows ou Linux, certificat automatique)

`Caddyfile` :

```caddy
portail.<domaine-acme> {
    encode gzip
    request_body {
        max_size 6MB          # documents de 5 Mo maximum (MAX_UPLOAD_MB)
    }
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "same-origin"
        X-Frame-Options "DENY"
    }
    reverse_proxy 127.0.0.1:8000
}
```

### Option 2 — IIS (Windows Server)

1. Installer **URL Rewrite** et **Application Request Routing**, activer le proxy dans ARR (« Enable proxy »).
2. Créer un site `portail.<domaine-acme>` lié en HTTPS (443) avec le certificat du domaine (certificat d'entreprise, ou Let's Encrypt via win-acme).
3. `web.config` du site :

```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Portail ACME" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8000/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_PROTO" value="https" />
          </serverVariables>
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <requestLimits maxAllowedContentLength="6291456" />
      </requestFiltering>
    </security>
  </system.webServer>
</configuration>
```

(Autoriser la variable `HTTP_X_FORWARDED_PROTO` dans « Variables serveur autorisées » d'URL Rewrite.)

---

## 7. Configuration (`backend\.env` de production)

Le fichier reste **hors de git**, lisible uniquement par le compte de service. Les variables marquées *(US-xx)* n'existent qu'après la story correspondante.

```ini
# --- Référence employés --------------------------------------------------
ACME_CSV_PATH=D:/portail-acme/vault/vault-employee-list.csv
# ACME_EMPLOYEE_SOURCE=sql               # (US-28) au lieu du fichier
# ACME_EMPLOYEE_DATABASE_URL=mssql+pyodbc://portail_lecture:...@srv-sql/RH?driver=ODBC+Driver+18+for+SQL+Server
# ACME_CSV_REFRESH_MINUTES=15            # (US-27) contrôle de nouveau fichier

# --- Base applicative ----------------------------------------------------
ACME_DATA_DIR=D:/portail-acme/data       # dossier local de travail (journaux, fichiers temporaires)
# DATABASE_URL=mssql+pyodbc://portail_app:...@srv-sql/portail_acme?driver=ODBC+Driver+18+for+SQL+Server   # (US-26)
# DATABASE_URL=postgresql+psycopg://portail_app:...@srv-sql:5432/portail_acme                               # (US-26)

# --- Documents -----------------------------------------------------------
# FILE_STORAGE=s3                        # (US-25)
# S3_BUCKET=acme-portail-documents
# S3_REGION=eu-west-3
# S3_ENDPOINT_URL=                       # vide pour AWS ; adresse du stockage compatible S3 sinon
# AWS_ACCESS_KEY_ID=...                  # ou rôle IAM de la machine (préférable)
# AWS_SECRET_ACCESS_KEY=...

# --- Sessions et limites -------------------------------------------------
EMPLOYEE_SESSION_MINUTES=30
ADMIN_SESSION_MINUTES=120
MAX_UPLOAD_MB=5
MAX_DOCUMENTS_PER_EMPLOYEE=10
API_DOCS=false

# --- Administrateurs ------------------------------------------------------
# Aucun mot de passe ici : le premier administrateur est créé en console (§9).
ADMIN_USERNAME=
ADMIN_PASSWORD_HASH=
```

Les secrets (mots de passe SQL, clés S3) peuvent aussi être fournis par des variables d'environnement du service ou un coffre (Windows Credential Manager, AWS Secrets Manager) : ils prennent le pas sur le fichier `.env`.

---

## 8. Installation et mise à jour de l'application

### 8.1 Préparer une version (poste de build)

```powershell
cd frontend ; npm ci ; npm run build ; cd ..
cd backend  ; .venv\Scripts\python -m pytest ; cd ..     # tous les tests doivent passer
```

Copier sur le serveur : `backend\` (sans `.venv`, `.env`, `__pycache__`) et `frontend\dist\`. **Ne jamais copier** `data\`, `backend\.env` ni une base d'essai.

### 8.2 Première installation (serveur)

```powershell
cd D:\portail-acme\backend
python -m venv .venv
.venv\Scripts\python -m pip install . httpx      # dépendances de production + httpx (requis par l'outil check_csv)
# + pilotes selon les stories : pyodbc (SQL Server) ou psycopg (PostgreSQL), boto3 (S3)
Copy-Item .env.example .env                       # puis compléter (§7)
.venv\Scripts\python -m app.tools.check_csv       # contrôle du fichier vault : « tout est conforme »
```

### 8.3 Service

**Windows (WinSW)** — `portail-acme.xml` à côté de `WinSW.exe` :

```xml
<service>
  <id>portail-acme</id>
  <name>Portail employés ACME</name>
  <executable>D:\portail-acme\backend\.venv\Scripts\python.exe</executable>
  <arguments>-m uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips 127.0.0.1</arguments>
  <workingdirectory>D:\portail-acme\backend</workingdirectory>
  <serviceaccount><username>.\svc-portail-acme</username><password>…</password></serviceaccount>
  <onfailure action="restart" delay="10 sec" />
  <log mode="roll-by-size"><sizeThreshold>10240</sizeThreshold><keepFiles>10</keepFiles></log>
</service>
```

`WinSW.exe install portail-acme.xml` puis `Start-Service portail-acme`.

**Linux (systemd)** — `/etc/systemd/system/portail-acme.service` :

```ini
[Unit]
Description=Portail employés ACME
After=network-online.target

[Service]
User=svc-portail-acme
WorkingDirectory=/opt/portail-acme/backend
ExecStart=/opt/portail-acme/backend/.venv/bin/python -m uvicorn app.main:create_app --factory \
          --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/portail-acme/data

[Install]
WantedBy=multi-user.target
```

`systemctl enable --now portail-acme`.

> **Un seul processus** (`--workers 1`, valeur par défaut) tant que la référence employés est en mémoire et rechargée par le processus (US-27). 400 employés n'en demandent pas plus.

### 8.4 Mise à jour vers une nouvelle version

1. Sauvegarde de la base applicative (§10).
2. Arrêt du service.
3. Remplacement de `backend\app\` et `frontend\dist\` ; `pip install .` si les dépendances ont changé.
4. Migrations de schéma (après US-26) : `.venv\Scripts\python -m alembic upgrade head`.
5. Redémarrage du service, vérification (§9).

Retour arrière : réinstaller la version précédente et restaurer la sauvegarde de la base si une migration a été appliquée.

---

## 9. Mise en service et vérifications

1. **Premier administrateur** (une seule fois, sur le serveur) : `.venv\Scripts\python -m app.tools.create_admin`. Créer ensuite un **deuxième** administrateur depuis l'écran « Administrateurs », pour ne jamais dépendre d'un seul mot de passe.
2. **Contrôles** :

| Vérification | Attendu |
|---|---|
| `https://portail.<domaine-acme>/api/health` | `{"status":"ok"}` |
| `http://portail.<domaine-acme>` | redirige vers HTTPS |
| `https://portail.<domaine-acme>/api/docs` | 404 |
| Connexion admin, tableau de bord | nombre d'employés actifs attendu |
| Parcours employé de test (compte réel volontaire) | envoi visible côté admin |
| Ajout puis consultation d'un document | l'objet apparaît dans le bucket, sous `<id>/` ; il s'ouvre depuis le dossier admin |
| Cookie `acme_session` (outils du navigateur) | `HttpOnly`, `Secure`, `SameSite=Strict` |
| Accès direct à l'URL du bucket | refusé (403) |

3. Rejouer le scénario `docs/scenario-test-directeur.md` sur l'adresse de production avant d'annoncer le portail aux employés.

---

## 10. Exploitation

| Sujet | Mesure |
|---|---|
| **Sauvegardes** | Base applicative : sauvegarde quotidienne par l'outil du serveur SQL, conservation 30 jours, test de restauration trimestriel. Bucket : versionnement + règle de cycle de vie (suppression des anciennes versions après 90 jours). |
| **Fichier vault** | Dépôt automatique par le SIRH ; le portail refuse un fichier invalide et garde le précédent (US-27) ; alerte à l'administration en cas de refus. |
| **Supervision** | Sonde HTTP sur `/api/health` toutes les minutes ; alerte si indisponible. |
| **Journaux** | Journaux du service (WinSW / journald) ; aucune donnée personnelle ni mot de passe journalisé (déjà vérifié par `check_csv`, à étendre dans US-29). |
| **Mises à jour de sécurité** | Système et Python mensuellement ; dépendances (`pip list --outdated`) à chaque version. |
| **Accès administrateur** | Comptes nominatifs (US-23), mots de passe de 12 caractères minimum, blocage après 5 erreurs. Option : réserver `/admin` au réseau interne ou au VPN par une règle du proxy. |
| **Fin de campagne** | Décider de la durée de conservation des mises à jour et des documents, puis purger (procédure à écrire). |

---

## 11. Décisions à prendre avec l'équipe informatique

| # | Question | Options | Recommandation |
|---|---|---|---|
| DEP-01 | Système du serveur | Windows Server / Linux | Celui que l'équipe exploite déjà |
| DEP-02 | Moteur de la base applicative | SQL Server / PostgreSQL / MySQL | Celui déjà en place chez ACME (SQL Server probable avec Windows Server) |
| DEP-03 | Source des employés | Fichier vault (A) / vue SQL (B) | A au démarrage ; B si la base RH est accessible depuis le serveur du portail |
| DEP-04 | Fréquence de mise à jour du vault | quotidienne / horaire / à la demande | Quotidienne pendant la campagne |
| DEP-05 | Stockage S3 | AWS (quelle région ?) / compatible S3 interne (MinIO…) | Interne si les pièces justificatives ne doivent pas quitter ACME ; sinon AWS avec chiffrement |
| DEP-06 | Sous-domaine | `portail.`, `dossier.`, `rh.` … | Court et explicite pour les employés |
| DEP-07 | Accès à `/admin` | Internet / réseau interne seulement | Réseau interne ou VPN si possible |
| DEP-08 | Certificat TLS | Let's Encrypt / certificat d'entreprise | Selon la politique d'ACME |
| DEP-09 | Données du test du directeur | Reprendre / repartir de zéro | Repartir de zéro, sauf mises à jour réelles à conserver |
| DEP-10 | Retour des mises à jour vers le SIRH | Ressaisie à partir du dossier / export automatique | Ressaisie pour la première campagne ; export en story suivante |

Une fois ces décisions prises, les stories US-25 à US-29 seront rédigées avec leurs critères d'acceptation et soumises à validation, puis réalisées une par une.
