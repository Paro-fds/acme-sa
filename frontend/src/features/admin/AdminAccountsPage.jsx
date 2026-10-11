import { useEffect, useId, useRef, useState } from 'react'
import {
  addAdmin,
  changeAdminRole,
  deleteAdmin,
  listAdmins,
  listEmployees,
  resetAccess,
  setAdminStatus,
} from '../../api/admin.js'
import { resetAdminMfa } from '../../api/mfa.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import Page from '../../components/Page.jsx'
import PasswordField from '../../components/PasswordField.jsx'
import TextField from '../../components/TextField.jsx'
import { formatDateTime, formatLocalDate } from '../../lib/format.js'
import { useLoader, useUnauthorizedRedirect } from '../../lib/useLoader.js'
import Block from './Block.jsx'
import { METHODS } from './mfa/methods.js'

const LOGIN_PATH = '/admin/connexion'

function Badge({ tone, children }) {
  const tones = {
    info: 'border-info-border bg-info-bg text-info-text',
    neutral: 'border-border bg-status-neutral-bg text-help',
    success: 'border-status-done-border bg-status-done-bg text-status-done-text',
    warning: 'border-warning-border bg-warning-bg/20 text-warning-text',
  }
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tones[tone] || tones.neutral}`}>{children}</span>
}

/** Confirmation « Supprimer le compte de … ? » (CA-09). */
function DeleteConfirmation({ username, deleting, onConfirm, onCancel }) {
  const titleId = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-detail`}
      onKeyDown={(event) => event.key === 'Escape' && !deleting && onCancel()}
      className="flex flex-col gap-3 rounded-lg border border-error-border bg-error-bg p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p id={titleId} className="font-semibold text-heading">Supprimer le compte de {username}{'\u00a0'}?</p>
        <p id={`${titleId}-detail`} className="text-sm text-help">
          Ses connexions en cours seront fermées et il ne pourra plus accéder à l'administration.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="min-h-11 rounded-lg bg-error-text font-semibold text-white disabled:opacity-60"
        >
          {deleting ? 'Suppression…' : 'Supprimer'}
        </button>
      </div>
    </div>
  )
}

/** Confirmation désactivation d'un compte RH (US-104 CA-02). */
function DeactivateConfirmation({ username, deactivating, onConfirm, onCancel }) {
  const titleId = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={`${titleId}-detail`}
      onKeyDown={(event) => event.key === 'Escape' && !deactivating && onCancel()}
      className="flex flex-col gap-3 rounded-lg border border-warning-border bg-warning-bg/20 p-3"
    >
      <div className="flex flex-col gap-0.5">
        <p id={titleId} className="font-semibold text-heading">Désactiver le compte de {username}{'\u00a0'}?</p>
        <p id={`${titleId}-detail`} className="text-sm text-help">
          Il ne pourra plus se connecter et ses sessions en cours seront fermées. Son historique de décisions reste visible.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={deactivating}
          className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deactivating}
          className="min-h-11 rounded-lg bg-warning-text font-semibold text-white disabled:opacity-60"
        >
          {deactivating ? 'Désactivation…' : 'Désactiver'}
        </button>
      </div>
    </div>
  )
}

/** US-102 CA-05 : réinitialiser la double authentification. */
function ResetMfaConfirmation({ username, resetting, onConfirm, onCancel }) {
  const titleId = useId()
  return (
    <div role="alertdialog" aria-labelledby={titleId} className="flex flex-col gap-3 rounded-lg border border-info-border bg-info-bg p-3">
      <div className="flex flex-col gap-0.5">
        <p id={titleId} className="font-semibold text-heading">
          Réinitialiser la double authentification de {username}{' '}?
        </p>
        <p className="text-sm text-help">
          Ses connexions en cours seront fermées ; à sa prochaine connexion, il choisira une nouvelle méthode.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={resetting}
          className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={resetting}
          className="min-h-11 rounded-lg bg-primary font-semibold text-white disabled:opacity-60"
        >
          {resetting ? 'Réinitialisation…' : 'Réinitialiser'}
        </button>
      </div>
    </div>
  )
}

function AdminItem({
  admin,
  deletable,
  isSuperAdmin,
  onRoleChange,
  onStatusChange,
  onDelete,
  onResetMfa,
}) {
  const [resettingMfa, setResettingMfa] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [changingRole, setChangingRole] = useState(false)
  const buttonRef = useRef(null)

  function cancelDelete() {
    setConfirmingDelete(false)
    setTimeout(() => buttonRef.current?.focus())
  }

  async function confirmDelete() {
    setDeleting(true)
    const deleted = await onDelete(admin)
    if (!deleted) {
      setDeleting(false)
      setConfirmingDelete(false)
    }
  }

  async function confirmDeactivate() {
    setUpdatingStatus(true)
    await onStatusChange(admin, false)
    setUpdatingStatus(false)
    setConfirmingDeactivate(false)
  }

  async function handleActivate() {
    setUpdatingStatus(true)
    await onStatusChange(admin, true)
    setUpdatingStatus(false)
  }

  async function handleRoleSelect(e) {
    const newRole = e.target.value
    if (newRole === admin.role) return
    setChangingRole(true)
    await onRoleChange(admin, newRole)
    setChangingRole(false)
  }

  const isActive = admin.is_active !== false

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
            isActive ? 'bg-info-bg text-info-text' : 'bg-status-neutral-bg text-help'
          }`}
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">{isActive ? 'shield_person' : 'person_off'}</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold break-all text-heading">
              {admin.full_name ? `${admin.full_name} (${admin.username})` : admin.username}
            </p>
            {admin.is_me && <Badge tone="info">Vous</Badge>}
            <Badge tone="info">{admin.role_label || 'Administrateur'}</Badge>
            {admin.must_change_password && <Badge tone="neutral">Mot de passe provisoire</Badge>}
            {isActive ? (
              <Badge tone="success">Actif</Badge>
            ) : (
              <Badge tone="neutral">Désactivé</Badge>
            )}
          </div>

          {admin.email && (
            <p className="text-sm text-help flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">mail</span>
              {admin.email}
            </p>
          )}

          {admin.employee_id && (
            <p className="text-sm text-help flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[16px]">badge</span>
              Matricule : {admin.employee_id}
            </p>
          )}

          <p className="text-sm text-help">
            Ajouté le {formatLocalDate(admin.created_at)}
            {admin.created_by ? ` par ${admin.created_by}` : ''}
          </p>
          <p className="text-sm text-help">
            {admin.last_login_at ? `Dernière connexion le ${formatDateTime(admin.last_login_at)}` : 'Jamais connecté'}
          </p>
          <p className="text-sm text-help">
            Double authentification{' '}:{' '}
            {admin.mfa_method ? (METHODS[admin.mfa_method]?.title || 'Activée') : 'à choisir à la prochaine connexion'}
          </p>

          {isSuperAdmin && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor={`role-${admin.id}`} className="text-xs font-medium text-help">
                  Rôle de {admin.username}{' '}:
                </label>
                <select
                  id={`role-${admin.id}`}
                  value={admin.role || 'ADMIN'}
                  onChange={handleRoleSelect}
                  disabled={changingRole || !isActive}
                  className="rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-heading disabled:opacity-60"
                >
                  <option value="ADMIN">Administrateur</option>
                  <option value="AGENT_RH">Agent RH</option>
                  <option value="REFERENTIAL">Responsable du référentiel</option>
                  <option value="READONLY">Lecture seule</option>
                </select>
              </div>

              {!admin.is_me && (
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => setConfirmingDeactivate(true)}
                      disabled={updatingStatus}
                      className="text-xs font-semibold text-warning-text hover:underline cursor-pointer"
                    >
                      Désactiver le compte
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleActivate}
                      disabled={updatingStatus}
                      className="text-xs font-semibold text-status-done-text hover:underline cursor-pointer"
                    >
                      Réactiver le compte
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmingDeactivate && (
        <DeactivateConfirmation
          username={admin.username}
          deactivating={updatingStatus}
          onConfirm={confirmDeactivate}
          onCancel={() => setConfirmingDeactivate(false)}
        />
      )}

      {!admin.is_me && admin.mfa_method && resettingMfa !== null && (
        <ResetMfaConfirmation
          username={admin.username}
          resetting={resettingMfa}
          onCancel={() => setResettingMfa(null)}
          onConfirm={async () => {
            setResettingMfa(true)
            await onResetMfa(admin)
            setResettingMfa(null)
          }}
        />
      )}

      {!admin.is_me && admin.mfa_method && resettingMfa === null && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setResettingMfa(false)}
            aria-label={`Réinitialiser la double authentification de ${admin.username}`}
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-primary hover:bg-info-bg cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">phonelink_erase</span>
            Réinitialiser la double authentification
          </button>
        </div>
      )}

      {deletable &&
        (confirmingDelete ? (
          <DeleteConfirmation username={admin.username} deleting={deleting} onConfirm={confirmDelete} onCancel={cancelDelete} />
        ) : (
          <div className="flex justify-end">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Supprimer ${admin.username}`}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-error-bg px-3 font-semibold text-error-text hover:bg-error-border/40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_remove</span>
              Supprimer
            </button>
          </div>
        ))}
    </li>
  )
}

/** CA-05, CA-06 : ajout avec un mot de passe provisoire ; US-103 : rôle choisi à la création ; US-104 : champs A10. */
function AddAdminForm({ onAdded, onCancel }) {
  const redirectIfUnauthorized = useUnauthorizedRedirect(LOGIN_PATH)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('AGENT_RH')
  const [employeeId, setEmployeeId] = useState('')
  const [errors, setErrors] = useState({})
  const [failure, setFailure] = useState(null)
  const [sending, setSending] = useState(false)
  const complete = username.trim() !== '' && password !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (!complete || sending) return
    setSending(true)
    setErrors({})
    setFailure(null)
    try {
      const created =
        fullName.trim() || email.trim() || employeeId.trim()
          ? await addAdmin({
              username: username.trim(),
              password,
              role,
              fullName: fullName.trim() || null,
              email: email.trim() || null,
              employeeId: employeeId.trim() || null,
            })
          : await addAdmin(username.trim(), password, role)
      setFullName('')
      setEmail('')
      setUsername('')
      setPassword('')
      setRole('AGENT_RH')
      setEmployeeId('')
      onAdded(created)
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      if (apiError.field === 'username' || apiError.field === 'password') {
        setErrors({ [apiError.field]: apiError.message })
      } else {
        setFailure(apiError.message)
      }
    }
    setSending(false)
  }

  return (
    <Block icon="person_add" title="Ajouter un compte RH">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TextField
            label="Nom"
            placeholder="ex. Agent RH Démo 1"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            placeholder="ex. agent1.demo@domaine-demo.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <TextField
          label="Identifiant"
          help="3 à 50 caractères : lettres sans accents, chiffres, point, tiret ou trait bas (par exemple marie.pierre)."
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setErrors({ ...errors, username: null })
          }}
          error={errors.username}
        />

        <PasswordField
          label="Mot de passe provisoire"
          help="12 caractères minimum. Transmettez-le vous-même à la personne : elle choisira son propre mot de passe à sa première connexion."
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrors({ ...errors, password: null })
          }}
          error={errors.password}
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="add-role" className="text-sm font-semibold text-heading">
            Rôle initial
          </label>
          <select
            id="add-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-heading shadow-input"
          >
            <option value="ADMIN">Administrateur</option>
            <option value="AGENT_RH">Agent RH</option>
            <option value="REFERENTIAL">Responsable du référentiel</option>
            <option value="READONLY">Lecture seule</option>
          </select>
          <p className="text-xs text-help">
            Définit les actions permises dans l'espace RH. Peut être modifié ultérieurement par un Administrateur.
          </p>
        </div>

        <TextField
          label="Matricule de la personne"
          help="Sert à ne jamais lui proposer ses propres certificats."
          placeholder="ex. EMP-0002"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
        />

        <Alert>{failure}</Alert>

        <div className="flex items-center gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Fermer le formulaire
            </Button>
          )}
          <Button type="submit" variant="secondary" disabled={!complete || sending}>
            <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
            {sending ? 'Ajout…' : "Ajouter l'administrateur"}
          </Button>
        </div>
      </form>
    </Block>
  )
}

/** Section en bas « Accès des employés » (A10 & US-104). */
function EmployeeAccessSection({ onNotice, onFailure }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const lastQuery = useRef('')
  const redirectIfUnauthorized = useUnauthorizedRedirect(LOGIN_PATH)

  async function handleSearch(term) {
    setQuery(term)
    lastQuery.current = term
    if (!term.trim() || term.trim().length < 2) {
      setSelectedEmployee(null)
      return
    }
    setSearching(true)
    try {
      const res = await listEmployees({ search: term.trim(), page: 1, pageSize: 5 })
      if (lastQuery.current === term) {
        if (res?.items && res.items.length > 0) {
          setSelectedEmployee(res.items[0])
        } else {
          setSelectedEmployee(null)
        }
      }
    } catch {
      // Pas d'affichage d'erreur bloquant sur la recherche
    } finally {
      if (lastQuery.current === term) {
        setSearching(false)
      }
    }
  }

  async function handleReset() {
    if (!selectedEmployee) return
    setResetting(true)
    try {
      await resetAccess(selectedEmployee.id)
      onNotice(`Accès de « ${selectedEmployee.display_name} » réinitialisé avec succès.`)
      setConfirming(false)
    } catch (err) {
      if (redirectIfUnauthorized(err)) return
      onFailure(err.message)
    }
    setResetting(false)
  }

  return (
    <Block icon="badge" title="Accès des employés">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="employee-search-access" className="text-sm font-semibold text-heading">
            Rechercher un employé (nom ou matricule)
          </label>
          <div className="relative">
            <input
              id="employee-search-access"
              type="search"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Rechercher par nom ou matricule (ex. Lucie Exemple ou EMP-0418)…"
              className="w-full min-h-11 rounded-lg border border-border-input bg-surface px-3 py-2 text-sm text-heading shadow-input placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-info-border outline-none"
            />
          </div>
          {searching && <p className="text-xs text-help">Recherche en cours…</p>}
        </div>

        {selectedEmployee && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-heading">
                {selectedEmployee.display_name} · {selectedEmployee.employee_code} · {selectedEmployee.agency_code}
              </p>
            </div>

            {confirming ? (
              <div role="alertdialog" aria-labelledby="reset-title" className="flex flex-col gap-3 rounded-lg border border-error-border bg-error-bg p-3">
                <p id="reset-title" className="font-semibold text-heading">
                  Réinitialiser l'accès de {selectedEmployee.display_name}{'\u00a0'}?
                </p>
                <p className="text-sm text-help">
                  Son mot de passe sera effacé et ses connexions en cours fermées. Ses données restent intactes.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={resetting}
                    className="min-h-11 rounded-lg border border-border bg-surface font-semibold text-heading disabled:opacity-60 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={resetting}
                    className="min-h-11 rounded-lg bg-error-text font-semibold text-white disabled:opacity-60 cursor-pointer"
                  >
                    {resetting ? 'Réinitialisation…' : 'Confirmer'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/90 cursor-pointer self-start"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">lock_reset</span>
                  Réinitialiser son accès
                </button>
                <p className="text-xs text-help">
                  L'employée devra créer un nouveau mot de passe. L'action est enregistrée dans le journal d'audit.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Block>
  )
}

/** US-23 : comptes administrateurs ; US-103 : gestion des rôles RH ; US-104 : gestion et déblocage (A10). */
export default function AdminAccountsPage() {
  const redirectIfUnauthorized = useUnauthorizedRedirect(LOGIN_PATH)
  const { data: admins, error, loading, reload } = useLoader(listAdmins, { loginPath: LOGIN_PATH })
  const [notice, setNotice] = useState(null)
  const [failure, setFailure] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const listId = useId()

  const page = (children) => (
    <Page account="admin" title="Comptes et rôles" backTo="/admin">
      {children}
    </Page>
  )

  if (loading) return page(<p role="status">Chargement…</p>)
  if (error) return page(<Alert>{error.message}</Alert>)

  const me = admins.find((a) => a.is_me)
  const isSuperAdmin = me?.role === 'ADMIN'

  async function handleRoleChange(admin, newRole) {
    setNotice(null)
    setFailure(null)
    try {
      const updated = await changeAdminRole(admin.id, newRole)
      setNotice(`Rôle de « ${admin.username} » modifié en « ${updated.role_label} ».`)
      reload()
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      setFailure(apiError.message)
      reload()
    }
  }

  async function handleStatusChange(admin, isActive) {
    setNotice(null)
    setFailure(null)
    try {
      await setAdminStatus(admin.id, isActive)
      setNotice(
        isActive
          ? `Compte « ${admin.username} » réactivé.`
          : `Compte « ${admin.username} » désactivé.`,
      )
      reload()
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      setFailure(apiError.message)
      reload()
    }
  }

  async function handleDelete(admin) {
    setNotice(null)
    setFailure(null)
    try {
      await deleteAdmin(admin.id)
      setNotice(`Compte « ${admin.username} » supprimé.`)
      reload()
      return true
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return true
      setFailure(apiError.message)
      reload()
      return false
    }
  }

  async function handleResetMfa(admin) {
    setNotice(null)
    setFailure(null)
    try {
      await resetAdminMfa(admin.id)
      setNotice(`Double authentification de « ${admin.username} » réinitialisée.`)
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      setFailure(apiError.message)
    }
    reload()
  }

  function handleAdded(created) {
    setFailure(null)
    setNotice(
      `Compte « ${created.username} » ajouté avec le rôle « ${created.role_label} ». Transmettez-lui son mot de passe provisoire.`,
    )
    setFormOpen(false)
    reload()
  }

  return page(
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[26px] leading-8 font-bold text-heading">Comptes et rôles</h2>
          <p className="text-sm text-help">
            Gérez les accès à l'espace RH et attribuez les rôles : Administrateur, Agent RH, Responsable du référentiel ou Lecture seule.
          </p>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setFormOpen((prev) => !prev)}
            className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white shadow hover:bg-primary/90 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">person_add</span>
            Créer un compte
          </button>
        )}
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      <Alert>{failure}</Alert>

      {/* Tableau des comptes RH (A10) */}
      <section aria-labelledby={listId} className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 id={listId} className="text-lg font-semibold text-heading">
            {admins.length} compte{admins.length > 1 ? 's' : ''}
          </h3>
        </div>

        {/* Liste accessible pour mobile et tests */}
        <ul aria-label="Comptes administrateurs" className="flex flex-col gap-3">
          {admins.map((admin) => (
            <AdminItem
              key={admin.id}
              admin={admin}
              isSuperAdmin={isSuperAdmin}
              deletable={!admin.is_me && admins.length > 1 && isSuperAdmin}
              onRoleChange={handleRoleChange}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onResetMfa={handleResetMfa}
            />
          ))}
        </ul>
      </section>

      {/* Formulaire d'ajout / Tiroir A10 */}
      {isSuperAdmin && (
        <div id="create-account-section">
          <AddAdminForm onAdded={handleAdded} onCancel={() => setFormOpen(false)} />
        </div>
      )}

      {/* Section Accès des employés (A10) */}
      {isSuperAdmin && (
        <EmployeeAccessSection
          onNotice={(msg) => setNotice(msg)}
          onFailure={(err) => setFailure(err)}
        />
      )}
    </>,
  )
}
