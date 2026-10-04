# E03 — Mise à jour

**Statut de l'epic :** En cours (US-08, US-09, US-10 faites ; reste US-11, US-12).

**Objectif :** permettre à l'employé de corriger son dossier depuis son téléphone, en plusieurs fois si nécessaire, puis de confirmer et soumettre sa mise à jour, en gardant la trace des anciennes et nouvelles valeurs.

**Module backend :** `update`.
**Écrans :** question Oui/Non sur `/profil`, puis le parcours en 4 étapes `/mise-a-jour/*`.

| Story | Titre | Priorité |
|---|---|---|
| [US-08](US-08-choisir-oui-non.md) | Choisir de mettre à jour ou non | MUST |
| [US-09](US-09-modifier-informations.md) | Modifier ses informations | MUST |
| [US-10](US-10-brouillon.md) | Sauvegarder et reprendre un brouillon | MUST |
| [US-11](US-11-verifier-modifications.md) | Vérifier ses modifications | MUST |
| [US-12](US-12-soumettre.md) | Confirmer et soumettre | MUST |

```text
Profil -- Oui --> 1. Informations --> 2. Documents --> 3. Vérification --> 4. Confirmation
   |               (US-09, US-10)     (E04)           (US-11)             (US-12)
   +-- Non --> reste sur le profil (US-08)
```

Stepper commun : « Étape X sur 4 : Informations / Documents / Vérification / Confirmation ».
