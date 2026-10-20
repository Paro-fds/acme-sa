import { useState } from 'react'
import Button from '../../components/Button.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import TextField from '../../components/TextField.jsx'
import { formatLocalDate } from '../../lib/format.js'

/** US-203 : état et signalement d'une information RH, communs à la partie 3 et à « Mon dossier » (US-129). */

export const HR_ICONS = { agency_confirmed: 'storefront', position_confirmed: 'badge', hire_date_confirmed: 'event' }

export function ItemStatus({ item }) {
  if (item.status === 'CONFIRMED') return <StatusBadge tone="done">Confirmé le {formatLocalDate(item.answered_at)}</StatusBadge>
  if (item.status === 'REPORTED') return <StatusBadge tone="progress">Signalé aux RH le {formatLocalDate(item.answered_at)}</StatusBadge>
  return <StatusBadge tone="neutral">En attente de votre confirmation</StatusBadge>
}

/** CA-03 : la bonne information est demandée ; la précision est facultative. */
export function ReportForm({ item, onSend, onCancel, sending, fieldError }) {
  const [values, setValues] = useState({ correct_value: '', comment: '' })
  const set = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }))
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSend(values)
      }}
      className="flex flex-col gap-3 rounded-lg bg-section p-3"
    >
      <p className="text-sm text-help">Valeur enregistrée : {item.value}</p>
      <TextField
        label="Quelle est la bonne information ?"
        value={values.correct_value}
        onChange={set('correct_value')}
        error={fieldError('correct_value')}
      />
      <TextField
        label="Précision pour les RH (facultatif)"
        value={values.comment}
        onChange={set('comment')}
        error={fieldError('comment')}
      />
      <p className="text-sm text-help">Votre signalement compte comme une confirmation : il ne bloque pas votre dossier.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={sending}>
          Envoyer aux RH
        </Button>
        <Button variant="subtle" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
