import { useId } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { getEmployee } from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import { AdminStatusBadge } from '../../components/StatusBadge.jsx'
import ValueComparison from '../../components/ValueComparison.jsx'
import { formatDateTime, initials } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import InfoSection from '../profile/InfoSection.jsx'
import { profileSections } from '../profile/profileSections.js'

export const DECLINED_MENTION = "L'employé a indiqué ne pas souhaiter mettre à jour son dossier"

function Block({ icon, title, children }) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-info-text" aria-hidden="true">{icon}</span>
        <h3 id={titleId} className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  )
}

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
    <section aria-label="Employé" className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4 shadow-card">
      <span
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white"
        aria-hidden="true"
      >
        {initials(folder.last_name, folder.first_name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <ReadOnlyBadge />
        <h2 className="text-[22px] leading-7 font-bold break-words">{folder.display_name}</h2>
        {folder.previous_name && <p className="text-sm text-muted">anciennement {folder.previous_name}</p>}
        <p className="text-sm text-help">
          {folder.employee_code} · Agence {folder.agency_code} · {folder.position}
        </p>
        <AdminStatusBadge status={folder.status} />
      </div>
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

function AccessBlock({ activated }) {
  return (
    <Block icon="key" title="Accès">
      <p className="flex items-center gap-2 text-heading">
        <span
          className={`material-symbols-outlined text-[20px] ${activated ? 'text-status-done-text' : 'text-muted'}`}
          aria-hidden="true"
        >
          {activated ? 'verified_user' : 'no_accounts'}
        </span>
        {activated ? 'Compte activé' : 'Compte non activé'}
      </p>
      <p className="text-sm text-help">
        {activated ? "L'employé a créé son mot de passe." : "L'employé n'a pas encore créé de mot de passe."}
      </p>
    </Block>
  )
}

/** US-20 : dossier d'un employé, en lecture seule. */
export default function EmployeeDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Retour vers la liste avec la recherche et le filtre en cours (US-18 CA-11).
  const listUrl = `/admin/employes${location.state?.listSearch ?? ''}`
  const { data: folder, error, loading } = useLoader(() => getEmployee(id), {
    loginPath: '/admin/connexion',
    key: id,
  })

  const page = (children) => (
    <Page account="admin" title="Dossier" backTo={listUrl}>
      {children}
    </Page>
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

  return page(
    <>
      <FolderHeader folder={folder} />
      <UpdateBlock folder={folder} />
      {profileSections(folder).map(({ icon, title, fields }) => (
        <InfoSection key={title} icon={icon} title={title} fields={fields} showEditable={false} />
      ))}
      <AccessBlock activated={folder.account_activated} />
    </>,
  )
}
