# Refonte visuelle du 2026-10-19

Maquettes faites avec l'utilisateur le 2026-10-19, à partir d'une image d'accueil qu'il a fournie, puis validées le même jour (« vous avez le feu vert d'implémenter ces pages suivant notre charte graphique »). Canevas en ligne : https://claude.ai/artifact/GaWyDgkDYsvgRtrJ6bZiFx (copie ici, fichiers `.dc.html`).

| Fichier | Écran | Story |
|---|---|---|
| tous | Cadre : menu bleu fixe à gauche (logo, rubriques, « Se déconnecter », montagnes « Grandir ensemble »), barre du haut blanche (date, cloche, compte) | US-127 |
| `Main.dc.html`, `Telephone.dc.html` | Accueil employé (ordinateur, téléphone) | US-128 |
| `MonDossier.dc.html` | Mon dossier | US-129 |
| `MesCertificats.dc.html` | Mes certificats | US-130 |
| `MaCarriere.dc.html` | Ma carrière | US-131 |
| `RhTableauDeBord.dc.html` | Gestion · tableau de bord | US-132 |
| `RhFileValidation.dc.html`, `RhExamen.dc.html` | Gestion · file de validation, examen d'un certificat | US-133 |
| `RhEmployes.dc.html` | Gestion · employés | US-134 |
| `RhPostes.dc.html` | Gestion · publication de postes | US-135 |

Règles d'implémentation :
- **La charte de l'application l'emporte sur les couleurs et la police des maquettes** : jetons de `frontend/src/index.css` (Inter, `primary` indigo, statuts), icônes Material Symbols. Les maquettes donnent la mise en page, la hiérarchie et les textes.
- **Pas d'emoji** (demande du 2026-10-19).
- Les données des maquettes sont fictives : un écran n'affiche que ce que l'API fournit déjà ; une donnée absente devient une question, pas une invention.
- `illustration-escalier.png` : image fournie par l'utilisateur (156 × 113 px) ; à remplacer par le fichier d'origine en plus grand s'il arrive.
- Écart avec les écrans validés par M. Hilaire (D-47) : à faire noter par M. Hilaire.
