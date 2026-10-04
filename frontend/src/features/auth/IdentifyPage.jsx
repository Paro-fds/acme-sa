import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { identify } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'

/** US-01 : identification par nom, prénom et date de naissance. */
export default function IdentifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ last_name: '', first_name: '', birth_date: '' })
  const [error, setError] = useState(location.state?.message ?? null)
  const [sending, setSending] = useState(false)

  const complete = form.last_name.trim() && form.first_name.trim() && form.birth_date
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setError(null)
    try {
      const { next_step: nextStep } = await identify(form)
      navigate('/connexion/mot-de-passe', {
        state: { identity: form, mode: nextStep === 'CREATE_PASSWORD' ? 'create' : 'enter' },
      })
    } catch (apiError) {
      if (apiError.code === 'IDENTITY_AMBIGUOUS') {
        navigate('/connexion/homonyme')
        return
      }
      setError(apiError.message)
      setSending(false)
    }
  }

  return (
    <Page title="Identification">
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Accéder à mon dossier</h2>
        <p>Saisissez vos informations telles qu'elles figurent dans votre dossier ACME.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <TextField label="Nom" autoComplete="family-name" value={form.last_name} onChange={update('last_name')} />
        <TextField label="Prénom" autoComplete="given-name" value={form.first_name} onChange={update('first_name')} />
        <TextField
          label="Date de naissance"
          type="date"
          value={form.birth_date}
          onChange={update('birth_date')}
          max={new Date().toISOString().slice(0, 10)}
        />
        <Alert>{error}</Alert>
        <Button type="submit" disabled={!complete || sending}>
          {sending ? 'Vérification…' : 'Continuer'}
        </Button>
      </form>
    </Page>
  )
}
