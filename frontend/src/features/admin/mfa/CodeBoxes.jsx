import { useState } from 'react'

/**
 * US-107 CA-03 (écran validé A01) : le code en 6 cases, une par chiffre.
 * Un seul champ, invisible, couvre les cases : la frappe, le collage et le code proposé par le téléphone
 * (`one-time-code`) le remplissent d'un coup, et les lecteurs d'écran n'y voient qu'un champ.
 */
export default function CodeBoxes({ id, value, onChange, invalid, describedBy }) {
  const [focused, setFocused] = useState(false)
  const current = Math.min(value.length, 5)

  return (
    <div className="relative">
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onPaste={(e) => {
          e.preventDefault()
          onChange(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6))
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="absolute inset-0 z-10 size-full cursor-text text-base opacity-0"
      />
      {/* A01 : case remplie bordure 2 px bleue et halo ; case vide grise ; 48 px de haut, chiffre de 18 px. */}
      <div data-testid="code-boxes" aria-hidden="true" className="grid grid-cols-6 gap-2 pt-1 sm:gap-2.5">
        {Array.from({ length: 6 }, (_, index) => {
          const digit = value[index]
          const isCurrent = focused && index === current
          return (
            <span
              key={index}
              className={`flex h-12 items-center justify-center rounded-lg text-lg tabular-nums ${
                invalid
                  ? 'border-2 border-error-border bg-error-bg font-bold text-error-text'
                  : digit
                    ? 'border-2 border-primary bg-surface font-bold text-primary shadow-[0_0_0_2px_rgb(30_30_130/0.2)]'
                    : isCurrent
                      ? 'border border-primary bg-surface font-semibold text-muted'
                      : 'border border-border-input bg-canvas font-semibold text-muted'
              }`}
            >
              {digit ?? '·'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
