import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import InformationsStep from './InformationsStep.jsx'
import { getEditableFields, getProfile, saveChanges } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/employee.js', () => ({ getEditableFields: vi.fn(), getProfile: vi.fn(), saveChanges: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const field = (code, label, section, required, value, original = value) => ({
  code,
  label,
  section,
  required,
  original_value: original,
  value,
  modified: value !== original,
})

const FIELDS = [
  field('last_name', 'Nom', 'IDENTITY', true, 'JOSEPH'),
  field('first_name', 'Prénom', 'IDENTITY', true, 'Jean'),
  field('telephone_number', 'Téléphone', 'CONTACT', true, '+50937221111'),
  field('email_address', 'Email', 'CONTACT', false, ''),
  field('address_line_1', 'Adresse', 'CONTACT', false, '12 rue Capois, Port-au-Prince'),
]

const PROFILE = { employee_code: 'AC-1001', position: 'Agent de crédit', department: 'Crédit', agency_code: 'PV' }

function renderStep() {
  render(
    <MemoryRouter initialEntries={['/mise-a-jour/informations']}>
      <Routes>
        <Route path="/profil" element={<p>Écran profil</p>} />
        <Route path="/mise-a-jour/informations" element={<InformationsStep />} />
        <Route path="/mise-a-jour/verification" element={<p>Étape suivante</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function renderForm(fields = FIELDS) {
  getEditableFields.mockResolvedValue(fields)
  renderStep()
  await screen.findByLabelText('Téléphone')
}

const input = (label) => screen.getByLabelText(label, { exact: true })
const card = (label) => input(label).closest('[data-field]')
const continueButton = () => screen.getByRole('button', { name: 'Continuer vers la vérification' })
const section = (name) => screen.getByRole('region', { name })

async function retype(user, label, value) {
  await user.clear(input(label))
  if (value) await user.type(input(label), value)
  await user.tab()
}

describe('InformationsStep (US-09)', () => {
  beforeEach(() => {
    getProfile.mockResolvedValue(PROFILE)
    saveChanges.mockResolvedValue({ state: 'IN_PROGRESS', changes: [] })
  })

  it('CA-01 : les champs sont pré-remplis et le stepper indique l’étape 1 sur 4', async () => {
    await renderForm()

    expect(screen.getByText('Étape 1 sur 4 : Informations')).toBeInTheDocument()
    expect(input('Nom')).toHaveValue('JOSEPH')
    expect(input('Prénom')).toHaveValue('Jean')
    expect(input('Téléphone')).toHaveValue('+50937221111')
    expect(input('Email')).toHaveValue('')
    expect(input('Adresse')).toHaveValue('12 rue Capois, Port-au-Prince')
  })

  it('CA-01 : les champs sont regroupés en Identité et Coordonnées, les informations pro en lecture seule', async () => {
    await renderForm()

    expect(within(section('Identité')).getByLabelText('Nom', { exact: true })).toBeInTheDocument()
    expect(within(section('Coordonnées')).getByLabelText('Téléphone')).toBeInTheDocument()
    const pro = section('Informations professionnelles')
    expect(within(pro).getByText('Lecture seule')).toBeInTheDocument()
    expect(within(pro).getByText('Agent de crédit')).toBeInTheDocument()
    expect(within(pro).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('les champs obligatoires sont signalés', async () => {
    await renderForm()

    expect(within(card('Téléphone')).getByText('(obligatoire)')).toBeInTheDocument()
    expect(within(card('Email')).queryByText('(obligatoire)')).not.toBeInTheDocument()
  })

  it('les sections se replient et se déplient', async () => {
    await renderForm()
    const user = userEvent.setup()
    const toggle = within(section('Coordonnées')).getByRole('button', { expanded: true })

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByLabelText('Téléphone')).not.toBeInTheDocument()
    await user.click(toggle)
    expect(input('Téléphone')).toBeInTheDocument()
  })

  it('CA-03 : un champ modifié affiche « Modifié », l’ancienne valeur barrée et le compteur de section', async () => {
    await renderForm()
    const user = userEvent.setup()

    expect(within(card('Téléphone')).getByText('Inchangé')).toBeInTheDocument()
    expect(within(section('Coordonnées')).getByText('Aucune modification')).toBeInTheDocument()

    await retype(user, 'Téléphone', '+509 3722 2222')
    await retype(user, 'Adresse', '5 rue Pavée, Jacmel')

    const phone = card('Téléphone')
    expect(within(phone).getByText('Modifié')).toBeInTheDocument()
    expect(within(phone).getByText('+50937221111').tagName).toBe('S')
    expect(within(phone).getByText(/Ancienne valeur/)).toBeInTheDocument()
    expect(within(section('Coordonnées')).getByText('2 modifications en cours')).toBeInTheDocument()
    expect(within(section('Identité')).getByText('Aucune modification')).toBeInTheDocument()
  })

  it('CA-03 : un brouillon existant est affiché comme modifié dès l’ouverture', async () => {
    await renderForm(FIELDS.map((f) => (f.code === 'telephone_number' ? field(f.code, f.label, f.section, true, '+509 3722 2222', '+50937221111') : f)))

    expect(input('Téléphone')).toHaveValue('+509 3722 2222')
    expect(within(card('Téléphone')).getByText('Modifié')).toBeInTheDocument()
    expect(within(section('Coordonnées')).getByText('1 modification en cours')).toBeInTheDocument()
  })

  it('CA-04 : remettre la valeur d’origine fait disparaître le badge', async () => {
    await renderForm()
    const user = userEvent.setup()

    await retype(user, 'Téléphone', '+509 3722 2222')
    await retype(user, 'Téléphone', '+50937221111')

    expect(within(card('Téléphone')).queryByText('Modifié')).not.toBeInTheDocument()
    expect(within(card('Téléphone')).queryByText(/Ancienne valeur/)).not.toBeInTheDocument()
  })

  it('CA-05 : une valeur invalide affiche le message sous le champ et désactive le bouton', async () => {
    await renderForm()
    const user = userEvent.setup()

    await retype(user, 'Téléphone', '12ab')

    expect(input('Téléphone')).toHaveAccessibleDescription(/Saisissez un numéro valide, par exemple \+509 3722 1111\./)
    expect(input('Téléphone')).toHaveAttribute('aria-invalid', 'true')
    expect(continueButton()).toBeDisabled()

    await retype(user, 'Téléphone', '+509 3722 2222')
    expect(input('Téléphone')).toHaveAttribute('aria-invalid', 'false')
    expect(continueButton()).toBeEnabled()
  })

  it.each([
    ['Email', 'jean@', 'Saisissez une adresse email valide.'],
    ['Adresse', 'rue', "L'adresse doit contenir entre 5 et 200 caractères."],
    ['Nom', 'Jean2', 'Saisissez un nom valide (lettres, espaces, tirets).'],
  ])('CA-05 : %s invalide → message du tableau', async (label, value, message) => {
    await renderForm()

    await retype(userEvent.setup(), label, value)

    expect(within(card(label)).getByText(message)).toBeInTheDocument()
  })

  it.each(['Téléphone', 'Nom', 'Prénom'])('CA-06 : %s vidé → « Ce champ est obligatoire. »', async (label) => {
    await renderForm()

    await retype(userEvent.setup(), label, '')

    expect(within(card(label)).getByText('Ce champ est obligatoire.')).toBeInTheDocument()
    expect(continueButton()).toBeDisabled()
  })

  it('un champ facultatif peut être vidé', async () => {
    await renderForm()

    await retype(userEvent.setup(), 'Adresse', '')

    expect(input('Adresse')).toHaveAttribute('aria-invalid', 'false')
    expect(continueButton()).toBeEnabled()
  })

  it('CA-08 : une ancienne valeur vide est affichée « Non renseigné »', async () => {
    await renderForm()

    await retype(userEvent.setup(), 'Email', 'jean.joseph@exemple.test')

    expect(within(card('Email')).getByText('Non renseigné')).toBeInTheDocument()
  })

  it('CA-02 : « Continuer » enregistre les valeurs modifiées puis passe à l’étape suivante', async () => {
    await renderForm()
    const user = userEvent.setup()
    await retype(user, 'Téléphone', '+509 3722 2222')
    await retype(user, 'Adresse', '5 rue Pavée, Jacmel')

    await user.click(continueButton())

    expect(saveChanges).toHaveBeenCalledWith({
      telephone_number: '+509 3722 2222',
      address_line_1: '5 rue Pavée, Jacmel',
    })
    expect(await screen.findByText('Étape suivante')).toBeInTheDocument()
  })

  it('CA-04 : un changement du brouillon remis à la valeur d’origine est renvoyé pour être supprimé', async () => {
    await renderForm(FIELDS.map((f) => (f.code === 'telephone_number' ? field(f.code, f.label, f.section, true, '+509 3722 2222', '+50937221111') : f)))
    const user = userEvent.setup()

    await retype(user, 'Téléphone', '+50937221111')
    await user.click(continueButton())

    expect(saveChanges).toHaveBeenCalledWith({ telephone_number: '+50937221111' })
  })

  it('une valeur d’origine non conforme (format du CSV) ne bloque pas si elle n’est pas modifiée', async () => {
    await renderForm(FIELDS.map((f) => (f.code === 'telephone_number' ? field(f.code, f.label, f.section, true, '3722') : f)))
    const user = userEvent.setup()

    expect(continueButton()).toBeEnabled()
    await user.click(continueButton())

    expect(saveChanges).toHaveBeenCalledWith({})
  })

  it('CA-05 : une erreur du serveur est affichée sous le champ concerné', async () => {
    saveChanges.mockRejectedValue(
      new ApiError(422, 'INVALID_FIELD', 'Saisissez une adresse email valide.', 'email_address'),
    )
    await renderForm()
    const user = userEvent.setup()

    await user.click(continueButton())

    expect(await within(card('Email')).findByText('Saisissez une adresse email valide.')).toBeInTheDocument()
    expect(screen.queryByText('Étape suivante')).not.toBeInTheDocument()
  })

  it('CA-09 : sans « Oui » préalable, retour au profil', async () => {
    getEditableFields.mockRejectedValue(
      new ApiError(409, 'UPDATE_NOT_STARTED', "Indiquez d'abord que vous souhaitez mettre à jour votre dossier."),
    )
    renderStep()

    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })
})
