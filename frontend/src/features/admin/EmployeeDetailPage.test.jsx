import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import EmployeeDetailPage from './EmployeeDetailPage.jsx'
import { getEmployee, listEmployeeDocuments } from '../../api/admin.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/admin.js', () => ({
  getEmployee: vi.fn(),
  listEmployeeDocuments: vi.fn(),
  employeeDocumentFileUrl: (id) => `/api/admin/documents/${id}/file`,
}))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const BASE = {
  id: '1001',
  employee_code: 'AC-1001',
  last_name: 'JOSEPH',
  first_name: 'Jean',
  display_name: 'JOSEPH Jean',
  previous_name: null,
  gender: 'M',
  birth_date: '1996-03-15',
  telephone_number: '+50937221111',
  email_address: 'jean.joseph@exemple.test',
  address_line_1: 'Delmas 33',
  agency_code: 'PV',
  department: 'Crédit',
  position: 'Agent de crédit',
  grade: '12',
  level: '2',
  contract_nature: 'CDI',
  hire_date: '2019-02-01',
  status: 'NOT_UPDATED',
  submitted_at: null,
  declined: false,
  changes: [],
  account_activated: false,
}

const SUBMITTED = {
  ...BASE,
  status: 'UPDATED',
  telephone_number: '+50937222222',
  address_line_1: '12 rue des Palmiers',
  submitted_at: '2026-10-04T14:32:00',
  changes: [
    { field_name: 'telephone_number', label: 'Téléphone', section: 'CONTACT', old_value: '+50937221111', new_value: '+50937222222' },
    { field_name: 'address_line_1', label: 'Adresse', section: 'CONTACT', old_value: 'Delmas 33', new_value: '12 rue des Palmiers' },
  ],
  account_activated: true,
}

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

const block = (name) => screen.getByRole('region', { name })

describe('EmployeeDetailPage (US-20)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listEmployeeDocuments.mockResolvedValue([])
  })

  it('en-tête : badge « Lecture seule », nom, matricule, agence, poste, statut', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    renderAt()

    const header = await screen.findByRole('region', { name: 'Employé' })
    expect(within(header).getByText('Lecture seule')).toBeInTheDocument()
    expect(within(header).getByRole('heading', { name: 'JOSEPH Jean · AC-1001' })).toBeInTheDocument()
    expect(within(header).getByText('Agent de crédit · Agence PV')).toBeInTheDocument()
    expect(within(header).getByText('Mise à jour effectuée')).toBeInTheDocument()
    expect(getEmployee).toHaveBeenCalledWith('1001')
  })

  it('reprend la structure de la maquette A07 sans inventer de fonctions non disponibles', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    renderAt()

    expect(await screen.findByRole('banner')).toHaveTextContent('Portail RH')
    const navigation = screen.getByRole('navigation', { name: 'Navigation principale RH' })
    expect(within(navigation).getByRole('link', { name: 'Employés' })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).getByText('File de validation')).toHaveAttribute('aria-disabled', 'true')
    expect(within(navigation).getByText('Signalements')).toHaveAttribute('aria-disabled', 'true')

    const profile = screen.getByRole('region', { name: 'Profil' })
    expect(within(profile).getByText('Téléphone')).toBeInTheDocument()
    expect(within(profile).getByText('+50937222222')).toBeInTheDocument()
    expect(screen.queryByText('Dossier complet')).not.toBeInTheDocument()
    expect(screen.queryByText(/consultation de ce dossier est enregistrée/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Certificats' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Signalements' })).not.toBeInTheDocument()
  })

  it('CA-01 : date de soumission et changements « Ancienne → Nouvelle »', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    renderAt()

    const update = await screen.findByRole('region', { name: 'Mise à jour' })
    expect(within(update).getByText('Mise à jour effectuée le 04/10/2026 à 14:32')).toBeInTheDocument()
    expect(within(update).getByText('2 informations modifiées')).toBeInTheDocument()
    const changes = within(update).getAllByRole('article')
    expect(within(changes[0]).getByText('Téléphone')).toBeInTheDocument()
    expect(within(changes[0]).getByText('+50937221111')).toBeInTheDocument()
    expect(within(changes[0]).getByText('+50937222222')).toBeInTheDocument()
    expect(within(changes[1]).getByText('12 rue des Palmiers')).toBeInTheDocument()
  })

  it('CA-01 : les informations affichent les nouvelles valeurs, sans mention « Modifiable »', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    renderAt()

    const profile = await screen.findByRole('region', { name: 'Profil' })
    expect(within(profile).getByText('+50937222222')).toBeInTheDocument()
    expect(profile).toHaveTextContent('15/03/1996')
    expect(profile).toHaveTextContent('Crédit')
    expect(screen.queryByText('Modifiable')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Non modifiable' })).not.toBeInTheDocument()
  })

  it('nom modifié : « anciennement … » sous le nouveau nom', async () => {
    getEmployee.mockResolvedValue({ ...SUBMITTED, last_name: 'JOSEPH-PAUL', display_name: 'JOSEPH-PAUL Jean', previous_name: 'JOSEPH' })
    renderAt()

    expect(await screen.findByRole('heading', { name: 'JOSEPH-PAUL Jean · AC-1001' })).toBeInTheDocument()
    expect(screen.getByText('anciennement JOSEPH')).toBeInTheDocument()
  })

  it('CA-02 : non effectuée (brouillon ou rien) → « Mise à jour non effectuée », sans changement', async () => {
    getEmployee.mockResolvedValue(BASE)
    renderAt()

    const update = await screen.findByRole('region', { name: 'Mise à jour' })
    expect(within(update).getByText('Mise à jour non effectuée')).toBeInTheDocument()
    expect(within(update).queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByText(/ne pas souhaiter/)).not.toBeInTheDocument()
    expect(screen.queryByText(/brouillon|en cours/i)).not.toBeInTheDocument()
  })

  it('CA-03 : réponse « Non » → mention', async () => {
    getEmployee.mockResolvedValue({ ...BASE, declined: true })
    renderAt()

    expect(await screen.findByText("L'employé a indiqué ne pas souhaiter mettre à jour son dossier")).toBeInTheDocument()
  })

  it('CA-04 : aucun champ de saisie ni bouton de modification', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    renderAt()
    await screen.findByRole('region', { name: 'Mise à jour' })

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    // Seule action possible sur le dossier : la réinitialisation de l'accès (US-22).
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Retour à la liste des employés' })).toHaveAttribute('href', '/admin/employes')
    expect(buttons[0]).toHaveAccessibleName('Menu du compte')
    expect(buttons[1]).toHaveAccessibleName("Réinitialiser l'accès")
  })

  it('US-21 : bloc « Documents » chargé avec le dossier', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    listEmployeeDocuments.mockResolvedValue([
      {
        id: 'd1',
        document_type: 'DIPLOME',
        type_label: 'Diplôme',
        original_name: 'licence.pdf',
        content_type: 'application/pdf',
        size_bytes: 2048,
        uploaded_at: '2026-10-04T09:00:00',
      },
    ])
    renderAt()

    const documents = await screen.findByRole('region', { name: 'Documents' })
    expect(within(documents).getByText('licence.pdf')).toBeInTheDocument()
    expect(listEmployeeDocuments).toHaveBeenCalledWith('1001')
  })

  it('US-21 : aucun document → « Aucun document transmis »', async () => {
    getEmployee.mockResolvedValue(BASE)
    renderAt()

    expect(within(await screen.findByRole('region', { name: 'Documents' })).getByText('Aucun document transmis')).toBeInTheDocument()
  })

  it('CA-07 : état du compte', async () => {
    getEmployee.mockResolvedValue(SUBMITTED)
    renderAt()
    expect(within(await screen.findByRole('region', { name: 'Accès' })).getByText('Compte activé')).toBeInTheDocument()
  })

  it('CA-07 : compte non activé', async () => {
    getEmployee.mockResolvedValue(BASE)
    renderAt()
    expect(within(await screen.findByRole('region', { name: 'Accès' })).getByText('Compte non activé')).toBeInTheDocument()
  })

  it('CA-06 : employé inconnu ou inactif → « Employé introuvable » et lien vers la liste', async () => {
    getEmployee.mockRejectedValue(new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employé introuvable.'))
    const user = userEvent.setup()
    renderAt('/admin/employes/1006')

    expect(await screen.findByRole('heading', { name: 'Employé introuvable' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Retour à la liste des employés' }))
    expect(await screen.findByText(/^Liste/)).toBeInTheDocument()
  })

  it('le bouton retour ramène à la liste avec la recherche et le filtre en cours', async () => {
    getEmployee.mockResolvedValue(BASE)
    const user = userEvent.setup()
    renderAt({ pathname: '/admin/employes/1001', state: { listSearch: '?search=pierre&status=NOT_UPDATED' } })
    await screen.findByRole('region', { name: 'Mise à jour' })

    await user.click(screen.getByRole('link', { name: 'Retour à la liste des employés' }))

    expect(await screen.findByText('Liste ?search=pierre&status=NOT_UPDATED')).toBeInTheDocument()
  })

  it('sans session → connexion admin', async () => {
    getEmployee.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderAt()

    expect(await screen.findByText('Écran connexion admin')).toBeInTheDocument()
  })
})
