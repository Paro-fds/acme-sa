export default function Card({ title, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-border bg-surface shadow-card ${className}`}>
      {title && <h2 className="border-b border-border px-4 py-3 text-lg font-semibold">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  )
}
