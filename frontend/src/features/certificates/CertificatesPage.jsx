import { useState } from 'react'
import { Link } from 'react-router'
import { getCertificateForm, listCertificates } from '../../api/certificates.js'
import { getProfile } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import Tip from '../../components/Tip.jsx'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { useLoader } from '../../lib/useLoader.js'
import { DossierProgress } from '../dossier/SectionParts.jsx'
import { CertificateCards, CertificatesHelp, CertificatesHero, FILTERS, Filters, ValidatedLevel } from './certificatesParts.jsx'
import { ELEMENT_LINKS } from './elementLinks.js'

async function load() {
  const profile = await getProfile()
  if (!profile.completion.is_complete) return { completion: profile.completion, certificates: [], limit: 0 }
  const [certificates, form] = await Promise.all([listCertificates(), getCertificateForm().catch(() => null)])
  return { completion: profile.completion, ...certificates, maxMb: form?.max_mb }
}

/** US-204 CA-01 : ce qui reste avant de déposer, avec un lien vers chaque élément (RG-07). Repris par US-1008. */
export function Checklist({ completion }) {
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

/**
 * US-204 (verrou et liste de ce qui reste), US-301 (accès au dépôt), US-303 (suivi des certificats).
 * US-130 (refonte du 2026-10-19) : en-tête illustré, niveau validé, filtres, avancement, message des RH et
 * « Corriger et renvoyer » ; « Comment ça marche » dans la colonne de droite sur ordinateur.
 */
export default function CertificatesPage() {
  const { data, error, loading } = useLoader(load)
  const desktop = useIsDesktop()
  const [filter, setFilter] = useState('all')
  const page = (children, aside, asideLabel) => (
    <Page account title="Mes certificats" aside={desktop ? aside : undefined} asideLabel={asideLabel}>
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)
  const { completion } = data
  if (!completion.is_complete) {
    const side = (
      <>
        <Tip>
          Vous y êtes presque ! Dès votre profil complété, cet espace vous permettra de déposer vos diplômes et attestations
          pour les faire valider par les RH.
        </Tip>
        <DossierProgress completion={completion} />
      </>
    )
    return page(
      <>
        {!desktop && side}
        <Checklist completion={completion} />
      </>,
      side,
    )
  }
  const { certificates } = data
  const help = <CertificatesHelp maxMb={data.maxMb} />
  const shown = certificates.filter(FILTERS.find((item) => item.key === filter).keep)
  return page(
    <>
      <CertificatesHero full={certificates.length >= data.limit} limit={data.limit} />
      <ValidatedLevel level={data.validated_level} />
      {certificates.length === 0 ? (
        <p className="rounded-xl bg-section p-4 text-help">Aucun certificat déposé pour l'instant.</p>
      ) : (
        <>
          <Filters certificates={certificates} active={filter} onChange={setFilter} />
          <CertificateCards certificates={shown} />
        </>
      )}
      {!desktop && help}
    </>,
    help,
    'Comment ça marche',
  )
}
