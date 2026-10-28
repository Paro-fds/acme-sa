import { useState } from 'react'
import { getMyPayslips, payslipPdfUrl } from '../../api/per.js'
import Alert from '../../components/Alert.jsx'
import { useLoader } from '../../lib/useLoader.js'

const NATURES = { gain: 'Gain', retenue: 'Retenue' }

function Detail({ slip }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-heading first-letter:uppercase">{slip.period_label}</h3>
        <p className="text-sm text-help">Paie du {slip.paid_on}</p>
      </div>
      {slip.lines.length > 0 && (
        <ul aria-label={`Rubriques de ${slip.period_label}`} className="flex flex-col divide-y divide-border">
          {slip.lines.map((line, index) => (
            <li key={`${line.label}-${index}`} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <span className="flex flex-col">
                <span className="text-heading">{line.label}</span>
                {NATURES[line.nature] && <span className="text-help">{NATURES[line.nature]}</span>}
              </span>
              <span className="font-semibold text-heading tabular-nums">{line.amount}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="rounded-lg bg-section p-3 text-sm text-heading tabular-nums">
        Gains {slip.earnings} · retenues {slip.deductions} · <strong>net à payer {slip.net}</strong>
      </p>
      {/* US-1021 : comme le bouton « Télécharger la fiche de paie (PDF) » du module du directeur */}
      <a
        href={payslipPdfUrl(slip.period)}
        download={`fiche-paie-${slip.period}.pdf`}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border-2 border-primary bg-surface px-4 font-bold text-primary hover:bg-info-bg sm:self-start"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          download
        </span>
        Télécharger la fiche de paie (PDF)
      </a>
    </div>
  )
}

/**
 * US-1020 : mes bulletins de paie (export Shivam), comme l'onglet « Bulletin » du module du directeur : la liste
 * des mois, le plus récent ouvert ; ni lignes à zéro ni charges de l'employeur. La fiche PDF (US-1021) les montre.
 */
export default function Payslips() {
  const { data: slips, error, loading } = useLoader(getMyPayslips)
  const [chosen, setChosen] = useState(0)

  return (
    <section aria-labelledby="per-payslips" className="flex flex-col gap-3">
      <h2 id="per-payslips" className="text-lg font-semibold text-heading">
        Mes bulletins de paie
      </h2>
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {slips && slips.length === 0 && (
        <p className="rounded-xl bg-section p-4 text-help">Aucun bulletin n'est disponible pour le moment.</p>
      )}
      {slips && slips.length > 0 && (
        <>
          <ul aria-label="Bulletins de paie" className="flex flex-wrap gap-2">
            {slips.map((slip, index) => (
              <li key={`${slip.period}-${slip.paid_on}`}>
                <button
                  type="button"
                  aria-pressed={index === chosen}
                  onClick={() => setChosen(index)}
                  className={`min-h-11 rounded-full border px-4 text-sm font-semibold first-letter:uppercase ${
                    index === chosen
                      ? 'border-primary bg-primary text-white'
                      : 'border-border-input bg-surface text-heading hover:bg-info-bg'
                  }`}
                >
                  {slip.period_label} — net {slip.net}
                </button>
              </li>
            ))}
          </ul>
          <Detail slip={slips[chosen]} />
        </>
      )}
    </section>
  )
}
