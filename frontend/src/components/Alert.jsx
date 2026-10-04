const TONES = {
  error: { box: 'border-error-border bg-error-bg text-error-text', icon: 'error' },
  info: { box: 'border-info-border bg-info-bg text-info-text', icon: 'info' },
  success: { box: 'border-status-done-border bg-status-done-bg text-status-done-text', icon: 'check_circle' },
}

export default function Alert({ tone = 'error', children }) {
  if (!children) return null
  const { box, icon } = TONES[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2 rounded-lg border p-3 text-base ${box}`}>
      <span className="material-symbols-outlined shrink-0" aria-hidden="true">{icon}</span>
      <p>{children}</p>
    </div>
  )
}
