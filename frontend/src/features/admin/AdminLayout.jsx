import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { getAdminFrame } from '../../api/adminFrame.js'
import AccountMenu from '../../components/AccountMenu.jsx'
import NavPanel, { NavIcon, navItemClass } from '../../components/NavPanel.jsx'
import TopBar from '../../components/TopBar.jsx'
import NotificationBell from './notifications/NotificationBell.jsx'
import { can } from './roles.js'

/**
 * Rubriques des écrans validés A02 → A11, dans leur ordre, plus « Postes à pourvoir » (US-802, nom d'US-124) ; chacune selon le rôle.
 * « À rattacher » (A09) retiré du menu le 2026-10-13 : l'écran reste joignable par le tableau de bord et la fiche de poste.
 */
const NAV_ITEMS = [
  { to: '/admin', end: true, icon: 'dashboard', label: 'Tableau de bord', access: 'dashboard' },
  { to: '/admin/validation', icon: 'verified', label: 'File de validation', access: 'validation', count: 'validation', tone: 'neutral' },
  { to: '/admin/employes', icon: 'group', label: 'Employés', access: 'employees' },
  { to: '/admin/postes', icon: 'work', label: 'Postes à pourvoir', access: 'openings' },
  { to: '/admin/signalements', icon: 'flag', label: 'Signalements', access: 'reports', count: 'reports', tone: 'warning' },
  { to: '/admin/comptes', icon: 'manage_accounts', label: 'Comptes et rôles', access: 'accounts' },
  { to: '/admin/audit', icon: 'list_alt', label: "Journal d'audit", access: 'audit' },
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

function Initials({ name }) {
  const letters = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-white" aria-hidden="true">
      {letters}
    </span>
  )
}

/**
 * US-108 : rubriques et compteurs repris de l'écran validé A02 ; US-111 : « Espace de gestion ».
 * US-127 (refonte du 2026-10-19) : panneau bleu à gauche, fixe sur ordinateur et ouvert par le bouton ☰ sur téléphone ;
 * barre du haut blanche (date, cloche US-116, nom et rôle avec le menu du compte) ; titre de la page en tête du contenu.
 */
export default function AdminLayout({ title, subtitle, backTo, backLabel = 'Retour', headerActions, wide = false, children }) {
  const frame = useAdminFrame()
  const [menuOpen, setMenuOpen] = useState(false)
  const role = frame?.me.role
  const person = frame && {
    name: frame.me.display_name,
    detail: frame.me.role_label,
    avatar: <Initials name={frame.me.display_name} />,
  }

  return (
    <div className="flex min-h-dvh bg-rh-canvas text-rh-strong">
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-rh-strong/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}
      <NavPanel
        space="admin"
        homeTo="/admin"
        subtitle="Espace de gestion"
        navLabel="Menu principal RH"
        className={`fixed inset-y-0 left-0 z-50 transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:translate-x-0 ${
          menuOpen ? 'translate-x-0 shadow-modal' : '-translate-x-full'
        }`}
      >
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.filter((item) => can(role, item.access)).map((item) => {
            const count = item.count ? frame?.counts[item.count] : 0
            return (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={navItemClass}>
                  <NavIcon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span
                      className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-sm font-bold tabular-nums ${BADGE_TONES[item.tone]}`}
                    >
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </NavPanel>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          start={
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu de navigation RH"
              aria-expanded={menuOpen}
              className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-heading hover:bg-canvas lg:hidden"
            >
              <span className="material-symbols-outlined" aria-hidden="true">{menuOpen ? 'close' : 'menu'}</span>
            </button>
          }
        >
          {can(role, 'notifications') && <NotificationBell />}
          <AccountMenu space="admin" person={person} />
        </TopBar>

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
