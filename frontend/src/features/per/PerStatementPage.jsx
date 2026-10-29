import { useState } from 'react'
import { downloadStatementPdf, getMyPer } from '../../api/per.js'
import Alert from '../../components/Alert.jsx'
import Button from '../../components/Button.jsx'
import TextField from '../../components/TextField.jsx'
import { saveFile } from '../../lib/saveFile.js'
import { useLoader } from '../../lib/useLoader.js'
import { PerDocumentPage, PerError, capitalize } from './perParts.jsx'
import { frToIso, isoToFr, todayIso, typeDay } from './statementDates.js'

const AUTHENTICATE = 'Pour authentifier ce document (signature et sceau ACME), contactez les Ressources humaines.'

/** Photos datées, de la plus ancienne à la plus récente (comme `indiquerMois` du directeur). */
function dated(photos) {
  return photos.filter((photo) => photo.reported_on).sort((a, b) => a.reported_on.localeCompare(b.reported_on))
}

function Month({ photo }) {
  return (
    <li className="flex flex-col gap-2 p-4">
      <h3 className="font-semibold text-heading">{capitalize(photo.period_label)}</h3>
      <p className="text-sm text-help tabular-nums">
        Au {photo.updated_on} · balance {photo.amount} · intérêt cumulé {photo.interest}
      </p>
      {photo.accounts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-help">
                <th className="py-1 pr-3 font-semibold">Compte</th>
                <th className="py-1 pr-3 font-semibold">Ouverture</th>
                <th className="py-1 pr-3 text-right font-semibold">Balance</th>
                <th className="py-1 text-right font-semibold">Intérêt</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-heading">
              {photo.accounts.map((account) => (
                <tr key={account.number} className="border-t border-border">
                  <td className="py-1 pr-3 whitespace-nowrap">{account.number}</td>
                  <td className="py-1 pr-3">{account.opened_on}</td>
                  <td className="py-1 pr-3 text-right">{account.amount}</td>
                  <td className="py-1 text-right">{account.interest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  )
}

/**
 * US-1024 : le relevé PER entre deux dates, comme le panneau « Relevé PER » du directeur (version du 2026-10-29) :
 * mois en base, deux dates proposées, « Afficher le relevé » (photos de l'intervalle, de la plus ancienne à la plus
 * récente), puis « Relevé en PDF ». Un mois absent n'est pas inventé.
 */
export default function PerStatementPage() {
  const { data, error, loading } = useLoader(getMyPer)
  // null : rien de tapé, la date proposée s'affiche
  const [typedStart, setStart] = useState(null)
  const [typedEnd, setEnd] = useState(null)
  const [shown, setShown] = useState(null)
  const [message, setMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  const photos = data ? dated(data.statement) : []

  const last = photos.at(-1)?.reported_on
  const today = todayIso()
  const start = typedStart ?? (photos.length ? isoToFr(photos[0].reported_on) : '')
  const end = typedEnd ?? (photos.length ? isoToFr(last > today ? last : today) : '')

  function show() {
    setMessage(null)
    setShown(null)
    const from = frToIso(start)
    const to = frToIso(end)
    if (!from || !to) {
      setMessage({ tone: 'error', text: "Indiquez le jour, le mois et l'année, par exemple 31/01/2026." })
      return
    }
    if (from > to) {
      setMessage({ tone: 'error', text: 'La date de début est postérieure à la date de fin.' })
      return
    }
    setShown({ from, to, photos: photos.filter((photo) => photo.reported_on >= from && photo.reported_on <= to) })
  }

  async function savePdf() {
    setMessage(null)
    setSaving(true)
    try {
      const file = await downloadStatementPdf(shown.from, shown.to)
      if (await saveFile(file, `Releve-PER-${shown.from}-au-${shown.to}.pdf`)) {
        setMessage({ tone: 'success', text: 'Le relevé PDF a été enregistré.' })
      }
    } catch (caught) {
      setMessage({ tone: 'error', text: caught.message || "Le relevé PDF n'a pas pu être créé." })
    } finally {
      setSaving(false)
    }
  }

  const labels = [...new Set(photos.map((photo) => photo.period_label))]

  return (
    <PerDocumentPage title="Relevé PER">
      {loading && <p role="status">Chargement…</p>}
      {error && <PerError error={error} />}
      {data && (
        <>
          <p className="text-help">
            {labels.length ? `Photos en base : ${labels.join(', ')}.` : "Aucune photo PER n'est encore en base."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Date de début"
              inputMode="numeric"
              maxLength={10}
              placeholder="JJ / MM / AAAA"
              autoComplete="off"
              value={start}
              onChange={(event) => setStart(typeDay(event.target.value))}
            />
            <TextField
              label="Date de fin"
              inputMode="numeric"
              maxLength={10}
              placeholder="JJ / MM / AAAA"
              autoComplete="off"
              value={end}
              onChange={(event) => setEnd(typeDay(event.target.value))}
            />
          </div>
          <Button onClick={show} className="sm:w-auto sm:self-start">
            Afficher le relevé
          </Button>
          {message?.tone === 'error' && <Alert>{message.text}</Alert>}
          {message?.tone === 'success' && (
            <p role="status" className="rounded-lg bg-info-bg p-3 text-heading">
              {message.text}
            </p>
          )}
          {shown && shown.photos.length === 0 && (
            <p className="rounded-xl bg-section p-4 text-help">Aucune photo PER entre ces deux dates.</p>
          )}
          {shown && shown.photos.length > 0 && (
            <>
              <ul
                aria-label="Relevé PER"
                className="flex flex-col divide-y divide-border rounded-xl bg-surface shadow-card"
              >
                {shown.photos.map((photo) => (
                  <Month key={`${photo.period}-${photo.reported_on}`} photo={photo} />
                ))}
              </ul>
              <p className="text-sm text-help">{AUTHENTICATE}</p>
            </>
          )}
          {shown && (
            <Button variant="secondary" onClick={savePdf} disabled={saving} className="sm:w-auto sm:self-start">
              <span className="material-symbols-outlined" aria-hidden="true">
                download
              </span>
              Relevé en PDF
            </Button>
          )}
        </>
      )}
    </PerDocumentPage>
  )
}
