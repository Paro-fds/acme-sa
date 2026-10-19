import { useId } from 'react'
import { getProfile } from '../../api/employee.js'
import { useLoader } from '../../lib/useLoader.js'
import { UNIT_TO_CONFIRM } from '../profile/profileSections.js'

function ReadOnly({ label, children }) {
  return (
    <div className="flex flex-col rounded-lg bg-surface p-3">
      <span className="text-sm text-help">{label}</span>
      <span className="flex items-center justify-between gap-2 font-semibold break-words text-heading">
        {children}
        <span className="material-symbols-outlined text-[18px] text-muted" aria-label="Non modifiable">lock</span>
      </span>
    </div>
  )
}

/** US-207 CA-03, écran validé 08 : l'identité connue des RH, en lecture seule, au-dessus des coordonnées. */
export default function IdentityBlock() {
  const titleId = useId()
  const { data: profile } = useLoader(getProfile)
  if (!profile) return null
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-section p-4">
      <h3 id={titleId} className="flex items-center gap-2 text-sm font-semibold tracking-wide text-help uppercase">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock</span>
        Identité RH vérifiée (lecture seule)
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <ReadOnly label="Nom de famille">{profile.last_name}</ReadOnly>
        <ReadOnly label="Prénom">{profile.first_name}</ReadOnly>
      </div>
      <ReadOnly label="Matricule et affectation">
        <span>
          {profile.employee_code} · {profile.affectation.agency ?? UNIT_TO_CONFIRM}
          <span className="block font-normal text-help">{profile.position}</span>
        </span>
      </ReadOnly>
      <p className="flex items-start gap-2 text-sm text-help">
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">info</span>
        Pour modifier votre état civil, contactez la Direction des Ressources Humaines.
      </p>
    </section>
  )
}
