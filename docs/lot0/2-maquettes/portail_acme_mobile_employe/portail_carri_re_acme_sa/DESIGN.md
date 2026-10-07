---
name: Portail Carrière ACME SA
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#464652'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#777683'
  outline-variant: '#c7c5d4'
  surface-tint: '#5153b4'
  primary: '#060068'
  on-primary: '#ffffff'
  primary-container: '#1e1e82'
  on-primary-container: '#898df1'
  inverse-primary: '#c0c1ff'
  secondary: '#bc0008'
  on-secondary: '#ffffff'
  secondary-container: '#e2261f'
  on-secondary-container: '#fffbff'
  tertiary: '#311100'
  on-tertiary: '#ffffff'
  tertiary-container: '#512100'
  on-tertiary-container: '#e67932'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#06006c'
  on-primary-fixed-variant: '#383a9a'
  secondary-fixed: '#ffdad5'
  secondary-fixed-dim: '#ffb4a9'
  on-secondary-fixed: '#410001'
  on-secondary-fixed-variant: '#930005'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68e'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#763300'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-lg-medium:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
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
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

### Personality & Purpose
The design system establishes an internal mobility and professional advancement interface tailored for 500 field officers, branch managers, and administrative personnel across 35 physical branches throughout Haiti. The aesthetic strikes a balance between institutional stability and accessible, dignified career empowerment. Microfinance operations demand trust, clarity, and reliability; the interface avoids corporate coldness or intimidating managerial hurdles, replacing them with a warm, encouraging, and respectful tone.

### Design Movement: Modern Functionalist & Humanist
The interface adopts a high-readability, lightweight modern aesthetic influenced by mobile ergonomics and clear visual hierarchy. Heavy ornamental graphics, large photographic hero elements, and complex gradients are excluded to maintain swift loading on intermittent mobile cellular connections across regional branches. Visual order is reinforced through clean structural alignment, purposeful color coding, and generous tactile areas.

### Emotional Response & Tone
- **Dignified & Uplifting:** Professional aspirations are treated with respect; user progression and submissions feel validated and protected.
- **Clear & Reassuring:** System states are explicit and immediate. Corrective guidance is supportive rather than punitive.
- **Lightweight & Dependable:** Crisp layouts emphasize actionable data over decorative bloat, reinforcing performance on diverse Android and iOS hardware.

### Key Identifiers & Metaphors
- **Institutional Emblem:** The ACME SA insignia maintains a solid deep navy block housing vibrant crimson typography, symbolizing an established, grounded foundation.
- **Guidance Anchor ("La Penseuse"):** A dedicated circular mascot placeholder representing contemplation, strategic career guidance, and personalized institutional mentorship.

## Colors

### Color Philosophy
The color system emphasizes high legibility under varying field conditions, including bright sunlight in open branch courtyards and entry-level mobile screens with restricted dynamic range. Color is never utilized as the sole indicator of system state; explicit textual feedback and icons accompany all status indications.

### Roles & Tokens
- **Primary Navy (`#1E1E82`):** The institutional anchor. Applied to top navigation app bars, primary interactive buttons, prominent card headings, and key active tabs.
- **Accent Red (`#CC1111`):** Reserved exclusively for brand accents, brand insignia typography, milestone badges, or celebration accents. It is strictly never used for errors, rejection states, or destructive alerts to avoid negative psychological conditioning around institutional mobility.
- **Attention & Correction Amber (`#B45309`):** Indicates missing information, required documentation updates, or draft reviews. Paired with empathetic, constructive instructional messaging and an amber warning icon.
- **Resolution & Success Green (`#15803D`):** Designates completed applications, verified branch endorsements, and submitted documentation. Always accompanied by a checkmark icon and affirmative copy.
- **Surface & Canvas (`#FFFFFF` and `#F8FAFC`):** Pure white covers dynamic interactive containers and modal panels, while soft slate gray forms the canvas background, minimizing eye fatigue during prolonged document entry.
- **Content Slate (`#1E293B`):** Deep charcoal neutral providing high WCAG AAA compliant contrast against white and light gray canvases. Subdued helper text utilizes Slate 600 (`#475569`) with a minimum 4.5:1 contrast ratio.

## Typography

### Typography Strategy
Inter is selected for its robust legibility engine, neutral character shaping, and tall x-height, rendering crisply across low-density smartphone screens. Because field personnel frequently read job postings, eligibility criteria, and transfer requirements on mobile devices while traveling or between branch meetings, body copy strictly honors a 16px base minimum (`body-md` and `body-lg`). Sub-16px text is strictly confined to secondary timestamps, badge tokens, and technical metadata.

### Hierarchical Rules
- **Headline Scaling:** `headline-lg` adapts to `headline-lg-mobile` on viewports under 600px width to prevent awkward word wraps in French and Haitian Creole terminology.
- **Legibility Safeguard:** Line heights remain generous (minimum 1.4x to 1.5x) to maintain clear horizontal scanning and prevent line confusion when reading dense criteria or branch policy outlines.
- **Button & Interactive Labels:** Rendered in medium to semi-bold weights to guarantee immediate tap recognition even in low-backlight conditions.

## Layout & Spacing

### Mobile-First Layout Model
The spatial model prioritizes vertical one-thumb execution. Layouts flow within a single-column fluid card hierarchy on mobile viewports (320px–599px), expanding to structured multi-column grids for branch desktop workstations (1024px+).

### Responsive Adaptation
- **Mobile (320px – 599px):** 1-column fluid stacking, 16px (`1rem`) outer canvas margins, 16px element gaps. Fixed bottom clearance reserved for sticky action bars.
- **Tablet (600px – 1023px):** 6-column fluid grid, 24px outer margins, 24px column gutters. Two-column split for application forms and resume summaries.
- **Desktop (1024px+):** 12-column fixed-max grid constrained to 1140px maximum width, centered on canvas with 40px outer margins. Supports persistent left-hand navigation and right-hand branch detail sidebars.

### Touch Target Mandate
All interactive components—inputs, selects, segmented controls, list items, and action triggers—enforce a strict minimum touch boundary of 44px × 44px, surrounded by at least 8px (`space-sm`) of non-interactive spacing.

## Elevation & Depth

### Tactile Clarity Over Decoration
The elevation structure relies on clean low-contrast outlines and subtle surface color tiering, avoiding heavy or dark multi-layered drop shadows that reduce contrast on budget mobile LCD screens.

### Elevation Tiers
- **Flat Ground (Level 0):** Background canvas (`#F8FAFC`). No shadow, no border.
- **Card Surface (Level 1):** White canvas (`#FFFFFF`) framed by a subtle 1px border (`#E2E8F0`) paired with a minimal ambient shadow: `0 1px 3px rgba(30, 41, 59, 0.06)`. Used for opportunity cards, branch listings, and profile modules.
- **Interactive State / Selected (Level 2):** Hover or active focus surfaces lift gently with a 1px border shift to Navy 200 (`#C7D2FE`) and ambient shadow: `0 4px 12px rgba(30, 30, 130, 0.08)`.
- **Sticky & Overlay Shelves (Level 3):** Bottom operational action trays and fixed application bars utilize an elevated white plane with a top demarcation line (`#E2E8F0`) and an upward diffuse shadow: `0 -4px 16px rgba(30, 41, 59, 0.08)`.
- **Modals & Dialog Sheets (Level 4):** Anchored bottom sheets and confirmation dialogues receive a backdrop scrim of `#0F172A` at 50% opacity and an elevation shadow: `0 10px 25px rgba(15, 23, 42, 0.15)`.

## Shapes

### Shape Language
A balanced roundedness tier (`roundedness: 2`) gives components an approachable, human character while retaining formal institutional authority. 

### Corner Radii Guidelines
- **Base Components (Inputs, Buttons, Cards):** 8px (`0.5rem`) corner radius. Provides comfortable visual containment without appearing juvenile or overly pill-formed.
- **Large Containers & Modal Sheets:** 16px (`1rem`) corner radius on top borders of mobile sliding bottom sheets and desktop container panels.
- **Avatars & Mascot Indicators:** Strict full-circle (50% / `9999px`) for the "La Penseuse" placeholder and employee profile portraits.
- **Badges & Chips:** 6px to 8px smooth corners to maintain structural alignment with rectangular form fields.

## Components

### Buttons
- **Primary Button:** Solid Deep Navy (`#1E1E82`) fill, pure white bold text (`#FFFFFF`), 48px minimum height for effortless one-handed thumb clicks. Active press scales down slightly (0.98 scale) with a Navy 900 overlay.
- **Secondary Button:** Outlined with a 1.5px Deep Navy border, transparent background, Deep Navy text. 48px minimum height.
- **Sticky Bottom Action Bar:** A persistent bottom container fixed above mobile browser navigation, housing primary application calls-to-action (e.g., "Postuler pour ce poste"). Features 16px horizontal and vertical padding, anchored over a crisp white surface with Level 3 elevation.

### Badges & Chips
- **Status Chips:** Distinct pill containers with 14px semi-bold text, paired with a leading 14px vector icon.
  - *Attention Required:* Light amber tint background (`#FEF3C7`), dark amber text (`#B45309`), alerting icon. Text provides clear direction (e.g., "Documents incomplets – Requis").
  - *Success / Validated:* Light green tint background (`#DCFCE7`), dark green text (`#15803D`), checkmark icon (e.g., "Candidature transmise").
  - *Department / Branch Badge:* Neutral Slate tint (`#F1F5F9`), slate text (`#334155`).
- **Accent Badge:** Vibrant red (`#CC1111`) fill with white text, strictly restricted to "Nouveau Poste" or "Poste Prioritaire" alerts.

### Lists & Navigation Cards
- **Opportunity Card:** White background, 1px border (`#E2E8F0`), 16px internal padding. Contains job title (`headline-sm`), branch location tag, deadline indicator, and touch chevron. Minimum vertical rhythm of 12px between cards.
- **Form Inputs:** 48px field height, white background, 1.5px border (`#CBD5E1`). Focus state illuminates with a 2px Deep Navy border and 2px offset halo (`rgba(30, 30, 130, 0.15)`). Helper text remains at 14px minimum to ensure clear instructions.

### Checkboxes & Radio Controls
- Minimum 24px × 24px visual box with an expanded 44px × 44px invisible tap area. Checked state fills with Deep Navy (`#1E1E82`) and a crisp white check icon.

### Mascot Placeholder: "La Penseuse"
- A 48px circular component displaying a stylized silhouette icon in Deep Navy on a soft slate surface (`#EEF2F6`) with an active accent dot. Accompanies onboarding steps, form encouragement tooltips, and developmental feedback notes with reassuring, conversational advice.

### ACME SA Emblem
- A solid rectangular block colored in Deep Navy (`#1E1E82`) with pure bold uppercase text in Vibrant Red (`#CC1111`), ensuring crisp institutional visibility in the mobile header without demanding excessive vertical screen real estate.