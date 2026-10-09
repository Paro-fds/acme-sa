import { useId } from 'react'
import { getEngagement } from '../../api/admin.js'
import { useLoader } from '../../lib/useLoader.js'

/** US-605 : combien d'employés reviennent d'eux-mêmes (critère n°3) et ce qu'ils pensent du dépôt (« plaisir »). */
export default function EngagementCard() {
  const titleId = useId()
  const { data, error, loading } = useLoader(getEngagement, { loginPath: '/admin/connexion' })
  if (loading || error) return null
  const answers = data.feedback.reduce((sum, item) => sum + item.count, 0)
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <h3 id={titleId} className="text-lg font-semibold">
        Engagement des employés
      </h3>
      <p>
        <span className="text-[28px] leading-8 font-bold text-heading tabular-nums">{data.employees_30_days}</span>{' '}
        employé{data.employees_30_days > 1 ? 's' : ''} sur {data.active_employees} se {data.employees_30_days > 1 ? 'sont' : 'est'} connecté
        {data.employees_30_days > 1 ? 's' : ''} ces 30 derniers jours ({data.logins_30_days} connexion{data.logins_30_days > 1 ? 's' : ''}).
      </p>
      <p className="text-sm text-help">Aucune relance n'est encore envoyée : ces connexions sont toutes spontanées.</p>
      <div className="flex flex-col gap-2">
        <p className="font-semibold text-heading">Avis après le dépôt d'un certificat</p>
        {answers === 0 ? (
          <p className="text-sm text-help">Aucune réponse pour l'instant.</p>
        ) : (
          <ul aria-label="Avis après le dépôt" className="grid grid-cols-3 gap-2">
            {data.feedback.map((item) => (
              <li key={item.rating} className="flex flex-col items-center rounded-lg bg-section p-2">
                <span className="text-xl font-bold text-heading tabular-nums">{item.count}</span>
                <span className="text-sm text-help">{item.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
