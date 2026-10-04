---
name: ACME Enterprise Clarity
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#44464f'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#757680'
  outline-variant: '#c5c6d0'
  surface-tint: '#4a5d91'
  primary: '#001038'
  on-primary: '#ffffff'
  primary-container: '#0f2557'
  on-primary-container: '#7b8dc6'
  inverse-primary: '#b3c5ff'
  secondary: '#4059aa'
  on-secondary: '#ffffff'
  secondary-container: '#8fa7fe'
  on-secondary-container: '#1d3989'
  tertiary: '#260b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#461b00'
  on-tertiary-container: '#c27f59'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b3c5ff'
  on-primary-fixed: '#001849'
  on-primary-fixed-variant: '#324578'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#00164e'
  on-secondary-fixed-variant: '#264191'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#6d3919'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

Ce design system s'ancre dans un style Corporate & Utilitarien sobre, conçu pour inspirer confiance, clarté et sécurité opérationnelle. Il s'adresse en priorité aux collaborateurs de terrain et employés administratifs d'ACME SA, dont une proportion significative présente une faible appétence technologique et utilise l'application en conditions de mobilité sur smartphone.

L'interface privilégie une lisibilité absolue, exempte de fioritures décoratives, d'effets de flou déroutants ou d'animations superflues. Chaque élément visuel remplit une fonction directe : situer l'utilisateur, valider une saisie sans ambiguïté et guider les démarches administratives pas à pas. La hiérarchie repose sur des contrastes marqués, des repères visuels explicites et des surfaces nettes assurant un confort d'utilisation immédiat.

## Colors

La palette s'articule autour d'un socle institutionnel bleu profond et de surfaces neutres ultra-lumineuses, garantissant un ratio de contraste rigoureusement conforme aux normes WCAG AA/AAA.

### Rôles des couleurs
- **Couleurs Primaires & Accents** :
  - `primary` (`#0F2557`) : En-têtes structurels, barre de navigation principale, boutons d'action clés (CTA primaire).
  - `primary-container` (`#1E3A8A`) : Variantes interactives actives, survols et focus states prioritaires.
  - `info` (`#EFF6FF`, texte `#1D4ED8`) : Messages contextuels, aides à la saisie, bannières informatives.

- **Neutres & Surfaces** :
  - Fond d'application : `#F8FAFC` (gris ardoise très pâle évitant la fatigue oculaire).
  - Fond de conteneurs / cartes : `#FFFFFF`.
  - Bordures structurelles : `#E2E8F0` (séparateurs passifs) et `#CBD5E1` (champs de formulaires).
  - Typographie principale : Titres en `#0F172A`, corps de texte et libellés en `#334155`.
  - Typographie secondaire / désactivée : `#64748B`.

- **Système de Statuts Explicites** (chaque statut associe obligatoirement un fond, une bordure, un texte contrasté et un point indicateur) :
  - *Non commencé* : Fond `#F1F5F9`, bordure `#CBD5E1`, texte `#475569`, pastille `#94A3B8`.
  - *Brouillon* : Fond `#FEF3C7`, bordure `#FCD34D`, texte `#B45309`, pastille `#D97706`.
  - *Soumis* : Fond `#DCFCE7`, bordure `#86EFAC`, texte `#15803D`, pastille `#16A34A`.
  - *Erreur* : Fond `#FEF2F2`, bordure `#FCA5A5`, texte `#B91C1C`, pastille `#DC2626`.

## Typography

La typographie s'appuie exclusivement sur la famille Inter pour ses qualités géométriques lisibles et sa neutralité institutionnelle. 

### Règles d'accessibilité mobile
- Le corps de texte courant (`body-md`) ne descend jamais en dessous de 16px sur mobile afin d'éviter tout zoom automatique non désiré dans les navigateurs mobiles et de garantir un confort de lecture optimal pour les employés presbytes.
- Les libellés d'actions principales et d'entrées de formulaires utilisent le niveau `label-lg` (16px gras).
- Le niveau `body-sm` (14px) est restreint aux horodatages, métadonnées secondaires et mentions d'aide sous les champs.

## Layout & Spacing

Le système structurel repose sur une grille fluide adaptée aux deux environnements :

### Grille et Points de rupture
- **Mobile (< 768px)** : Grille 4 colonnes, marge externe fixe de `16px` (`margin`), gouttières de `16px` (`gutter`). Largeur à 100% avec zones d'interaction alignées sur les pouces.
- **Tablette (768px - 1024px)** : Grille 8 colonnes, marge de `24px`, gouttières de `20px`.
- **Desktop (> 1024px)** : Grille 12 colonnes, largeur maximale de contenu de `1200px` centrée, gouttières de `24px` (`gutter-desktop`) et marges latérales de `32px` (`margin-desktop`).

### Rythme et ergonomie
- L'espacement intérieur des formulaires applique une distance verticale systématique de `space-lg` (24px) entre chaque groupe de champs pour réduire la charge cognitive.
- Les zones d'appui interactives respectent strictement une dimension minimale de 44px de hauteur sur smartphone.

## Elevation & Depth

Le design system adopte une profondeur mesurée combinant des bordures à faible contraste et des ombres légères diffuses (`shadow-sm`). Les surfaces ne cherchent pas à simuler une fausse 3D, mais à détacher clairement les modules manipulables du fond général `#F8FAFC`.

- **Niveau 0 (Toile de fond)** : `#F8FAFC`, plat.
- **Niveau 1 (Cartes de contenu, formulaires, sections)** : Fond `#FFFFFF`, bordure nette `1px solid #E2E8F0`, ombre subtile `0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Niveau 2 (Boutons flottants, barres de validation sticky)** : Fond `#FFFFFF`, ombre projetée vers le haut `0 -4px 12px 0 rgba(15, 23, 42, 0.08)`, bordure supérieure `1px solid #E2E8F0`.
- **Niveau 3 (Modales, volets coulissants)** : Fond `#FFFFFF`, ombre `0 10px 25px -5px rgba(15, 23, 42, 0.12)`, fond d'obscurcissement opaque à 50% (`#0F172A` avec opacité 0.5).

## Shapes

La géométrie privilégie la rondeur modérée pour adoucir la rigueur corporate sans perdre sa structure professionnelle.

- **Cartes et blocs de contenu** : Arrondi `rounded-xl` (12px à 16px) apportant une cadence visuelle claire et rassurante.
- **Champs de formulaire, boutons standards, alertes** : Arrondi `rounded-lg` (8px), net et direct.
- **Badges de statut et pastilles** : Finition `rounded-full` (pilule) pour se distinguer immédiatement des composants interactifs de type bouton.

## Components

### 1. Boutons
- **Bouton Primaire** : Fond `#0F2557`, texte `#FFFFFF`, hauteur minimale 48px sur mobile (44px web), padding horizontal 20px, texte en `label-lg`. État actif : fond `#1E3A8A`.
- **Bouton Secondaire** : Fond transparent, bordure `1.5px solid #0F2557`, texte `#0F2557`.
- **Sticky Bottom Action Bar (Mobile)** : Conteneur fixé en bas de l'écran, fond blanc, bordure supérieure discrète, padding de 16px. Le bouton principal occupe 100% de la largeur utile avec une cible de 52px pour faciliter la manipulation à une main.

### 2. Champs de formulaire (Input fields)
- **Structure** : Label supérieur fixe en `#0F172A` (14px ou 16px gras), champ de hauteur 48px avec fond blanc, texte `#0F172A`, bordure `1.5px solid #CBD5E1`.
- **Aides contextuelles** : Texte d'aide direct sous le champ en `#475569` (14px).
- **Focus state** : Bordure `#0F2557` (2px) et anneau externe léger `box-shadow: 0 0 0 3px rgba(15, 37, 87, 0.15)`.
- **Erreur** : Bordure `#FCA5A5`, fond `#FEF2F2`, message explicite en `#B91C1C` précédé d'une icône d'alerte.

### 3. Badges de statut
- Les statuts ne reposent jamais uniquement sur la couleur : ils associent systématiquement une pastille circulaire pleine (8px), un label textuel en gras (`label-sm`), une bordure fine et un fond teinté.
  - *Non commencé* : Fond `#F1F5F9`, bordure `#CBD5E1`, texte `#475569`, pastille `#94A3B8`.
  - *Brouillon* : Fond `#FEF3C7`, bordure `#FCD34D`, texte `#B45309`, pastille `#D97706`.
  - *Soumis* : Fond `#DCFCE7`, bordure `#86EFAC`, texte `#15803D`, pastille `#16A34A`.

### 4. Stepper de progression
- **Étapes** : *Informations* → *Documents* → *Vérification* → *Confirmation*.
- **Sur mobile** : Barre de progression horizontale continue surmontée d'un texte récapitulatif clair ("Étape 2 sur 4 : Documents").
- **Sur web** : Rangée d'étapes reliées par un segment. L'étape courante est mise en avant par un badge numéroté `#0F2557` et un texte gras. Les étapes validées affichent un cercle vert avec coche de validation.

### 5. Composant comparatif de valeurs (Modifications)
- Conçu pour récapituler les changements avant validation finale.
- **Structure** : Conteneur bordé `#E2E8F0`, fond blanc.
- En-tête : Libellé du champ + badge textuel "Modifié" (fond `#EFF6FF`, texte `#1D4ED8`, bordure `#BFDBFE`).
- Corps : Affichage côte à côte ou empilé "Ancienne valeur → Nouvelle valeur". L'ancienne valeur est grisée (`#64748B`, barrée si suppression), la nouvelle valeur apparaît en gras `#0F172A` avec un léger surlignage vert pâle (`#DCFCE7`) garantissant une relecture sans équivoque.

### 6. Cartes & Listes
- Conteneurs blancs délimités par une bordure `#E2E8F0` et des coins `rounded-xl`. Séparateurs intérieurs horizontaux de 1px entre les lignes. Flèches de navigation chevronnées (droite) d'au moins 20px pour indiquer les éléments interactifs.