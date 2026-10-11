import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import EmployeeDetailPage from './EmployeeDetailPage.jsx'
import { getEmployee, getEmployeeDossier, listEmployeeCertificates, listEmployeeDocuments } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  getEmployee: vi.fn(),
  getEmployeeDossier: vi.fn(),
  listEmployeeDocuments: vi.fn(),
  listEmployeeCertificates: vi.fn(),
  employeeDocumentFileUrl: (id) => `/api/admin/documents/${id}/file`,
  certificateFileUrl: (id) => `/api/admin/validation/${id}/file`,
}))
vi.mock('../../api/adminFrame.js', () => ({ getAdminFrame: vi.fn().mockRejectedValue(new Error('hors test')) }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const FOLDER = {
  id: '1001',
  employee_code: 'AC-1001',
  display_name: 'JOSEPH Jean',
  previous_name: null,
  position: 'Agent de crédit',
  agency_code: 'PV',
  status: 'NOT_UPDATED',
  submitted_at: null,
  declined: false,
  changes: [],
  account_activated: true,
}

const field = (value, confirmed_at = '2026-10-01T09:00:00Z') => ({ value, complete: value !== null, confirmed_at: value ? confirmed_at : null })
const hr = (key, label, value, status = 'CONFIRMED') => ({
  key,
  label,
  value,
  status,
  answered_at: status === 'TO_CONFIRM' ? null : '2026-10-01T09:00:00Z',
})

const DOSSIER = {
  consent: { information_notice_at: '2026-10-01T09:00:00Z', whatsapp: false },
  telephone: field('3722 1111'),
  address: field('12 rue Capois, Port-au-Prince'),
  email: { ...field(null), no_email: true, complete: true, confirmed_at: '2026-10-01T09:00:00Z' },
  emergency_contact: { name: 'Paul Pierre', relationship: 'SIBLING', telephone: '4812 8901', complete: true, confirmed_at: '2026-10-01T09:00:00Z' },
  education_level: field('LICENCE'),
  completion: { percent: 100, complete: 8, total: 8 },
  hr_information: [
    hr('agency_confirmed', 'Agence', 'Agence Démo Nord'),
    hr('position_confirmed', 'Poste', 'Agent de crédit'),
    hr('hire_date_confirmed', "Date d'embauche", '01/02/2019', 'REPORTED'),
  ],
  relationships: [{ value: 'SIBLING', label: 'Frère ou sœur' }],
  education_levels: [{ value: 'LICENCE', label: 'Licence', examples: '' }],
}

const REPORT = {
  id: 4,
  at: '2026-09-28T09:00:00Z',
  field_label: "Date d'embauche",
  status: 'CLOSED_ACCURATE',
  status_label: 'Clos — valeur exacte',
  note: 'La valeur actuelle est juste.',
}

const VALIDATED = { id: 'c1', status: 'VALIDATED', is_archived: false, type_label: 'Diplôme', level_label: 'Licence', title: 'Licence en Gestion', institution: 'Université', year: 2019, history: [] }

function ListProbe() {
  const { search } = useLocation()
  return <p>Liste {search}</p>
}

function renderAt(entry = '/admin/employes/1001') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/admin/connexion" element={<p>Écran connexion admin</p>} />
        <Route path="/admin/employes" element={<ListProbe />} />
        <Route path="/admin/employes/:id" element={<EmployeeDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EmployeeDetailPage (US-20, US-108 : écran A07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getEmployee.mockResolvedValue(FOLDER)
    getEmployeeDossier.mockResolvedValue({ dossier: DOSSIER, reports: [] })
    listEmployeeCertificates.mockResolvedValue([])
    listEmployeeDocuments.mockResolvedValue([])
  })

  it('A07 : en-tête avec nom, matricule, poste, agence officielle, statut du dossier et profil en %', async () => {
    renderAt()

    const header = await screen.findByRole('region', { name: 'Employé' })
    expect(within(header).getByRole('heading', { level: 1, name: 'JOSEPH Jean · AC-1001' })).toBeInTheDocument()
    expect(header).toHaveTextContent('Agent de crédit · Agence Démo Nord')
    expect(within(header).getByText('Profil complet')).toBeInTheDocument()
    expect(within(header).getByText('Profil : 100 %')).toBeInTheDocument()
    expect(screen.getByText(/Votre consultation de ce dossier est enregistrée dans le journal d'audit/)).toBeInTheDocument()
    expect(getEmployeeDossier).toHaveBeenCalledWith('1001')
  })

  it('A07 : « Dossier complet » avec un profil complet et au moins un certificat validé', async () => {
    listEmployeeCertificates.mockResolvedValue([VALIDATED])
    renderAt()

    const header = await screen.findByRole('region', { name: 'Employé' })
    expect(within(header).getByText('Dossier complet')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Certificats' })).toHaveTextContent('Licence en Gestion')
  })

  it('A07 : profil V2, chaque information avec la date de confirmation de l’employé', async () => {
    renderAt()

    const profile = await screen.findByRole('region', { name: 'Profil' })
    const rows = within(profile).getAllByRole('term').map((term) => term.textContent)
    expect(rows).toEqual([
      'Téléphone',
      'Email',
      'Adresse',
      "Contact d'urgence",
      "Niveau d'études déclaré",
      'Agence',
      'Poste',
      "Date d'embauche",
    ])
    expect(profile).toHaveTextContent("3722 1111Confirmé par l'employé le 01/10/2026")
    expect(profile).toHaveTextContent("Pas d'adresse email")
    expect(profile).toHaveTextContent('Paul Pierre · Frère ou sœur · 4812 8901')
    expect(profile).toHaveTextContent('Licence')
    expect(profile).toHaveTextContent("01/02/2019Signalé par l'employé le 01/10/2026")
  })

  it('A07 : une information non complétée reste « Non renseigné » et « À compléter »', async () => {
    getEmployeeDossier.mockResolvedValue({
      dossier: {
        ...DOSSIER,
        telephone: { value: '+509 3722 0000', complete: false, confirmed_at: null },
        completion: { percent: 87, complete: 7, total: 8 },
        hr_information: [hr('agency_confirmed', 'Agence', 'Agence Démo Nord', 'TO_CONFIRM')],
      },
      reports: [],
    })
    renderAt()

    const profile = await screen.findByRole('region', { name: 'Profil' })
    expect(profile).toHaveTextContent('Non renseignéÀ compléter par l’employé')
    expect(profile).toHaveTextContent('À confirmer par l’employé')
    expect(screen.getByText('Profil incomplet')).toBeInTheDocument()
  })

  it('A07 : signalements de l’employé avec leur statut', async () => {
    getEmployeeDossier.mockResolvedValue({ dossier: DOSSIER, reports: [REPORT] })
    renderAt()

    const reports = await screen.findByRole('region', { name: 'Signalements' })
    expect(reports).toHaveTextContent("28/09/2026Date d'embaucheClos — valeur exacteLa valeur actuelle est juste.")
  })

  it('aucun bloc de l’ancien parcours quand rien n’a été envoyé ; aucun document → pas de bloc', async () => {
    renderAt()
    await screen.findByRole('region', { name: 'Profil' })

    expect(screen.queryByText(/Mise à jour non effectuée/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Documents' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Signalements' })).not.toBeInTheDocument()
  })

  it('US-206 : une mise à jour envoyée avec l’ancien portail reste lisible, avec ses documents (US-21)', async () => {
    getEmployee.mockResolvedValue({
      ...FOLDER,
      status: 'UPDATED',
      submitted_at: '2026-10-04T14:32:00',
      changes: [{ field_name: 'telephone_number', label: 'Téléphone', section: 'CONTACT', old_value: '+50937221111', new_value: '+50937222222' }],
    })
    listEmployeeDocuments.mockResolvedValue([
      { id: 'd1', document_type: 'DIPLOME', type_label: 'Diplôme', original_name: 'licence.pdf', content_type: 'application/pdf', size_bytes: 2048, uploaded_at: '2026-10-04T09:00:00' },
    ])
    renderAt()

    const update = await screen.findByRole('region', { name: "Mise à jour envoyée avec l'ancien portail" })
    expect(within(update).getByText('Envoyée le 04/10/2026 à 14:32')).toBeInTheDocument()
    expect(within(update).getByText('+50937222222')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Documents' })).getByText('licence.pdf')).toBeInTheDocument()
  })

  it('CA-04 : lecture seule, seule action : réinitialiser l’accès (US-22)', async () => {
    renderAt()
    await screen.findByRole('region', { name: 'Profil' })

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    const buttons = within(screen.getByRole('main')).queryAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName("Réinitialiser l'accès")
    expect(within(screen.getByRole('region', { name: 'Accès' })).getByText('Compte activé')).toBeInTheDocument()
  })

  it('CA-06 : employé inconnu ou inactif → « Employé introuvable » et lien vers la liste', async () => {
    getEmployee.mockRejectedValue(new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employé introuvable.'))
    const user = userEvent.setup()
    renderAt('/admin/employes/1006')

    expect(await screen.findByRole('heading', { name: 'Employé introuvable' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Retour à la liste des employés' }))
    expect(await screen.findByText(/^Liste/)).toBeInTheDocument()
  })

  it('le lien « Employés » ramène à la liste avec la recherche et les filtres en cours', async () => {
    const user = userEvent.setup()
    renderAt({ pathname: '/admin/employes/1001', state: { listSearch: '?search=pierre&domain=Finance' } })
    await screen.findByRole('region', { name: 'Profil' })

    await user.click(screen.getByRole('link', { name: 'Retour à la liste des employés' }))
    expect(await screen.findByText('Liste ?search=pierre&domain=Finance')).toBeInTheDocument()
  })

  it('sans session → connexion admin', async () => {
    getEmployee.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderAt()
    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
