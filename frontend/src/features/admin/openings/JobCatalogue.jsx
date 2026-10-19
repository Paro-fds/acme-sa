import { useId, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { getJobProfile, listJobProfiles } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import { useIsDesktop } from '../../../lib/useIsDesktop.js'
import { useLoader } from '../../../lib/useLoader.js'
import ProfileCompetences from '../../openings/ProfileCompetences.jsx'
import ProfileSections from '../../openings/ProfileSections.jsx'
import { searchProfiles } from './catalogueSearch.js'
import { canEdit, LOGIN_PATH, OPENINGS_PATH } from './openingParts.jsx'

const ALL = ''

function DepartmentChip({ department }) {
  if (!department) return null
  return <span className="w-fit rounded-full bg-info-bg px-2.5 py-0.5 text-sm font-semibold text-info-text">{department}</span>
}

/** US-121 : le code de la matrice du directeur, ou « Sans code ». */
const codeText = (profile) => (profile.position_code ? profile.position_code : 'Sans code')

function Level({ text }) {
  return text ? (
    <span className="text-sm text-help">{text}</span>
  ) : (
    <span className="w-fit rounded-full bg-status-progress-bg px-2.5 py-0.5 text-sm font-semibold text-status-progress-text">
      Non précisé
    </span>
  )
}

/** CA-02 : la fiche en aperçu, sans quitter la liste ; « Publier ce poste » pour l'Agent RH et l'Administrateur. */
function ProfilePreview({ code, me }) {
  const { data: profile, loading, error } = useLoader(() => getJobProfile(code), { loginPath: LOGIN_PATH })
  if (loading) return <p role="status">Chargement de la fiche…</p>
  if (error) return <Alert>{error.message}</Alert>
  return (
    <section aria-label={profile.title} className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-lg font-bold break-words text-primary-active">{profile.title}</h3>
        <p className="text-sm break-words text-help">
          <span className="font-semibold text-heading">
            {profile.position_code ? `Code ${profile.position_code}` : 'Sans code'}
          </span>
          {' · '}
          {[profile.department, profile.service].filter(Boolean).join(' · ')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-help">Niveau demandé :</span>
          <Level text={profile.level_text} />
        </div>
      </div>
      {profile.description && <p className="text-base whitespace-pre-line text-body">{profile.description}</p>}
      <ProfileCompetences competences={profile.competences} />
      <ProfileSections sections={profile.sections} open />
      {canEdit(me) && (
        <Link
          to={`${OPENINGS_PATH}/nouveau?fiche=${encodeURIComponent(profile.code)}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white hover:bg-primary-active"
        >
          <span className="material-symbols-outlined" aria-hidden="true">campaign</span>
          Publier ce poste
        </Link>
      )}
    </section>
  )
}

function ProfileItem({ profile, selected, onSelect, children }) {
  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border bg-surface p-4 shadow-card ${selected ? 'border-primary' : 'border-border'}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-base font-semibold break-words text-heading">{profile.title}</p>
          <p className="text-sm break-words text-help">
            {codeText(profile)}
            {profile.service && ` · ${profile.service}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DepartmentChip department={profile.department} />
            <Level text={profile.level_text} />
          </div>
        </div>
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          className="flex min-h-11 shrink-0 items-center gap-1 self-start rounded-lg px-3 text-base font-semibold text-primary hover:bg-info-bg sm:self-center"
        >
          Voir<span className="sr-only"> la fiche {profile.title}</span>
          <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
      </div>
      {children}
    </li>
  )
}

/**
 * US-119 CA-01, CA-02 : le catalogue des postes ACME, filtré par mots de l'intitulé (sans accents) et par département.
 * US-126 : les intitulés qui commencent par la recherche d'abord (`catalogueSearch.js`).
 * US-121 : les postes de la matrice du directeur (code, département, service, compétences).
 * Sur ordinateur, la fiche choisie s'ouvre à droite ; sur téléphone, sous la ligne choisie.
 */
export default function JobCatalogue({ me }) {
  const { data, loading, error } = useLoader(listJobProfiles, { loginPath: LOGIN_PATH })
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState(ALL)
  const [selected, setSelected] = useState(null)
  const desktop = useIsDesktop()
  const searchId = useId()
  const departmentId = useId()

  const profiles = useMemo(() => data?.items ?? [], [data])
  const departments = useMemo(
    () => [...new Set(profiles.map((p) => p.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [profiles],
  )
  const shown = searchProfiles(
    profiles.filter((p) => department === ALL || p.department === department),
    search,
  )
  const toggle = (code) => setSelected((current) => (current === code ? null : code))

  if (loading) return <p role="status">Chargement du catalogue…</p>
  if (error) return <Alert>{error.message}</Alert>

  return (
    <div className="flex flex-col gap-4">
      <p className="text-help">
        Les postes d’ACME, avec leur code et leurs compétences : choisissez-en un pour le publier sans réécrire son texte.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={searchId} className="text-base font-semibold text-heading">
            Rechercher un poste
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Par exemple « comptable » ou « crédit »"
            className="min-h-12 w-full rounded-lg border border-border-input bg-surface px-4 text-base text-heading shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:w-64">
          <label htmlFor={departmentId} className="text-base font-semibold text-heading">
            Département
          </label>
          <select
            id={departmentId}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className="min-h-12 w-full rounded-lg border border-border-input bg-surface px-4 text-base text-heading shadow-card outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value={ALL}>Tous les départements</option>
            {departments.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-sm text-help" aria-live="polite">
        {shown.length} poste{shown.length > 1 ? 's' : ''} sur {profiles.length}
      </p>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
        {shown.length === 0 ? (
          <p className="rounded-xl bg-surface p-4 text-base text-heading shadow-card">
            Aucune fiche ne correspond à votre recherche.
          </p>
        ) : (
          <ul aria-label="Fiches de poste" className="flex min-w-0 flex-col gap-3">
            {shown.map((profile) => (
              <ProfileItem
                key={profile.code}
                profile={profile}
                selected={selected === profile.code}
                onSelect={() => toggle(profile.code)}
              >
                {!desktop && selected === profile.code && <ProfilePreview key={profile.code} code={profile.code} me={me} />}
              </ProfileItem>
            ))}
          </ul>
        )}
        {desktop && (
          // L'aperçu défile seul, sans emporter la liste : une longue fiche reste lisible jusqu'à « Publier ce poste ».
          <aside
            aria-label="Aperçu du poste"
            tabIndex={0}
            className="flex flex-col gap-4 rounded-xl lg:sticky lg:top-22 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain"
          >
            {selected ? (
              <ProfilePreview key={selected} code={selected} me={me} />
            ) : (
              <p className="rounded-xl bg-section p-4 text-base text-help">Choisissez « Voir » pour lire une fiche ici.</p>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
