import { NavLink } from 'react-router'

/** US-207 CA-02 : barre du bas de l'espace employé (écrans validés 06 → 13). */
const ITEMS = [
  { to: '/accueil', icon: 'home', label: 'Accueil' },
  { to: '/profil', icon: 'person', label: 'Mon profil' },
  { to: '/certificats', icon: 'verified', label: 'Mes certificats' },
]

export default function BottomNav() {
  return (
    <nav aria-label="Navigation principale" className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]">
      <ul className="mx-auto grid max-w-3xl grid-cols-3">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm ${
                  isActive ? 'font-semibold text-primary' : 'text-help hover:text-heading'
                }`
              }
            >
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
