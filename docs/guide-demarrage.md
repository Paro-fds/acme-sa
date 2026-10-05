# Guide de démarrage — Portail employés ACME SA (MVP)

Ce guide explique comment installer, lancer, arrêter et sauvegarder le portail sur la machine qui sert au test, et comment remplacer le fichier des employés.
Toutes les commandes se tapent dans **PowerShell**, depuis le dossier du projet (`app-web`), sauf mention contraire.

---

## 1. Installation (une seule fois)

### Prérequis

| Logiciel | Version | Vérifier |
|---|---|---|
| Python | 3.12 ou plus récent | `python --version` |
| Node.js | 22 (ou 20.19 au minimum) | `node --version` |

### Installer les dépendances

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -e ".[dev]"
cd ..\frontend
npm install
cd ..
```

### Configurer `backend\.env`

1. Copier le modèle : `Copy-Item backend\.env.example backend\.env`
2. Ouvrir `backend\.env` et vérifier :

| Paramètre | Valeur |
|---|---|
| `ACME_CSV_PATH` | Chemin du fichier des employés, par exemple `../data/vault-employee-list_20261001-1400.csv` |
| `ACME_DATA_DIR` | Dossier de la base et des documents : **hors OneDrive** (par défaut `C:/acme-data`) |

Aucun mot de passe n'est à mettre dans ce fichier : les comptes administrateurs sont enregistrés dans la base (§1, « Premier administrateur »). Les lignes `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` ne servent plus qu'à importer un ancien compte ; elles peuvent rester vides.

Les autres paramètres (durée des sessions, taille des fichiers, nombre de documents) peuvent rester à leur valeur par défaut.

> **À ne jamais faire :** mettre `ACME_DATA_DIR` dans OneDrive (la synchronisation peut corrompre la base), copier le CSV ou `backend\.env` dans git, ou partager le dossier `data\`.

### Premier administrateur

Au premier lancement de `.\run.ps1` (§3), tant qu'aucun administrateur n'existe dans la base, la fenêtre PowerShell demande :

```
Création du premier administrateur du portail.
Mot de passe : 12 caractères minimum (il ne s'affiche pas pendant la saisie).
Identifiant : direction
Mot de passe :
Confirmation :
Administrateur « direction » créé. Connexion : /admin/connexion
```

Choisir un mot de passe **long** (par exemple trois mots et un nombre) : avec l'accès à distance (§8), la page de connexion admin est visible sur Internet. Ce premier compte ne peut être créé **que** sur cet ordinateur, jamais depuis une page web.

Ensuite, tout se fait dans le portail, menu du compte (en haut à droite) :

- **Administrateurs** : liste des comptes, « Ajouter un administrateur » (identifiant + mot de passe provisoire, à transmettre soi-même à la personne : elle choisit le sien à sa première connexion), « Supprimer » (ses connexions sont fermées). On ne peut pas supprimer son propre compte ni le dernier administrateur.
- **Changer mon mot de passe** : mot de passe actuel puis nouveau (12 caractères minimum) ; les autres connexions de ce compte sont fermées.

La même création se lance aussi à la main : `cd backend ; .venv\Scripts\python -m app.tools.create_admin`.

### Autoriser l'accès depuis les téléphones (pare-feu Windows)

Dans un PowerShell **ouvert en tant qu'administrateur** :

```powershell
New-NetFirewallRule -DisplayName "Portail ACME (8000)" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
```

Le réseau Wi-Fi doit être déclaré comme **réseau privé** dans Windows (Paramètres → Réseau et Internet → Wi-Fi → propriétés du réseau).

---

## 2. Vérifier le fichier des employés (avant chaque test)

```powershell
cd backend
.venv\Scripts\python -m app.tools.check_csv
cd ..
```

L'outil lit le CSV indiqué dans `backend\.env` (ou celui passé en argument) et affiche **uniquement des nombres, des formats et des noms de colonnes** : aucune donnée personnelle n'apparaît à l'écran. Il travaille sur une base temporaire et ne modifie rien.

| Ligne du rapport | Ce qu'il faut vérifier |
|---|---|
| Employés actifs / inactifs | Le nombre d'actifs attendu (364 pour le fichier du 01/10/2026) |
| Dates lisibles | `[OK]` ; sinon, les lignes indiquées ont une date qui n'est pas au format MM/JJ/AAAA |
| Accents abîmés | `[OK]` ; sinon, le fichier n'a pas été enregistré en UTF-8 |
| Formats de téléphone | Les formats présents (chaque chiffre est remplacé par 9) |
| Identités en double | Ces employés verront « Contactez l'administration » à l'identification |
| Exposition des données | Les trois lignes doivent être `[OK]` : aucune colonne exclue dans les réponses, aucun mot de passe dans les journaux, cookie de session protégé |

La dernière ligne indique « tout est conforme » ou « à corriger ».

---

## 3. Lancer et arrêter

```powershell
.\run.ps1            # lance le portail
.\run.ps1 -Build     # recompile d'abord l'interface (après une modification du frontend)
```

Le script affiche les adresses à utiliser :

```
Portail ACME démarré.
  Sur cet ordinateur : http://127.0.0.1:8000
  Depuis un téléphone (même Wi-Fi) : http://192.168.1.23:8000
  Arrêter : Ctrl+C
```

| Espace | Adresse |
|---|---|
| Employés | `http://<adresse>:8000/` |
| Administration | `http://<adresse>:8000/admin/connexion` |
| Contrôle de l'API | `http://<adresse>:8000/api/health` → `{"status":"ok"}` |

**Arrêter :** `Ctrl+C` dans la fenêtre PowerShell. Les données (mises à jour, brouillons, documents, comptes) restent dans `ACME_DATA_DIR` et sont retrouvées au prochain lancement.

**Pendant le test :** brancher l'ordinateur sur le secteur et désactiver la mise en veille (Paramètres → Système → Alimentation → « Mettre en veille » : Jamais), sinon les téléphones perdent la connexion.

---

## 4. Sauvegarder

Tout ce que les employés ont saisi ou envoyé se trouve dans `ACME_DATA_DIR` :

| Élément | Emplacement |
|---|---|
| Base (comptes, sessions, brouillons, mises à jour) | `C:\acme-data\portail.db` |
| Documents transmis | `C:\acme-data\documents\<identifiant employé>\` |

Pour sauvegarder :

1. Arrêter le portail (`Ctrl+C`) : la copie d'une base en cours d'utilisation peut être incomplète.
2. Copier le dossier entier :

   ```powershell
   $date = Get-Date -Format 'yyyy-MM-dd_HHmm'
   Copy-Item C:\acme-data "D:\sauvegardes\acme-data_$date" -Recurse
   ```

3. Relancer le portail.

Pour restaurer, arrêter le portail, remplacer `C:\acme-data` par la copie, puis relancer.

> Le dossier contient des données personnelles et des pièces justificatives : le conserver sur un disque de la machine ou un support chiffré, jamais dans un dossier partagé.

---

## 5. Remplacer le fichier des employés

Le CSV est en **lecture seule** : le portail ne le modifie jamais. Les mises à jour sont rattachées à la colonne `id` de chaque employé.

1. Arrêter le portail.
2. Déposer le nouveau fichier dans `data\` (jamais dans git).
3. Mettre à jour `ACME_CSV_PATH` dans `backend\.env`.
4. Lancer le contrôle : `cd backend ; .venv\Scripts\python -m app.tools.check_csv ; cd ..`
5. Relancer le portail.

À savoir :

- Les identifiants (`id`) doivent rester les mêmes d'un fichier à l'autre ; sinon, les mises à jour déjà faites ne sont plus rattachées à la bonne personne.
- Un employé passé à `active = false` disparaît de l'identification, des statistiques et de la liste ; ses données restent dans la base.
- Le fichier est lu au lancement : un changement n'est pris en compte qu'après un redémarrage.

---

## 6. Repartir de zéro (après une répétition)

Pour effacer toutes les saisies, les comptes et les documents :

1. Arrêter le portail.
2. Sauvegarder si besoin (§4).
3. Supprimer `C:\acme-data\portail.db` et le dossier `C:\acme-data\documents`.
4. Relancer : une base vide est créée automatiquement.

---

## 7. En cas de problème

| Symptôme | Cause probable et solution |
|---|---|
| « Environnement Python introuvable » | L'installation n'a pas été faite : voir §1 |
| « Dépendances du frontend absentes » | Lancer `cd frontend ; npm install` |
| « backend\.env absent » | Copier `backend\.env.example` en `backend\.env` (§1) |
| Le téléphone n'affiche rien | Même Wi-Fi ? Règle de pare-feu (§1) ? Réseau déclaré « privé » ? Essayer `http://<adresse>:8000/api/health` |
| La connexion admin est refusée alors que le mot de passe est bon | Vérifier l'identifiant (les majuscules comptent). Après 5 erreurs, **ce compte** est bloqué 15 minutes ; un autre administrateur peut toujours se connecter |
| Un administrateur a oublié son mot de passe | Un autre administrateur le supprime puis l'ajoute de nouveau avec un mot de passe provisoire (« Administrateurs ») |
| « Portail non démarré : il faut un compte administrateur » | La création du premier administrateur a été abandonnée : relancer `.\run.ps1` et répondre aux questions |
| `-Tunnel` : « L'accès Internet n'a pas pu être ouvert » | Pas de connexion Internet, ou réseau qui bloque Cloudflare : le portail reste utilisable sur le Wi-Fi. Détails dans `%TEMP%\acme-tunnel.log` |
| L'adresse `trycloudflare.com` affiche « Error 1033 » | Le tunnel démarre (attendre quelques secondes) ou le portail a été arrêté : relancer `.\run.ps1 -Tunnel` et transmettre la **nouvelle** adresse |
| Un employé a oublié son mot de passe | Administration → dossier de l'employé → bloc « Accès » → « Réinitialiser l'accès » ; il crée un nouveau mot de passe à sa prochaine connexion, son dossier est conservé |
| « Contactez l'administration » à l'identification | Deux employés actifs ont les mêmes nom, prénom et date de naissance (voir le rapport du §2) |
| L'interface n'a pas changé après une modification | Relancer avec `.\run.ps1 -Build` |
| Le port 8000 est déjà utilisé | `.\run.ps1 -Port 8001` (et ouvrir ce port dans le pare-feu) |

---

## 8. Accès depuis un autre réseau (testeurs hors du Wi-Fi)

Le portail peut être ouvert sur Internet, en **HTTPS**, par un tunnel Cloudflare : l'ordinateur reste le serveur, rien n'est à configurer sur la box et aucun compte n'est nécessaire.

**Une seule fois :**

```powershell
winget install --id Cloudflare.cloudflared
```

Les administrateurs doivent avoir des mots de passe longs (12 caractères minimum, imposés par le portail).

**Lancer :**

```powershell
.\run.ps1 -Tunnel
```

Le script affiche, en plus des adresses locales :

```
  Depuis n'importe où (Internet) : https://mots-au-hasard.trycloudflare.com
    Administration : https://mots-au-hasard.trycloudflare.com/admin/connexion
```

Envoyer cette adresse **uniquement** aux testeurs (message privé, pas de groupe ni de publication).

À savoir :

- **L'adresse change à chaque lancement** : la renvoyer aux testeurs après un redémarrage.
- **L'accès se ferme avec le portail** (`Ctrl+C`) ; il s'interrompt aussi si l'ordinateur se met en veille ou perd Internet.
- **Ce qui reste protégé :** les données d'un employé ne s'affichent qu'après son nom, son prénom, sa date de naissance **et** son mot de passe ; l'administration exige son propre mot de passe ; 5 erreurs bloquent la connexion 15 minutes ; le cookie de session est chiffré en transit (`Secure`), et la documentation de l'API (`/api/docs`) est désactivée.
- **Ce qui est visible par quiconque a l'adresse :** les écrans d'identification et de connexion admin (sans aucune donnée).
- Le mode rapide de Cloudflare est prévu pour des essais : pour une ouverture durable à tous les employés, un tunnel nommé (compte Cloudflare, adresse fixe) ou un hébergement dédié sera nécessaire.
