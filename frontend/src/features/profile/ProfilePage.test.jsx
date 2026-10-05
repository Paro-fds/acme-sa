import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import ProfilePage, { DISCARDED_NOTICE } from './ProfilePage.jsx'
import { decide, discardUpdate, getProfile, reopenUpdate } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/employee.js', () => ({
  getProfile: vi.fn(),
  decide: vi.fn(),
  reopenUpdate: vi.fn(),
  discardUpdate: vi.fn(),
}))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const PROFILE = {
  employee_code: 'AC-1001',
  last_name: 'JOSEPH',
  first_name: 'Jean',
  gender: 'M',
  birth_date: '1996-03-15',
  telephone_number: '+50937221111',
  email_address: '',
  address_line_1: '12 rue Capois, Port-au-Prince',
  agency_code: 'PV',
  department: 'Crédit',
  position: 'Agent de crédit',
  grade: '12',
  level: '2',
  contract_nature: 'CDI',
  hire_date: '2019-06-03',
  editable_fields: ['last_name', 'first_name', 'telephone_number', 'email_address', 'address_line_1'],
  update: { state: 'NOT_DONE', accepted: null, created_at: null, updated_at: null, submitted_at: null, changes: [] },
}

function IdentifyProbe() {
  const { state } = useLocation()
  return <p>Écran identification : {state?.message}</p>
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/profil']}>
      <Routes>
        <Route path="/" element={<IdentifyProbe />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/mise-a-jour/informations" element={<p>Étape 1 : Informations</p>} />
        <Route path="/documents" element={<p>Écran Mes documents</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function renderProfile(overrides = {}) {
  getProfile.mockResolvedValue({ ...PROFILE, ...overrides })
  renderPage()
  await screen.findByRole('heading', { name: 'JOSEPH Jean' })
}

/** Ligne « libellé / valeur » d'une section. */
function field(sectionName, label) {
  const section = screen.getByRole('region', { name: sectionName })
  return within(section).getByText(label, { selector: 'dt' }).closest('div')
}

describe('ProfilePage (US-05)', () => {
  it('CA-01 : nom, prénom, matricule, agence et poste en haut de page', async () => {
    await renderProfile()

    const summary = screen.getByRole('region', { name: 'JOSEPH Jean' })
    expect(within(summary).getByText('Agent de crédit')).toBeInTheDocument()
    expect(within(summary).getByText('Matricule AC-1001')).toBeInTheDocument()
    expect(within(summary).getByText('Agence PV')).toBeInTheDocument()
    expect(within(summary).getByText('JJ')).toBeInTheDocument() // avatar avec initiales
  })

  it('CA-01 : les informations sont regroupées dans les trois sections', async () => {
    await renderProfile()

    const labels = (name) =>
      within(screen.getByRole('region', { name }))
        .getAllByRole('term')
        .map((term) => term.textContent)

    expect(labels('Identité')).toEqual(['Nom', 'Prénom', 'Sexe', 'Date de naissance'])
    expect(labels('Coordonnées')).toEqual(['Téléphone', 'Email', 'Adresse'])
    expect(labels('Informations professionnelles')).toEqual([
      'Matricule',
      'Agence',
      'Département',
      'Poste',
      'Grade',
      'Niveau',
      'Contrat',
      "Date d'embauche",
    ])
  })

  it('les dates sont au format JJ/MM/AAAA et le sexe en toutes lettres', async () => {
    await renderProfile()

    expect(field('Identité', 'Date de naissance')).toHaveTextContent('15/03/1996')
    expect(field('Informations professionnelles', "Date d'embauche")).toHaveTextContent('03/06/2019')
    expect(field('Identité', 'Sexe')).toHaveTextContent('Masculin')
  })

  it('les champs modifiables sont signalés, les autres portent un cadenas', async () => {
    await renderProfile()

    expect(within(field('Identité', 'Nom')).getByText('Modifiable')).toBeInTheDocument()
    expect(within(field('Coordonnées', 'Email')).getByText('Modifiable')).toBeInTheDocument()
    expect(within(field('Identité', 'Date de naissance')).getByLabelText('Non modifiable')).toBeInTheDocument()
    expect(within(field('Informations professionnelles', 'Poste')).getByLabelText('Non modifiable')).toBeInTheDocument()
    expect(within(field('Identité', 'Date de naissance')).queryByText('Modifiable')).not.toBeInTheDocument()
  })

  it('CA-04 : un champ vide affiche « Non renseigné »', async () => {
    await renderProfile({ email_address: '' })

    expect(field('Coordonnées', 'Email')).toHaveTextContent('Non renseigné')
  })

  it('CA-05 : les valeurs renvoyées par l’API (nouvelles après soumission) sont affichées', async () => {
    await renderProfile({ telephone_number: '+509 3722 2222' })

    expect(field('Coordonnées', 'Téléphone')).toHaveTextContent('+509 3722 2222')
  })

  it('US-07 : le lien « Mes documents » ouvre la liste des documents', async () => {
    await renderProfile()

    await userEvent.setup().click(screen.getByRole('link', { name: /Mes documents/ }))

    expect(await screen.findByText('Écran Mes documents')).toBeInTheDocument()
  })

  it('CA-06 : sans session, retour à l’identification', async () => {
    getProfile.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran identification : Vous devez être connecté.')).toBeInTheDocument()
  })
})

describe('ProfilePage — choix Oui / Non (US-08)', () => {
  const yes = () => screen.getByRole('button', { name: 'Oui, mettre à jour mon dossier' })
  const no = () => screen.getByRole('button', { name: 'Non, consulter uniquement' })

  it('CA-01 : « Oui » ouvre l’étape 1 « Informations »', async () => {
    decide.mockResolvedValue({ ...PROFILE.update, state: 'IN_PROGRESS', accepted: true })
    await renderProfile()

    await userEvent.setup().click(yes())

    expect(decide).toHaveBeenCalledWith(true)
    expect(await screen.findByText('Étape 1 : Informations')).toBeInTheDocument()
  })

  it('CA-02 : « Non » laisse l’employé sur son profil avec le message', async () => {
    decide.mockResolvedValue({ ...PROFILE.update, accepted: false })
    await renderProfile()

    await userEvent.setup().click(no())

    expect(decide).toHaveBeenCalledWith(false)
    expect(await screen.findByText("C'est noté. Vous pourrez mettre à jour votre dossier à tout moment.")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'JOSEPH Jean' })).toBeInTheDocument()
    expect(screen.getByText('Non effectuée')).toBeInTheDocument()
  })

  it('CA-03 : après « Non », « Oui » reste possible et ouvre l’étape 1', async () => {
    decide.mockResolvedValueOnce({ ...PROFILE.update, accepted: false })
    decide.mockResolvedValueOnce({ ...PROFILE.update, state: 'IN_PROGRESS', accepted: true })
    await renderProfile()
    const user = userEvent.setup()

    await user.click(no())
    await screen.findByText("C'est noté. Vous pourrez mettre à jour votre dossier à tout moment.")
    await user.click(yes())

    expect(await screen.findByText('Étape 1 : Informations')).toBeInTheDocument()
  })

  it('CA-04 : après soumission, la question n’est plus affichée', async () => {
    await renderProfile({
      update: { ...PROFILE.update, state: 'DONE', accepted: true, submitted_at: '2026-10-04T15:10:00' },
    })

    expect(screen.queryByRole('button', { name: 'Oui, mettre à jour mon dossier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Non, consulter uniquement' })).not.toBeInTheDocument()
  })

  it('CA-04 : un 409 (soumise depuis un autre appareil) recharge le profil, qui n’affiche plus la question', async () => {
    decide.mockRejectedValue(
      new ApiError(409, 'UPDATE_ALREADY_SUBMITTED', 'Votre mise à jour a déjà été soumise : elle ne peut plus être modifiée.'),
    )
    await renderProfile()
    getProfile.mockResolvedValue({
      ...PROFILE,
      update: { ...PROFILE.update, state: 'DONE', accepted: true, submitted_at: '2026-10-04T15:10:00' },
    })

    await userEvent.setup().click(no())

    expect(await screen.findByText('Effectuée')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Votre mise à jour a déjà été soumise')
    expect(screen.queryByRole('button', { name: 'Oui, mettre à jour mon dossier' })).not.toBeInTheDocument()
  })
})

describe('ProfilePage — modifier à nouveau (US-24)', () => {
  const SENT = {
    state: 'DONE',
    accepted: true,
    reopened: false,
    created_at: '2026-10-04T09:00:00',
    updated_at: '2026-10-04T15:10:00',
    submitted_at: '2026-10-04T15:10:00',
    changes: [],
  }
  const REOPENED = { ...SENT, state: 'IN_PROGRESS', reopened: true, updated_at: '2026-10-06T09:00:00' }

  it('CA-01, CA-02 : « Modifier à nouveau » rouvre la mise à jour puis ouvre l’étape 1', async () => {
    reopenUpdate.mockResolvedValue(REOPENED)
    await renderProfile({ update: SENT })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Modifier à nouveau' }))

    expect(reopenUpdate).toHaveBeenCalledOnce()
    expect(await screen.findByText('Étape 1 : Informations')).toBeInTheDocument()
  })

  it('CA-05 : « Annuler les modifications » confirmé → message, retour à l’état envoyé', async () => {
    discardUpdate.mockResolvedValue(SENT)
    const user = userEvent.setup()
    await renderProfile({ update: REOPENED })
    getProfile.mockResolvedValue({ ...PROFILE, update: SENT })

    await user.click(screen.getByRole('button', { name: 'Annuler les modifications' }))
    await user.click(screen.getByRole('button', { name: 'Tout annuler' }))

    expect(discardUpdate).toHaveBeenCalledOnce()
    expect(await screen.findByText(DISCARDED_NOTICE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier à nouveau' })).toBeInTheDocument()
  })

  it('une erreur (état changé ailleurs) est affichée et le profil rechargé', async () => {
    reopenUpdate.mockRejectedValue(new ApiError(409, 'UPDATE_NOT_SUBMITTED', "Votre mise à jour n'a pas encore été envoyée : vous pouvez la modifier directement."))
    await renderProfile({ update: SENT })
    getProfile.mockResolvedValue({ ...PROFILE, update: REOPENED })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Modifier à nouveau' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("pas encore été envoyée")
    expect(await screen.findByRole('button', { name: 'Reprendre la modification' })).toBeInTheDocument()
  })
})
