/**
 * Rubriques de l'espace employé. US-113 : « Mon profil » devient « Mon dossier » ; « Mon parcours » entre dans le menu
 * (à gauche sur ordinateur, menu du bouton ☰ sur téléphone). La barre du bas du téléphone garde 4 rubriques.
 */
export const EMPLOYEE_NAV = [
  { to: '/accueil', icon: 'home', label: 'Accueil', bottom: true },
  { to: '/profil', icon: 'person', label: 'Mon dossier', bottom: true },
  { to: '/certificats', icon: 'verified', label: 'Mes certificats', bottom: true },
  { to: '/parcours', icon: 'workspace_premium', label: 'Mon parcours', bottom: false },
  { to: '/carriere', icon: 'work', label: 'Ma carrière', bottom: true },
]
