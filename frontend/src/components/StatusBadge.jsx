const STYLES = {
  neutral: 'bg-status-neutral-bg border-status-neutral-border text-status-neutral-text',
  progress: 'bg-status-progress-bg border-status-progress-border text-status-progress-text',
  done: 'bg-status-done-bg border-status-done-border text-status-done-text',
  error: 'bg-error-bg border-error-border text-error-text',
}

const DOTS = {
  neutral: 'bg-status-neutral-dot',
  progress: 'bg-status-progress-dot',
  done: 'bg-status-done-dot',
  error: 'bg-error-dot',
}

/** Pastille de statut : jamais la couleur seule, toujours un texte (design system). */
export default function StatusBadge({ tone, children }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[tone]}`}
    >
      <span className={`size-2 rounded-full ${DOTS[tone]}`} aria-hidden="true" />
      {children}
    </span>
  )
}

export function EmployeeStateBadge({ state }) {
  if (state === 'DONE') return <StatusBadge tone="done">Effectuée</StatusBadge>
  if (state === 'IN_PROGRESS') return <StatusBadge tone="progress">En cours</StatusBadge>
  return <StatusBadge tone="neutral">Non effectuée</StatusBadge>
}

export function AdminStatusBadge({ status }) {
  return status === 'UPDATED' ? (
    <StatusBadge tone="done">Mise à jour effectuée</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Mise à jour non effectuée</StatusBadge>
  )
}
