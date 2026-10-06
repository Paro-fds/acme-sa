import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useLogout } from '../lib/useLogout.js'

const MENU_ITEM =
  'flex min-h-11 items-center gap-3 rounded-md px-3 text-left font-semibold text-heading hover:bg-canvas disabled:opacity-60'

/** Liens supplémentaires de l'espace employé (V2, US-25). */
const EMPLOYEE_LINKS = [{ to: '/parcours', icon: 'workspace_premium', label: 'Mon parcours' }]

/** Liens supplémentaires de l'espace admin (US-23). */
const ADMIN_LINKS = [
  { to: '/admin/administrateurs', icon: 'manage_accounts', label: 'Administrateurs' },
  { to: '/admin/mot-de-passe', icon: 'password', label: 'Changer mon mot de passe' },
]

/** Avatar de l'en-tête et son menu (« Se déconnecter » : US-04 employé, US-15 admin ; liens admin : US-23 ; « Mon parcours » : US-25). */
export default function AccountMenu({ space = 'employee' }) {
  const logout = useLogout(space)
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function handleLogout() {
    setSending(true)
    setError(null)
    const failure = await logout()
    if (failure) {
      setSending(false)
      setError(failure.message)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Menu du compte"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="-mr-2 flex size-11 items-center justify-center rounded-full text-primary hover:bg-canvas"
      >
        <span className="material-symbols-outlined text-[32px]" aria-hidden="true">account_circle</span>
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 mt-2 flex w-60 flex-col gap-2 rounded-lg border border-border bg-surface p-2 shadow-modal"
        >
          {(space === 'admin' ? ADMIN_LINKS : EMPLOYEE_LINKS).map((link) => (
            <Link key={link.to} to={link.to} role="menuitem" onClick={() => setOpen(false)} className={MENU_ITEM}>
              <span className="material-symbols-outlined" aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          ))}
          <button type="button" role="menuitem" onClick={handleLogout} disabled={sending} className={MENU_ITEM}>
            <span className="material-symbols-outlined" aria-hidden="true">logout</span>
            {sending ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
          {error && (
            <p role="alert" className="px-3 pb-1 text-sm text-error-text">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
