import { useState } from 'react'
import { useNavigate } from 'react-router'
import { changeMyAdminPassword, getAdminMe } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'

export const PASSWORD_CHANGED = 'Mot de passe modifié.'
const EMPTY = { current: '', next: '', confirmation: '' }
const FIELDS = { current_password: 'current', new_password: 'next', new_password_confirmation: 'confirmation' }

/**
 * US-23 CA-07, CA-08 : choisir son mot de passe (provisoire, à la première connexion)
 * ou changer son mot de passe (menu du compte).
 */
export default function AdminPasswordPage() {
  const navigate = useNavigate()
  const redirectIfUnauthorized = useUnauthorizedRedirect('/admin/connexion')
  const { data: me, error: loadError, loading, reload } = useLoader(getAdminMe, { loginPath: '/admin/connexion' })
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)

  const forced = me?.must_change_password
  const title = forced ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe'
  const page = (children) => (
    <Page account="admin" title="Mot de passe" backTo={forced || !me ? undefined : '/admin'}>
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (loadError) return page(<Alert>{loadError.message}</Alert>)

  const complete = values.current !== '' && values.next !== '' && values.confirmation !== ''
  const change = (name) => (event) => {
    setValues({ ...values, [name]: event.target.value })
    setErrors({ ...errors, [name]: null })
    setDone(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setFailure(null)
    setErrors({})
    try {
      await changeMyAdminPassword(values.current, values.next, values.confirmation)
      if (forced) {
        navigate('/admin', { replace: true })
        return
      }
      setValues(EMPTY)
      setDone(true)
      reload()
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      const field = FIELDS[apiError.field]
      if (field) setErrors({ [field]: apiError.message })
      else setFailure(apiError.message)
    }
    setSending(false)
  }

  return page(
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">{title}</h2>
        <p>
          {forced
            ? `Bienvenue, ${me.username}. Votre mot de passe actuel est provisoire : choisissez le vôtre pour accéder à l'administration.`
            : 'Vos autres connexions seront fermées.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <PasswordField
          label={forced ? 'Mot de passe provisoire' : 'Mot de passe actuel'}
          autoComplete="current-password"
          value={values.current}
          onChange={change('current')}
          error={errors.current}
        />
        <PasswordField
          label="Nouveau mot de passe"
          help="12 caractères minimum, par exemple trois mots et un nombre."
          autoComplete="new-password"
          value={values.next}
          onChange={change('next')}
          error={errors.next}
        />
        <PasswordField
          label="Confirmer le nouveau mot de passe"
          autoComplete="new-password"
          value={values.confirmation}
          onChange={change('confirmation')}
          error={errors.confirmation}
        />
        <Alert>{failure}</Alert>
        {done && <Alert tone="success">{PASSWORD_CHANGED}</Alert>}
        <Button type="submit" disabled={!complete || sending}>
          {sending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </Button>
      </form>
    </>,
  )
}
