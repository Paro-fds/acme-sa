import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import ProfilePage from './ProfilePage.jsx'
import { getProfile } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn(), decide: vi.fn() }))
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

  it('CA-06 : sans session, retour à l’identification', async () => {
    getProfile.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran identification : Vous devez être connecté.')).toBeInTheDocument()
  })
})
