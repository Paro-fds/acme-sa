import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { createOpening, getJobProfile, getOpening, getOpeningForm, updateOpening } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import Page from '../../../components/Page.jsx'
import TextField from '../../../components/TextField.jsx'
import { useIsDesktop } from '../../../lib/useIsDesktop.js'
import { useLoader, useUnauthorizedRedirect } from '../../../lib/useLoader.js'
import ProfileCompetences from '../../openings/ProfileCompetences.jsx'
import ProfileSections from '../../openings/ProfileSections.jsx'
import { AudiencePreview, DomainChecks, UnitPicker, useAudience } from './audienceParts.jsx'
import { LOGIN_PATH, OPENINGS_PATH, SelectField, TextAreaField } from './openingParts.jsx'

const EMPTY = {
  code: '',
  title: '',
  unit_code: '',
  target_grade: '',
  mission: '',
  opens_on: '',
  closes_on: '',
  min_level: '',
  domains: [],
  min_years_in_institution: '',
  min_years_in_position: '',
  criteria_unit_codes: [],
  profile_code: '',
}

const MISSION_MAX = 2000

/** US-121 : sans description détaillée, la mission reprend les compétences du poste. */
function missionOf(profile) {
  if (profile.description) return profile.description
  if (!profile.competences?.length) return ''
  return ['Compétences attendues :', ...profile.competences.map((competence) => `- ${competence}`)].join('\n')
}

/** US-119, US-121 : ce que le poste du catalogue propose (code de la matrice compris) ; tout reste modifiable. */
function fromProfile(profile, form) {
  const levels = new Set(form.levels.map((level) => level.code))
  const domains = new Set(form.domains.map((domain) => domain.code))
  return {
    ...EMPTY,
    code: profile.position_code ?? '',
    title: profile.title,
    mission: missionOf(profile).slice(0, MISSION_MAX),
    domains: profile.suggested_domains.filter((code) => domains.has(code)),
    min_level: levels.has(profile.suggested_level) ? profile.suggested_level : '',
    profile_code: profile.code,
  }
}

function toValues(opening) {
  const { criteria } = opening
  const text = (value) => (value === null || value === undefined ? '' : String(value))
  return {
    code: opening.code,
    title: opening.title,
    unit_code: opening.unit_code,
    target_grade: opening.target_grade,
    mission: opening.mission,
    opens_on: opening.opens_on,
    closes_on: opening.closes_on,
    min_level: text(criteria.min_level),
    domains: criteria.domains ?? [],
    min_years_in_institution: text(criteria.min_years_in_institution),
    min_years_in_position: text(criteria.min_years_in_position),
    criteria_unit_codes: criteria.unit_codes ?? [],
    profile_code: opening.profile_code ?? '',
  }
}

const orNull = (value) => (value === '' ? null : value)
const yearsOrNull = (value) => (value === '' ? null : Number(value))

function toCriteria(values) {
  return {
    min_level: orNull(values.min_level),
    domains: values.domains,
    min_years_in_institution: yearsOrNull(values.min_years_in_institution),
    min_years_in_position: yearsOrNull(values.min_years_in_position),
    // US-122 : plus de critère de grade ; un poste modifié perd l'ancien critère.
    min_grade: null,
    unit_codes: values.criteria_unit_codes,
  }
}

function toFiche(values) {
  return {
    code: values.code,
    title: values.title,
    unit_code: values.unit_code,
    // US-122 : plus demandé ; un poste déjà saisi garde son grade, sans l'afficher.
    target_grade: values.target_grade,
    mission: values.mission,
    opens_on: orNull(values.opens_on),
    closes_on: orNull(values.closes_on),
    criteria: toCriteria(values),
    ...(values.profile_code ? { profile_code: values.profile_code } : {}),
  }
}

function OpeningForm({ id, form, opening, profile }) {
  const navigate = useNavigate()
  const redirect = useUnauthorizedRedirect(LOGIN_PATH)
  const [values, setValues] = useState(opening ? toValues(opening) : profile ? fromProfile(profile, form) : EMPTY)
  // US-117 : sans référentiel importé, l'unité du poste est un texte libre et la visibilité ne se restreint pas par unité.
  const hasReferential = form.units.length > 0
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  const setList = (name) => (list) => setValues((current) => ({ ...current, [name]: list }))
  const fieldError = (name) => (error?.field === name ? error.message : undefined)
  const desktop = useIsDesktop()
  const audience = useAudience(toCriteria(values))
  const preview = <AudiencePreview data={audience.data} error={audience.error} />

  async function handleSubmit(event) {
    event.preventDefault()
    setSending(true)
    setError(null)
    try {
      const saved = id ? await updateOpening(id, toFiche(values)) : await createOpening(toFiche(values))
      navigate(`${OPENINGS_PATH}/${saved.id}`)
    } catch (caught) {
      if (!redirect(caught)) setError(caught)
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
      {opening?.status === 'PUBLISHED' && (
        <Alert tone="info">Ce poste est publié. Toute modification des critères est tracée, avec son auteur et sa date.</Alert>
      )}
      {profile && (
        <section aria-label="Fiche du catalogue" className="flex flex-col gap-2 rounded-xl bg-info-bg p-4">
          <p className="flex items-start gap-2 text-base text-info-text">
            <span className="material-symbols-outlined shrink-0" aria-hidden="true">menu_book</span>
            <span>
              Repris de la fiche « {profile.title} » : code, intitulé, mission, domaines de diplôme et niveau minimum. Vérifiez,
              puis indiquez l’unité et les dates.
            </span>
          </p>
          <details className="rounded-lg bg-surface px-3">
            <summary className="flex min-h-11 cursor-pointer items-center text-base font-semibold text-primary">
              Voir la fiche complète
            </summary>
            <div className="flex flex-col gap-3 pb-3">
              <ProfileCompetences competences={profile.competences} />
              <ProfileSections sections={profile.sections} />
            </div>
          </details>
        </section>
      )}
      {!hasReferential && (
        <Alert tone="info">
          Le référentiel des unités n'est pas encore importé : écrivez l'unité du poste. Le poste sera proposé à tous les
          employés qui remplissent les autres critères.{' '}
          <Link to="/admin/referentiel" className="font-semibold underline underline-offset-4">
            Importer le référentiel
          </Link>
        </Alert>
      )}
      <section aria-labelledby="fiche-title" className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card sm:p-6">
        <h2 id="fiche-title" className="text-lg font-semibold text-heading">
          Fiche du poste
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Code du poste" required value={values.code} onChange={set('code')} help="Par exemple CC-2026-01." error={fieldError('code')} />
          <TextField label="Intitulé" required value={values.title} onChange={set('title')} error={fieldError('title')} />
          {hasReferential ? (
            <SelectField label="Unité du poste" required options={form.units} value={values.unit_code} onChange={set('unit_code')} error={fieldError('unit_code')} />
          ) : (
            <TextField
              label="Unité du poste"
              required
              maxLength={120}
              value={values.unit_code}
              onChange={set('unit_code')}
              help="Par exemple Agence de Pétion-Ville."
              error={fieldError('unit_code')}
            />
          )}
          <TextField label="Date d'ouverture" required type="date" value={values.opens_on} onChange={set('opens_on')} error={fieldError('opens_on')} />
          <TextField label="Date limite" required type="date" value={values.closes_on} onChange={set('closes_on')} error={fieldError('closes_on')} />
        </div>
        <TextAreaField label="Mission" required value={values.mission} onChange={set('mission')} error={fieldError('mission')} />
      </section>

      <section aria-labelledby="criteria-title" className="flex flex-col gap-5 rounded-xl bg-surface p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="criteria-title" className="text-lg font-semibold text-heading">
            Qui verra ce poste ?
          </h2>
          <p className="text-sm text-help">
            Seuls les employés qui remplissent <strong className="text-heading">tous</strong> ces critères voient le poste
            dans « Ma carrière » ; les autres ne le voient pas. Seules leurs données validées comptent.
          </p>
        </div>
        {hasReferential && (
          <UnitPicker
            units={form.units}
            value={values.criteria_unit_codes}
            onChange={setList('criteria_unit_codes')}
            error={fieldError('criteria_unit_codes')}
          />
        )}
        <DomainChecks domains={form.domains} value={values.domains} onChange={setList('domains')} error={fieldError('domains')} />
        <p className="border-t border-border pt-4 text-sm font-semibold tracking-wide text-help uppercase">Autres critères (facultatifs)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Niveau d'études minimum"
            options={form.levels}
            value={values.min_level}
            onChange={set('min_level')}
            error={fieldError('min_level')}
            emptyLabel="Aucun"
          />
          <TextField
            label="Ancienneté dans l'institution (années)"
            type="number"
            min="0"
            max="50"
            value={values.min_years_in_institution}
            onChange={set('min_years_in_institution')}
            error={fieldError('min_years_in_institution')}
          />
          <TextField
            label="Ancienneté dans le poste (années)"
            type="number"
            min="0"
            max="50"
            value={values.min_years_in_position}
            onChange={set('min_years_in_position')}
            error={fieldError('min_years_in_position')}
          />
        </div>
      </section>

      {!desktop && preview}
      {error && !error.field && <Alert>{error.message}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="subtle" className="sm:w-auto" onClick={() => navigate(id ? `${OPENINGS_PATH}/${id}` : OPENINGS_PATH)}>
          Annuler
        </Button>
        <Button type="submit" className="sm:w-auto" disabled={sending}>
          {sending ? 'Enregistrement…' : id ? 'Enregistrer' : 'Enregistrer le brouillon'}
        </Button>
      </div>
      </div>
      {desktop && <aside className="flex flex-col gap-4 lg:sticky lg:top-22">{preview}</aside>}
    </form>
  )
}

/**
 * US-802 CA-01 : saisie (Agent RH ou Administrateur) ou modification d'un poste.
 * US-115 : « Qui verra ce poste ? » (plusieurs unités, plusieurs domaines) et l'aperçu de l'audience, à droite sur
 * ordinateur, sous les critères sur téléphone.
 */
export default function OpeningFormPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  // US-119 : « Publier ce poste » depuis le catalogue ouvre la saisie avec `?fiche=<code>`.
  const fiche = id ? null : params.get('fiche')
  const { data, loading, error } = useLoader(
    async () => {
      const [form, opening, profile] = await Promise.all([
        getOpeningForm(),
        id ? getOpening(id) : null,
        fiche ? getJobProfile(fiche) : null,
      ])
      return { form, opening, profile }
    },
    { loginPath: LOGIN_PATH, key: `${id}:${fiche}` },
  )
  const title = id ? 'Modifier un poste' : fiche ? 'Publier un poste du catalogue' : 'Saisir un poste'

  return (
    <Page
      account="admin"
      wide
      title={title}
      backTo={id ? `${OPENINGS_PATH}/${id}` : fiche ? `${OPENINGS_PATH}?onglet=catalogue` : OPENINGS_PATH}
    >
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {data && <OpeningForm id={id} form={data.form} opening={data.opening} profile={data.profile} />}
    </Page>
  )
}
