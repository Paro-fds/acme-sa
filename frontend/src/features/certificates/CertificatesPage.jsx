import { Link } from 'react-router'
import { listCertificates } from '../../api/certificates.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Mascot from '../../components/Mascot.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import { DossierProgress } from '../dossier/SectionParts.jsx'
import CertificateList from './CertificateList.jsx'
import { ELEMENT_LINKS } from './elementLinks.js'
import { DEPOSIT_PATH } from './paths.js'

async function load() {
  const profile = await getProfile()
  const certificates = profile.completion.is_complete ? await listCertificates() : { certificates: [], limit: 0 }
  return { completion: profile.completion, ...certificates }
}

/** US-204 CA-01 : ce qui reste avant de déposer, avec un lien vers chaque élément (RG-07). */
function Checklist({ completion }) {
  const missing = completion.elements.filter((element) => !element.complete)
  const n = missing.length
  return (
    <section aria-labelledby="checklist-title" className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <h3 id="checklist-title" className="text-lg font-semibold text-balance">
        Il reste {n} information{n > 1 ? 's' : ''} à compléter avant de déposer votre certificat
      </h3>
      <p className="text-sm text-help">Complétons votre profil pour valoriser votre certificat.</p>
      <ul aria-label="Informations à compléter" className="flex flex-col gap-2">
        {missing.map((element) => (
          <li key={element.key}>
            <Link
              to={ELEMENT_LINKS[element.key].to}
              className="flex min-h-12 items-center gap-3 rounded-lg bg-section px-3 py-2 hover:bg-info-bg"
            >
              <span className="material-symbols-outlined text-info-text" aria-hidden="true">radio_button_unchecked</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold text-heading">{ELEMENT_LINKS[element.key].action}</span>
                <span className="text-sm text-help">{element.label}</span>
              </span>
              <span className="material-symbols-outlined text-muted" aria-hidden="true">chevron_right</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-sm text-info-text">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">lock_open</span>
        Le dépôt de certificat s'ouvre dès que votre profil est complet. Les RH examinent chaque certificat sous 5 jours ouvrables.
      </p>
    </section>
  )
}

/** US-204 (verrou et liste de ce qui reste), US-301 (accès au dépôt), US-303 (suivi des certificats). */
export default function CertificatesPage() {
  const { data, error, loading } = useLoader(load)
  const page = (children) => (
    <Page account title="Mes certificats">
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)
  const { completion } = data
  if (!completion.is_complete) {
    return page(
      <>
        <Mascot role="Conseil carrière">
          « Vous y êtes presque ! Dès votre profil complété, cet espace vous permettra de déposer vos diplômes et attestations
          pour les faire valider par les RH. »
        </Mascot>
        <DossierProgress completion={completion} />
        <Checklist completion={completion} />
      </>,
    )
  }
  const full = data.certificates.length >= data.limit
  return page(
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Mes certificats</h2>
        <span className="rounded-full bg-info-bg px-3 py-1 text-sm font-semibold text-info-text">
          {data.certificates.length} titre{data.certificates.length > 1 ? 's' : ''} déposé{data.certificates.length > 1 ? 's' : ''}
        </span>
      </div>
      <section aria-label="Niveau d'études validé" className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-card">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info-text" aria-hidden="true">
          <span className="material-symbols-outlined">workspace_premium</span>
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-semibold tracking-wide text-help uppercase">Niveau d'études validé</span>
          <span className="font-semibold text-heading">{data.validated_level ?? "Aucun pour l'instant"}</span>
          {!data.validated_level && <span className="text-sm text-help">Il sera établi par vos certificats validés par les RH.</span>}
        </div>
      </section>
      <Mascot role="Conseil RH">
        « Retrouvez ici l'état de vos titres. Vos diplômes validés enrichissent vos opportunités de mobilité interne. »
      </Mascot>
      {full ? (
        <Alert tone="info">Vous avez déposé {data.limit} certificats, le nombre maximum.</Alert>
      ) : (
        <Link
          to={DEPOSIT_PATH}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active"
        >
          <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
          Déposer un certificat
        </Link>
      )}
      <CertificateList certificates={data.certificates} />
      <p className="text-center text-sm text-help">Une question sur vos documents ? Adressez-vous au service RH de votre agence.</p>
    </>,
  )
}
