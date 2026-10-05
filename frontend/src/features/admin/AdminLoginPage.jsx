import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { getAdminMe } from '../../api/admin.js'
import { adminLogin } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import TextField from '../../components/TextField.jsx'
import { ADMIN_PASSWORD_PATH } from '../../lib/useLoader.js'

/** US-15 : connexion d'un administrateur ; mène au tableau de bord, ou au choix du mot de passe s'il est provisoire (US-23). */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.message ?? null)
  const [notice, setNotice] = useState(location.state?.notice ?? null)
  const [sending, setSending] = useState(false)
  const complete = username.trim() !== '' && password !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setError(null)
    setNotice(null)
    try {
      await adminLogin(username.trim(), password)
      const me = await getAdminMe()
      navigate(me.must_change_password ? ADMIN_PASSWORD_PATH : '/admin', { replace: true })
    } catch (apiError) {
      setError(apiError.message)
      setPassword('')
      setSending(false)
    }
  }

  return (
    <Page title="Administration">
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Connexion administrateur</h2>
        <p>Espace réservé au suivi de la campagne de mise à jour des dossiers.</p>
      </div>

      <Alert tone="info">{notice}</Alert>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <TextField
          label="Identifiant"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PasswordField
          label="Mot de passe"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Alert>{error}</Alert>
        <Button type="submit" disabled={!complete || sending}>
          {sending ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </Page>
  )
}
