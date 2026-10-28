import { getMyPer } from '../../api/per.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { useLoader } from '../../lib/useLoader.js'
import Payslips from './Payslips.jsx'

function Accounts({ accounts }) {
  if (accounts.length === 0) return null
  return (
    <ul aria-label="Comptes" className="flex flex-col gap-2">
      {accounts.map((account) => (
        <li
          key={account.number}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg bg-section p-3 text-sm"
        >
          <span className="flex flex-col">
            <span className="font-semibold text-heading">Compte {account.number}</span>
            <span className="text-help">Ouvert le {account.opened_on}</span>
          </span>
          <span className="flex flex-col tabular-nums sm:text-right">
            <span className="font-semibold text-heading">{account.amount}</span>
            <span className="text-help">dont intérêts {account.interest}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Balance({ balance }) {
  return (
    <section aria-labelledby="per-balance" className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 id="per-balance" className="text-sm font-semibold tracking-wide text-help uppercase">
          Ma balance PER
        </h2>
        <p className="text-[32px] leading-tight font-bold text-primary tabular-nums">{balance.amount}</p>
        <p className="text-sm text-help">
          Mise à jour le {balance.updated_on} ({balance.period_label}) · intérêts cumulés {balance.interest}
        </p>
      </div>
      <Accounts accounts={balance.accounts} />
    </section>
  )
}

function Statement({ photos }) {
  return (
    <section aria-labelledby="per-statement" className="flex flex-col gap-3">
      <h2 id="per-statement" className="text-lg font-semibold text-heading">
        Relevé PER
      </h2>
      <ul aria-label="Relevé PER" className="flex flex-col divide-y divide-border rounded-xl bg-surface shadow-card">
        {photos.map((photo) => (
          <li key={`${photo.period}-${photo.updated_on}`} className="flex items-baseline justify-between gap-4 p-4">
            <span className="flex flex-col">
              <span className="font-semibold text-heading first-letter:uppercase">{photo.period_label}</span>
              <span className="text-sm text-help">Au {photo.updated_on}</span>
            </span>
            <span className="font-semibold text-heading tabular-nums">{photo.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * US-1012 : le PER, module de PAM (une seule connexion, D-61). Lecture seule : la balance la plus récente, ses
 * comptes, puis le relevé de chaque mois déposé par l'export Shivam. US-1020 : puis les bulletins de paie.
 */
export default function PerPage() {
  const { data, error, loading } = useLoader(getMyPer)

  return (
    <Page account title="Mon PER" subtitle="Plan d'épargne retraite, en lecture seule.">
      <div className="flex flex-col gap-6">
        {loading && <p role="status">Chargement…</p>}
        {error && <Alert tone={error.code === 'NO_BALANCE' ? 'info' : 'error'}>{error.message}</Alert>}
        {data && (
          <>
            <Balance balance={data.balance} />
            <Statement photos={data.statement} />
          </>
        )}
        <Payslips />
        <p className="text-sm text-help">Une question sur votre PER ou votre paie ? Adressez-vous à la DRH.</p>
      </div>
    </Page>
  )
}
