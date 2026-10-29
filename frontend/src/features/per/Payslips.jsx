import { useRef, useState } from 'react'
import { getMyPayslips, payslipSheetUrl } from '../../api/per.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import { useLoader } from '../../lib/useLoader.js'
import { capitalize } from './perParts.jsx'

/**
 * US-1022 : ma fiche de paie, comme le panneau « Fiche de paie » du module du directeur (version du 2026-10-29) : la
 * fiche du mois au format `payslip.html` dans un cadre, « Enregistrer en PDF » (impression du navigateur), puis les
 * autres mois en lignes ; un clic remplace la fiche et déplace le surlignage.
 */
export default function Payslips() {
  const { data: slips, error, loading } = useLoader(getMyPayslips)
  const [chosen, setChosen] = useState(0)
  const frame = useRef(null)
  const slip = slips?.[chosen]

  function savePdf() {
    const view = frame.current?.contentWindow
    if (!view) return
    view.focus()
    view.print()
  }

  return (
    <section aria-label="Fiche de paie" className="flex flex-col gap-3">
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {slips && slips.length === 0 && (
        <p className="rounded-xl bg-section p-4 text-help">Aucune fiche de paie n'est disponible pour le moment.</p>
      )}
      {slip && (
        <>
          <iframe
            ref={frame}
            key={slip.period}
            title={`Fiche de paie de ${slip.period_label}`}
            src={payslipSheetUrl(slip.period)}
            className="h-[72vh] w-full rounded-xl border border-border bg-surface"
          />
          <Button variant="secondary" onClick={savePdf} className="sm:w-auto sm:self-start">
            <span className="material-symbols-outlined" aria-hidden="true">
              download
            </span>
            Enregistrer en PDF
          </Button>
          <ul aria-label="Mois disponibles" className="flex flex-col gap-2">
            {slips.map((item, index) => (
              <li key={`${item.period}-${item.paid_on}`}>
                <button
                  type="button"
                  aria-current={index === chosen ? 'true' : undefined}
                  onClick={() => setChosen(index)}
                  className={`flex min-h-11 w-full items-center rounded-lg px-4 text-left font-semibold text-heading ${
                    index === chosen ? 'bg-info-bg ring-1 ring-primary' : 'bg-section hover:bg-info-bg'
                  }`}
                >
                  {capitalize(item.period_label)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
