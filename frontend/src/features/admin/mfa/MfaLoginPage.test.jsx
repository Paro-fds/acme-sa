import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminMe } from '../../../api/admin.js'
import { ApiError } from '../../../api/client.js'
import { loginMfa } from '../../../api/mfa.js'
import MfaLoginPage from './MfaLoginPage.jsx'

vi.mock('../../../api/admin.js', () => ({ getAdminMe: vi.fn() }))
vi.mock('../../../api/mfa.js', () => ({
  loginMfa: { status: vi.fn(), start: vi.fn(), confirm: vi.fn(), resend: vi.fn(), verify: vi.fn() },
}))

const NOT_ENROLLED = { enrolled: false, method: null, destination: null }
const WHATSAPP = { enrolled: true, method: 'WHATSAPP', destination: '+509 •••• 1111' }
const SENT = { method: 'WHATSAPP', destination: '+509 •••• 1111', local_code: '482913' }
const WRONG_CODE = new ApiError(422, 'INVALID_CODE', 'Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.', 'code')

function renderPage(step) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/admin/double-authentification', state: step ? { step } : undefined }]}>
      <Routes>
        <Route path="/admin/double-authentification" element={<MfaLoginPage />} />
        <Route path="/admin" element={<p>Tableau de bord</p>} />
        <Route path="/admin/mot-de-passe" element={<p>Choix du mot de passe</p>} />
        <Route path="/admin/connexion" element={<p>Connexion RH</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getAdminMe.mockResolvedValue({ id: 'a1', username: 'rh.demo', must_change_password: false })
})

describe('MfaLoginPage — première connexion (US-102 CA-01)', () => {
  it('propose les trois méthodes au choix', async () => {
    renderPage({ mfa: NOT_ENROLLED, code: null })

    expect(await screen.findByRole('heading', { name: 'Protégez votre compte' })).toBeInTheDocument()
    const choices = screen.getByRole('group', { name: /Comment souhaitez-vous recevoir vos codes/ })
    expect(choices).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /WhatsApp/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Email/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Application d'authentification/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recevoir un code' })).toBeDisabled()
  })

  it('CA-02 : WhatsApp → numéro, code reçu (boîte de démonstration), puis ouverture du tableau de bord', async () => {
    loginMfa.start.mockResolvedValue({ method: 'WHATSAPP', code: SENT, totp: null })
    loginMfa.confirm.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage({ mfa: NOT_ENROLLED, code: null })

    await user.click(await screen.findByRole('radio', { name: /WhatsApp/ }))
    await user.type(screen.getByLabelText('Numéro WhatsApp'), '+509 3722 1111')
    await user.click(screen.getByRole('button', { name: 'Recevoir un code' }))

    expect(loginMfa.start).toHaveBeenCalledWith('WHATSAPP', '+509 3722 1111')
    const demo = await screen.findByRole('complementary', { name: 'Message non envoyé' })
    expect(demo).toHaveTextContent('En ligne, ce code partirait par WhatsApp au +509 •••• 1111.')
    expect(demo).toHaveTextContent('482 913')
    await user.type(screen.getByLabelText('Code de vérification'), '482913')
    await user.click(screen.getByRole('button', { name: 'Activer la double authentification' }))

    expect(loginMfa.confirm).toHaveBeenCalledWith('482913')
    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
  })

  it('CA-03 : application → QR code et clé, puis le code de l’application', async () => {
    loginMfa.start.mockResolvedValue({
      method: 'TOTP',
      code: null,
      totp: { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/x', qr_code: 'data:image/svg+xml,<svg/>' },
    })
    loginMfa.confirm.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage({ mfa: NOT_ENROLLED, code: null })

    await user.click(await screen.findByRole('radio', { name: /Application d'authentification/ }))
    expect(screen.queryByLabelText('Adresse email')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Afficher le QR code' }))

    expect(await screen.findByRole('img', { name: /QR code à scanner/ })).toBeInTheDocument()
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Renvoyer le code' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Code de vérification'), '123456')
    await user.click(screen.getByRole('button', { name: 'Activer la double authentification' }))
    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
  })

  it('en ligne, tant que le service d’envoi n’est pas choisi : seule l’application est ouverte', async () => {
    renderPage({ mfa: { ...NOT_ENROLLED, available_methods: ['TOTP'] }, code: null })

    expect(await screen.findByRole('radio', { name: /WhatsApp/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Email/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Application d'authentification/ })).toBeEnabled()
    expect(screen.getAllByText("Pas encore disponible : le service d'envoi des codes reste à choisir.")).toHaveLength(2)
  })

  it('une adresse invalide s’affiche sous le champ', async () => {
    loginMfa.start.mockRejectedValue(
      new ApiError(422, 'INVALID_DESTINATION', 'Saisissez une adresse email valide.', 'destination'),
    )
    const user = userEvent.setup()
    renderPage({ mfa: NOT_ENROLLED, code: null })

    await user.click(await screen.findByRole('radio', { name: /Email/ }))
    await user.type(screen.getByLabelText('Adresse email'), 'rh')
    await user.click(screen.getByRole('button', { name: 'Recevoir un code' }))

    expect(await screen.findByText('Saisissez une adresse email valide.')).toBeInTheDocument()
    expect(screen.getByLabelText('Adresse email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('MfaLoginPage — connexions suivantes (US-102 CA-02, CA-03)', () => {
  it('le code part dès la connexion ; le bon code ouvre l’espace RH', async () => {
    loginMfa.verify.mockResolvedValue(null)
    const user = userEvent.setup()
    renderPage({ mfa: WHATSAPP, code: SENT })

    expect(await screen.findByRole('heading', { name: /Vérification de sécurité/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Espace RH' })).toBeInTheDocument()
    expect(screen.getByText('Mot de passe vérifié')).toBeInTheDocument()
    expect(screen.getByText('Saisissez le code à 6 chiffres envoyé par WhatsApp au +509 •••• 1111.')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Code de vérification'), '482913')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(loginMfa.verify).toHaveBeenCalledWith('482913')
    expect(await screen.findByText('Tableau de bord')).toBeInTheDocument()
  })

  it('un code faux est signalé sous le champ, qui se vide', async () => {
    loginMfa.verify.mockRejectedValue(WRONG_CODE)
    const user = userEvent.setup()
    renderPage({ mfa: WHATSAPP, code: SENT })

    await user.type(await screen.findByLabelText('Code de vérification'), '000000')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(await screen.findByText(WRONG_CODE.message)).toBeInTheDocument()
    expect(screen.getByLabelText('Code de vérification')).toHaveValue('')
  })

  it('« Renvoyer le code » remplace le code affiché', async () => {
    loginMfa.resend.mockResolvedValue({ ...SENT, local_code: '111222' })
    const user = userEvent.setup()
    renderPage({ mfa: WHATSAPP, code: SENT })

    await user.click(await screen.findByRole('button', { name: 'Renvoyer le code' }))

    expect(await screen.findByText('111 222')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('le précédent ne fonctionne plus')
  })

  it('seuls 6 chiffres sont acceptés', async () => {
    const user = userEvent.setup()
    renderPage({ mfa: { enrolled: true, method: 'TOTP', destination: null }, code: null })

    const field = await screen.findByLabelText('Code de vérification')
    await user.type(field, '12a3 4567')

    expect(field).toHaveValue('123456')
    expect(screen.queryByRole('button', { name: 'Renvoyer le code' })).not.toBeInTheDocument()
  })

  it('sans étape reçue (page rechargée), l’état est demandé au serveur ; mot de passe provisoire → son changement', async () => {
    loginMfa.status.mockResolvedValue(WHATSAPP)
    loginMfa.verify.mockResolvedValue(null)
    getAdminMe.mockResolvedValue({ id: 'a2', username: 'marie.pierre', must_change_password: true })
    const user = userEvent.setup()
    renderPage()

    await user.type(await screen.findByLabelText('Code de vérification'), '482913')
    await user.click(screen.getByRole('button', { name: 'Valider' }))

    expect(await screen.findByText('Choix du mot de passe')).toBeInTheDocument()
  })

  it('session en attente expirée → retour à la connexion RH', async () => {
    loginMfa.status.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Connexion RH')).toBeInTheDocument()
  })
})
