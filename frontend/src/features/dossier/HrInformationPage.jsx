import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { confirmHrInformation, reportHrError } from '../../api/dossier.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import Tip from '../../components/Tip.jsx'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { HR_ICONS, ItemStatus, ReportForm } from './hrInformationParts.jsx'
import { DossierProgress, SectionHeading } from './SectionParts.jsx'
import { useDossierSection } from './useDossierSection.js'

/** « ~8 ans » à partir d'une date JJ/MM/AAAA (écran validé 07). */
export function seniority(value, today = new Date()) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '')
  if (!match) return null
  const years = Math.floor((today - new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))) / (365.25 * 24 * 3600 * 1000))
  return years >= 1 ? `~${years} an${years > 1 ? 's' : ''}` : 'moins d’un an'
}

function HrItemCard({ item, section }) {
  const titleId = useId()
  const [reporting, setReporting] = useState(false)
  const { save, sending, fieldError, error } = section

  async function confirm() {
    await save(() => confirmHrInformation(item.key))
  }

  async function report(values) {
    if (await save(() => reportHrError(item.key, values))) setReporting(false)
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-bg text-info-text" aria-hidden="true">
          <span className="material-symbols-outlined">{HR_ICONS[item.key]}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 id={titleId} className="text-sm font-semibold text-help">
            {item.label}
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold break-words text-heading">
            {item.value}
            {item.key === 'hire_date_confirmed' && seniority(item.value) && (
              <span className="rounded-full bg-section px-2 py-0.5 text-sm font-normal text-help">
                Ancienneté : {seniority(item.value)}
              </span>
            )}
          </p>
          <ItemStatus item={item} />
        </div>
        <span className="material-symbols-outlined text-muted" aria-label="Non modifiable">lock</span>
      </div>
      {reporting ? (
        <ReportForm
          item={item}
          onSend={report}
          onCancel={() => setReporting(false)}
          sending={sending}
          fieldError={fieldError}
        />
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {item.status !== 'CONFIRMED' && (
            <Button variant="secondary" onClick={confirm} disabled={sending}>
              <span className="material-symbols-outlined" aria-hidden="true">check</span>
              C'est exact
            </Button>
          )}
          {item.status !== 'REPORTED' && (
            <Button variant="subtle" onClick={() => setReporting(true)}>
              Signaler une erreur
            </Button>
          )}
        </div>
      )}
      {reporting && error && !error.field && <Alert>{error.message}</Alert>}
    </section>
  )
}

/** US-203, écran « Mes informations RH » (section 3 / 3) : confirmer ou signaler, jamais modifier (CA-01). */
export default function HrInformationPage() {
  const navigate = useNavigate()
  const section = useDossierSection()
  const desktop = useIsDesktop()
  const tip = <Tip>Confirmer votre poste et votre agence aide les RH à préparer vos prochaines opportunités.</Tip>
  const aside =
    desktop && section.dossier ? (
      <>
        <DossierProgress completion={section.dossier.completion} />
        {tip}
      </>
    ) : undefined
  const page = (children, actions) => (
    <Page account title="Mon dossier" backTo="/profil" backLabel="Mon dossier" actions={actions} aside={aside}>
      {children}
    </Page>
  )

  if (section.loading) return page(<p role="status">Chargement…</p>)
  if (section.loadError) return page(<Alert>{section.loadError.message}</Alert>)
  const current = section.dossier
  return page(
    <>
      <SectionHeading number={3} title="Mes informations RH" icon="verified_user">
        Ces informations viennent du service RH. Vérifiez-les : vous ne pouvez pas les modifier, mais vous pouvez signaler une
        erreur.
      </SectionHeading>
      {!desktop && (
        <>
          {tip}
          <DossierProgress completion={current.completion} />
        </>
      )}
      {current.hr_information.map((item) => (
        <HrItemCard key={item.key} item={item} section={section} />
      ))}
    </>,
    <>
      <Button onClick={() => navigate('/accueil')}>
        <span className="material-symbols-outlined" aria-hidden="true">task_alt</span>
        Valider et terminer mon profil
      </Button>
      <p className="text-center text-sm text-help">Vos réponses sont transmises aux RH.</p>
    </>,
  )
}
