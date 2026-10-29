import { useEffect, useId, useRef, useState } from 'react'

export const SEARCH_DELAY_MS = 300

/**
 * US-18, US-134 : « Rechercher un employé ». La recherche part 300 ms après la dernière frappe.
 * `value` : terme de l'adresse (?search=) ; `onSearch(term)` : nouveau terme à appliquer.
 */
export default function EmployeeSearch({ value, onSearch }) {
  const [text, setText] = useState(value)
  const lastSent = useRef(value)
  const inputRef = useRef(null)
  const id = useId()

  // L'adresse a changé sans passer par la saisie (bouton « Effacer la recherche », retour arrière).
  useEffect(() => {
    if (value !== lastSent.current) {
      lastSent.current = value
      setText(value)
    }
  }, [value])

  useEffect(() => {
    if (text === lastSent.current) return undefined
    const timer = setTimeout(() => send(text), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  })

  function send(term) {
    lastSent.current = term
    onSearch(term)
  }

  function clear() {
    setText('')
    send('')
    inputRef.current?.focus()
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (text !== lastSent.current) send(text)
    inputRef.current?.blur() // ferme le clavier sur mobile
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-rh-strong">
        Rechercher un employé
      </label>
      <div className="flex min-h-12 items-center gap-2 rounded-lg border border-border-input bg-surface px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-info-border">
        <span className="material-symbols-outlined text-muted" aria-hidden="true">search</span>
        <input
          ref={inputRef}
          id={id}
          type="search"
          enterKeyHint="search"
          placeholder="Nom, prénom ou matricule"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={100}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            onClick={clear}
            aria-label="Effacer"
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-canvas"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        )}
      </div>
    </form>
  )
}
