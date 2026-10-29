const TONES = {
  error: { box: 'border-error-border bg-error-bg text-error-text', icon: 'error' },
  info: { box: 'border-info-border bg-info-bg text-info-text', icon: 'info' },
  success: { box: 'border-status-done-border bg-status-done-bg text-status-done-text', icon: 'check_circle' },
}

/** `title` : première ligne en gras, au-dessus du message (US-101). */
export default function Alert({ tone = 'error', title, children }) {
  if (!children) return null
  const { box, icon } = TONES[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2 rounded-lg border p-3 text-base ${box}`}>
      <span className="material-symbols-outlined shrink-0" aria-hidden="true">{icon}</span>
      <div className="flex flex-col gap-1">
        {title && <p className="font-semibold">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  )
}
