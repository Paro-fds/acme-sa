import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { identify, sendLoginCode, verifyLoginCode } from '../../api/auth.js'
import { ApiError } from '../../api/client.js'
import LoginPage from './LoginPage.jsx'

vi.mock('../../api/auth.js', () => ({ identify: vi.fn(), sendLoginCode: vi.fn(), verifyLoginCode: vi.fn() }))

const EMAIL = { channel: 'EMAIL', destination: 'j•••@exemple.test', available: true }
const SENT = { channel: 'EMAIL', destination: 'j•••@exemple.test', expires_in: 300, resend_in: 60 }

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/connexion']}>
      <Routes>
        <Route path="/" element={<p>Écran accueil public</p>} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/accueil" element={<p>Écran accueil</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillIdentity(user, code = 'ac-1001') {
  await user.type(screen.getByLabelText('Code employé'), code)
  await user.type(screen.getByLabelText('Date de naissance'), '15031996')
  await user.click(screen.getByRole('button', { name: 'Continuer' }))
}

async function reachCodeStep(user) {
  await fillIdentity(user)
  await user.click(await screen.findByRole('button', { name: 'Recevoir mon code par courriel' }))
  await screen.findByLabelText('Code reçu')
}

beforeEach(() => {
  vi.clearAllMocks()
  identify.mockResolvedValue({ channels: [EMAIL] })
  sendLoginCode.mockResolvedValue(SENT)
  verifyLoginCode.mockResolvedValue(undefined)
})

describe('LoginPage (US-1003)', () => {
  it('CA-01 : étape 1, code employé et date de naissance, sans mot de passe', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Connexion' })).toBeInTheDocument()
    expect(screen.getByText('Étape 1 sur 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Code employé')).toBeInTheDocument()
    expect(screen.getByLabelText('Date de naissance')).toHaveAttribute('type', 'password')
    expect(screen.queryByText(/mot de passe/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/première fois/i)).not.toBeInTheDocument()
  })

  it('CA-01 : le code et la date partent au serveur ; un échec donne le message du serveur', async () => {
    identify.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Informations incorrectes.'))
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(identify).toHaveBeenCalledWith('ac-1001', '15031996', undefined)
    expect(await screen.findByRole('alert')).toHaveTextContent('Informations incorrectes.')
  })

  it('US-1015 CA-01 : à 3 échecs, le calcul s’affiche et sa réponse part avec la date', async () => {
    identify.mockRejectedValueOnce(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Informations incorrectes.', null, { captcha: 'Combien font 4 + 5 ?' }),
    )
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('Informations incorrectes.')
    const answer = screen.getByLabelText('Combien font 4 + 5 ?')
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()

    await user.type(answer, '9')
    await user.click(screen.getByRole('button', { name: 'Continuer' }))

    expect(identify).toHaveBeenLastCalledWith('ac-1001', '15031996', '9')
    expect(await screen.findByText('Étape 2 sur 3')).toBeInTheDocument()
  })

  it('US-1015 CA-02 : un verrou répond comme une erreur, sans compte à rebours', async () => {
    identify.mockRejectedValue(new ApiError(401, 'INVALID_CREDENTIALS', 'Informations incorrectes.'))
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Informations incorrectes.')
    expect(screen.queryByText(/verrouill/i)).not.toBeInTheDocument()
  })

  it('CA-03 : étape 2, le courriel masqué ; aucune adresse à saisir', async () => {
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(await screen.findByText('Étape 2 sur 3')).toBeInTheDocument()
    expect(screen.getByText(/j•••@exemple\.test/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('CA-03 : sans courriel, « Contactez la DRH » et aucun envoi possible', async () => {
    identify.mockResolvedValue({ channels: [{ channel: 'EMAIL', destination: null, available: false }] })
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Contactez la DRH')
    expect(screen.queryByRole('button', { name: 'Recevoir mon code par courriel' })).not.toBeInTheDocument()
  })

  it('CA-05 : étape 3, validité du code et renvoi après 60 secondes', async () => {
    const user = userEvent.setup()
    renderPage()

    await reachCodeStep(user)

    expect(sendLoginCode).toHaveBeenCalledWith('EMAIL')
    expect(screen.getByText('Étape 3 sur 3')).toBeInTheDocument()
    expect(screen.getByText(/Valable encore 0[45]:\d\d/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Renvoyer le code \(01:00|00:59\)/ })).toBeDisabled()
  })

  it('CA-06 : le bon code ouvre l’espace employé', async () => {
    const user = userEvent.setup()
    renderPage()
    await reachCodeStep(user)

    await user.type(screen.getByLabelText('Code reçu'), '123456')
    await user.click(screen.getByRole('button', { name: 'Me connecter' }))

    expect(verifyLoginCode).toHaveBeenCalledWith('123456')
    expect(await screen.findByText('Écran accueil')).toBeInTheDocument()
  })

  it('US-1016 : un code faux donne le message unique, sans essais restants', async () => {
    verifyLoginCode.mockRejectedValue(new ApiError(422, 'INVALID_CODE', 'Code incorrect ou expiré.', 'code'))
    const user = userEvent.setup()
    renderPage()
    await reachCodeStep(user)

    await user.type(screen.getByLabelText('Code reçu'), '000000')
    await user.click(screen.getByRole('button', { name: 'Me connecter' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Code incorrect ou expiré.')
    expect(alert).not.toHaveTextContent(/essai/)
  })

  it('CA-10 : connexion momentanément impossible (pas d’envoi de courriel)', async () => {
    sendLoginCode.mockRejectedValue(
      new ApiError(503, 'LOGIN_UNAVAILABLE', 'La connexion est momentanément impossible. Réessayez plus tard ou contactez la DRH.'),
    )
    const user = userEvent.setup()
    renderPage()
    await fillIdentity(user)

    await user.click(await screen.findByRole('button', { name: 'Recevoir mon code par courriel' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('momentanément impossible')
  })

  it('CA-10 : sur le poste local, le code s’affiche à l’écran', async () => {
    sendLoginCode.mockResolvedValue({ ...SENT, local_code: '424242' })
    const user = userEvent.setup()
    renderPage()

    await reachCodeStep(user)

    expect(screen.getByRole('status')).toHaveTextContent('Code : 424242')
  })

  it('US-1004 CA-01 : courriel et WhatsApp proposés, avec les messages restants', async () => {
    identify.mockResolvedValue({
      channels: [EMAIL, { channel: 'WHATSAPP', destination: '+509 •••• 1111', available: true, remaining: 4 }],
    })
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    const list = await screen.findByRole('list', { name: 'Canaux de réception' })
    expect(within(list).getByText(/\+509 •••• 1111/)).toBeInTheDocument()
    expect(within(list).getByText('4 messages restants ce mois-ci (sur 5)')).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: 'Recevoir mon code par courriel' })).toBeEnabled()
    expect(within(list).getByRole('button', { name: 'Recevoir mon code par WhatsApp' })).toBeEnabled()
  })

  it('US-1004 CA-03 : WhatsApp grisé quand le quota du mois est atteint, le courriel reste proposé', async () => {
    identify.mockResolvedValue({
      channels: [EMAIL, { channel: 'WHATSAPP', destination: '+509 •••• 1111', available: false, remaining: 0 }],
    })
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(await screen.findByText('Vous avez reçu 5 codes par WhatsApp ce mois-ci.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recevoir mon code par WhatsApp' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recevoir mon code par courriel' })).toBeEnabled()
  })

  it('US-1004 CA-01 : sans courriel, seul WhatsApp est proposé', async () => {
    identify.mockResolvedValue({
      channels: [
        { channel: 'EMAIL', destination: null, available: false },
        { channel: 'WHATSAPP', destination: '+509 •••• 7777', available: true, remaining: 5 },
      ],
    })
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(await screen.findByText("Aucun courriel n'est enregistré à votre dossier.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recevoir mon code par courriel' })).not.toBeInTheDocument()
  })

  it('US-1004 : le code part par WhatsApp, et « Renvoyer » garde le même canal', async () => {
    identify.mockResolvedValue({
      channels: [EMAIL, { channel: 'WHATSAPP', destination: '+509 •••• 1111', available: true, remaining: 5 }],
    })
    sendLoginCode.mockResolvedValue({ ...SENT, channel: 'WHATSAPP', destination: '+509 •••• 1111', resend_in: 0, remaining: 4 })
    const user = userEvent.setup()
    renderPage()
    await fillIdentity(user)

    await user.click(await screen.findByRole('button', { name: 'Recevoir mon code par WhatsApp' }))
    expect(await screen.findByText('WhatsApp : 4 messages restants ce mois-ci (sur 5)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Renvoyer le code' }))

    expect(sendLoginCode.mock.calls).toEqual([['WHATSAPP'], ['WHATSAPP']])
  })

  it('US-1005 CA-02 : un contact modifié depuis moins de 72 heures est grisé, l’autre reste proposé', async () => {
    identify.mockResolvedValue({
      channels: [
        { ...EMAIL, available: false, recently_changed: true },
        { channel: 'WHATSAPP', destination: '+509 •••• 1111', available: true, remaining: 5 },
      ],
    })
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    expect(await screen.findByText('Ce contact a été modifié il y a moins de 72 heures. Contactez la DRH.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Recevoir mon code par courriel' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recevoir mon code par WhatsApp' })).toBeEnabled()
  })

  it('US-1018 : WhatsApp « Indisponible » sans configuration, le courriel reste proposé', async () => {
    identify.mockResolvedValue({
      channels: [EMAIL, { channel: 'WHATSAPP', destination: '+509 •••• 1111', available: false, remaining: 5, unavailable: true }],
    })
    const user = userEvent.setup()
    renderPage()

    await fillIdentity(user)

    const list = await screen.findByRole('list', { name: 'Canaux de réception' })
    expect(within(list).getByText('Indisponible')).toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: 'Recevoir mon code par WhatsApp' })).not.toBeInTheDocument()
    expect(within(list).getByRole('button', { name: 'Recevoir mon code par courriel' })).toBeEnabled()
  })

  it('« Modifier mes informations » ramène à l’étape 1', async () => {
    const user = userEvent.setup()
    renderPage()
    await reachCodeStep(user)

    await user.click(screen.getByRole('button', { name: 'Modifier mes informations' }))

    expect(screen.getByText('Étape 1 sur 3')).toBeInTheDocument()
  })
})
