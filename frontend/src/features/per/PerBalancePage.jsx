import { getMyPer } from '../../api/per.js'
import { useLoader } from '../../lib/useLoader.js'
import { PerDocumentPage, PerError, capitalize } from './perParts.jsx'

/** US-1023 : la dernière photo PER, centrée et suivie de « USD », comme `#montant` et `#date-maj` du directeur. */
export default function PerBalancePage() {
  const { data, error, loading } = useLoader(getMyPer)
  const balance = data?.balance

  return (
    <PerDocumentPage title="Balance PER">
      {loading && <p role="status">Chargement…</p>}
      {error && <PerError error={error} />}
      {balance && (
        <section aria-labelledby="per-balance" className="flex flex-col gap-2 rounded-xl bg-surface p-6 shadow-card">
          <h2 id="per-balance" className="text-center text-sm font-semibold tracking-wide text-help uppercase">
            Ma balance PER
          </h2>
          <p className="text-center text-[32px] leading-tight font-bold text-primary tabular-nums">
            {balance.amount} USD
          </p>
          <p className="text-center text-help">
            {capitalize(balance.period_label)} · mise à jour le {balance.updated_on}
          </p>
        </section>
      )}
    </PerDocumentPage>
  )
}
