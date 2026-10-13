import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { createOpening, getOpening, getOpeningForm, updateOpening } from '../../../api/openings.js'
import Alert from '../../../components/Alert.jsx'
import Button from '../../../components/Button.jsx'
import Page from '../../../components/Page.jsx'
import TextField from '../../../components/TextField.jsx'
import { useIsDesktop } from '../../../lib/useIsDesktop.js'
import { useLoader, useUnauthorizedRedirect } from '../../../lib/useLoader.js'
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
  min_grade: '',
  criteria_unit_codes: [],
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
    min_grade: text(criteria.min_grade),
    criteria_unit_codes: criteria.unit_codes ?? [],
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
    min_grade: orNull(values.min_grade),
    unit_codes: values.criteria_unit_codes,
  }
}

function toFiche(values) {
  return {
    code: values.code,
    title: values.title,
    unit_code: values.unit_code,
    target_grade: values.target_grade,
    mission: values.mission,
    opens_on: orNull(values.opens_on),
    closes_on: orNull(values.closes_on),
    criteria: toCriteria(values),
  }
}

function OpeningForm({ id, form, opening }) {
  const navigate = useNavigate()
  const redirect = useUnauthorizedRedirect(LOGIN_PATH)
  const [values, setValues] = useState(opening ? toValues(opening) : EMPTY)
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
      {form.units.length === 0 && (
        <Alert tone="info">
          Aucune unité à proposer : le référentiel des unités n'a pas encore été importé.{' '}
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
          <SelectField label="Unité du poste" required options={form.units} value={values.unit_code} onChange={set('unit_code')} error={fieldError('unit_code')} />
          <TextField
            label="Grade visé"
            required
            inputMode="numeric"
            value={values.target_grade}
            onChange={set('target_grade')}
            error={fieldError('target_grade')}
          />
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
        <UnitPicker
          units={form.units}
          value={values.criteria_unit_codes}
          onChange={setList('criteria_unit_codes')}
          error={fieldError('criteria_unit_codes')}
        />
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
          <TextField label="Grade minimum" inputMode="numeric" value={values.min_grade} onChange={set('min_grade')} error={fieldError('min_grade')} />
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
  const { data, loading, error } = useLoader(
    async () => {
      const [form, opening] = await Promise.all([getOpeningForm(), id ? getOpening(id) : null])
      return { form, opening }
    },
    { loginPath: LOGIN_PATH, key: id },
  )
  const title = id ? 'Modifier un poste' : 'Saisir un poste'

  return (
    <Page account="admin" wide title={title} backTo={id ? `${OPENINGS_PATH}/${id}` : OPENINGS_PATH}>
      {loading && <p role="status">Chargement…</p>}
      {error && <Alert>{error.message}</Alert>}
      {data && <OpeningForm id={id} form={data.form} opening={data.opening} />}
    </Page>
  )
}
