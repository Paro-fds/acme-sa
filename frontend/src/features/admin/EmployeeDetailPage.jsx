import { Link, useLocation, useParams } from 'react-router'
import { getEmployee, listEmployeeDocuments } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import { AdminStatusBadge } from '../../components/StatusBadge.jsx'
import ValueComparison from '../../components/ValueComparison.jsx'
import { displayValue, formatDateTime, initials } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import { profileSections } from '../profile/profileSections.js'
import AdminShell from './AdminShell.jsx'
import AdminDocuments from './AdminDocuments.jsx'
import Block from './Block.jsx'
import ResetAccess from './ResetAccess.jsx'

export const DECLINED_MENTION = "L'employé a indiqué ne pas souhaiter mettre à jour son dossier"

function ReadOnlyBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-info-border bg-info-bg px-2.5 py-0.5 text-xs font-semibold text-info-text">
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">visibility</span>
      Lecture seule
    </span>
  )
}

function FolderHeader({ folder }) {
  return (
    <section aria-label="Employé" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-start sm:justify-between sm:p-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="break-words text-2xl leading-tight font-bold">
          {folder.display_name} · {folder.employee_code}
        </h1>
        {folder.previous_name && <p className="text-sm text-muted">anciennement {folder.previous_name}</p>}
        <p className="text-sm text-help">{folder.position} · Agence {folder.agency_code}</p>
        <div className="mt-2"><ReadOnlyBadge /></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusBadge status={folder.status} />
      </div>
    </section>
  )
}

function ProfileBlock({ folder }) {
  const fields = profileSections(folder).flatMap(({ fields: sectionFields }) => sectionFields)

  return (
    <section aria-label="Profil" className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <div className="border-b border-border bg-section px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold">Profil</h2>
      </div>
      <dl className="divide-y divide-border px-4 py-2 text-sm sm:px-6">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:gap-0">
            <dt className="shrink-0 font-medium text-muted sm:w-56">{label}</dt>
            <dd className={`min-w-0 break-words ${value ? 'text-heading' : 'text-muted italic'}`}>
              {displayValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Mise à jour soumise (date + « Ancienne → Nouvelle ») ou non effectuée ; jamais de brouillon. */
function UpdateBlock({ folder }) {
  if (folder.status !== 'UPDATED') {
    return (
      <Block icon="pending" title="Mise à jour">
        <p className="font-semibold text-heading">Mise à jour non effectuée</p>
        {folder.declined && <Alert tone="info">{DECLINED_MENTION}</Alert>}
      </Block>
    )
  }
  return (
    <Block icon="task_alt" title="Mise à jour">
      <p className="font-semibold text-status-done-text">Mise à jour effectuée le {formatDateTime(folder.submitted_at)}</p>
      {folder.changes.length === 0 ? (
        <p className="text-help">Aucune information modifiée : l'employé a confirmé son dossier tel quel.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-help">
            {folder.changes.length} information{folder.changes.length > 1 ? 's' : ''} modifiée{folder.changes.length > 1 ? 's' : ''}
          </p>
          {folder.changes.map((change) => (
            <ValueComparison
              key={change.field_name}
              label={change.label}
              oldValue={change.old_value}
              newValue={change.new_value}
            />
          ))}
        </div>
      )}
    </Block>
  )
}

const loadFolder = (id) => Promise.all([getEmployee(id), listEmployeeDocuments(id)])

/** US-20, US-21 : dossier d'un employé et ses documents, en lecture seule. */
export default function EmployeeDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Retour vers la liste avec la recherche et le filtre en cours (US-18 CA-11).
  const listUrl = `/admin/employes${location.state?.listSearch ?? ''}`
  const { data, error, loading, reload } = useLoader(() => loadFolder(id), {
    loginPath: '/admin/connexion',
    key: id,
  })

  const page = (children) => (
    <AdminShell>
      {children}
    </AdminShell>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error?.status === 404) {
    return page(
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-6 text-center shadow-card">
        <span className="material-symbols-outlined text-[32px] text-muted" aria-hidden="true">person_off</span>
        <h2 className="text-lg font-semibold">Employé introuvable</h2>
        <p className="text-help">Ce dossier n'existe pas ou l'employé n'est plus actif.</p>
        <Link to="/admin/employes" className="font-semibold text-primary underline">
          Retour à la liste des employés
        </Link>
      </div>,
    )
  }
  if (error) return page(<Alert>{error.message}</Alert>)

  const [folder, documents] = data
  return page(
    <>
      <div className="mb-6 flex flex-col gap-3">
        <Link
          to={listUrl}
          aria-label="Retour à la liste des employés"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
        >
          <span className="material-symbols-outlined mr-1.5 text-[18px]" aria-hidden="true">arrow_back</span>
          Employés
        </Link>
        <div className="flex items-center gap-2 rounded-md border border-border bg-section px-4 py-2.5 text-xs text-help">
          <span className="material-symbols-outlined shrink-0 text-[16px]" aria-hidden="true">visibility</span>
          <span>Consultation en lecture seule ; seules les informations d'accès peuvent être modifiées.</span>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <FolderHeader folder={folder} />
        <ProfileBlock folder={folder} />
        <UpdateBlock folder={folder} />
        <AdminDocuments documents={documents} />
        <ResetAccess
          employeeId={folder.id}
          name={folder.display_name}
          activated={folder.account_activated}
          onReset={reload}
        />
      </div>
    </>,
  )
}
