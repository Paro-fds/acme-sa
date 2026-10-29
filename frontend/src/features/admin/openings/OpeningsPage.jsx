import { Link, useSearchParams } from 'react-router'
import { getAdminMe } from '../../../api/admin.js'
import { listJobProfiles, listOpenings } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Page from '../../../components/Page.jsx'
import { useLoader } from '../../../lib/useLoader.js'
import JobCatalogue from './JobCatalogue.jsx'
import { canEdit, LOGIN_PATH, OPENINGS_PATH, OPENINGS_TITLE, OpeningStatusBadge } from './openingParts.jsx'

const CATALOGUE = 'catalogue'
const CARD = 'rounded-xl border border-rh-line bg-surface shadow-card'

/** Le nombre de fiches du catalogue est un plus : l'écran s'affiche sans lui. */
async function load() {
  const [openings, me, catalogue] = await Promise.all([listOpenings(), getAdminMe(), listJobProfiles().catch(() => null)])
  return { openings: openings.items, me, catalogueCount: catalogue?.items?.length ?? null }
}

const plural = (n, word, words = `${word}s`) => `${n} ${n > 1 ? words : word}`

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/** « 1er nov. », « 15 oct. » : la date (AAAA-MM-JJ ou horodatage) sans changer de jour selon le fuseau. */
function dayMonth(value) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return { text: `${day === 1 ? '1er' : day} ${MONTHS[month - 1]}`, year }
}

/** US-135 CA-03 : la période selon le statut. */
function periodOf(opening) {
  if (opening.status === 'CLOSED') return `date limite passée le ${dayMonth(opening.closes_on).text}`
  if (opening.status === 'FILLED') {
    const filled = [...opening.history].reverse().find((step) => step.status === 'FILLED')
    return filled ? `pourvu le ${dayMonth(filled.at).text}` : 'pourvu'
  }
  const opens = dayMonth(opening.opens_on)
  const closes = dayMonth(opening.closes_on)
  return `du ${opens.text}${opens.year === closes.year ? '' : ` ${opens.year}`} au ${closes.text} ${closes.year}`
}

/** « Lettre du directeur RH jointe par … » ou « Publié par … » (publié sans lettre, par l'Administrateur). */
function publishedBy(opening) {
  if (opening.status !== 'PUBLISHED') return null
  if (opening.letter) return `Lettre du directeur RH jointe par ${opening.letter.actor_name}`
  const step = [...opening.history].reverse().find((item) => item.status === 'PUBLISHED')
  return step ? `Publié par ${step.actor_name}` : null
}

function OpeningItem({ opening, editable }) {
  const details = [opening.unit_label, periodOf(opening), opening.status === 'DRAFT' && opening.created_by_me && 'saisi par vous']
  const publisher = publishedBy(opening)
  const draftAction = opening.status === 'DRAFT' && editable
  return (
    <li className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Link
            to={`${OPENINGS_PATH}/${opening.id}`}
            className="text-lg font-bold break-words text-primary underline-offset-2 hover:underline"
          >
            {opening.title}
            <span className="font-normal text-rh-text"> · {opening.code}</span>
          </Link>
          <span className="text-rh-text">{details.filter(Boolean).join(' · ')}</span>
          {publisher && (
            <span className="flex items-center gap-1.5 text-sm text-rh-text">
              <span className="material-symbols-outlined text-lg text-rh-muted" aria-hidden="true">
                {opening.letter ? 'description' : 'person'}
              </span>
              {publisher}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {opening.application_count > 0 && (
            <span className="font-semibold whitespace-nowrap text-rh-strong">{plural(opening.application_count, 'candidature')}</span>
          )}
          <OpeningStatusBadge opening={opening} />
        </div>
      </div>
      {draftAction && (
        <div className="flex flex-col gap-2 rounded-lg bg-info-bg p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-info-text">Pour publier, joignez la lettre du directeur RH.</span>
          <Link
            to={`${OPENINGS_PATH}/${opening.id}`}
            className="inline-flex min-h-11 w-fit items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-active"
          >
            Joindre la lettre et publier
          </Link>
        </div>
      )}
    </li>
  )
}

const STEPS = [
  ['Choisissez une fiche', 'Dans le catalogue, ou saisissez un poste hors catalogue'],
  ['Complétez et cliquez « Suivant »', 'Dates, mission et qui verra le poste'],
  ['Joignez la lettre et publiez', 'La lettre du directeur RH ne se change plus ensuite'],
]

/** US-135 CA-05 : comment publier, et qui clôture ou pourvoit. */
function HowToPublish() {
  return (
    <aside aria-label="Comment publier" className="flex flex-col gap-4">
      <section aria-labelledby="publier" className={`${CARD} flex flex-col gap-4 p-5`}>
        <h2 id="publier" className="text-lg font-bold text-rh-strong">
          Publier un poste
        </h2>
        <ol className="flex flex-col gap-4">
          {STEPS.map(([title, detail], index) => (
            <li key={title} className="flex gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-bg font-bold text-info-text"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span data-step-title className="font-semibold text-rh-strong">
                  {title}
                </span>
                <span className="text-sm text-rh-text">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="statuts" className={`${CARD} flex flex-col gap-2 p-5`}>
        <h2 id="statuts" className="text-lg font-bold text-rh-strong">
          Clôturer ou marquer pourvu
        </h2>
        <p className="text-rh-text">Réservé à l’Administrateur, depuis la fiche du poste.</p>
      </section>
    </aside>
  )
}

function Tab({ selected, onSelect, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`-mb-px flex min-h-12 items-center border-b-[3px] px-3 text-left text-base font-semibold sm:px-4 ${
        selected ? 'border-primary text-primary' : 'border-transparent text-rh-text hover:text-rh-strong'
      }`}
    >
      {children}
    </button>
  )
}

/** « 5 postes · 2 publiés · 7 candidatures reçues ». */
function summaryOf(openings) {
  const published = openings.filter((opening) => opening.status === 'PUBLISHED').length
  const applications = openings.reduce((sum, opening) => sum + (opening.application_count ?? 0), 0)
  return [
    plural(openings.length, 'poste'),
    plural(published, 'publié'),
    `${plural(applications, 'candidature')} ${applications > 1 ? 'reçues' : 'reçue'}`,
  ].join(' · ')
}

/**
 * US-802 : postes saisis par les RH, avec leur statut (Brouillon, Publié, Clôturé, Pourvu).
 * US-119 : second onglet « Catalogue des postes ACME » (`?onglet=catalogue`), d'où l'on publie un poste à partir de sa fiche.
 * US-135 (refonte du 2026-10-19) : chiffres sous le titre, qui a saisi ou publié, candidatures, la lettre demandée
 * pour publier un brouillon, « Publier un poste » à côté de la liste.
 */
export default function OpeningsPage() {
  const { data, loading, error } = useLoader(load, { loginPath: LOGIN_PATH })
  const [params, setParams] = useSearchParams()
  const catalogue = params.get('onglet') === CATALOGUE
  const show = (tab) => setParams(tab ? { onglet: tab } : {}, { replace: true })
  const editable = canEdit(data?.me)

  return (
    <Page
      account="admin"
      wide
      title={OPENINGS_TITLE}
      subtitle={data?.openings.length ? summaryOf(data.openings) : undefined}
      headerActions={
        editable && (
          <Link
            to={`${OPENINGS_PATH}/nouveau`}
            className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white hover:bg-primary-active"
          >
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Saisir un poste hors catalogue
          </Link>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div role="tablist" aria-label={OPENINGS_TITLE} className="flex gap-1 border-b border-rh-line">
          <Tab selected={!catalogue} onSelect={() => show(null)}>
            Postes publiés
          </Tab>
          <Tab selected={catalogue} onSelect={() => show(CATALOGUE)}>
            Catalogue des postes ACME{data?.catalogueCount != null && ` · ${data.catalogueCount}`}
          </Tab>
        </div>
        {loading && <p role="status">Chargement…</p>}
        {error && <Alert>{error.message}</Alert>}
        {catalogue && data && <JobCatalogue me={data.me} />}
        {!catalogue && data && (
          <div className={`grid grid-cols-1 gap-5 ${editable ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : ''}`}>
            {data.openings.length === 0 ? (
              <p className="text-rh-text">Aucun poste saisi pour le moment.</p>
            ) : (
              <ul aria-label="Postes" className={`${CARD} flex flex-col divide-y divide-rh-line self-start`}>
                {data.openings.map((opening) => (
                  <OpeningItem key={opening.id} opening={opening} editable={editable} />
                ))}
              </ul>
            )}
            {editable && <HowToPublish />}
          </div>
        )}
      </div>
    </Page>
  )
}
