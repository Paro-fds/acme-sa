import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import ProfilePage from './ProfilePage.jsx'
import { getProfile } from '../../api/employee.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
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
  affectation: { agency: 'Pétion-Ville', region: 'Métropole 1', direction: 'Direction du Crédit' },
  position: 'Agent de crédit',
  grade: '12',
  level: '2',
  contract_nature: 'CDI',
  hire_date: '2019-06-03',
  editable_fields: ['telephone_number', 'email_address', 'address_line_1'],
  completion: {
    percent: 25,
    complete: 2,
    total: 8,
    is_complete: false,
    elements: [
      { key: 'telephone', label: 'Téléphone', complete: true },
      { key: 'address', label: 'Adresse', complete: true },
      { key: 'email', label: 'Email', complete: false },
      { key: 'emergency_contact', label: "Contact d'urgence", complete: false },
      { key: 'education_level', label: "Niveau d'études", complete: false },
      { key: 'agency_confirmed', label: 'Agence confirmée', complete: false },
      { key: 'position_confirmed', label: 'Poste confirmé', complete: false },
      { key: 'hire_date_confirmed', label: "Date d'embauche confirmée", complete: false },
    ],
  },
}

function IdentifyProbe() {
  const { state } = useLocation()
  return <p>Écran identification : {state?.message}</p>
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/profil']}>
      <Routes>
        <Route path="/connexion" element={<IdentifyProbe />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/certificats" element={<p>Écran Mes certificats</p>} />
        <Route path="/parcours" element={<p>Écran Mon parcours</p>} />
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
    expect(within(summary).getByText('Pétion-Ville')).toBeInTheDocument() // libellé officiel seul (US-201)
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
      'Région',
      'Direction',
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

    expect(within(field('Coordonnées', 'Email')).getByText('Modifiable')).toBeInTheDocument()
    expect(within(field('Identité', 'Nom')).getByLabelText('Non modifiable')).toBeInTheDocument()
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

  it('US-206 : plus de question Oui / Non ni de « Mes documents » ; les sections du dossier et « Mes certificats »', async () => {
    await renderProfile()

    expect(screen.queryByRole('button', { name: /mettre à jour mon dossier/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Mes documents/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mes coordonnées/ })).toHaveAttribute('href', '/profil/coordonnees')
    expect(screen.getByRole('link', { name: /Contact d'urgence & études/ })).toHaveAttribute('href', '/profil/contact-etudes')
    expect(screen.getByRole('link', { name: /Mes informations RH/ })).toHaveAttribute('href', '/profil/informations-rh')
    expect(screen.getByRole('link', { name: /Mes certificats.*Disponible dès votre profil complet/ })).toBeInTheDocument()
  })

  it('US-25 CA-03 : la carte « Mon parcours » ouvre le parcours', async () => {
    await renderProfile()

    const career = screen.getByRole('link', { name: /Mon parcours/ })
    expect(career).toHaveTextContent('Diplômes, formations, expériences et compétences')

    await userEvent.setup().click(career)
    expect(await screen.findByText('Écran Mon parcours')).toBeInTheDocument()
  })

  it('CA-06 : sans session, retour à l’identification', async () => {
    getProfile.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran identification : Vous devez être connecté.')).toBeInTheDocument()
  })
})

describe('ProfilePage — dossier et progression (US-201)', () => {
  it('CA-02 : « Votre dossier est complet à X % », avec une barre de progression', async () => {
    await renderProfile()

    expect(screen.getByRole('heading', { name: 'Votre dossier est complet à 25 %' })).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Progression du dossier' })
    expect(bar).toHaveAttribute('aria-valuenow', '25')
    expect(screen.getByText('2 éléments complétés sur 8')).toBeInTheDocument()
  })

  it('CA-01 : agence, région et direction avec leur libellé officiel, jamais le code brut', async () => {
    await renderProfile()

    const section = screen.getByRole('region', { name: 'Informations professionnelles' })
    expect(within(section).getByText('Pétion-Ville')).toBeInTheDocument()
    expect(within(section).getByText('Métropole 1')).toBeInTheDocument()
    expect(within(section).getByText('Direction du Crédit')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'JOSEPH Jean' })).getByText('Pétion-Ville')).toBeInTheDocument()
    expect(screen.queryByText('PV')).not.toBeInTheDocument()
  })

  it('CA-03 : une agence inconnue du référentiel s’affiche « Unité à confirmer », sans bloquer', async () => {
    await renderProfile({ affectation: { agency: null, region: null, direction: 'Direction du Crédit' } })

    const section = screen.getByRole('region', { name: 'Informations professionnelles' })
    expect(within(section).getAllByText('Unité à confirmer')).toHaveLength(2)
    expect(within(screen.getByRole('region', { name: 'JOSEPH Jean' })).getByText('Unité à confirmer')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Votre dossier est complet à 25 %' })).toBeInTheDocument()
  })
})

describe('ProfilePage — erreurs de chargement', () => {
  it('affiche un message si l API retourne null (erreur serveur silencieuse)', async () => {
    getProfile.mockResolvedValue(null)
    renderPage()

    expect(await screen.findByText('Impossible de charger le profil.')).toBeInTheDocument()
  })
})
