import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../api/client.js'
import { getReferential, importReferential } from '../../../api/referential.js'
import ReferentialPage from './ReferentialPage.jsx'

vi.mock('../../../api/referential.js', () => ({ getReferential: vi.fn(), importReferential: vi.fn() }))
vi.mock('../../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const unit = (code, label, type, typeLabel, parent = null, extra = {}) => ({
  code,
  label,
  type,
  type_label: typeLabel,
  parent_code: parent,
  parent_label: null,
  since: parent ? '2026-01-01' : null,
  former_labels: [],
  history: parent ? [{ parent_code: parent, start: '2026-01-01', end: null }] : [],
  ...extra,
})

const REFERENTIAL = {
  units: [
    unit('PV', 'Agence Démo Nord', 'AGENCE', 'Agence', 'RD1', { former_labels: ['Succursale Nord'] }),
    unit('DM', 'Agence Démo Sud', 'AGENCE', 'Agence', 'RD1', {
      since: '2026-11-01',
      history: [
        { parent_code: 'RD2', start: '2026-01-01', end: '2026-11-01' },
        { parent_code: 'RD1', start: '2026-11-01', end: null },
      ],
    }),
    unit('RD1', 'Région Démo 1', 'REGION', 'Région'),
    unit('DOP', 'Direction des Opérations (démo)', 'DIRECTION', 'Direction'),
  ],
  mappings: [
    { column: 'agency_code', value: 'PV', unit_code: 'PV' },
    { column: 'agency_code', value: 'PB', unit_code: null },
  ],
  to_attach: [
    { column: 'agency_code', value: 'PB', employees: 3 },
    { column: 'department', value: 'Direction Opération', employees: 1 },
  ],
}
const XLSX = new File(['x'], 'referentiel.xlsx', {
  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/admin/referentiel']}>
      <Routes>
        <Route path="/admin/referentiel" element={<ReferentialPage />} />
        <Route path="/admin/connexion" element={<p>Connexion RH</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  getReferential.mockResolvedValue(REFERENTIAL)
})

describe('ReferentialPage (US-501)', () => {
  it('chaque région avec ses agences, leur code, leur date de rattachement et leurs anciens libellés', async () => {
    renderPage()

    const region = await screen.findByRole('region', { name: 'Région Démo 1' })
    expect(within(region).getByText('Agence Démo Nord')).toBeInTheDocument()
    expect(within(region).getByText('PV')).toBeInTheDocument()
    expect(within(region).getByText('Ancien libellé : Succursale Nord')).toBeInTheDocument()
    expect(within(region).getByText("Rattachée depuis le 01/11/2026 ; avant : RD2 jusqu'au 01/11/2026")).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '4 unités' })).toBeInTheDocument()
  })

  it('référentiel vide : invite à importer le fichier', async () => {
    getReferential.mockResolvedValue({ units: [], mappings: [], to_attach: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Aucune unité : importez le fichier du référentiel.' })).toBeInTheDocument()
  })

  it('CA-01 : import d’un fichier cohérent → résumé, puis le référentiel est rechargé', async () => {
    importReferential.mockResolvedValue({
      counts: { Agence: 3, Région: 2 },
      added: 5,
      renamed: ['PV : Pétion-Ville → Agence de Pétion-Ville'],
      moved: [],
      mappings: 4,
      unmapped: 1,
    })
    const user = userEvent.setup()
    renderPage()

    const submit = await screen.findByRole('button', { name: 'Importer' })
    expect(submit).toBeDisabled()
    await user.upload(screen.getByLabelText('Classeur Excel (.xlsx)'), XLSX)
    await user.click(submit)

    expect(importReferential).toHaveBeenCalledWith(XLSX)
    const summary = await screen.findByText('Référentiel importé : 3 agences, 2 régions.')
    expect(summary.closest('[role="status"]')).toHaveTextContent('Renommée : PV : Pétion-Ville → Agence de Pétion-Ville')
    expect(getReferential).toHaveBeenCalledTimes(2)
  })

  it('CA-01 : fichier incohérent → chaque problème avec son onglet et sa ligne, rien d’importé', async () => {
    importReferential.mockRejectedValue(
      new ApiError(422, 'REFERENTIAL_REJECTED', "Le fichier n'a pas été importé : corrigez ces points puis importez-le à nouveau.", null, {
        problems: [
          { sheet: 'Unités', line: 6, message: 'Agence sans région : DM.' },
          { sheet: 'Unités', line: 9, message: 'Code en double : PV (déjà à la ligne 4).' },
        ],
      }),
    )
    const user = userEvent.setup()
    renderPage()

    await user.upload(await screen.findByLabelText('Classeur Excel (.xlsx)'), XLSX)
    await user.click(screen.getByRole('button', { name: 'Importer' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Le fichier n'a pas été importé")
    expect(within(alert).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Unités, ligne 6 : Agence sans région : DM.',
      'Unités, ligne 9 : Code en double : PV (déjà à la ligne 4).',
    ])
    expect(getReferential).toHaveBeenCalledTimes(1)
  })

  it('le format attendu des deux onglets est expliqué', async () => {
    renderPage()

    expect(await screen.findByText('Onglet « Unités »')).toBeInTheDocument()
    expect(screen.getByText('Onglet « Correspondances »')).toBeInTheDocument()
  })
})

describe('ReferentialPage — À rattacher (US-502)', () => {
  it('CA-01 : chaque valeur sans unité, avec le nombre d’employés concernés', async () => {
    renderPage()

    const block = await screen.findByRole('region', { name: 'À rattacher' })
    const rows = within(block).getAllByRole('listitem').map((item) => item.textContent)
    expect(rows).toEqual([
      expect.stringMatching(/PB.*Agence.*3 employés/),
      expect.stringMatching(/Direction Opération.*Direction ou service.*1 employé$/),
    ])
    expect(block).toHaveTextContent('Ces employés voient « Unité à confirmer »')
  })

  it('CA-03 : rien à rattacher, un message le dit', async () => {
    getReferential.mockResolvedValue({ ...REFERENTIAL, to_attach: [] })
    renderPage()

    expect(await within(await screen.findByRole('region', { name: 'À rattacher' })).findByText(
      "Toutes les valeurs de l'export sont rattachées à une unité officielle.",
    )).toBeInTheDocument()
  })
})
