import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import CareerPage, { VISIBILITY_NOTICE } from './CareerPage.jsx'
import { getMyCareer } from '../../api/career.js'
import { ApiError } from '../../api/client.js'

vi.mock('../../api/career.js', () => ({ getMyCareer: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ logout: vi.fn() }))

const LABELS = {
  QUALIFICATION: 'Diplômes et certifications',
  TRAINING: 'Formations suivies',
  EXPERIENCE: 'Expériences professionnelles',
  SKILL: 'Compétences',
}

const entry = (id, kind, fields) => ({
  id,
  kind,
  qualification_type: null,
  qualification_type_label: null,
  title: '',
  organization: null,
  location: null,
  start_month: null,
  end_month: null,
  duration_hours: null,
  description: null,
  skill_level: null,
  skill_level_label: null,
  created_at: '2026-10-15T09:00:00Z',
  updated_at: '2026-10-15T09:00:00Z',
  proof: null,
  ...fields,
})

function career(itemsByKind = {}, { limit = 30 } = {}) {
  return {
    kinds: Object.entries(LABELS).map(([kind, label]) => {
      const items = itemsByKind[kind] ?? []
      return { kind, label, count: items.length, limit, items }
    }),
    last_changed_at: null,
  }
}

function IdentifyProbe() {
  const { state } = useLocation()
  return <p>Écran identification : {state?.message}</p>
}

function renderPage(data = career()) {
  getMyCareer.mockResolvedValue(data)
  render(
    <MemoryRouter initialEntries={['/parcours']}>
      <Routes>
        <Route path="/connexion" element={<IdentifyProbe />} />
        <Route path="/profil" element={<p>Écran profil</p>} />
        <Route path="/parcours" element={<CareerPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return screen.findByRole('heading', { name: 'Mon parcours', level: 2 })
}

const section = (name) => screen.getByRole('region', { name })

describe('CareerPage (US-25)', () => {
  it('CA-01 : parcours vide — quatre rubriques dans l’ordre, messages d’accueil et boutons « Ajouter »', async () => {
    await renderPage()

    const titles = screen.getAllByRole('region').map((region) => within(region).getByRole('heading', { level: 3 }).textContent)
    expect(titles).toEqual(Object.values(LABELS))

    expect(within(section('Diplômes et certifications')).getByText(/Ajoutez vos diplômes et certifications/)).toBeInTheDocument()
    expect(within(section('Formations suivies')).getByText(/Ajoutez les formations que vous avez suivies/)).toBeInTheDocument()
    expect(within(section('Expériences professionnelles')).getByText(/Ajoutez les postes que vous avez occupés/)).toBeInTheDocument()
    expect(within(section('Compétences')).getByText(/Ajoutez vos compétences/)).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Ajouter : Diplômes et certifications' })).toHaveAttribute('href', '/parcours/ajouter/diplomes')
    expect(screen.getByRole('link', { name: 'Ajouter : Formations suivies' })).toHaveAttribute('href', '/parcours/ajouter/formations')
    expect(screen.getByRole('link', { name: 'Ajouter : Expériences professionnelles' })).toHaveAttribute('href', '/parcours/ajouter/experiences')
    expect(screen.getByRole('link', { name: 'Ajouter : Compétences' })).toHaveAttribute('href', '/parcours/ajouter/competences')
  })

  it('CA-01 (D-17) : la mention de visibilité est affichée en haut de la page', async () => {
    await renderPage()

    expect(VISIBILITY_NOTICE).toBe(
      'Votre parcours est visible par l’administration d’ACME SA, qui peut vous contacter pour des opportunités internes.',
    )
    expect(screen.getByText(VISIBILITY_NOTICE)).toBeInTheDocument()
  })

  it('CA-02 : les éléments sont affichés dans l’ordre de l’API, avec le nombre d’éléments par rubrique', async () => {
    await renderPage(
      career({
        EXPERIENCE: [
          entry('e2', 'EXPERIENCE', { title: 'Agent de crédit', organization: 'ACME SA', start_month: '2020-01' }),
          entry('e1', 'EXPERIENCE', {
            title: 'Caissier', organization: 'Banque XYZ', location: 'Cap-Haïtien', start_month: '2016-01', end_month: '2019-12',
          }),
        ],
        QUALIFICATION: [
          entry('q1', 'QUALIFICATION', {
            qualification_type: 'DIPLOME', qualification_type_label: 'Diplôme', title: 'Licence en sciences comptables',
            organization: 'Université d’État d’Haïti', start_month: '2021-06',
          }),
        ],
      }),
    )

    const experiences = section('Expériences professionnelles')
    const items = within(experiences).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByRole('heading', { level: 4 }).textContent)).toEqual(['Agent de crédit', 'Caissier'])
    expect(within(experiences).getByText('2 éléments')).toBeInTheDocument()
    expect(within(section('Diplômes et certifications')).getByText('1 élément')).toBeInTheDocument()
    expect(within(section('Formations suivies')).getByText('0 élément')).toBeInTheDocument()
  })

  it('CA-02 : détail de chaque rubrique (type, organisme, mois en toutes lettres, en cours, niveau)', async () => {
    await renderPage(
      career({
        QUALIFICATION: [
          entry('q1', 'QUALIFICATION', {
            qualification_type: 'DIPLOME', qualification_type_label: 'Diplôme', title: 'Licence',
            organization: 'Université d’État d’Haïti', start_month: '2021-06',
          }),
          entry('q2', 'QUALIFICATION', {
            qualification_type: 'CERTIFICATION', qualification_type_label: 'Certification', title: 'Certification AML',
            organization: 'ACAMS', start_month: '2024-03', end_month: '2027-03',
          }),
        ],
        TRAINING: [
          entry('t1', 'TRAINING', {
            title: 'Crédit aux PME', organization: 'ACME SA (interne)', start_month: '2025-03', end_month: '2025-04', duration_hours: 24,
          }),
          entry('t2', 'TRAINING', { title: 'Anglais des affaires', organization: 'Institut', start_month: '2025-09' }),
        ],
        EXPERIENCE: [
          entry('e1', 'EXPERIENCE', { title: 'Agent de crédit', organization: 'ACME SA', start_month: '2020-01' }),
        ],
        SKILL: [
          entry('s1', 'SKILL', { title: 'Analyse de crédit', skill_level: 'EXPERT', skill_level_label: 'Expert' }),
        ],
      }),
    )

    const qualifications = section('Diplômes et certifications')
    expect(within(qualifications).getByText('Diplôme · Université d’État d’Haïti · juin 2021')).toBeInTheDocument()
    expect(within(qualifications).getByText('Certification · ACAMS · mars 2024')).toBeInTheDocument()
    expect(within(qualifications).getByText('expire en mars 2027')).toBeInTheDocument()

    const trainings = section('Formations suivies')
    expect(within(trainings).getByText('ACME SA (interne) · mars 2025 → avril 2025 · 24 h')).toBeInTheDocument()
    expect(within(trainings).getByText('Institut · depuis septembre 2025 · en cours')).toBeInTheDocument()

    expect(within(section('Expériences professionnelles')).getByText('ACME SA · depuis janvier 2020 · poste actuel')).toBeInTheDocument()

    expect(within(section('Compétences')).getByText('Analyse de crédit')).toBeInTheDocument()
    expect(within(section('Compétences')).getByText('Expert')).toBeInTheDocument()
  })

  it('une rubrique pleine (30 / 30) désactive « Ajouter » avec le message de limite', async () => {
    const skills = Array.from({ length: 2 }, (_, index) =>
      entry(`s${index}`, 'SKILL', { title: `Compétence ${index}`, skill_level: 'GOOD', skill_level_label: 'Bon niveau' }),
    )
    await renderPage(career({ SKILL: skills }, { limit: 2 }))

    const skillSection = section('Compétences')
    expect(within(skillSection).queryByRole('link', { name: /Ajouter/ })).not.toBeInTheDocument()
    expect(within(skillSection).getByRole('button', { name: 'Ajouter : Compétences' })).toBeDisabled()
    expect(within(skillSection).getByText('Nombre maximum d’éléments atteint pour cette rubrique (2).')).toBeInTheDocument()
  })

  it('le retour mène au profil', async () => {
    await renderPage()

    await userEvent.setup().click(within(screen.getByRole('main')).getByRole('link', { name: 'Mon profil' }))
    expect(await screen.findByText('Écran profil')).toBeInTheDocument()
  })

  it('sans session, retour à l’identification', async () => {
    getMyCareer.mockRejectedValue(new ApiError(401, 'UNAUTHORIZED', 'Votre session a expiré. Reconnectez-vous.'))
    render(
      <MemoryRouter initialEntries={['/parcours']}>
        <Routes>
          <Route path="/connexion" element={<IdentifyProbe />} />
          <Route path="/parcours" element={<CareerPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Écran identification : Votre session a expiré. Reconnectez-vous.')).toBeInTheDocument()
  })

  it('une erreur de chargement est affichée', async () => {
    getMyCareer.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Le serveur est injoignable. Vérifiez votre connexion.'))
    render(
      <MemoryRouter initialEntries={['/parcours']}>
        <Routes>
          <Route path="/parcours" element={<CareerPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Le serveur est injoignable.')
  })
})
