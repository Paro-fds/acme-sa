import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { adminLogin } from '../../api/auth.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import TextField from '../../components/TextField.jsx'

/** US-15 (version Walking Skeleton) : connexion administrateur. */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.message ?? null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!username || !password || sending) return
    setSending(true)
    setError(null)
    try {
      await adminLogin(username, password)
      navigate('/admin/employes', { replace: true })
    } catch (apiError) {
      setError(apiError.message)
      setSending(false)
    }
  }

  return (
    <Page title="Administration">
      <h2 className="text-[26px] leading-8 font-bold">Connexion administrateur</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <TextField label="Identifiant" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <TextField
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Alert>{error}</Alert>
        <Button type="submit" disabled={!username || !password || sending}>
          Se connecter
        </Button>
      </form>
    </Page>
  )
}
