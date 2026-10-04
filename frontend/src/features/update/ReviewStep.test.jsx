import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import ReviewStep from './ReviewStep.jsx'
import { getMyUpdate } from '../../api/employee.js'
import { listMyDocuments } from '../../api/documents.js'

vi.mock('../../api/employee.js', () => ({ getMyUpdate: vi.fn(), submitUpdate: vi.fn() }))
vi.mock('../../api/documents.js', () => ({ listMyDocuments: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const change = (field_name, label, section, old_value, new_value) => ({
  field_name,
  label,
  section,
  old_value,
  new_value,
  changed_at: '2026-10-04T14:32:00',
})

const PHONE = change('telephone_number', 'Téléphone', 'CONTACT', '+50937221111', '+509 3722 2222')
const ADDRESS = change('address_line_1', 'Adresse', 'CONTACT', '12 rue Capois, Port-au-Prince', '5 rue Pavée, Jacmel')

function renderStep({ changes = [PHONE, ADDRESS], documents = [] } = {}) {
  getMyUpdate.mockResolvedValue({ state: 'IN_PROGRESS', accepted: true, updated_at: '2026-10-04T14:32:00', changes })
  listMyDocuments.mockResolvedValue(documents)
  render(
    <MemoryRouter initialEntries={['/mise-a-jour/verification']}>
      <Routes>
        <Route path="/mise-a-jour/informations" element={<p>Étape 1 : Informations</p>} />
        <Route path="/mise-a-jour/verification" element={<ReviewStep />} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.findByRole('heading', { name: 'Vérification avant soumission' })
}

const documentsSection = () => screen.getByRole('region', { name: 'Justificatifs joints' })
const confirmBox = () => screen.getByLabelText(/Je confirme que les informations fournies sont exactes/)

describe('ReviewStep (US-11)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('le stepper indique l’étape 3 sur 4', async () => {
    await renderStep()

    expect(screen.getByText('Étape 3 sur 4 : Vérification')).toBeInTheDocument()
  })

  it('CA-01 : « 2 modifications en attente » et, pour chacune, l’ancienne et la nouvelle valeur', async () => {
    await renderStep()

    expect(screen.getByText('2 modifications en attente')).toBeInTheDocument()
    expect(
      screen.getByText("Ces modifications seront transmises à l'administration ACME pour mise à jour de votre dossier."),
    ).toBeInTheDocument()
    const contact = screen.getByRole('region', { name: 'Coordonnées modifiées' })
    expect(within(contact).getByText('2 champs')).toBeInTheDocument()
    const phone = within(contact).getByRole('heading', { name: 'Téléphone' }).closest('article')
    expect(within(phone).getByText('+50937221111').tagName).toBe('S')
    expect(within(phone).getByText('+509 3722 2222')).toBeInTheDocument()
    expect(within(contact).getByText('5 rue Pavée, Jacmel')).toBeInTheDocument()
  })

  it('CA-01 : les changements sont regroupés par section', async () => {
    await renderStep({ changes: [change('last_name', 'Nom', 'IDENTITY', 'JOSEPH', 'JOSEPH-PAUL'), PHONE] })

    expect(screen.getByText('2 modifications en attente')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Identité modifiée' })).getByText('1 champ')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Coordonnées modifiées' })).getByText('1 champ')).toBeInTheDocument()
  })

  it('une seule modification est accordée au singulier', async () => {
    await renderStep({ changes: [PHONE] })

    expect(screen.getByText('1 modification en attente')).toBeInTheDocument()
  })

  it('CA-02 : les documents ajoutés sont listés dans « Justificatifs joints »', async () => {
    await renderStep({
      documents: [{ id: 'd1', document_type: 'DIPLOMA', type_label: 'Diplôme', original_name: 'licence.pdf', size_bytes: 245760 }],
    })

    const section = documentsSection()
    expect(within(section).getByText('licence.pdf')).toBeInTheDocument()
    expect(within(section).getByText(/Diplôme/)).toBeInTheDocument()
    expect(within(section).queryByText('Aucun document joint (optionnel)')).not.toBeInTheDocument()
  })

  it('CA-03 : sans document, « Aucun document joint (optionnel) » sans bloquer la soumission', async () => {
    await renderStep()

    expect(within(documentsSection()).getByText('Aucun document joint (optionnel)')).toBeInTheDocument()
    await userEvent.setup().click(confirmBox())
    expect(screen.getByRole('button', { name: 'Soumettre ma mise à jour' })).toBeEnabled()
  })

  it('CA-04 : sans modification, le message dédié s’affiche et la soumission reste possible', async () => {
    await renderStep({ changes: [] })

    expect(
      screen.getByText("Vous n'avez modifié aucune information. Vous pouvez confirmer que vos informations sont exactes."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/modifications? en attente/)).not.toBeInTheDocument()
    await userEvent.setup().click(confirmBox())
    expect(screen.getByRole('button', { name: 'Soumettre ma mise à jour' })).toBeEnabled()
  })

  it('CA-05 : « Revenir en arrière et modifier » ouvre l’étape 1', async () => {
    await renderStep()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Revenir en arrière et modifier' }))

    expect(await screen.findByText('Étape 1 : Informations')).toBeInTheDocument()
  })

  it('CA-06 : une ancienne valeur vide est affichée « Non renseigné »', async () => {
    await renderStep({ changes: [change('email_address', 'Email', 'CONTACT', '', 'rose.etienne@exemple.test')] })

    expect(screen.getByText('Non renseigné')).toBeInTheDocument()
  })
})
