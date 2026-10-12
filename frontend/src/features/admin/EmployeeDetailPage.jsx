import { Link, useLocation, useParams } from 'react-router'
import * as adminApi from '../../api/admin.js'
import Alert from '../../components/Alert.jsx'
import Page from '../../components/Page.jsx'
import ValueComparison from '../../components/ValueComparison.jsx'
import { formatDateTime, formatLocalDate } from '../../lib/format.js'
import { useLoader } from '../../lib/useLoader.js'
import AdminCertificatesBlock from './AdminCertificatesBlock.jsx'
import AdminDocuments from './AdminDocuments.jsx'
import Block from './Block.jsx'
import ResetAccess from './ResetAccess.jsx'
import { can } from './roles.js'

export const DECLINED_MENTION = "L'employé a indiqué ne pas souhaiter mettre à jour son dossier"

const FOLDER_STATUS = {
  FOLDER_COMPLETE: { label: 'Dossier complet', tone: 'border-status-done-border bg-status-done-bg text-status-done-text' },
  PROFILE_COMPLETE: { label: 'Profil complet', tone: 'border-info-border bg-info-bg text-info-text' },
  INCOMPLETE: { label: 'Profil incomplet', tone: 'border-status-progress-border bg-status-progress-bg text-status-progress-text' },
}

/** Écran A02 : « Dossier complet : profil complet et au moins un certificat validé. » */
function folderStatus(dossier, certificates) {
  if (dossier.completion.percent < 100) return FOLDER_STATUS.INCOMPLETE
  const validated = certificates.some((cert) => cert.status === 'VALIDATED' && !cert.is_archived)
  return validated ? FOLDER_STATUS.FOLDER_COMPLETE : FOLDER_STATUS.PROFILE_COMPLETE
}

const hrItem = (dossier, key) => dossier.hr_information.find((item) => item.key === key)
const labelOf = (choices, value) => choices.find((choice) => choice.value === value)?.label ?? value

function FolderHeader({ folder, dossier, certificates }) {
  const status = folderStatus(dossier, certificates)
  return (
    <section
      aria-label="Employé"
      className="flex flex-col gap-4 rounded-lg border border-rh-line bg-surface p-4 shadow-card sm:flex-row sm:items-start sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl leading-tight font-bold break-words text-rh-strong">
          {folder.display_name} · {folder.employee_code}
        </h1>
        {folder.previous_name && <p className="text-sm text-rh-muted">anciennement {folder.previous_name}</p>}
        <p className="text-sm text-rh-text">
          {hrItem(dossier, 'position_confirmed')?.value || folder.position} · {hrItem(dossier, 'agency_confirmed')?.value}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
        <span className="inline-flex items-center rounded-full border border-rh-line bg-rh-hover px-3 py-1 text-xs font-semibold text-rh-text tabular-nums">
          Profil : {dossier.completion.percent} %
        </span>
      </div>
    </section>
  )
}

/** Une information complétée par l'employé : la date de sa dernière confirmation, ou ce qui reste à faire. */
function fieldNote(field, missing = 'À compléter par l’employé') {
  if (field.complete && field.confirmed_at) return `Confirmé par l'employé le ${formatLocalDate(field.confirmed_at)}`
  return field.complete ? 'Complété par l’employé' : missing
}

/** Agence, poste, date d'embauche : confirmés, signalés aux RH, ou encore à confirmer. */
function hrNote(item) {
  if (item.status === 'CONFIRMED') return `Confirmé par l'employé le ${formatLocalDate(item.answered_at)}`
  if (item.status === 'REPORTED') return `Signalé par l'employé le ${formatLocalDate(item.answered_at)}`
  return 'À confirmer par l’employé'
}

function profileRows(dossier) {
  const contact = dossier.emergency_contact
  const contactValue = contact.complete
    ? [contact.name, labelOf(dossier.relationships, contact.relationship), contact.telephone].filter(Boolean).join(' · ')
    : null
  const hr = (key, label) => {
    const item = hrItem(dossier, key)
    return item && { label, value: item.value || null, note: hrNote(item) }
  }
  return [
    { label: 'Téléphone', value: dossier.telephone.complete ? dossier.telephone.value : null, note: fieldNote(dossier.telephone) },
    {
      label: 'Email',
      value: dossier.email.no_email ? "Pas d'adresse email" : dossier.email.complete ? dossier.email.value : null,
      note: fieldNote(dossier.email),
    },
    { label: 'Adresse', value: dossier.address.complete ? dossier.address.value : null, note: fieldNote(dossier.address) },
    { label: "Contact d'urgence", value: contactValue, note: fieldNote(contact) },
    {
      label: "Niveau d'études déclaré",
      value: dossier.education_level.complete ? labelOf(dossier.education_levels, dossier.education_level.value) : null,
      note: fieldNote(dossier.education_level),
    },
    hr('agency_confirmed', 'Agence'),
    hr('position_confirmed', 'Poste'),
    hr('hire_date_confirmed', "Date d'embauche"),
  ].filter(Boolean)
}

/** Écran A07 : les huit éléments du profil, chacun avec la date de confirmation de l'employé. */
function ProfileBlock({ dossier }) {
  return (
    <section aria-label="Profil" className="overflow-hidden rounded-lg border border-rh-line bg-surface shadow-card">
      <h2 className="border-b border-rh-line bg-rh-canvas px-4 py-3 text-base font-semibold sm:px-6">Profil</h2>
      <dl className="divide-y divide-rh-line px-4 text-sm sm:px-6">
        {profileRows(dossier).map(({ label, value, note }) => (
          <div key={label} className="flex flex-col gap-1 py-3.5 md:flex-row md:items-center">
            <dt className="shrink-0 text-rh-text md:w-56">{label}</dt>
            <dd className="flex min-w-0 flex-col gap-0.5 md:flex-row md:items-center md:gap-3">
              <span className={`break-words ${value ? 'text-rh-strong' : 'text-rh-muted italic'}`}>{value ?? 'Non renseigné'}</span>
              <span className="text-xs text-rh-muted md:border-l md:border-rh-line md:pl-3">{note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const REPORT_TONES = {
  NEW: 'border-status-progress-border bg-status-progress-bg text-status-progress-text',
  IN_PROGRESS: 'border-info-border bg-info-bg text-info-text',
  CORRECTED: 'border-status-done-border bg-status-done-bg text-status-done-text',
  CLOSED_ACCURATE: 'border-rh-line bg-rh-hover text-rh-text',
}

/** Écran A07 : les signalements de l'employé (US-403), du plus récent au plus ancien. */
function ReportsBlock({ reports }) {
  if (reports.length === 0) return null
  return (
    <section aria-label="Signalements" className="overflow-hidden rounded-lg border border-rh-line bg-surface shadow-card">
      <h2 className="border-b border-rh-line bg-rh-canvas px-4 py-3 text-base font-semibold sm:px-6">Signalements</h2>
      <ul className="flex flex-col gap-3 p-4 sm:p-6">
        {reports.map((report) => (
          <li
            key={report.id ?? report.at}
            className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-rh-line px-4 py-3 text-sm"
          >
            <span className="text-rh-muted tabular-nums">{formatLocalDate(report.at)}</span>
            <span className="font-medium text-rh-strong">{report.field_label}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${REPORT_TONES[report.status] ?? REPORT_TONES.CLOSED_ACCURATE}`}>
              {report.status_label}
            </span>
            {report.note && <span className="text-rh-text">{report.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Ancien parcours du MVP (retiré par US-206) : ce qui a été envoyé reste lisible par les RH. */
function PreviousUpdateBlock({ folder }) {
  if (folder.status !== 'UPDATED') return null
  return (
    <Block icon="task_alt" title="Mise à jour envoyée avec l'ancien portail">
      <p className="font-semibold text-status-done-text">Envoyée le {formatDateTime(folder.submitted_at)}</p>
      {folder.changes.length === 0 ? (
        <p className="text-rh-text">Aucune information modifiée : l'employé a confirmé son dossier tel quel.</p>
      ) : (
        folder.changes.map((change) => (
          <ValueComparison key={change.field_name} label={change.label} oldValue={change.old_value} newValue={change.new_value} />
        ))
      )}
    </Block>
  )
}

const loadFolder = (id) =>
  Promise.all([
    adminApi.getEmployee(id),
    adminApi.getEmployeeDossier(id),
    adminApi.listEmployeeCertificates(id).catch(() => []),
    adminApi.listEmployeeDocuments(id),
    adminApi.getAdminMe().catch(() => null),
  ])

/**
 * US-20, US-21, US-304 ; US-108 : écran A07 « Dossier d'un employé », en lecture seule.
 * Profil V2 avec les dates de confirmation, certificats, signalements ; accès (US-22, Administrateur seul).
 */
export default function EmployeeDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  // Retour vers la liste avec la recherche et les filtres en cours (US-18 CA-11).
  const listUrl = `/admin/employes${location.state?.listSearch ?? ''}`
  const { data, error, loading, reload } = useLoader(() => loadFolder(id), {
    loginPath: '/admin/connexion',
    key: id,
  })

  const page = (children) => (
    <Page account="admin" wide>
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error?.status === 404) {
    return page(
      <div className="flex flex-col items-center gap-3 rounded-xl border border-rh-line bg-surface p-6 text-center shadow-card">
        <span className="material-symbols-outlined text-[32px] text-rh-muted" aria-hidden="true">person_off</span>
        <h2 className="text-lg font-semibold">Employé introuvable</h2>
        <p className="text-rh-text">Ce dossier n'existe pas ou l'employé n'est plus actif.</p>
        <Link to="/admin/employes" className="font-semibold text-primary underline">
          Retour à la liste des employés
        </Link>
      </div>,
    )
  }
  if (error) return page(<Alert>{error.message}</Alert>)

  const [folder, { dossier, reports }, certificates, documents, me] = data
  return page(
    <>
      <div className="flex flex-col gap-3">
        <Link
          to={listUrl}
          aria-label="Retour à la liste des employés"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary hover:underline"
        >
          <span className="material-symbols-outlined mr-1.5 text-[18px]" aria-hidden="true">arrow_back</span>
          Employés
        </Link>
        <p className="flex items-center gap-2 rounded-md border border-rh-line bg-rh-hover px-4 py-2.5 text-xs text-rh-text">
          <span className="material-symbols-outlined shrink-0 text-[16px]" aria-hidden="true">visibility</span>
          Votre consultation de ce dossier est enregistrée dans le journal d'audit.
        </p>
      </div>
      <FolderHeader folder={folder} dossier={dossier} certificates={certificates} />
      <ProfileBlock dossier={dossier} />
      <AdminCertificatesBlock certificates={certificates} />
      <ReportsBlock reports={reports} />
      <PreviousUpdateBlock folder={folder} />
      {documents.length > 0 && <AdminDocuments documents={documents} />}
      {can(me?.role, 'resetAccess') && (
        <ResetAccess employeeId={folder.id} name={folder.display_name} activated={folder.account_activated} onReset={reload} />
      )}
    </>,
  )
}
