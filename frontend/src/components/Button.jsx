const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-active disabled:bg-muted',
  secondary: 'border-[1.5px] border-primary bg-transparent text-primary hover:bg-info-bg disabled:border-muted disabled:text-muted',
  ghost: 'bg-transparent text-primary hover:bg-info-bg',
  subtle: 'bg-canvas text-help hover:bg-status-neutral-bg hover:text-heading disabled:text-muted',
}

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}
