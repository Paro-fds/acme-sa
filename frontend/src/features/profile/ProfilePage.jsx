import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { decide, discardUpdate, getProfile, reopenUpdate } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { initials } from '../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import InfoSection from './InfoSection.jsx'
import { profileSections } from './profileSections.js'
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
export const DISCARDED_NOTICE = 'Modifications annulées : votre dernier envoi est conservé.'

/** US-05 (profil), US-06 (état de la mise à jour), US-08 (choix Oui / Non), accès à « Mes documents » (US-07) et à « Mon parcours » (US-25). */
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

  /** US-24 : « Modifier à nouveau » (reopen) et « Annuler les modifications » (discard). */
  async function sendAction(action) {
    setSending(true)
    setNotice(null)
    setError(null)
    try {
      if (action === 'reopen') {
        await reopenUpdate()
        navigate('/mise-a-jour/informations')
        return
      }
      setUpdate(await discardUpdate())
      setNotice(DISCARDED_NOTICE)
      reload()
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      setError(apiError.message)
      // État changé depuis un autre appareil : on affiche l'état réel.
      setUpdate(null)
      reload()
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
        onReopen={() => sendAction('reopen')}
        onDiscard={() => sendAction('discard')}
        sending={sending}
        notice={notice}
        error={error}
      />

      <Link
        to="/documents"
        className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card hover:bg-canvas"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-bg text-info-text" aria-hidden="true">
          <span className="material-symbols-outlined">folder_shared</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-heading">Mes documents</span>
          <span className="text-sm text-help">Diplômes, certificats et attestations joints à votre dossier</span>
        </span>
        <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
      </Link>

      <Link
        to="/parcours"
        className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-card hover:bg-canvas"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-info-bg text-info-text" aria-hidden="true">
          <span className="material-symbols-outlined">workspace_premium</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold text-heading">Mon parcours</span>
          <span className="text-sm text-help">Diplômes, formations, expériences et compétences</span>
        </span>
        <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
      </Link>

      {profileSections(profile).map(({ icon, title, fields }) => (
        <InfoSection
          key={title}
          icon={icon}
          title={title}
          fields={fields.map(({ field, ...rest }) => ({ ...rest, editable: Boolean(field) && editable(field) }))}
        />
      ))}
    </Page>
  )
}
