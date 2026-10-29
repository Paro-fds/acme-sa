import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { claimNextCertificate } from '../../api/validation.js'
import { can } from './roles.js'

/** US-132 : tableau de bord RH de la refonte (maquette `RhTableauDeBord.dc.html`), présentation seule. */

const CARD = 'rounded-xl border border-rh-line bg-surface shadow-card'
const plural = (n, word, words = `${word}s`) => (n > 1 ? words : word)

/** Un dossier coché et une courbe qui monte, dessinés avec les jetons de la charte. */
function DashboardIllustration() {
  return (
    <svg width="160" height="120" viewBox="0 0 200 150" aria-hidden="true" className="h-24 w-auto shrink-0 lg:h-28">
      <path d="M0 150 C25 100 55 90 85 102 C110 72 150 58 200 84 L200 150 Z" className="fill-highlight" />
      <rect x="40" y="34" width="70" height="90" rx="7" strokeWidth="2" className="fill-surface stroke-info-border" />
      <rect x="52" y="50" width="46" height="6" rx="3" className="fill-primary-active" />
      <rect x="52" y="64" width="38" height="5" rx="2.5" className="fill-primary-soft" />
      <rect x="52" y="76" width="42" height="5" rx="2.5" className="fill-primary-soft" />
      <circle cx="104" cy="116" r="15" className="fill-status-done-text" />
      <path d="m97 116 5 5 9-10" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-surface" />
      <path d="M126 104 L144 86 L158 94 L180 64" fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary" />
      <circle cx="180" cy="64" r="5" className="fill-accent-icon" />
    </svg>
  )
}

/** CA-01 : bonjour, ce qui attend, « Prendre le suivant » (qui peut décider) et le bandeau illustré. */
export function DashboardHero({ firstName, waiting, overdue, role }) {
  const navigate = useNavigate()
  const [claiming, setClaiming] = useState(false)
  const [notice, setNotice] = useState(null)

  async function takeNext() {
    setClaiming(true)
    setNotice(null)
    try {
      const result = await claimNextCertificate()
      if (result.claimed && result.certificate_id) {
        navigate(`/admin/validation/${result.certificate_id}`)
        return
      }
      setNotice('Aucun certificat en attente dans la file.')
    } catch (error) {
      setNotice(error.message || 'Impossible de prendre le certificat suivant.')
    }
    setClaiming(false)
  }

  return (
    <section className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
      <div className="flex min-w-0 flex-col gap-2.5 2xl:flex-1">
        <h2 className="text-[28px] leading-9 font-extrabold tracking-tight text-primary-active lg:text-[34px] lg:leading-[42px]">
          Bonjour{firstName ? ` ${firstName}` : ''}
        </h2>
        <p className="text-base leading-relaxed text-rh-text lg:text-lg">
          {waiting > 0
            ? `${waiting} ${plural(waiting, 'certificat')} ${waiting > 1 ? 'attendent' : 'attend'} une décision${
                overdue > 0 ? `, dont ${overdue} en retard` : ''
              }. Commencez par le plus ancien.`
            : 'Aucun certificat n’attend de décision.'}
        </p>
        {waiting > 0 && can(role, 'claim') && (
          <button
            type="button"
            onClick={takeNext}
            disabled={claiming}
            className="mt-1 flex min-h-12 w-fit items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-active disabled:opacity-60"
          >
            Prendre le suivant
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        )}
        {notice && (
          <p role="status" className="text-rh-text">
            {notice}
          </p>
        )}
      </div>
      <div className="flex min-h-28 items-center gap-2 overflow-hidden rounded-2xl bg-info-bg 2xl:w-[24rem] 2xl:shrink-0">
        <DashboardIllustration />
        <p className="py-4 pr-5 text-base leading-relaxed text-info-text">Des dossiers fiables, des postes pourvus en interne.</p>
      </div>
    </section>
  )
}

function Tile({ to, label, value, children }) {
  const body = (
    <>
      <span className="text-sm font-semibold text-rh-text">{label}</span>
      <span className="text-[32px] leading-none font-bold text-rh-strong tabular-nums">{value}</span>
      <span className="text-sm text-rh-muted">{children}</span>
    </>
  )
  const classes = `${CARD} flex h-full min-h-32 flex-col gap-2 p-5`
  return (
    <li>
      {to ? (
        <Link to={to} className={`${classes} hover:bg-rh-hover`}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
    </li>
  )
}

/** CA-02 : employés actifs, dossiers complets, certificats à décider, signalements ; un lien si le rôle y a accès. */
export function KeyFigures({ kpi, toProcess, agencies, role }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">
        Chiffres clés
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Employés actifs" value={kpi.active_employees}>
          dans {agencies} {plural(agencies, 'agence')}
        </Tile>
        <Tile to={can(role, 'employees') ? '/admin/employes' : null} label="Dossiers complets" value={`${kpi.complete_folders_percent} %`}>
          {kpi.complete_folders} sur {kpi.active_employees} · objectif {kpi.target_percent} %
        </Tile>
        <Tile to={can(role, 'validation') ? '/admin/validation' : null} label="Certificats à décider" value={kpi.waiting_certificates}>
          {kpi.overdue_certificates > 0 ? (
            <span className="font-semibold text-status-progress-text">{kpi.overdue_certificates} en retard</span>
          ) : (
            'aucun en retard'
          )}
        </Tile>
        <Tile to={can(role, 'reports') ? '/admin/signalements' : null} label="Signalements à traiter" value={toProcess.error_reports}>
          erreurs signalées par les employés
        </Tile>
      </ul>
    </section>
  )
}

/**
 * CA-03 : une barre par agence, triée, avec la ligne de l'objectif. Une seule série, une seule couleur ; les valeurs
 * sont écrites à côté des barres, et le tableau « Par unité » en bas sert de vue en tableau.
 */
export function AgencyChart({ agencies, target }) {
  const titleId = useId()
  const sorted = [...agencies].sort((a, b) => b.complete_folders_percent - a.complete_folders_percent)
  const summary = `Dossiers complets par agence : ${sorted
    .map((agency) => `${agency.unit_label} ${agency.complete_folders_percent} %`)
    .join(', ')}. Objectif ${target} %.`
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex flex-col gap-4 p-5 lg:p-6`}>
      <div className="flex flex-col gap-0.5">
        <h2 id={titleId} className="text-lg font-bold text-rh-strong">
          Dossiers complets par agence
        </h2>
        <p className="text-sm text-rh-muted">Part des employés actifs dont le dossier est complet</p>
      </div>
      <div role="img" aria-label={summary} className="flex flex-col gap-3">
        {sorted.map((agency) => (
          <div key={agency.unit_code} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_3rem] items-center gap-3 lg:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.5rem]">
            <span className="truncate text-sm text-rh-text" title={agency.unit_label}>
              {agency.unit_label}
            </span>
            <span className="relative h-3 rounded-full bg-rh-hover" title={`${agency.unit_label} : ${agency.complete_folders_percent} %`}>
              <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${agency.complete_folders_percent}%` }} />
              <span className="absolute -inset-y-1 w-0.5 bg-rh-strong" style={{ left: `${target}%` }} />
            </span>
            <span className="text-right text-sm font-semibold text-rh-strong tabular-nums">{agency.complete_folders_percent} %</span>
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm text-rh-muted">
        <span className="h-3 w-0.5 bg-rh-strong" aria-hidden="true" />
        Objectif : {target} % des actifs au dossier complet
      </p>
    </section>
  )
}

/** CA-04 : ce qui attend, chaque ligne vers sa page ; les valeurs à rattacher pour qui gère le référentiel. */
export function TodoList({ toProcess, role }) {
  const titleId = useId()
  const rows = [
    toProcess.overdue_certificates > 0 &&
      can(role, 'validation') && {
        to: '/admin/validation',
        icon: 'schedule',
        text: `${toProcess.overdue_certificates} ${plural(toProcess.overdue_certificates, 'certificat')} en retard (plus de 5 jours ouvrables)`,
      },
    toProcess.error_reports > 0 &&
      can(role, 'reports') && {
        to: '/admin/signalements',
        icon: 'flag',
        text: `${toProcess.error_reports} ${plural(toProcess.error_reports, 'signalement')} d’erreur à traiter`,
      },
    toProcess.applications_in_progress > 0 &&
      can(role, 'openings') && {
        to: '/admin/postes',
        icon: 'work',
        text: `${toProcess.applications_in_progress} ${plural(toProcess.applications_in_progress, 'candidature')} en cours sur ${
          toProcess.openings_with_applications
        } ${plural(toProcess.openings_with_applications, 'poste')}`,
      },
    toProcess.to_attach > 0 &&
      can(role, 'referential') && {
        to: '/admin/referentiel',
        icon: 'link',
        text: `${toProcess.to_attach} ${plural(toProcess.to_attach, 'valeur')} à rattacher au référentiel`,
      },
  ].filter(Boolean)
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex flex-col gap-2 p-5`}>
      <h2 id={titleId} className="text-lg font-bold text-rh-strong">
        À faire
      </h2>
      {rows.length === 0 ? (
        <p className="text-rh-text">Rien d’urgent pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-rh-line">
          {rows.map((row) => (
            <li key={row.to}>
              <Link to={row.to} className="flex min-h-12 items-center gap-3 py-2 font-medium text-rh-strong hover:text-primary">
                <span className="material-symbols-outlined text-xl text-rh-muted" aria-hidden="true">{row.icon}</span>
                <span className="flex-1">{row.text}</span>
                <span className="material-symbols-outlined text-rh-muted" aria-hidden="true">chevron_right</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** CA-05 : employés différents connectés ces 7 derniers jours, l'écart, et la courbe des 8 dernières périodes. */
export function WeeklyEngagement({ weekly }) {
  const titleId = useId()
  const last = weekly.at(-1) ?? 0
  const delta = last - (weekly.at(-2) ?? 0)
  const width = 280
  const height = 80
  const max = Math.max(...weekly, 1)
  const x = (index) => 8 + (index * (width - 16)) / Math.max(weekly.length - 1, 1)
  const y = (value) => height - 8 - (value * (height - 16)) / max
  const points = weekly.map((value, index) => `${x(index)},${y(value)}`).join(' ')
  return (
    <section aria-labelledby={titleId} className={`${CARD} flex flex-col gap-3 p-5`}>
      <h2 id={titleId} className="text-lg font-bold text-rh-strong">
        Engagement des employés
      </h2>
      <p className="text-sm text-rh-muted">Employés connectés ces 7 derniers jours</p>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-[32px] leading-none font-bold text-rh-strong tabular-nums">{last}</span>
        <span className={`text-sm font-semibold ${delta >= 0 ? 'text-status-done-text' : 'text-status-progress-text'}`}>
          {delta >= 0 ? '+' : '−'} {Math.abs(delta)} par rapport aux 7 jours d’avant
        </span>
      </p>
      <svg
        role="img"
        aria-label={`Employés connectés, 8 dernières semaines : ${weekly.join(', ')}.`}
        viewBox={`0 0 ${width} ${height}`}
        className="h-20 w-full"
        preserveAspectRatio="none"
      >
        <polygon points={`${x(0)},${height} ${points} ${x(weekly.length - 1)},${height}`} className="fill-info-bg" />
        <polyline points={points} fill="none" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-primary" />
        {weekly.map((value, index) => (
          <circle key={index} cx={x(index)} cy={y(value)} r={index === weekly.length - 1 ? 4 : 2.5} className="fill-primary">
            <title>{`${value} employés`}</title>
          </circle>
        ))}
      </svg>
      <p className="flex justify-between text-xs text-rh-muted">
        <span>il y a 8 semaines</span>
        <span>ces 7 jours</span>
      </p>
    </section>
  )
}
