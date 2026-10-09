import { useEffect, useId, useRef, useState } from 'react'
import { addAdmin, changeAdminRole, deleteAdmin, listAdmins } from '../../api/admin.js'
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
  }
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>
}

/** Confirmation « Supprimer le compte de … ? » dans la carte (CA-09 : « Annuler » ne change rien). */
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

/** US-102 CA-05 : téléphone perdu ; la personne choisira une nouvelle méthode à sa prochaine connexion. */
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

function AdminItem({ admin, deletable, isSuperAdmin, onRoleChange, onDelete, onResetMfa }) {
  const [resettingMfa, setResettingMfa] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [changingRole, setChangingRole] = useState(false)
  const buttonRef = useRef(null)

  function cancel() {
    setConfirming(false)
    setTimeout(() => buttonRef.current?.focus())
  }

  async function confirm() {
    setDeleting(true)
    const deleted = await onDelete(admin)
    if (!deleted) {
      setDeleting(false)
      setConfirming(false)
    }
  }

  async function handleRoleSelect(e) {
    const newRole = e.target.value
    if (newRole === admin.role) return
    setChangingRole(true)
    await onRoleChange(admin, newRole)
    setChangingRole(false)
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-info-bg text-info-text"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined">shield_person</span>
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold break-all text-heading">{admin.username}</p>
            {admin.is_me && <Badge tone="info">Vous</Badge>}
            <Badge tone="info">{admin.role_label || 'Administrateur'}</Badge>
            {admin.must_change_password && <Badge tone="neutral">Mot de passe provisoire</Badge>}
          </div>
          <p className="text-sm text-help">
            Ajouté le {formatLocalDate(admin.created_at)}
            {admin.created_by ? ` par ${admin.created_by}` : ''}
          </p>
          <p className="text-sm text-help">
            {admin.last_login_at ? `Dernière connexion le ${formatDateTime(admin.last_login_at)}` : 'Jamais connecté'}
          </p>
          <p className="text-sm text-help">
            Double authentification{' '}:{' '}
            {admin.mfa_method ? METHODS[admin.mfa_method].title : 'à choisir à la prochaine connexion'}
          </p>

          {isSuperAdmin && (
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor={`role-${admin.id}`} className="text-xs font-medium text-help">
                Rôle de {admin.username}{' '}:
              </label>
              <select
                id={`role-${admin.id}`}
                value={admin.role || 'ADMIN'}
                onChange={handleRoleSelect}
                disabled={changingRole}
                className="rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-heading disabled:opacity-60"
              >
                <option value="ADMIN">Administrateur</option>
                <option value="AGENT_RH">Agent RH</option>
                <option value="REFERENTIAL">Responsable du référentiel</option>
                <option value="READONLY">Lecture seule</option>
              </select>
            </div>
          )}
        </div>
      </div>
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
            className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 font-semibold text-primary hover:bg-info-bg"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">phonelink_erase</span>
            Réinitialiser la double authentification
          </button>
        </div>
      )}
      {deletable &&
        (confirming ? (
          <DeleteConfirmation username={admin.username} deleting={deleting} onConfirm={confirm} onCancel={cancel} />
        ) : (
          <div className="flex justify-end">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setConfirming(true)}
              aria-label={`Supprimer ${admin.username}`}
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-error-bg px-3 font-semibold text-error-text hover:bg-error-border/40"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person_remove</span>
              Supprimer
            </button>
          </div>
        ))}
    </li>
  )
}

/** CA-05, CA-06 : ajout avec un mot de passe provisoire ; US-103 : rôle choisi à la création. */
function AddAdminForm({ onAdded }) {
  const redirectIfUnauthorized = useUnauthorizedRedirect(LOGIN_PATH)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('AGENT_RH')
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
      const created = await addAdmin(username.trim(), password, role)
      setUsername('')
      setPassword('')
      setRole('AGENT_RH')
      onAdded(created)
    } catch (apiError) {
      if (redirectIfUnauthorized(apiError)) return
      if (apiError.field === 'username' || apiError.field === 'password') setErrors({ [apiError.field]: apiError.message })
      else setFailure(apiError.message)
    }
    setSending(false)
  }

  return (
    <Block icon="person_add" title="Ajouter un compte RH">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
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
        <Alert>{failure}</Alert>
        <Button type="submit" variant="secondary" disabled={!complete || sending}>
          <span className="material-symbols-outlined" aria-hidden="true">person_add</span>
          {sending ? 'Ajout…' : "Ajouter l'administrateur"}
        </Button>
      </form>
    </Block>
  )
}

/** US-23 : comptes administrateurs ; US-103 : gestion des rôles RH. */
export default function AdminAccountsPage() {
  const redirectIfUnauthorized = useUnauthorizedRedirect(LOGIN_PATH)
  const { data: admins, error, loading, reload } = useLoader(listAdmins, { loginPath: LOGIN_PATH })
  const [notice, setNotice] = useState(null)
  const [failure, setFailure] = useState(null)
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
    setNotice(`Compte « ${created.username} » ajouté avec le rôle « ${created.role_label} ». Transmettez-lui son mot de passe provisoire.`)
    reload()
  }

  return page(
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-[26px] leading-8 font-bold">Comptes et rôles</h2>
        <p>Gérez les accès à l'espace RH et attribuez les rôles : Administrateur, Agent RH, Responsable du référentiel ou Lecture seule.</p>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}
      <Alert>{failure}</Alert>

      <section aria-labelledby={listId} className="flex flex-col gap-3">
        <h3 id={listId} className="px-1 text-lg font-semibold">
          {admins.length} compte{admins.length > 1 ? 's' : ''}
        </h3>
        <ul aria-label="Comptes administrateurs" className="flex flex-col gap-2">
          {admins.map((admin) => (
            <AdminItem
              key={admin.id}
              admin={admin}
              isSuperAdmin={isSuperAdmin}
              deletable={!admin.is_me && admins.length > 1 && isSuperAdmin}
              onRoleChange={handleRoleChange}
              onDelete={handleDelete}
              onResetMfa={handleResetMfa}
            />
          ))}
        </ul>
      </section>

      {isSuperAdmin && <AddAdminForm onAdded={handleAdded} />}
    </>,
  )
}
