# US-1025 — Recevoir les avis de sécurité en HTML, comme le directeur

| | |
|---|---|
| **Statut** | Fait |
| **Epic** | D10 PAM et Carrières |
| **Lot** | 5 |
| **Priorité** | Must |
| **Exigences** | Version du directeur du 2026-10-29 (`PAM_pour_Skin`) : `pam_alerte_email.html`, `noyau.py` (`rendre_courriel_alerte`, `alerter` et ses quatre appels) |
| **Règles** | — |
| **Décisions liées** | D-60 |

## Récit

> En tant qu'**employé**, je veux recevoir les avis de sécurité de PAM dans un courriel clair, **afin de de repérer tout de suite une action que je n'ai pas faite**.

## Pourquoi

Choix du 2026-10-27 : le portail devient PAM, l'interface des collaborateurs de Carrières (plan : `../../../../pam/plan-pam.md`).

## Critères d'acceptation

- **CA-01** Chaque avis part en HTML (modèle `pam_alerte_email.html` du directeur, à nos couleurs) avec une partie texte, sujet « ACME SA — PAM » : « Bonjour Jean, » (prénom seul, casse de titre ; « Bonjour, » sans prénom), le message, l'encadré « Sécurité : si vous n'êtes pas à l'origine de cette action, contactez la DRH. », puis le pied du courriel du code.
- **CA-02** Les textes du directeur : connexion réussie « Une consultation de vos documents de paie vient d'avoir lieu. Si vous n'êtes pas à l'origine de cette connexion, contactez la DRH. » ; essais refusés « Des essais de consultation ont été refusés. Si vous n'êtes pas à l'origine de ces essais, contactez la DRH. » ; courriel changé « Votre adresse du profil RH a changé. Le nouveau contact ne recevra pas de code pendant 72 heures. Si vous n'êtes pas à l'origine de ce changement, contactez la DRH. » ; numéro changé « Votre numéro du profil RH a changé. L'ancien numéro ne sert plus à recevoir de code. Si vous n'êtes pas à l'origine de ce changement, contactez la DRH. »
- **CA-03** Les valeurs sont échappées ; aucun lien, ni code employé, ni nom complet ; un envoi raté ne change ni la connexion, ni le verrouillage, ni le gel.

## Notes

Remplace les textes de US-1015, US-1005 et US-1016 (avis en texte brut). Le quatrième avis du directeur, la main levée, vient avec US-1026.

## Definition of Done

- [x] Chaque critère d'acceptation est couvert par un test vert
- [x] Écran vérifié sur téléphone (390 px) et sur ordinateur (1280 px), s'il y a un écran
- [x] Données fictives uniquement ; aucun salaire, aucune colonne exclue dans l'API ni les journaux
- [x] Statut mis à jour ici et dans `../README.md`
