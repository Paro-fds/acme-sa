import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../api/client.js'
import { createCertificate, getCertificateForm, listCertificates, requestUpload, sendFile } from '../../api/certificates.js'
import { resizeImage } from '../../lib/resizeImage.js'
import DepositPage from './DepositPage.jsx'

vi.mock('../../api/certificates.js', () => ({
  getCertificateForm: vi.fn(),
  requestUpload: vi.fn(),
  sendFile: vi.fn(),
  createCertificate: vi.fn(),
  listCertificates: vi.fn(),
}))
vi.mock('../../lib/resizeImage.js', () => ({ resizeImage: vi.fn(async (file) => file) }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))
vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn(() => Promise.resolve({ first_name: 'Lucie' })) }))

const FORM = {
  types: [
    { value: 'DIPLOME', label: 'Diplôme' },
    { value: 'CERTIFICAT', label: 'Certificat' },
  ],
  levels: [
    { value: 'BACCALAUREAT', label: 'Baccalauréat', examples: 'Bac', needs_domain: false, on_scale: true },
    { value: 'LICENCE', label: 'Licence', examples: 'Bac + 3', needs_domain: true, on_scale: true },
  ],
  domains: [
    { value: 'COMPTABILITE', label: 'Comptabilité' },
    { value: 'AUTRE', label: 'Autre (à préciser)' },
  ],
  max_mb: 5,
  limit: 20,
}
const PDF = new File(['%PDF-1.7'], 'licence.pdf', { type: 'application/pdf' })
const CERTIFICATE = { id: 'c1', title: 'Licence en sciences comptables', status: 'RECEIVED' }

function ThanksProbe() {
  const { state } = useLocation()
  return <p>Merci {state?.firstName} : {state?.certificate?.title}</p>
}

function renderPage(entry = '/certificats/deposer') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/certificats/deposer" element={<DepositPage />} />
        <Route path="/certificats/merci" element={<ThanksProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function fillForm(user) {
  await user.upload(await screen.findByLabelText('Choisir un fichier'), PDF)
  await user.click(screen.getByRole('radio', { name: /Diplôme/ }))
  await user.selectOptions(screen.getByLabelText("Niveau d'études associé"), 'LICENCE')
  await user.type(screen.getByLabelText('Intitulé exact'), 'Licence en sciences comptables')
  await user.type(screen.getByLabelText("Établissement d'enseignement"), "Université d'État d'Haïti")
  await user.type(screen.getByLabelText("Année d'obtention"), '2019')
  await user.selectOptions(screen.getByLabelText("Domaine d'études"), 'COMPTABILITE')
}

describe('US-301 — Déposer un certificat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCertificateForm.mockResolvedValue(FORM)
    requestUpload.mockResolvedValue({ upload_id: 'u1', method: 'PUT', url: '/api/me/certificates/uploads/u1', headers: {} })
    sendFile.mockResolvedValue()
    createCertificate.mockResolvedValue(CERTIFICATE)
  })

  it('CA-01 : formats et taille annoncés, photo ou fichier', async () => {
    renderPage()

    expect(await screen.findByText('Formats acceptés : PDF, JPG ou PNG · 5 Mo au plus')).toBeVisible()
    expect(screen.getByLabelText('Prendre une photo')).toHaveAttribute('capture', 'environment')
    expect(screen.getByLabelText('Choisir un fichier')).toHaveAttribute('accept', 'application/pdf,image/jpeg,image/png')
  })

  it('CA-02 : aperçu du fichier avant l’envoi', async () => {
    renderPage()
    await userEvent.upload(await screen.findByLabelText('Choisir un fichier'), PDF)

    expect(screen.getByRole('region', { name: 'Fichier choisi' })).toHaveTextContent('licence.pdf')
  })

  it('CA-01 : une photo est réduite avant l’envoi', async () => {
    const photo = new File(['jpeg'], 'photo.jpg', { type: 'image/jpeg' })
    renderPage()
    await userEvent.upload(await screen.findByLabelText('Prendre une photo'), photo)

    expect(resizeImage).toHaveBeenCalledWith(photo)
  })

  it('CA-03 : le domaine n’est demandé qu’à partir de Bac + 2, le pays seulement si étranger', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(await screen.findByLabelText("Niveau d'études associé"), 'BACCALAUREAT')
    expect(screen.queryByLabelText("Domaine d'études")).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Niveau d'études associé"), 'LICENCE')
    expect(screen.getByLabelText("Domaine d'études")).toBeVisible()

    expect(screen.queryByLabelText("Pays d'obtention")).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: "Diplôme obtenu à l'étranger" }))
    expect(screen.getByLabelText("Pays d'obtention")).toBeVisible()
  })

  it('envoie le fichier par dépôt signé, enregistre le certificat et remercie', async () => {
    const user = userEvent.setup()
    renderPage()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Envoyer mon certificat/ }))

    expect(requestUpload).toHaveBeenCalledWith(PDF)
    expect(sendFile).toHaveBeenCalledWith(expect.objectContaining({ upload_id: 'u1' }), PDF, expect.any(Function))
    expect(createCertificate).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'DIPLOME', level: 'LICENCE', year: '2019', domain: 'COMPTABILITE' }),
      'u1',
      'licence.pdf',
      null,
    )
    expect(await screen.findByText('Merci Lucie : Licence en sciences comptables')).toBeVisible()
  })

  it('CA-03 : une erreur de champ s’affiche près du champ et le fichier n’est pas renvoyé', async () => {
    createCertificate.mockRejectedValueOnce(
      new ApiError(422, 'INVALID_FIELD', "Indiquez l'établissement qui l'a délivré.", 'institution'),
    )
    const user = userEvent.setup()
    renderPage()
    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /Envoyer mon certificat/ }))

    expect(await screen.findByLabelText("Établissement d'enseignement")).toHaveAccessibleDescription(
      /Indiquez l'établissement/,
    )
    await user.click(screen.getByRole('button', { name: /Envoyer mon certificat/ }))
    expect(requestUpload).toHaveBeenCalledOnce()
    expect(createCertificate).toHaveBeenCalledTimes(2)
  })

  it('US-207 CA-04 : le type se choisit parmi 4 boutons ; l’impact du niveau est annoncé (écran 11)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('radio', { name: /Certificat/ }))
    expect(screen.getByRole('radio', { name: /Certificat/ })).toBeChecked()

    await user.selectOptions(screen.getByLabelText("Niveau d'études associé"), 'LICENCE')
    expect(screen.getByText("Une fois validé par les RH, votre niveau d'études deviendra Licence.")).toBeVisible()
  })

  it('sans fichier, l’envoi demande d’en choisir un', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: /Envoyer mon certificat/ }))

    expect(screen.getByText('Ajoutez une photo ou un PDF de votre certificat.')).toBeVisible()
    expect(requestUpload).not.toHaveBeenCalled()
  })
})

describe('US-130 CA-06 — Corriger et renvoyer un certificat', () => {
  const TO_CORRECT = {
    id: 'c4',
    certificate_type: 'DIPLOME',
    level: 'LICENCE',
    title: 'Licence en sciences comptables',
    institution: 'Université Démo',
    year: 2019,
    country: 'France',
    domain: 'AUTRE',
    domain_label: 'Microfinance rurale',
    status: 'TO_CORRECT',
    is_archived: false,
    rejection_reason: 'Document illisible ou de mauvaise qualité',
    rejection_comment: 'La photo est floue.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getCertificateForm.mockResolvedValue(FORM)
    listCertificates.mockResolvedValue({ certificates: [TO_CORRECT], limit: 20 })
    requestUpload.mockResolvedValue({ upload_id: 'u2', method: 'PUT', url: '/api/me/certificates/uploads/u2', headers: {} })
    sendFile.mockResolvedValue()
    createCertificate.mockResolvedValue(CERTIFICATE)
  })

  it('le formulaire est rempli, le message des RH rappelé, le fichier à choisir de nouveau', async () => {
    renderPage('/certificats/deposer?remplace=c4')

    const reminder = await screen.findByRole('region', { name: 'Vous corrigez « Licence en sciences comptables »' })
    expect(reminder).toHaveTextContent('Message des RH : Document illisible ou de mauvaise qualité. La photo est floue.')
    expect(screen.getByRole('radio', { name: /Diplôme/ })).toBeChecked()
    expect(screen.getByLabelText("Niveau d'études associé")).toHaveValue('LICENCE')
    expect(screen.getByLabelText('Intitulé exact')).toHaveValue('Licence en sciences comptables')
    expect(screen.getByLabelText("Établissement d'enseignement")).toHaveValue('Université Démo')
    expect(screen.getByLabelText("Année d'obtention")).toHaveValue('2019')
    expect(screen.getByLabelText("Domaine d'études")).toHaveValue('AUTRE')
    expect(screen.getByLabelText('Précisez le domaine')).toHaveValue('Microfinance rurale')
    expect(screen.getByLabelText("Diplôme obtenu à l'étranger")).toBeChecked()
    expect(screen.getByLabelText("Pays d'obtention")).toHaveValue('France')
    expect(screen.queryByRole('region', { name: 'Fichier choisi' })).not.toBeInTheDocument()
  })

  it('l’envoi remplace l’ancien certificat', async () => {
    const user = userEvent.setup()
    renderPage('/certificats/deposer?remplace=c4')
    await user.upload(await screen.findByLabelText('Choisir un fichier'), PDF)
    await user.click(screen.getByRole('button', { name: /Renvoyer mon certificat/ }))

    expect(createCertificate).toHaveBeenCalledWith(
      expect.objectContaining({ certificate_type: 'DIPLOME', level: 'LICENCE', year: '2019', domain: 'AUTRE', domain_other: 'Microfinance rurale' }),
      'u2',
      'licence.pdf',
      'c4',
    )
    expect(await screen.findByText(/Merci Lucie : Licence en sciences comptables/)).toBeVisible()
  })

  it('un certificat qui n’est plus à corriger ne se renvoie pas', async () => {
    listCertificates.mockResolvedValue({ certificates: [{ ...TO_CORRECT, is_archived: true }], limit: 20 })
    renderPage('/certificats/deposer?remplace=c4')

    expect(await screen.findByText('Ce certificat ne peut plus être renvoyé : il a déjà été corrigé ou décidé.')).toBeVisible()
    expect(screen.queryByLabelText('Intitulé exact')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Retour à mes certificats/ })).toHaveAttribute('href', '/certificats')
  })
})
