import { Link } from 'react-router'
import logo from '../../assets/logo-acme.png'
import AccountMenu from '../../components/AccountMenu.jsx'

const NAVIGATION = [
  { label: 'Tableau de bord', to: '/admin' },
  { label: 'File de validation' },
  { label: 'Employés', to: '/admin/employes', active: true },
  { label: 'Signalements' },
  { label: 'À rattacher', to: '/admin/referentiel' },
  { label: 'Comptes et rôles', to: '/admin/administrateurs' },
  { label: "Journal d'audit" },
]

function NavigationItem({ item }) {
  const className = `flex min-h-11 shrink-0 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:shrink ${
    item.active
      ? 'bg-primary font-semibold text-white shadow-card'
      : item.to
        ? 'text-heading hover:bg-canvas'
        : 'cursor-not-allowed text-muted'
  }`

  if (!item.to) {
    return <span aria-disabled="true" className={className}>{item.label}</span>
  }

  return (
    <Link to={item.to} aria-current={item.active ? 'page' : undefined} className={className}>
      {item.label}
    </Link>
  )
}

/** Enveloppe RH de la maquette A07 ; les entrées dont la page n'existe pas restent désactivées. */
export default function AdminShell({ children }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="z-10 flex h-14 shrink-0 items-center justify-between gap-3 bg-primary px-4 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="ACME SA" width="32" height="32" className="size-8 shrink-0 rounded bg-white p-0.5 object-contain" />
          <span className="font-light text-white/60" aria-hidden="true">|</span>
          <span className="truncate text-sm font-medium tracking-wide">Portail RH</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-white/80 sm:inline">Espace RH</span>
          <AccountMenu space="admin" />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-border bg-surface px-3 py-2 lg:w-64 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <nav aria-label="Navigation principale RH" className="flex gap-1 overflow-x-auto text-sm font-medium lg:flex-col">
            {NAVIGATION.map((item) => <NavigationItem key={item.label} item={item} />)}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
