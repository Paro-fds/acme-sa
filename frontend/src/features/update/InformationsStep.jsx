import { useState } from 'react'
import { useNavigate } from 'react-router'
import { getEditableFields, saveChanges } from '../../api/employee.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

const INPUT_TYPES = { telephone_number: 'tel', email_address: 'email' }

function InformationsForm({ fields }) {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect()
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.code, field.value])))
  const [error, setError] = useState(null)
  const [sending, setSending] = useState(false)

  async function handleContinue() {
    setSending(true)
    setError(null)
    try {
      await saveChanges(values)
      navigate('/mise-a-jour/verification')
    } catch (apiError) {
      if (!redirectIfUnauthorized(apiError)) setError(apiError)
      setSending(false)
    }
  }

  return (
    <Page
      account
      title="Mise à jour"
      backTo="/profil"
      actions={
        <Button onClick={handleContinue} disabled={sending}>
          Continuer
        </Button>
      }
    >
      <p className="text-sm font-semibold text-muted">Étape 1 sur 4 : Informations</p>
      {fields.map((field) => (
        <TextField
          key={field.code}
          label={field.label}
          type={INPUT_TYPES[field.code] ?? 'text'}
          value={values[field.code]}
          onChange={(event) => setValues({ ...values, [field.code]: event.target.value })}
          error={error?.field === field.code ? error.message : null}
        />
      ))}
      <Alert>{error && !error.field ? error.message : null}</Alert>
    </Page>
  )
}

/** US-09 (version Walking Skeleton) : modification des champs autorisés. */
export default function InformationsStep() {
  const { data: fields, error, loading } = useLoader(getEditableFields)

  if (loading) return <Page account title="Mise à jour"><p role="status">Chargement…</p></Page>
  if (error) return <Page account title="Mise à jour" backTo="/profil"><Alert>{error.message}</Alert></Page>
  return <InformationsForm fields={fields} />
}
