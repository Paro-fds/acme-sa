import { useId } from 'react'
import { Link } from 'react-router'
import { useIsDesktop } from '../../lib/useIsDesktop.js'
import { CERTIFICATES_PATH, DEPOSIT_PATH } from '../certificates/paths.js'

/** US-123 : l'accueil « tableau de bord » (maquette validée le 2026-10-15), présentation seule. */

export const CAREER_PATH = '/carriere'
export const PROFILE_PATH = '/profil'
const STEP_COUNT = 7
const DAY = 24 * 60 * 60 * 1000

const plural = (n, word, words = `${word}s`) => (n > 1 ? words : word)

/** « Mardi 13 octobre 2026 ». */
export function todayText(today) {
  const text = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const dateOf = (iso) => new Date(`${iso}T00:00:00`)
const midnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const daysUntil = (iso, today) => Math.round((dateOf(iso) - midnight(today)) / DAY)
const shortMonth = (iso) => dateOf(iso).toLocaleDateString('fr-FR', { month: 'short' })
const dayMonth = (iso) => dateOf(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

/** Années pleines depuis l'embauche. */
export function yearsSince(iso, today) {
  if (!iso) return null
  const start = dateOf(iso)
  let years = today.getFullYear() - start.getFullYear()
  if (today.getMonth() < start.getMonth() || (today.getMonth() === start.getMonth() && today.getDate() < start.getDate())) years -= 1
  return Math.max(years, 0)
}

function Go({ children }) {
  return (
    <span className="mt-auto flex items-center gap-0.5 pt-1 text-sm font-semibold">
      {children}
      <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_right</span>
    </span>
  )
}

function Label({ icon, children, tone = 'text-primary' }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm font-semibold ${tone}`}>
      <span className="material-symbols-outlined text-lg" aria-hidden="true">{icon}</span>
      {children}
    </span>
  )
}

const TILE = 'flex min-h-40 min-w-0 flex-col gap-1.5 rounded-xl p-4 shadow-card'

function Tile({ to, solid = false, children }) {
  return (
    <li className="flex">
      <Link
        to={to}
        className={`${TILE} w-full ${solid ? 'bg-primary text-white hover:bg-primary-active' : 'bg-surface text-heading hover:bg-section'}`}
      >
        {children}
      </Link>
    </li>
  )
}

/** Tuile grisée d'un dossier incomplet : elle dit ce qui la débloque. */
function LockedTile({ icon, label }) {
  return (
    <li className="flex">
      <div className={`${TILE} w-full bg-section/70 text-help shadow-none`}>
        <Label icon={icon} tone="text-help">{label}</Label>
        <span className="text-3xl font-bold tabular-nums">–</span>
        <span className="text-sm">Après le dossier</span>
      </div>
    </li>
  )
}

function Value({ value, unit }) {
  return (
    <span className="text-[34px] leading-none font-bold tabular-nums">
      {value}
      {unit && (
        <>
          {' '}
          <small className="text-sm font-semibold">{unit}</small>
        </>
      )}
    </span>
  )
}

function Bar({ parts }) {
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-section" aria-hidden="true">
      {parts.map(({ ratio, className }, index) => (
        <i key={index} className={className} style={{ width: `${Math.round(ratio * 100)}%` }} />
      ))}
    </span>
  )
}

/** CA-02, CA-06 : les quatre tuiles ; un dossier incomplet passe en premier, les autres attendent. */
export function Tiles({ completion, missing, openings, certificates, application }) {
  const titleId = useId()
  const complete = completion.is_complete
  const dossier = (
    <Tile key="dossier" to={PROFILE_PATH}>
      <Label icon="person">Mon dossier</Label>
      {complete ? <Value value={completion.percent} unit="%" /> : <Value value={completion.complete} unit={`sur ${completion.total}`} />}
      <Bar parts={[{ ratio: completion.percent / 100, className: complete ? 'bg-status-done-dot' : 'bg-primary' }]} />
      <span className="text-sm text-help">
        {complete
          ? 'À jour : les RH voient votre vrai profil.'
          : `Il manque : ${missing.map((element) => element.label.toLowerCase()).join(', ')}.`}
      </span>
      <Go>{complete ? 'Voir mon dossier' : 'Continuer mon dossier'}</Go>
    </Tile>
  )

  if (!complete) {
    return (
      <section aria-labelledby={titleId}>
        <h2 id={titleId} className="sr-only">Vos chiffres</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {dossier}
          <LockedTile icon="verified" label="Mes certificats" />
          <LockedTile icon="work" label="Postes ouverts pour vous" />
        </ul>
      </section>
    )
  }

  const total = certificates.length
  const validated = certificates.filter((c) => c.status === 'VALIDATED').length
  const inReview = certificates.filter((c) => c.status === 'RECEIVED' || c.status === 'IN_REVIEW').length
  const count = openings.length
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">Vos chiffres</h2>
      <ul className={`grid grid-cols-2 gap-3 ${application ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Tile to={CAREER_PATH} solid>
          <Label icon="work" tone="text-white">Postes ouverts pour vous</Label>
          <Value value={count} />
          <span className="text-sm text-white/85">
            {count > 0 ? 'Vous remplissez tous les critères : il ne reste qu’à postuler.' : 'Chaque diplôme validé peut vous en ouvrir.'}
          </span>
          <Go>Voir les postes</Go>
        </Tile>
        <Tile to={CERTIFICATES_PATH}>
          <Label icon="verified" tone="text-status-done-text">Mes certificats</Label>
          <Value value={validated} unit={total ? `${plural(validated, 'validé')} sur ${total}` : 'certificat déposé'} />
          <Bar
            parts={[
              { ratio: total ? validated / total : 0, className: 'bg-status-done-dot' },
              { ratio: total ? inReview / total : 0, className: 'bg-status-progress-dot' },
            ]}
          />
          <span className="text-sm text-help">
            {total ? 'Chaque diplôme validé peut vous ouvrir un poste.' : 'Déposez un diplôme pour le faire valider par les RH.'}
            {inReview > 0 && ` ${inReview} en examen.`}
          </span>
          <Go>Voir le suivi</Go>
        </Tile>
        {application && (
          <Tile to={CAREER_PATH}>
            <Label icon="send" tone="text-accent-text">Ma candidature</Label>
            <Value value={application.step_number} unit={`étape sur ${STEP_COUNT}`} />
            <span className="flex gap-1" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }, (_, index) => (
                <i key={index} className={`h-1.5 flex-1 rounded-full ${index < application.step_number ? 'bg-accent-icon' : 'bg-section'}`} />
              ))}
            </span>
            <span className="text-sm break-words text-help">
              {application.opening_title} · {application.step_label}
            </span>
            <Go>Suivre</Go>
          </Tile>
        )}
        {dossier}
      </ul>
    </section>
  )
}

function Panel({ title, link, sub, children }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={titleId} className="text-lg font-bold text-heading">
          {title}
        </h2>
        {link}
      </div>
      {sub && <p className="text-sm text-help">{sub}</p>}
      {children}
    </section>
  )
}

function PanelLink({ to, children }) {
  return (
    <Link to={to} className="flex min-h-11 items-center gap-0.5 text-sm font-semibold text-primary hover:underline">
      {children}
      <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_right</span>
    </Link>
  )
}

function Criteria({ lines }) {
  const n = lines.length
  return (
    <span className="flex items-center gap-1 text-sm text-status-done-text">
      <span className="material-symbols-outlined text-lg" aria-hidden="true">check</span>
      {n > 0 ? `${n} ${plural(n, 'critère')} sur ${n}` : 'Ouvert à tous'}
    </span>
  )
}

/** Temps restant : la barre se remplit à l'approche de la date limite. */
function Remaining({ opening, today }) {
  const days = daysUntil(opening.closes_on, today)
  const span = Math.max(daysUntil(opening.closes_on, dateOf(opening.opens_on)), 1)
  const elapsed = Math.min(Math.max(1 - days / span, 0), 1)
  return (
    <span className="flex min-w-28 flex-col gap-1 text-sm">
      <span>
        <strong className="text-heading">
          {days} {plural(days, 'jour')}
        </strong>
        <span className="text-help"> · {dayMonth(opening.closes_on)}</span>
      </span>
      <Bar parts={[{ ratio: elapsed, className: 'bg-status-progress-dot' }]} />
    </span>
  )
}

/** CA-03 : les postes publiés dont l'employé remplit tous les critères. */
export function OpeningsPanel({ openings, today }) {
  const desktop = useIsDesktop()
  const title = 'Postes ouverts pour vous'
  return (
    <Panel
      title={title}
      link={<PanelLink to={CAREER_PATH}>Tous les postes</PanelLink>}
      sub={openings.length > 0 ? 'Vous cochez déjà tous les critères. Ne laissez pas passer la date limite.' : null}
    >
      {openings.length === 0 ? (
        <p className="rounded-lg bg-section p-3 text-base text-heading">
          Aucun poste ouvert pour vous en ce moment. Chaque certificat validé peut vous en ouvrir de nouveaux.
        </p>
      ) : desktop ? (
        <table aria-label={title} className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-border text-sm text-help">
              <th scope="col" className="py-2 font-semibold">Poste</th>
              <th scope="col" className="py-2 font-semibold">Critères</th>
              <th scope="col" className="py-2 font-semibold">Temps restant</th>
              <th scope="col" className="py-2"><span className="sr-only">Action</span></th>
            </tr>
          </thead>
          <tbody>
            {openings.map((opening) => (
              <tr key={opening.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-3">
                  <span className="flex flex-col">
                    <strong className="break-words text-heading">{opening.title}</strong>
                    <span className="text-sm text-help">{opening.unit_label}</span>
                  </span>
                </td>
                <td className="py-3 pr-3"><Criteria lines={opening.criteria_lines} /></td>
                <td className="py-3 pr-3"><Remaining opening={opening} today={today} /></td>
                <td className="py-3 text-right">
                  <Link
                    to={CAREER_PATH}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap text-primary hover:bg-info-bg"
                  >
                    Voir et postuler<span className="sr-only"> : {opening.title}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul aria-label={title} className="flex flex-col gap-2">
          {openings.map((opening) => (
            <li key={opening.id}>
              <Link to={CAREER_PATH} className="flex flex-col gap-2 rounded-lg border border-border p-3 hover:bg-section">
                <span className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <strong className="break-words text-heading">{opening.title}</strong>
                    <span className="text-sm text-help">{opening.unit_label}</span>
                  </span>
                  <span className="material-symbols-outlined text-primary" aria-hidden="true">chevron_right</span>
                </span>
                <span className="flex flex-wrap items-end justify-between gap-3">
                  <Criteria lines={opening.criteria_lines} />
                  <Remaining opening={opening} today={today} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/** CA-04 : les dates limites des postes et la prochaine confirmation annuelle, les plus proches d'abord. */
export function DatesPanel({ openings, freshness, today }) {
  const dates = openings.map((opening) => ({ key: `opening-${opening.id}`, on: opening.closes_on, title: 'Date limite', detail: opening.title }))
  const confirmation = freshness.items.map((item) => item.expires_on).sort()[0]
  if (confirmation) dates.push({ key: 'confirmation', on: confirmation, title: 'Confirmer mon dossier', detail: 'Une fois par an' })
  const upcoming = dates.filter((date) => daysUntil(date.on, today) >= 0).sort((a, b) => a.on.localeCompare(b.on)).slice(0, 4)
  if (upcoming.length === 0) return null
  const title = 'À ne pas manquer'
  return (
    <Panel title={title} sub="Vos dates à retenir, pour ne rater aucune occasion.">
      <ul aria-label={title} className="flex flex-col">
        {upcoming.map((date) => (
          <li key={date.key} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3 border-b border-border py-3 last:border-0">
            <span className="flex flex-col items-center rounded-lg border border-border bg-canvas py-1 leading-tight">
              <span className="text-xs text-help uppercase">{shortMonth(date.on)}</span>
              <span className="text-xl font-bold text-heading tabular-nums">{dateOf(date.on).getDate()}</span>
              {dateOf(date.on).getFullYear() !== today.getFullYear() && (
                <span className="text-xs text-help tabular-nums">{dateOf(date.on).getFullYear()}</span>
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <strong className="text-base text-heading">{date.title}</strong>
              <span className="text-sm break-words text-help">{date.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

/** CA-05 : pourquoi déposer un diplôme. */
export function DiplomasCard() {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-xl bg-info-bg p-4">
      <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold text-info-text">
        <span className="material-symbols-outlined" aria-hidden="true">school</span>
        Vos diplômes travaillent pour vous
      </h2>
      <p className="text-base text-info-text">
        Une formation suivie, un master obtenu, une certification : une fois validé par les RH, chaque diplôme compte dans
        les postes qui vous sont proposés.
      </p>
      <Link
        to={DEPOSIT_PATH}
        className="flex min-h-11 w-fit items-center gap-1 rounded-lg bg-surface px-4 text-base font-semibold text-primary shadow-card hover:bg-section"
      >
        <span className="material-symbols-outlined" aria-hidden="true">add</span>
        Ajouter un diplôme
      </Link>
    </section>
  )
}

/** CA-05 : ancienneté, plus haut diplôme validé, éléments du parcours ; aucun grade (US-122). */
export function CareerFigures({ years, highestDiploma, entries }) {
  const facts = [
    years !== null && { value: years === 0 ? 'Moins d’un an' : `${years} ${plural(years, 'an')}`, label: 'chez ACME SA' },
    highestDiploma && { value: highestDiploma, label: 'plus haut diplôme validé' },
    entries > 0 && { value: String(entries), label: `${plural(entries, 'élément')} dans votre parcours` },
  ].filter(Boolean)
  if (facts.length === 0) return null
  return (
    <Panel
      title="Mon parcours en chiffres"
      link={<PanelLink to={CAREER_PATH}>Voir la frise</PanelLink>}
      sub="Votre expérience compte : elle entre dans le calcul de chaque poste proposé."
    >
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col rounded-lg bg-section p-3">
            <dt className="order-2 text-sm text-help">{fact.label}</dt>
            <dd className="order-1 text-2xl font-bold text-heading">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}
