import { useState } from 'react'
import { confirmHrInformation, getDossier, getFreshness, reportHrError } from '../../api/dossier.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import InfoSection from './InfoSection.jsx'
import { DossierDetail, DossierHero, DossierParts, DossierProgressRing, IdentityCard, WhyCard } from './profileParts.jsx'
import { profileSections } from './profileSections.js'

const TITLE = 'Mon dossier'

async function loadDossier() {
  const [profile, dossier, freshness] = await Promise.all([getProfile(), getDossier(), getFreshness().catch(() => null)])
  return profile && dossier ? { profile, dossier, freshness } : null
}

/**
 * US-129 : « Confirmer » ou « Signaler » une information RH sans quitter la page ; le dossier renvoyé remplace
 * l'ancien (progression à jour) et la date de la prochaine confirmation est relue.
 */
function useHrAnswers(setDossier, setFreshness) {
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  async function save(send) {
    if (sending) return false
    setSending(true)
    setError(null)
    try {
      setDossier(await send())
      setFreshness(await getFreshness().catch(() => null))
      return true
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError)
      return false
    } finally {
      setSending(false)
    }
  }

  return {
    onConfirm: (item) => save(() => confirmHrInformation(item.key)),
    onReport: (item, values) => save(() => reportHrError(item.key, values)),
    sending,
    error,
    fieldError: (field) => (error?.field === field ? error.message : null),
  }
}

/**
 * US-129 (refonte du 2026-10-19) : en-tête illustré, progression, les 3 parties (la partie 3 se confirme ici),
 * l'identité et « Pourquoi ces données » à droite, puis le détail complet replié (US-05, US-201).
 */
export default function ProfilePage() {
  const { data, error, loading } = useLoader(loadDossier)
  const desktop = useIsDesktop()
  const [dossier, setDossier] = useState(null)
  const [freshness, setFreshness] = useState(undefined)
  const hr = useHrAnswers(setDossier, setFreshness)

  if (loading) return <Page account title={TITLE}><p role="status">Chargement…</p></Page>
  if (error) return <Page account title={TITLE}><Alert>{error.message}</Alert></Page>
  if (!data) return <Page account title={TITLE}><Alert>Impossible de charger le profil.</Alert></Page>

  const { profile } = data
  const current = dossier ?? data.dossier
  const editable = (fieldName) => profile.editable_fields.includes(fieldName)
  const identity = <IdentityCard profile={profile} />
  const why = <WhyCard />

  return (
    <Page
      account
      title={TITLE}
      asideLabel="Identité et aide"
      aside={
        desktop ? (
          <>
            {identity}
            {why}
          </>
        ) : undefined
      }
    >
      <DossierHero />
      {!desktop && identity}
      <DossierProgressRing completion={current.completion} freshness={freshness === undefined ? data.freshness : freshness} />
      <DossierParts dossier={current} hr={hr} />
      <DossierDetail>
        {profileSections(profile).map(({ icon, title, fields }) => (
          <InfoSection
            key={title}
            icon={icon}
            title={title}
            fields={fields.map(({ field, ...rest }) => ({ ...rest, editable: Boolean(field) && editable(field) }))}
          />
        ))}
      </DossierDetail>
      {!desktop && why}
    </Page>
  )
}
