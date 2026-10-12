import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { getAdminFrame } from '../../api/adminFrame.js'
import logo from '../../assets/logo-acme.png'
import AccountMenu from '../../components/AccountMenu.jsx'
import { useLogout } from '../../lib/useLogout.js'
import { can } from './roles.js'

/** Rubriques des écrans validés A02 → A11, dans leur ordre, plus « Postes ouverts » (US-802, lot 4, sans maquette) ; chacune selon le rôle. */
const NAV_ITEMS = [
  { to: '/admin', end: true, label: 'Tableau de bord', access: 'dashboard' },
  { to: '/admin/validation', label: 'File de validation', access: 'validation', count: 'validation', tone: 'neutral' },
  { to: '/admin/employes', label: 'Employés', access: 'employees' },
  { to: '/admin/postes', label: 'Postes ouverts', access: 'openings' },
  { to: '/admin/signalements', label: 'Signalements', access: 'reports', count: 'reports', tone: 'warning' },
  { to: '/admin/referentiel', label: 'À rattacher', access: 'referential', count: 'to_attach', tone: 'warning' },
  { to: '/admin/comptes', label: 'Comptes et rôles', access: 'accounts' },
  { to: '/admin/audit', label: "Journal d'audit", access: 'audit' },
]

const BADGE_TONES = {
  neutral: 'bg-status-neutral-bg text-status-neutral-text',
  warning: 'bg-status-progress-bg text-status-progress-text',
}

/** US-108 CA-02 : nom, rôle et compteurs réels ; en cas d'échec, le cadre s'affiche sans eux (la page gère la session). */
function useAdminFrame() {
  const [frame, setFrame] = useState(null)
  useEffect(() => {
    let active = true
    getAdminFrame()
      .then((result) => active && setFrame(result))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return frame
}

function navLinkClass({ isActive }) {
  return `flex min-h-11 items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary text-white shadow-card' : 'text-rh-text hover:bg-rh-hover hover:text-rh-strong'
  }`
}

/**
 * US-108 : cadre de l'espace RH repris de l'écran validé A02 :
 * en-tête bleu marine (logo, « Espace de gestion » depuis US-111, « Nom · Rôle », « Se déconnecter »), menu latéral à gauche,
 * titre de la page en tête du contenu. À 390 px, le menu s'ouvre par un bouton.
 */
export default function AdminLayout({ title, subtitle, backTo, backLabel = 'Retour', headerActions, wide = false, children }) {
  const frame = useAdminFrame()
  const logout = useLogout('admin')
  const [menuOpen, setMenuOpen] = useState(false)
  const accountLabel = frame ? `${frame.me.display_name} · ${frame.me.role_label}` : undefined
  const role = frame?.me.role

  return (
    <div className="flex min-h-dvh flex-col bg-rh-canvas text-rh-strong">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 flex h-16 shrink-0 items-center justify-between gap-3 bg-primary px-4 text-white sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu de navigation RH"
            aria-expanded={menuOpen}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-surface/10 lg:hidden"
          >
            <span className="material-symbols-outlined" aria-hidden="true">{menuOpen ? 'close' : 'menu'}</span>
          </button>
          <img src={logo} alt="ACME SA" width="32" height="32" className="h-8 w-auto shrink-0 rounded bg-surface object-contain p-0.5" />
          <span className="text-lg text-white/40" aria-hidden="true">|</span>
          <span className="truncate text-base font-medium">Espace de gestion</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <AccountMenu space="admin" label={accountLabel} role={role} />
          <span className="hidden text-white/40 sm:inline" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => logout()}
            className="hidden min-h-11 px-1 text-white/80 underline underline-offset-2 hover:text-white sm:inline"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {menuOpen && (
          <div className="fixed inset-0 z-20 bg-rh-strong/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
        )}
        <aside
          className={`fixed top-16 bottom-0 left-0 z-20 w-64 shrink-0 overflow-y-auto border-r border-rh-line bg-surface py-6 transition-transform lg:static lg:translate-x-0 lg:overflow-visible ${
            menuOpen ? 'translate-x-0 shadow-modal' : '-translate-x-full'
          }`}
        >
          <nav aria-label="Menu principal RH" className="flex flex-col gap-1 px-3 lg:sticky lg:top-22">
            {NAV_ITEMS.filter((item) => can(role, item.access)).map((item) => {
              const count = item.count ? frame?.counts[item.count] : 0
              return (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={navLinkClass}>
                  <span>{item.label}</span>
                  {count > 0 && (
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${BADGE_TONES[item.tone]}`}
                    >
                      {count}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 md:p-8">
          <div className={`mx-auto flex w-full flex-col gap-6 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
            {backTo && (
              <Link to={backTo} className="-mb-3 inline-flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>
                {backLabel}
              </Link>
            )}
            {title && (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <h1 className="text-2xl font-bold tracking-tight break-words text-primary">{title}</h1>
                  {subtitle && <p className="text-sm text-rh-muted">{subtitle}</p>}
                </div>
                {headerActions && <div className="flex flex-wrap items-center gap-2">{headerActions}</div>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
