import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { getProfile } from '../api/employee.js'
import logo from '../assets/logo-acme.png'
import { useIsDesktop } from '../lib/useIsDesktop.js'
import { useLogout } from '../lib/useLogout.js'
import AccountMenu from './AccountMenu.jsx'
import EmployeeNotificationBell from '../features/notifications/EmployeeNotificationBell.jsx'
import Avatar from './Avatar.jsx'
import BottomNav from './BottomNav.jsx'
import { EMPLOYEE_NAV } from './employeeNav.js'
import NavPanel, { NavIcon, navItemClass } from './NavPanel.jsx'
import TopBar from './TopBar.jsx'

/** Nom, poste et photo de l'employé pour le menu ; le cadre s'affiche même si le profil ne charge pas. */
function useEmployeeIdentity() {
  const [identity, setIdentity] = useState(null)
  useEffect(() => {
    let active = true
    Promise.resolve()
      .then(() => getProfile())
      .then((profile) => active && profile && setIdentity(profile))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  return identity
}

function Identity({ identity }) {
  if (!identity) return null
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar firstName={identity.first_name} lastName={identity.last_name} photoUrl={identity.photo_url} size="md" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold text-heading">
          {identity.first_name} {identity.last_name}
        </span>
        {identity.position && <span className="truncate text-sm text-help">{identity.position}</span>}
      </div>
    </div>
  )
}

function NavItems({ onNavigate }) {
  return (
    <ul className="flex flex-col gap-1">
      {EMPLOYEE_NAV.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-lg px-3.5 font-medium ${
                isActive ? 'bg-primary font-semibold text-white' : 'text-heading hover:bg-canvas'
              }`
            }
          >
            <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function LogoutButton() {
  const logout = useLogout('employee')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  return (
    <>
      <button
        type="button"
        disabled={sending}
        onClick={async () => {
          setSending(true)
          setError(null)
          const failure = await logout()
          if (failure) {
            setSending(false)
            setError(failure.message)
          }
        }}
        className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-help hover:text-heading disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">logout</span>
        {sending ? 'Déconnexion…' : 'Se déconnecter'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-error-text">
          {error}
        </p>
      )}
    </>
  )
}

function Brand() {
  return (
    <Link to="/accueil" className="flex items-center gap-3">
      <img src={logo} alt="ACME SA" width="40" height="40" className="size-10 shrink-0 rounded-full" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-semibold text-heading">Portail Carrière</span>
        <span className="truncate text-sm text-help">ACME SA</span>
      </span>
    </Link>
  )
}

/** US-127 : sur ordinateur, panneau bleu fixe à gauche (rubriques, « Se déconnecter », montagnes). */
function Sidebar({ nav }) {
  return (
    <NavPanel
      space="employee"
      homeTo="/accueil"
      subtitle="Microfinance, un avenir ensemble"
      navLabel="Espace employé"
      className="sticky top-0 h-dvh"
    >
      {nav && (
        <ul className="flex flex-col gap-1.5">
          {EMPLOYEE_NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={navItemClass}>
                <NavIcon name={item.icon} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </NavPanel>
  )
}

/** US-127 : nom, poste et photo de l'employé dans la barre du haut, avec le menu du compte. */
function accountPerson(identity) {
  if (!identity) return undefined
  return {
    name: `${identity.first_name} ${identity.last_name}`,
    detail: identity.position,
    avatar: <Avatar firstName={identity.first_name} lastName={identity.last_name} photoUrl={identity.photo_url} size="md" />,
  }
}

/** Téléphone : bouton ☰ qui ouvre toutes les rubriques (dont « Mon parcours »), le compte et « Se déconnecter ». */
function Drawer({ identity, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-heading/40" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col gap-6 bg-surface px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-modal"
      >
        <div className="flex items-center justify-between gap-2 px-2">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-heading hover:bg-canvas"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <nav aria-label="Rubriques">
          <NavItems onNavigate={onClose} />
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border px-2 pt-4">
          <Identity identity={identity} />
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}

function MobileHeader({ identity, nav }) {
  const [open, setOpen] = useState(false)
  // Le menu est rendu hors de l'en-tête : son flou (backdrop-blur) empêcherait un panneau « fixed » de couvrir l'écran.
  return (
    <>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 bg-surface/90 shadow-[0_1px_8px_rgb(0_0_0/0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-3xl items-center gap-3 px-4">
          {nav && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={open}
              className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-primary hover:bg-canvas"
            >
              <span className="material-symbols-outlined text-[28px]" aria-hidden="true">menu</span>
            </button>
          )}
          <img src={logo} alt="ACME SA" width="40" height="40" className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-heading">Portail Carrière</span>
            <span className="truncate text-sm text-help">Institution de Microfinance — Haïti</span>
          </div>
          {nav && <EmployeeNotificationBell />}
          <AccountMenu space="employee" />
        </div>
      </header>
      {open && <Drawer identity={identity} onClose={() => setOpen(false)} />}
    </>
  )
}

function BackLink({ to, label }) {
  return (
    <Link to={to} className="-my-2 flex min-h-11 w-fit items-center gap-1 font-semibold text-heading hover:text-primary">
      <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
      {label}
    </Link>
  )
}

/**
 * US-207, US-113 : cadre de l'espace employé.
 * Téléphone (écrans 06 → 13) : en-tête « Portail Carrière » avec le bouton ☰, contenu, barre d'actions et barre du bas.
 * Ordinateur (US-127) : panneau bleu fixe à gauche, barre du haut (date, cloche, compte), contenu au centre, `aside` (progression, aide) dans la colonne de droite,
 * boutons d'action en bas du contenu au lieu d'une barre collée. `wide` : pleine largeur sans colonne de droite.
 */
export default function EmployeeLayout({
  title,
  backTo,
  backLabel,
  actions,
  nav = true,
  aside,
  asideLabel = 'Aide et progression',
  wide = false,
  children,
}) {
  const desktop = useIsDesktop()
  const identity = useEmployeeIdentity()

  if (desktop) {
    return (
      <div className="flex min-h-dvh bg-canvas">
        <Sidebar nav={nav} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar>
            {nav && <EmployeeNotificationBell />}
            <AccountMenu space="employee" person={accountPerson(identity)} />
          </TopBar>
          <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 px-10 py-9">
            <h1 className="sr-only">{title}</h1>
            {backTo && <BackLink to={backTo} label={backLabel} />}
            <div className={aside ? 'grid grid-cols-[minmax(0,1fr)_20rem] items-start gap-6' : wide ? '' : 'max-w-3xl'}>
              <div className="flex min-w-0 flex-col gap-6">
                {children}
                {actions && (
                  <div className="flex flex-row-reverse flex-wrap gap-3 border-t border-border pt-5 [&>*]:w-auto [&>*]:min-w-48">
                    {actions}
                  </div>
                )}
              </div>
              {aside && (
                <aside aria-label={asideLabel} className="sticky top-24 flex flex-col gap-6">
                  {aside}
                </aside>
              )}
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <MobileHeader identity={identity} nav={nav} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="sr-only">{title}</h1>
        {backTo && <BackLink to={backTo} label={backLabel} />}
        {children}
      </main>
      {(actions || nav) && (
        <div className="sticky bottom-0 z-10">
          {actions && (
            <div className="border-t border-border bg-surface p-4 shadow-sticky">
              <div className="mx-auto flex max-w-3xl flex-col gap-2">{actions}</div>
            </div>
          )}
          {nav && <BottomNav />}
        </div>
      )}
    </div>
  )
}
