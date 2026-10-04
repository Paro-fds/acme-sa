import { useState } from 'react'
import TextField from './TextField.jsx'

/** Champ mot de passe avec bouton afficher / masquer (US-02 CA-07). */
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? `Masquer : ${props.label}` : `Afficher : ${props.label}`}
          aria-pressed={visible}
          className="flex size-11 items-center justify-center rounded-lg text-muted hover:bg-canvas"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      }
    />
  )
}
