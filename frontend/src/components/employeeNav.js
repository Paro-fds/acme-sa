/**
 * Rubriques de l'espace employé (à gauche sur ordinateur, menu du bouton ☰ sur téléphone).
 * US-113 : « Mon profil » devient « Mon dossier ». US-114 : « Mon parcours » est fondu dans « Ma carrière ».
 * US-1012 : « Mon PER » (plan d'épargne retraite).
 */
export const EMPLOYEE_NAV = [
  { to: '/accueil', icon: 'home', label: 'Accueil', bottom: true },
  { to: '/profil', icon: 'person', label: 'Mon dossier', bottom: true },
  { to: '/certificats', icon: 'verified', label: 'Mes certificats', bottom: true },
  { to: '/carriere', icon: 'work', label: 'Ma carrière', bottom: true },
  { to: '/per', icon: 'savings', label: 'Mon PER' }, // US-1012 : menu seulement, la barre du bas reste à 4
]
