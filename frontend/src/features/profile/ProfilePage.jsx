import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { decide, getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { formatDate, formatGender, initials } from '../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import InfoSection from './InfoSection.jsx'
import UpdateStateCard from './UpdateStateCard.jsx'

function ProfileSummary({ profile }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-white"
        >
          {initials(profile.last_name, profile.first_name)}
        </div>
        <div className="flex min-w-0 flex-col">
          <h2 id={titleId} className="text-xl font-bold break-words">
            {profile.last_name} {profile.first_name}
          </h2>
          <p className="font-semibold text-info-text">{profile.position}</p>
          <p className="flex items-center gap-1 text-sm text-muted">
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">location_on</span>
            <span>Agence {profile.agency_code}</span>
          </p>
          <p className="text-sm text-muted">Matricule {profile.employee_code}</p>
        </div>
      </div>
    </section>
  )
}

export const DECLINED_NOTICE = "C'est noté. Vous pourrez mettre à jour votre dossier à tout moment."

/** US-05 (profil), US-06 (état de la mise à jour) et US-08 (choix Oui / Non). */
export default function ProfilePage() {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const { data: profile, error: loadError, loading, reload } = useLoader(getProfile)
  const [update, setUpdate] = useState(null)
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function sendDecision(accepted) {
    setSending(true)
    setNotice(null)
    setError(null)
    try {
      const result = await decide(accepted)
      if (accepted) {
        navigate('/mise-a-jour/informations')
        return
      }
      setUpdate(result)
      setNotice(DECLINED_NOTICE)
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      setError(apiError.message)
      // Soumise depuis un autre appareil : le profil rechargé n'affiche plus la question.
      if (apiError.code === 'UPDATE_ALREADY_SUBMITTED') {
        setUpdate(null)
        reload()
      }
    }
    setSending(false)
  }

  if (loading) return <Page account title="Mon profil"><p role="status">Chargement…</p></Page>
  if (loadError) return <Page account title="Mon profil"><Alert>{loadError.message}</Alert></Page>

  const editable = (fieldName) => profile.editable_fields.includes(fieldName)

  return (
    <Page account title="Mon profil">
      <ProfileSummary profile={profile} />

      <UpdateStateCard
        update={update ?? profile.update}
        onYes={() => sendDecision(true)}
        onNo={() => sendDecision(false)}
        onResume={() => navigate('/mise-a-jour/informations')}
        sending={sending}
        notice={notice}
        error={error}
      />

      <InfoSection
        icon="person"
        title="Identité"
        fields={[
          { label: 'Nom', value: profile.last_name, editable: editable('last_name') },
          { label: 'Prénom', value: profile.first_name, editable: editable('first_name') },
          { label: 'Sexe', value: formatGender(profile.gender) },
          { label: 'Date de naissance', value: formatDate(profile.birth_date) },
        ]}
      />

      <InfoSection
        icon="contacts"
        title="Coordonnées"
        fields={[
          { label: 'Téléphone', value: profile.telephone_number, editable: editable('telephone_number') },
          { label: 'Email', value: profile.email_address, editable: editable('email_address') },
          { label: 'Adresse', value: profile.address_line_1, editable: editable('address_line_1') },
        ]}
      />

      <InfoSection
        icon="business_center"
        title="Informations professionnelles"
        fields={[
          { label: 'Matricule', value: profile.employee_code },
          { label: 'Agence', value: profile.agency_code },
          { label: 'Département', value: profile.department },
          { label: 'Poste', value: profile.position },
          { label: 'Grade', value: profile.grade },
          { label: 'Niveau', value: profile.level },
          { label: 'Contrat', value: profile.contract_nature },
          { label: "Date d'embauche", value: formatDate(profile.hire_date) },
        ]}
      />
    </Page>
  )
}
