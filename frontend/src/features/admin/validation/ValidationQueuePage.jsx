import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { getAdminMe } from '../../../api/admin.js'
import { claimNextCertificate, getValidationQueue } from '../../../api/validation.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { useLoader } from '../../../lib/useLoader.js'
import { can } from '../roles.js'
import { useUnits } from '../useUnits.js'

const LOGIN_PATH = '/admin/connexion'
const PAGE_SIZE = 20
const ALL_AGENCIES = 'Toutes les agences'
const ALL_TYPES = 'Tous les types'
const TYPES = [
  ['DIPLOME', 'Diplôme'],
  ['CERTIFICAT', 'Certificat'],
  ['ATTESTATION', 'Attestation'],
  ['AUTRE', 'Autre'],
]
/** US-133 CA-03 : le filtre « Délai » remplace la case « En retard seulement ». */
const DELAYS = {
  Tous: () => true,
  'En retard': (item) => item.is_overdue,
  'Dans le délai': (item) => !item.is_overdue,
}

const plural = (n, word, words = `${word}s`) => (n > 1 ? words : word)
const dayMonth = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** « En retard · 7 j » ou « Jour 3 sur 5 » (jours ouvrables depuis le dépôt). */
export function delayLabel(item) {
  if (item.is_overdue) return `En retard · ${item.business_days} j`
  return `Jour ${Math.max(item.business_days, 1)} sur 5`
}

function takenBy(item) {
  if (item.assigned_to_me) return 'Vous'
  return item.assigned_to || 'Non assigné'
}

/** La file entière est chargée une fois : les compteurs portent sur toute la file, les filtres se font ici. */
async function load() {
  const [queue, me] = await Promise.all([getValidationQueue(), getAdminMe().catch(() => null)])
  return { ...queue, me }
}

function Filter({ label, value, onChange, options }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-rh-text">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-48 rounded-lg border border-border-input bg-surface px-3 text-base text-rh-strong focus:border-primary focus:outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  )
}

function DelayBadge({ item }) {
  return item.is_overdue ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-status-progress-border bg-status-progress-bg px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap text-status-progress-text">
      {delayLabel(item)}
    </span>
  ) : (
    <span className="text-sm whitespace-nowrap text-rh-text">{delayLabel(item)}</span>
  )
}

const EXAMINE = 'inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active'

/**
 * US-401 (écran A03), US-133 (refonte du 2026-10-19) : en-tête et « Prendre le suivant », trois compteurs, filtres
 * Agence / Type / Délai, le tableau du plus ancien au plus récent, 20 par page.
 */
export default function ValidationQueuePage() {
  const navigate = useNavigate()
  const { agencies } = useUnits()
  const [agency, setAgency] = useState(ALL_AGENCIES)
  const [type, setType] = useState(ALL_TYPES)
  const [delay, setDelay] = useState('Tous')
  const [page, setPage] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [notice, setNotice] = useState(null)
  const { data, loading, error, reload } = useLoader(load, { loginPath: LOGIN_PATH })

  async function takeNext() {
    setNotice(null)
    setClaiming(true)
    try {
      const result = await claimNextCertificate()
      if (result.claimed && result.certificate_id) {
        navigate(`/admin/validation/${result.certificate_id}`)
        return
      }
      setNotice('Aucun certificat en attente dans la file.')
      reload()
    } catch (err) {
      setNotice(err.message || 'Impossible de prendre le certificat suivant.')
    }
    setClaiming(false)
  }

  const filter = (setter) => (value) => {
    setter(value)
    setPage(0)
  }

  const all = [...(data?.items ?? [])].sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
  const shown = all.filter(
    (item) =>
      (agency === ALL_AGENCIES || item.agency_code === agency) &&
      (type === ALL_TYPES || item.certificate_type === type) &&
      DELAYS[delay](item),
  )
  const pageItems = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const waiting = data?.total_waiting ?? 0
  const overdue = all.filter((item) => item.is_overdue).length
  const mine = all.filter((item) => item.assigned_to_me).length

  // Un seul titre : celui du cadre ; la phrase et « Prendre le suivant » dans son en-tête.
  const claimButton = can(data?.me?.role ?? null, 'claim') && (
    <button
      type="button"
      onClick={takeNext}
      disabled={claiming || waiting === 0}
      className="flex min-h-12 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active disabled:opacity-60"
    >
      Prendre le suivant
      <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
    </button>
  )

  return (
    <Page
      account="admin"
      wide
      title="File de validation des certificats"
      subtitle={`${waiting} ${plural(waiting, 'certificat')} ${waiting > 1 ? 'attendent' : 'attend'} une décision. Délai : 5 jours ouvrables après le dépôt.`}
      headerActions={claimButton || null}
    >
      <div className="flex flex-col gap-6">
        {notice && <Alert tone="info">{notice}</Alert>}
        {error && <Alert>{error.message}</Alert>}

        {data && (
          <ul aria-label="Compteurs" className="grid grid-cols-3 gap-3">
            {[
              [overdue, 'en retard', 'text-status-progress-text'],
              [all.length - overdue, 'dans le délai', 'text-rh-strong'],
              [mine, 'pris par vous', 'text-primary'],
            ].map(([value, label, tone]) => (
              <li key={label} className="flex flex-col rounded-xl border border-rh-line bg-surface p-4 shadow-card">
                <span className={`text-[28px] leading-none font-bold tabular-nums ${tone}`}>{value}</span>
                <span className="text-sm text-rh-text">{label}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-3 rounded-xl border border-rh-line bg-surface p-4 shadow-card sm:grid-cols-3">
          <Filter
            label="Agence"
            value={agency}
            onChange={filter(setAgency)}
            options={[[ALL_AGENCIES, ALL_AGENCIES], ...agencies.map((unit) => [unit.code, unit.label])]}
          />
          <Filter label="Type de document" value={type} onChange={filter(setType)} options={[[ALL_TYPES, ALL_TYPES], ...TYPES]} />
          <Filter label="Délai" value={delay} onChange={filter(setDelay)} options={Object.keys(DELAYS).map((key) => [key, key])} />
        </div>

        {loading && !data ? (
          <p role="status" className="py-8 text-center text-rh-muted">
            Chargement de la file…
          </p>
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border-input bg-surface p-10 text-center font-medium text-rh-muted">
            Aucun certificat en attente de validation.
          </p>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-xl border border-rh-line bg-surface shadow-card">
            <ul aria-label="Certificats en attente, version téléphone" className="flex flex-col divide-y divide-rh-line lg:hidden">
              {pageItems.map((item) => (
                <li key={item.certificate_id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-semibold text-rh-strong">{item.employee_name}</span>
                      <span className="text-sm text-rh-muted">
                        {item.employee_code} · {item.agency_name || 'Agence non renseignée'}
                      </span>
                    </div>
                    <DelayBadge item={item} />
                  </div>
                  <span className="text-rh-strong">
                    {item.certificate_type_label} · {item.title}
                  </span>
                  <span className="text-sm text-rh-text">
                    {item.declared_level_label} · déposé le {dayMonth(item.submitted_at)} · {takenBy(item)}
                  </span>
                  <Link to={`/admin/validation/${item.certificate_id}`} className={`${EXAMINE} w-fit`}>
                    Examiner
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto lg:block">
              <table aria-label="Certificats en attente" className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-rh-line bg-rh-hover/80 text-sm font-semibold text-rh-text">
                    <th scope="col" className="px-4 py-3">Employé</th>
                    <th scope="col" className="px-4 py-3">Document</th>
                    <th scope="col" className="px-4 py-3">Niveau déclaré</th>
                    <th scope="col" className="px-4 py-3">Déposé le</th>
                    <th scope="col" className="px-4 py-3">Délai</th>
                    <th scope="col" className="px-4 py-3">Pris par</th>
                    <th scope="col" className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rh-line text-sm">
                  {pageItems.map((item) => (
                    <tr key={item.certificate_id} className="hover:bg-rh-canvas">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-rh-strong">{item.employee_name}</span>
                        <span className="block text-rh-muted">
                          {item.employee_code} · {item.agency_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-rh-strong">
                        {item.certificate_type_label} · {item.title}
                      </td>
                      <td className="px-4 py-3 text-rh-text">{item.declared_level_label}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-rh-text">{dayMonth(item.submitted_at)}</td>
                      <td className="px-4 py-3">
                        <DelayBadge item={item} />
                      </td>
                      <td className={`px-4 py-3 ${item.assigned_to_me ? 'font-semibold text-primary' : 'text-rh-text'}`}>{takenBy(item)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/admin/validation/${item.certificate_id}`} className={EXAMINE}>
                          Examiner
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rh-line bg-rh-canvas px-4 py-3 text-sm text-rh-text">
              <span>
                {page * PAGE_SIZE + 1} à {page * PAGE_SIZE + pageItems.length} sur {shown.length}, du plus ancien au plus récent
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="min-h-11 rounded-lg border border-rh-line bg-surface px-4 font-semibold text-rh-strong disabled:opacity-50"
                >
                  Précédent
                </button>
                <button
                  type="button"
                  disabled={(page + 1) * PAGE_SIZE >= shown.length}
                  onClick={() => setPage(page + 1)}
                  className="min-h-11 rounded-lg border border-rh-line bg-surface px-4 font-semibold text-rh-strong disabled:opacity-50"
                >
                  Suivant
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
