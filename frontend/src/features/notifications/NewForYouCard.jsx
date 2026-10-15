import { Link, useNavigate } from 'react-router'
import { markMyNotificationRead } from '../../api/notifications.js'
import { useMyNotifications } from './myNotificationParts.jsx'

/** US-120 CA-04 : sur l'accueil, les postes ouverts pour l'employé qu'il n'a pas encore vus. */
export default function NewForYouCard() {
  const { data } = useMyNotifications()
  const navigate = useNavigate()
  const fresh = (data?.items ?? []).filter((item) => item.kind === 'OPENING' && item.unread)
  if (fresh.length === 0) return null
  // « Voir le poste » : tous les postes de l'encart sont vus, « Ma carrière » les montre ensemble.
  const open = (event) => {
    event.preventDefault()
    fresh.forEach((item) => markMyNotificationRead(item.key).catch(() => {}))
    navigate(fresh[0].link)
  }
  return (
    <section aria-label="Nouveau pour vous" className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-surface p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-primary uppercase">
        <span className="material-symbols-outlined text-lg" aria-hidden="true">work</span>
        Nouveau pour vous
      </p>
      <ul className="flex flex-col gap-3">
        {fresh.map((item) => (
          <li key={item.key} className="flex flex-col gap-1">
            <p className="text-base font-semibold break-words text-heading">{item.detail}</p>
            <p className="text-sm text-help">Vous remplissez tous les critères de ce poste : il ne reste qu’à postuler.</p>
          </li>
        ))}
      </ul>
      <Link
        to={fresh[0].link}
        onClick={open}
        className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active sm:w-fit"
      >
        {fresh.length > 1 ? 'Voir les postes' : 'Voir le poste'}
      </Link>
    </section>
  )
}
