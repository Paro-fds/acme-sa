import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import ProfilePage from './ProfilePage.jsx'
import { getProfile } from '../../api/employee.js'
import { confirmHrInformation, getDossier, getFreshness, reportHrError } from '../../api/dossier.js'
import { ApiError } from '../../api/client.js'
import { dossierFixture, NO_CONSENT } from '../dossier/testData.js'

vi.mock('../../api/employee.js', () => ({ getProfile: vi.fn() }))
vi.mock('../../api/dossier.js', () => ({
  getDossier: vi.fn(),
  getFreshness: vi.fn(),
  confirmHrInformation: vi.fn(),
  reportHrError: vi.fn(),
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
  affectation: { agency: 'Pétion-Ville', region: 'Métropole 1', direction: 'Direction du Crédit' },
  position: 'Agent de crédit',
  grade: '12',
  level: '2',
  contract_nature: 'CDI',
  hire_date: '2019-06-03',
  editable_fields: ['telephone_number', 'email_address', 'address_line_1'],
  completion: { percent: 25, complete: 2, total: 8, is_complete: false, elements: [] },
}

/** Coordonnées complètes (partie 1), contact et études vides (partie 2), agence confirmée (partie 3). */
const DOSSIER = dossierFixture({
  telephone: { value: '+509 3722 1111', complete: true, confirmed_at: '2026-10-08T09:00:00Z' },
  address: { value: '12 rue Capois, Port-au-Prince', complete: true, confirmed_at: '2026-10-08T09:00:00Z' },
  email: { value: null, no_email: true, complete: true, confirmed_at: '2026-10-08T09:00:00Z' },
  completion: { percent: 50, complete: 4, total: 8 },
})

const FRESHNESS = {
  items: [
    { key: 'telephone', label: 'Téléphone', value: '+509 3722 1111', confirmed_at: '2026-10-08T09:00:00Z', expires_on: '2027-10-08', reminder_on: '2027-09-08', state: 'FRESH' },
    { key: 'agency_confirmed', label: 'Agence', value: 'Agence Démo', confirmed_at: '2026-10-09T09:00:00Z', expires_on: '2027-10-09', reminder_on: '2027-09-09', state: 'FRESH' },
  ],
  stale_count: 0,
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
      </Routes>
    </MemoryRouter>,
  )
}

async function renderProfile(overrides = {}) {
  getProfile.mockResolvedValue({ ...PROFILE, ...overrides })
  renderPage()
  await screen.findByRole('heading', { name: 'Mon dossier', level: 2 })
}

/** Ligne « libellé / valeur » d'une section du détail. */
function field(sectionName, label) {
  const section = screen.getByRole('region', { name: sectionName })
  return within(section).getByText(label, { selector: 'dt' }).closest('div')
}

const part3 = () => screen.getByRole('region', { name: 'Mes informations RH' })
const hrRow = (label) => within(part3()).getByText(label).closest('li')

beforeEach(() => {
  vi.clearAllMocks()
  getDossier.mockResolvedValue(DOSSIER)
  getFreshness.mockResolvedValue(FRESHNESS)
})

describe('US-129 CA-01 — en-tête de la refonte', () => {
  it('titre, phrase d’accroche et bandeau illustré, sans emoji', async () => {
    await renderProfile()

    expect(
      screen.getByText(
        'Vos informations personnelles et votre situation chez ACME. Vérifiez-les une fois par an : les RH s’en servent pour vous proposer des postes.',
      ),
    ).toBeVisible()
    expect(screen.getByText('Un dossier à jour, ce sont des postes qui vous correspondent.')).toBeVisible()
    expect(document.body.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('US-129 CA-02 — progression', () => {
  it('dossier incomplet : le pourcentage, ce qui est saisi et ce qu’il reste à faire', async () => {
    await renderProfile()

    const progress = screen.getByRole('region', { name: 'Progression du dossier' })
    expect(progress).not.toHaveTextContent(/Votre dossier est complet|%/)
    expect(within(progress).getByRole('progressbar', { name: 'Progression du dossier' })).toHaveAttribute('aria-valuenow', '50')
    expect(progress).toHaveTextContent('4 informations sur 8 saisies ou confirmées. Complétez-le pour déposer des certificats et postuler.')
    expect(progress).toHaveTextContent('Dernière confirmation le 9 octobre 2026 · prochaine avant le 8 octobre 2027')
  })

  it('US-136 CA-07 : dossier complet, la carte de progression disparaît', async () => {
    getDossier.mockResolvedValue({ ...DOSSIER, completion: { percent: 100, complete: 8, total: 8 } })
    await renderProfile()

    expect(screen.queryByRole('region', { name: 'Progression du dossier' })).not.toBeInTheDocument()
    expect(screen.queryByText(/8 informations sur 8|Dernière confirmation|Votre dossier est complet|100 %/)).not.toBeInTheDocument()
  })

  it('rien de confirmé : pas de ligne de confirmation', async () => {
    getFreshness.mockResolvedValue({ items: [], stale_count: 0 })
    await renderProfile()

    expect(screen.queryByText(/Dernière confirmation/)).not.toBeInTheDocument()
  })
})

describe('US-129 CA-03 — les parties 1 et 2', () => {
  it('chaque partie mène à sa page, avec son état', async () => {
    await renderProfile()

    const parts = screen.getByRole('region', { name: 'Mes informations, en 3 parties' })
    const coordinates = within(parts).getByRole('link', { name: /Partie 1 sur 3.*Mes coordonnées/ })
    expect(coordinates).toHaveAttribute('href', '/profil/coordonnees')
    expect(coordinates).toHaveTextContent('Complet')
    const contact = within(parts).getByRole('link', { name: /Partie 2 sur 3.*Contact d’urgence et études/ })
    expect(contact).toHaveAttribute('href', '/profil/contact-etudes')
    expect(contact).toHaveTextContent('À compléter')
  })
})

describe('US-129 CA-04 — la partie 3 dans la page', () => {
  it('chaque information avec sa valeur et son état ; les boutons seulement pour ce qui reste à confirmer', async () => {
    await renderProfile()

    expect(within(part3()).getByText('Partie 3 sur 3')).toBeVisible()
    expect(within(part3()).getByRole('link', { name: /Ouvrir la partie 3/ })).toHaveAttribute('href', '/profil/informations-rh')
    expect(hrRow("Agence d'affectation")).toHaveTextContent('Agence Démo')
    expect(hrRow("Agence d'affectation")).toHaveTextContent('Confirmé le 06/10/2026')
    expect(within(hrRow("Agence d'affectation")).queryByRole('button')).not.toBeInTheDocument()
    expect(within(hrRow('Poste actuel')).getByRole('button', { name: /C'est exact/ })).toBeVisible()
    expect(within(hrRow('Poste actuel')).getByRole('button', { name: 'Signaler une erreur' })).toBeVisible()
  })

  it('« C’est exact » confirme sans changer de page et met la progression à jour', async () => {
    const user = userEvent.setup()
    const confirmed = dossierFixture({
      ...DOSSIER,
      completion: { percent: 62, complete: 5, total: 8 },
      hr_information: DOSSIER.hr_information.map((item) =>
        item.key === 'position_confirmed' ? { ...item, status: 'CONFIRMED', answered_at: '2026-10-19T09:00:00Z' } : item,
      ),
    })
    confirmHrInformation.mockResolvedValue(confirmed)
    await renderProfile()

    await user.click(within(hrRow('Poste actuel')).getByRole('button', { name: /C'est exact/ }))

    expect(confirmHrInformation).toHaveBeenCalledWith('position_confirmed')
    expect(await within(hrRow('Poste actuel')).findByText('Confirmé le 19/10/2026')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Progression du dossier' })).toHaveAttribute('aria-valuenow', '62')
    expect(getFreshness).toHaveBeenCalledTimes(2)
  })

  it('« Signaler une erreur » ouvre le formulaire et envoie la bonne information', async () => {
    const user = userEvent.setup()
    const reported = dossierFixture({
      ...DOSSIER,
      hr_information: DOSSIER.hr_information.map((item) =>
        item.key === 'hire_date_confirmed' ? { ...item, status: 'REPORTED', answered_at: '2026-10-19T09:00:00Z' } : item,
      ),
    })
    reportHrError.mockResolvedValue(reported)
    await renderProfile()

    await user.click(within(hrRow("Date d'embauche")).getByRole('button', { name: 'Signaler une erreur' }))
    await user.type(within(hrRow("Date d'embauche")).getByLabelText('Quelle est la bonne information ?'), '12/03/2017')
    await user.click(within(hrRow("Date d'embauche")).getByRole('button', { name: 'Envoyer aux RH' }))

    expect(reportHrError).toHaveBeenCalledWith('hire_date_confirmed', { correct_value: '12/03/2017', comment: '' })
    expect(await within(hrRow("Date d'embauche")).findByText('Signalé aux RH le 19/10/2026')).toBeVisible()
  })

  it('une erreur de champ s’affiche près du champ', async () => {
    const user = userEvent.setup()
    reportHrError.mockRejectedValue(new ApiError(422, 'VALIDATION_ERROR', 'Indiquez la bonne information.', 'correct_value'))
    await renderProfile()

    await user.click(within(hrRow('Poste actuel')).getByRole('button', { name: 'Signaler une erreur' }))
    await user.click(within(hrRow('Poste actuel')).getByRole('button', { name: 'Envoyer aux RH' }))

    expect(await within(hrRow('Poste actuel')).findByText('Indiquez la bonne information.')).toBeVisible()
  })
})

describe('US-129 CA-05 — identité et protection des données', () => {
  it('l’identité en lecture seule, sans photo : les initiales', async () => {
    await renderProfile({ photo_url: null })

    const identity = screen.getByRole('region', { name: 'Jean JOSEPH' })
    expect(identity).toHaveTextContent('Matricule AC-1001')
    expect(identity).toHaveTextContent('Date de naissance15/03/1996')
    expect(identity).toHaveTextContent('SexeMasculin')
    expect(identity).toHaveTextContent('Non modifiable : une erreur ? Signalez-la aux RH.')
    expect(within(identity).getByText('JJ')).toBeInTheDocument()
    expect(within(identity).queryByText('Photo officielle')).not.toBeInTheDocument()
  })

  it('photo officielle : l’image et la mention « Photo officielle »', async () => {
    await renderProfile({ photo_url: '/photos/AC-1001.jpg' })

    const identity = screen.getByRole('region', { name: 'Jean JOSEPH' })
    expect(within(identity).getByRole('img', { name: /^Photo de / })).toHaveAttribute('src', '/photos/AC-1001.jpg')
    expect(within(identity).getByText('Photo officielle')).toBeInTheDocument()
  })

  it('pourquoi ces données et qui y a accès', async () => {
    await renderProfile()

    const why = screen.getByRole('region', { name: 'Pourquoi nous collectons ces données ?' })
    expect(why).toHaveTextContent('Pour vous joindre, vous prévenir d’un poste ouvert et tenir votre dossier RH à jour.')
    expect(why).toHaveTextContent('Qui y a accès ?')
    expect(why).toHaveTextContent('Le service RH seulement. Chaque consultation est enregistrée.')
  })

  it('sur ordinateur, l’identité et l’aide sont dans la colonne de droite', async () => {
    const { setDesktop } = await import('../../lib/testViewport.js')
    setDesktop(true)
    try {
      await renderProfile()
      const side = screen.getByRole('complementary', { name: 'Identité et aide' })
      expect(within(side).getByRole('region', { name: 'Jean JOSEPH' })).toBeInTheDocument()
      expect(within(side).getByRole('region', { name: 'Pourquoi nous collectons ces données ?' })).toBeInTheDocument()
    } finally {
      setDesktop(false)
    }
  })
})

describe('US-129 CA-06 — le détail complet, replié en bas', () => {
  it('replié sous « Voir tout le détail de mon dossier », il s’ouvre d’un clic', async () => {
    const user = userEvent.setup()
    await renderProfile()

    const summary = screen.getByText('Voir tout le détail de mon dossier')
    expect(summary.closest('details')).not.toHaveAttribute('open')
    await user.click(summary)
    expect(screen.getByRole('region', { name: 'Informations professionnelles' })).toBeVisible()
  })

  it('les informations sont regroupées dans les trois sections', async () => {
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

  it('les dates au format JJ/MM/AAAA, le sexe en toutes lettres, « Non renseigné » pour un champ vide', async () => {
    await renderProfile({ email_address: '' })

    expect(field('Identité', 'Date de naissance')).toHaveTextContent('15/03/1996')
    expect(field('Informations professionnelles', "Date d'embauche")).toHaveTextContent('03/06/2019')
    expect(field('Identité', 'Sexe')).toHaveTextContent('Masculin')
    expect(field('Coordonnées', 'Email')).toHaveTextContent('Non renseigné')
  })

  it('les champs modifiables sont signalés, les autres portent un cadenas', async () => {
    await renderProfile()

    expect(within(field('Coordonnées', 'Email')).getByText('Modifiable')).toBeInTheDocument()
    expect(within(field('Identité', 'Nom')).getByLabelText('Non modifiable')).toBeInTheDocument()
    expect(within(field('Informations professionnelles', 'Poste')).getByLabelText('Non modifiable')).toBeInTheDocument()
  })

  it('US-201 : libellés officiels de l’affectation ; agence inconnue : « Unité à confirmer »', async () => {
    await renderProfile({ affectation: { agency: null, region: null, direction: 'Direction du Crédit' } })

    const section = screen.getByRole('region', { name: 'Informations professionnelles' })
    expect(within(section).getAllByText('Unité à confirmer')).toHaveLength(2)
    expect(within(section).getByText('Direction du Crédit')).toBeInTheDocument()
  })
})

describe('US-129 CA-07 — sans consentement', () => {
  it('la partie 3 montre ses valeurs sans boutons, avec le lien vers sa page', async () => {
    getDossier.mockResolvedValue({ ...DOSSIER, consent: NO_CONSENT })
    await renderProfile()

    expect(hrRow('Poste actuel')).toHaveTextContent('Chargée de crédit')
    expect(within(part3()).queryByRole('button')).not.toBeInTheDocument()
    expect(within(part3()).getByRole('link', { name: /Ouvrir la partie 3/ })).toHaveAttribute('href', '/profil/informations-rh')
  })
})

describe('Mon dossier — ce qui ne change pas', () => {
  it('US-206, US-114 : ni ancienne mise à jour, ni « Mes documents », ni « Mon parcours », ni carte « Mes certificats »', async () => {
    await renderProfile()

    expect(screen.queryByRole('button', { name: /mettre à jour mon dossier/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Mes documents|Mon parcours/ })).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('link', { name: /Mes certificats/ })).not.toBeInTheDocument()
  })

  it('sans session, retour à l’identification', async () => {
    getProfile.mockRejectedValue(new ApiError(401, 'NOT_AUTHENTICATED', 'Vous devez être connecté.'))
    renderPage()

    expect(await screen.findByText('Écran identification : Vous devez être connecté.')).toBeInTheDocument()
  })

  it('un message si l’API ne renvoie rien', async () => {
    getProfile.mockResolvedValue(null)
    renderPage()

    expect(await screen.findByText('Impossible de charger le profil.')).toBeInTheDocument()
  })
})
