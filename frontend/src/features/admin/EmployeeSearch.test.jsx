import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import EmployeeListPage from './EmployeeListPage.jsx'
import { listEmployees } from '../../api/admin.js'

vi.mock('../../api/admin.js', () => ({ listEmployees: vi.fn() }))
vi.mock('../../api/auth.js', () => ({ adminLogout: vi.fn(), logout: vi.fn() }))

const employee = (id, last_name, first_name) => ({
  id,
  employee_code: `AC-${id}`,
  last_name,
  first_name,
  display_name: `${last_name} ${first_name}`,
  previous_name: null,
  agency_code: 'PV',
  position: 'Agent',
  status: 'NOT_UPDATED',
})

const EVERYONE = [employee('1008', 'BAPTISTE', 'Marc'), employee('1002', 'PIERRE', 'Marie'), employee('1003', 'PIERRE', 'Marie')]

/** Simule l'API : filtre très simple sur le nom. */
function fakeApi({ page = 1, search = '' }) {
  const items = EVERYONE.filter((item) => item.display_name.toLowerCase().includes(search.trim().toLowerCase()))
  return Promise.resolve({ items, total: items.length, page, page_size: 20, page_count: 1 })
}

function LocationProbe() {
  const { search } = useLocation()
  return <output aria-label="adresse">{search}</output>
}

function FolderProbe() {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(-1)}>
      Retour depuis le dossier
    </button>
  )
}

function renderAt(path = '/admin/employes') {
  render(
    <MemoryRouter initialEntries={['/admin', path]} initialIndex={1}>
      <Routes>
        <Route path="/admin" element={<Link to="/admin/employes">Tableau de bord</Link>} />
        <Route
          path="/admin/employes"
          element={
            <>
              <EmployeeListPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/admin/employes/:id" element={<FolderProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

const searchBox = () => screen.getByRole('searchbox', { name: 'Rechercher un employé' })
const cardNames = () =>
  within(screen.getByRole('list', { name: 'Employés' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.font-semibold').textContent)

describe('EmployeeSearch (US-18)', () => {
  let user

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    listEmployees.mockReset()
    listEmployees.mockImplementation(fakeApi)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('barre de recherche : placeholder, touche « Rechercher » du clavier', async () => {
    renderAt()
    await screen.findByText('3 employés')

    expect(searchBox()).toHaveAttribute('placeholder', 'Rechercher par nom, prénom ou matricule…')
    expect(searchBox()).toHaveAttribute('enterkeyhint', 'search')
    expect(screen.getByRole('search')).toHaveClass('sticky')
  })

  it('la recherche part 300 ms après la dernière frappe, pas avant', async () => {
    renderAt()
    await screen.findByText('3 employés')
    listEmployees.mockClear()

    await user.type(searchBox(), 'pierre')
    act(() => vi.advanceTimersByTime(200))
    expect(listEmployees).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(100))
    expect(await screen.findByText('2 employés')).toBeInTheDocument()
    expect(listEmployees).toHaveBeenCalledTimes(1)
    expect(listEmployees).toHaveBeenCalledWith({ page: 1, search: 'pierre', status: '' })
    expect(cardNames()).toEqual(['PIERRE Marie', 'PIERRE Marie'])
  })

  it('le terme est conservé dans l’adresse et la page revient à 1', async () => {
    renderAt('/admin/employes?page=2&status=NOT_UPDATED')
    await screen.findByText(/employés?$/)

    await user.type(searchBox(), 'pierre')
    act(() => vi.advanceTimersByTime(300))

    await vi.waitFor(() => expect(screen.getByLabelText('adresse')).toHaveTextContent('?status=NOT_UPDATED&search=pierre'))
  })

  it('CA-07 : aucun résultat → message et « Effacer la recherche » ; CA-08 : la liste complète revient', async () => {
    renderAt()
    await screen.findByText('3 employés')

    await user.type(searchBox(), 'zzz')
    act(() => vi.advanceTimersByTime(300))

    expect(await screen.findByText('Aucun employé ne correspond à votre recherche.')).toBeInTheDocument()
    expect(screen.queryByText(/0 employé/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }))

    expect(await screen.findByText('3 employés')).toBeInTheDocument()
    expect(searchBox()).toHaveValue('')
    expect(screen.getByLabelText('adresse')).toHaveTextContent(/^$/)
  })

  it('CA-08 : le bouton « effacer » du champ vide la recherche immédiatement', async () => {
    renderAt('/admin/employes?search=pierre')
    expect(await screen.findByText('2 employés')).toBeInTheDocument()
    expect(searchBox()).toHaveValue('pierre')

    await user.click(screen.getByRole('button', { name: 'Effacer' }))

    expect(await screen.findByText('3 employés')).toBeInTheDocument()
    expect(searchBox()).toHaveValue('')
    expect(searchBox()).toHaveFocus()
  })

  it('CA-08 : vider le champ au clavier fait réapparaître la liste complète', async () => {
    renderAt('/admin/employes?search=pierre')
    await screen.findByText('2 employés')

    await user.clear(searchBox())
    act(() => vi.advanceTimersByTime(300))

    expect(await screen.findByText('3 employés')).toBeInTheDocument()
  })

  it('Entrée lance la recherche sans attendre', async () => {
    renderAt()
    await screen.findByText('3 employés')

    await user.type(searchBox(), 'baptiste{Enter}')

    expect(await screen.findByText('1 employé')).toBeInTheDocument()
  })

  it('CA-11 : retour depuis un dossier → même recherche et mêmes résultats', async () => {
    renderAt()
    await screen.findByText('3 employés')
    await user.type(searchBox(), 'pierre')
    act(() => vi.advanceTimersByTime(300))
    await screen.findByText('2 employés')

    await user.click(within(screen.getByRole('list', { name: 'Employés' })).getAllByRole('link')[0])
    await user.click(await screen.findByRole('button', { name: 'Retour depuis le dossier' }))

    expect(await screen.findByText('2 employés')).toBeInTheDocument()
    expect(searchBox()).toHaveValue('pierre')
    expect(screen.getByLabelText('adresse')).toHaveTextContent('?search=pierre')
  })

  it('les frappes successives ne créent pas d’entrées d’historique (retour arrière = écran précédent)', async () => {
    renderAt()
    await screen.findByText('3 employés')
    await user.type(searchBox(), 'pi')
    act(() => vi.advanceTimersByTime(300))
    await user.type(searchBox(), 'erre')
    act(() => vi.advanceTimersByTime(300))
    await screen.findByText('2 employés')

    // Un seul retour suffit à revenir au tableau de bord.
    await user.click(screen.getByRole('button', { name: 'Retour' }))

    expect(await screen.findByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument()
  })
})
