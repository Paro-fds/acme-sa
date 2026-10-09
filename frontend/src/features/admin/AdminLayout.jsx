import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import logo from '../../assets/logo-acme.png'
import AccountMenu from '../../components/AccountMenu.jsx'

const NAV_ITEMS = [
  { to: '/admin', end: true, label: 'Tableau de bord', icon: 'dashboard' },
  { to: '/admin/validations', end: false, label: 'File de validation', icon: 'fact_check' },
  { to: '/admin/employes', end: false, label: 'Employés', icon: 'groups' },
  { to: '/admin/signalements', end: false, label: 'Signalements', icon: 'report_problem' },
  { to: '/admin/referentiel', end: false, label: 'À rattacher', icon: 'account_tree' },
  { to: '/admin/administrateurs', end: false, label: 'Comptes et rôles', icon: 'manage_accounts' },
  { to: '/admin/audit', end: false, label: "Journal d'audit", icon: 'history' },
]

/**
 * Layout officiel de l'espace RH aligné sur les maquettes A02 à A10 validées par la direction.
 * Comprend :
 * - L'en-tête supérieur bleu marine (#1E1E82) avec le logo ACME SA, « Portail RH », le titre, les actions et le menu de compte.
 * - La barre latérale (Sidebar) gauche avec les 7 rubriques officielles.
 * - Le conteneur principal avec fond clair et contenu de la page.
 * - Un menu escamotable sur mobile (zones tactiles ≥ 44 px).
 */
export default function AdminLayout({
  title,
  backTo,
  headerActions,
  wide = false,
  children,
}) {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinkClass = ({ isActive }) =>
    `flex min-h-11 items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-[#1E1E82] text-white shadow-sm font-semibold'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <div className="flex min-h-dvh flex-col bg-[#F8FAFC] text-slate-800 antialiased">
      {/* En-tête supérieur global RH (TopHeader officiel A02/A10) */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between bg-[#1E1E82] px-4 text-white shadow-sm sm:px-6">
        <div className="flex items-center gap-3">
          {/* Bouton mobile pour ouvrir le menu latéral */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu de navigation RH"
            aria-expanded={mobileMenuOpen}
            className="-ml-2 flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
          >
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          {backTo && (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              aria-label="Retour"
              className="-ml-2 flex size-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
            </button>
          )}

          <img
            src={logo}
            alt="ACME SA"
            width="32"
            height="32"
            className="size-8 rounded bg-white p-0.5 object-contain"
          />
          <span className="text-lg font-light text-white/40" aria-hidden="true">
            |
          </span>
          <span className="text-base font-normal tracking-wide text-white">Portail RH</span>

          {title && (
            <h1 className="ml-2 hidden text-base font-semibold text-white/90 md:inline">
              {title}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          <div className="text-white">
            <AccountMenu space="admin" />
          </div>
        </div>
      </header>

      {/* Conteneur principal avec menu latéral et zone centrale */}
      <div className="flex flex-1">
        {/* Voile sombre pour mobile quand le menu est ouvert */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Menu latéral gauche fixe (Sidebar A02/A10) */}
        <aside
          className={`fixed inset-y-16 left-0 z-20 flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white py-6 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
          }`}
        >
          <nav aria-label="Menu principal RH" className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={navLinkClass}
              >
                <span className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
              </NavLink>
            ))}
          </nav>

          <div className="px-6 text-xs text-slate-400">
            <p className="font-semibold text-slate-500">ACME SA Carrière</p>
            <p>Version 2.0 · Espace RH</p>
          </div>
        </aside>

        {/* Zone principale de contenu */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className={`mx-auto flex w-full flex-col gap-6 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
            {title && (
              <div className="flex flex-wrap items-center justify-between gap-4 md:hidden">
                <h1 className="text-2xl font-bold tracking-tight text-[#1E1E82]">{title}</h1>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
