import { NavLink } from 'react-router'

/** US-207 CA-02 : barre du bas de l'espace employé (écrans validés 06 → 13) ; « Ma carrière » ajoutée par US-801. */
const ITEMS = [
  { to: '/accueil', icon: 'home', label: 'Accueil' },
  { to: '/profil', icon: 'person', label: 'Mon profil' },
  { to: '/certificats', icon: 'verified', label: 'Mes certificats' },
  { to: '/carriere', icon: 'work', label: 'Ma carrière' },
]

export default function BottomNav() {
  return (
    <nav aria-label="Navigation principale" className="bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgb(30_41_59/0.06)] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-center text-sm leading-tight ${
                  isActive ? 'font-semibold text-primary' : 'text-help hover:text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
