# Portail carrière ACME SA

Portail web mobile-first : l'employé complète son dossier et dépose ses certificats ; les RH les valident et pilotent.

- Cahier des charges : [cahier_des_charges_portail_employes.md](cahier_des_charges_portail_employes.md)
- Stories et statuts : [docs/lot0/1-specifications/epics/README.md](docs/lot0/1-specifications/epics/README.md)
- Consignes de développement : [agent.md](agent.md)

## Démonstrateur

**Adresse : https://acme-sa-frontend.vercel.app/**

Toutes les données sont **fictives** : aucun employé réel, aucun vrai référentiel (bandeau « Démonstration · données fictives »). L'API est hébergée sur Render en offre gratuite : la première page peut mettre une minute à répondre après une période d'inactivité.

### Comptes employés

Connexion avec **nom, prénom et date de naissance**. La première fois, choisir « Première connexion ? Créer mon mot de passe » (8 caractères au moins) ; ensuite, se connecter avec ce mot de passe.

| Nom | Prénom | Date de naissance | Matricule | Agence | Poste | Ce qu'il montre |
|---|---|---|---|---|---|---|
| JOSEPH | Jean | 15/03/1996 | AC-1001 | PV | Agent de crédit | Parcours complet : consentement, profil, dépôt d'un certificat |
| PIERRE | Marie | 02/07/1990 | AC-1002 | AD | Assistante administrative | Homonyme de AC-1003, départagée par la date de naissance |
| PIERRE | Marie | 20/11/1985 | AC-1003 | PB | Caissière | Agence PB absente du référentiel : « Unité à confirmer » |
| LOUIS | Paul | 10/01/1988 | AC-1004 | RC | Agent de recouvrement | Même nom et même date que AC-1005 : écran « Plusieurs dossiers correspondent » |
| LOUIS | Paul | 10/01/1988 | AC-1005 | RC | Agent de recouvrement | Idem, sans adresse email |
| ÉTIENNE | Rosé | 30/09/1979 | AC-1007 | PV | Chef d'équipe | Nom accentué, sans adresse email |
| BAPTISTE | Marc | 01/12/2000 | AC-1008 | AD | Coursier | Embauche récente (2024) |
| CHARLES | Anne | 05/05/1992 | AC-1006 | DM | Analyste | **Inactive** : la connexion est refusée |

Un compte créé reste en place entre deux redéploiements (base Supabase). Pour revoir la première connexion d'un employé, réinitialiser son accès depuis l'espace RH.

### Compte RH

- Adresse : https://acme-sa-frontend.vercel.app/admin/connexion
- Identifiant : celui saisi dans `ADMIN_USERNAME` sur Render.
- Mot de passe : **communiqué à part, jamais écrit dans le dépôt** (seule son empreinte est sur Render). Le demander au développeur.
- À la première connexion, l'écran « Protégez votre compte » demande d'enregistrer une application d'authentification (Microsoft Authenticator, Google Authenticator…). Les méthodes WhatsApp et email sont grisées tant que le service d'envoi n'est pas choisi (D-41).

### Référentiel des unités

Dans l'espace RH : menu du compte → **Référentiel** → importer [backend/demo/referentiel-fictif.xlsx](backend/demo/referentiel-fictif.xlsx). Les codes PB et RC restent « À rattacher », comme dans l'export réel.

### Parcours conseillé (5 minutes)

1. Accueil `/` : les trois bénéfices, puis connexion de **Jean JOSEPH**.
2. « Avant de commencer » : accepter la mention, arriver sur l'accueil et le pourcentage.
3. Compléter les trois sections du profil jusqu'à 100 %.
4. Déposer un certificat (PDF, JPG ou PNG, 5 Mo au plus), voir le remerciement puis « Mes certificats ».
5. Espace RH : connexion avec la double authentification, tableau de bord.

Le détail de la mise en ligne est dans [docs/lot0/9-demonstrateur/mise-en-ligne-pas-a-pas.md](docs/lot0/9-demonstrateur/mise-en-ligne-pas-a-pas.md).

## Lancer en local

```powershell
.\run.ps1                                  # application complète
cd backend; .venv\Scripts\python -m pytest # tests backend et architecture
cd frontend; npm test                      # tests des écrans
cd frontend; npx playwright test           # tests de bout en bout
```

Les tests n'utilisent que les employés fictifs de `backend/tests/fixtures/`.
