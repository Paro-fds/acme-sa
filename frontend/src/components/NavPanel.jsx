import { useState } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo-acme.png'
import { useLogout } from '../lib/useLogout.js'

/** Classe d'une rubrique du panneau (lien `NavLink`) : pleine largeur, 48 px de haut, rubrique en cours surlignée. */
export function navItemClass({ isActive }) {
  return `flex min-h-12 items-center gap-3.5 rounded-lg px-3.5 text-base ${
    isActive ? 'bg-nav-active font-semibold text-white' : 'font-medium text-nav-text hover:bg-nav-hover hover:text-white'
  }`
}

/** Icône Material Symbols d'une rubrique. */
export function NavIcon({ name }) {
  return (
    <span className="material-symbols-outlined shrink-0 text-[22px]" aria-hidden="true">
      {name}
    </span>
  )
}

function Brand({ to, subtitle }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg px-2 py-1 text-white hover:bg-nav-hover">
      <img src={logo} alt="" width="44" height="44" className="size-11 shrink-0 rounded-full bg-surface object-contain p-0.5" />
      <span className="flex min-w-0 flex-col">
        <span className="text-2xl leading-tight font-extrabold tracking-tight">
          ACME <span className="font-normal">SA</span>
        </span>
        <span className="text-sm leading-snug text-nav-muted">{subtitle}</span>
      </span>
    </Link>
  )
}

function LogoutButton({ space }) {
  const logout = useLogout(space)
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
        className="flex min-h-12 items-center gap-3.5 rounded-lg px-3.5 text-base text-nav-text hover:bg-nav-hover hover:text-white disabled:opacity-60"
      >
        <NavIcon name="logout" />
        {sending ? 'Déconnexion…' : 'Se déconnecter'}
      </button>
      {error && (
        <p role="alert" className="rounded-lg bg-surface px-3 py-2 text-sm text-error-text">
          {error}
        </p>
      )}
    </>
  )
}

/** Montagnes dessinées et devise, collées au bas du panneau (maquette du 2026-10-19). */
function Mountains() {
  return (
    <div className="relative -mx-4 -mb-6 h-44 shrink-0 overflow-hidden">
      <svg
        viewBox="0 0 280 150"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-36 w-full"
      >
        <path d="M0 150 L0 96 L38 70 L62 84 L104 40 L136 66 L160 52 L206 90 L240 72 L280 96 L280 150 Z" className="fill-nav-mountain-far" />
        <path d="M104 40 L118 52 L110 52 L100 60 L94 50 Z" className="fill-nav-mountain-snow" />
        <path d="M0 150 L0 116 L46 92 L84 110 L128 82 L170 104 L214 86 L252 104 L280 96 L280 150 Z" className="fill-nav-mountain-mid" />
        <path d="M0 150 L0 132 L60 118 L120 130 L190 116 L250 128 L280 122 L280 150 Z" className="fill-nav-mountain-near" />
      </svg>
      <p className="absolute inset-x-6 bottom-6 text-base leading-snug font-medium text-white">
        Grandir ensemble
        <br />
        pour un impact durable
      </p>
    </div>
  )
}

/**
 * US-127 : panneau de menu des deux espaces (refonte du 2026-10-19) : bleu de la charte, marque, rubriques (`children`,
 * dans un `<nav>`), « Se déconnecter », montagnes et devise en bas. `className` : position (fixe à l'écran, tiroir…).
 */
export default function NavPanel({ space, homeTo, subtitle, navLabel, className = '', children }) {
  return (
    <div data-nav-panel className={`flex w-72 shrink-0 flex-col gap-7 overflow-y-auto bg-nav-bg px-4 pt-6 pb-6 text-white ${className}`}>
      <Brand to={homeTo} subtitle={subtitle} />
      {children && <nav aria-label={navLabel}>{children}</nav>}
      <div className="mt-auto flex flex-col gap-1">
        <LogoutButton space={space} />
      </div>
      <Mountains />
    </div>
  )
}
