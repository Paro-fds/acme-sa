import { listEmployees } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { AdminStatusBadge } from '../../components/StatusBadge.jsx'
import { useLoader } from '../../lib/useLoader.js'

/** US-17 (version Walking Skeleton) : liste des employés avec leur statut. */
export default function EmployeeListPage() {
  const { data, error, loading } = useLoader(() => listEmployees(), { loginPath: '/admin/connexion' })

  if (loading) return <Page account="admin" title="Employés"><p role="status">Chargement…</p></Page>
  if (error) return <Page account="admin" title="Employés"><Alert>{error.message}</Alert></Page>

  return (
    <Page account="admin" title="Employés">
      <p className="text-sm text-muted">{data.total} employés</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface shadow-card">
        {data.items.map((employee) => (
          <li key={employee.id} className="flex flex-col gap-1 p-4">
            <span className="font-semibold text-heading">
              {employee.last_name} {employee.first_name}
            </span>
            <span className="text-sm text-muted">
              {employee.employee_code} · Agence {employee.agency_code}
            </span>
            <span>
              <AdminStatusBadge status={employee.status} />
            </span>
          </li>
        ))}
      </ul>
    </Page>
  )
}
