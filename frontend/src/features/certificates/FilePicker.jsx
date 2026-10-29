import { useEffect, useId, useState } from 'react'
import { formatSize } from '../../lib/format.js'
import { resizeImage } from '../../lib/resizeImage.js'

const ACCEPT = 'application/pdf,image/jpeg,image/png'

/** US-301 (repris par US-1008) : photo ou fichier, réduite si c'est une photo, puis aperçu avant l'envoi. */
export default function FilePicker({ file, onFile, maxMb, error, progress, title = 'Pièce justificative' }) {
  const cameraId = useId()
  const fileId = useId()
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function choose(event) {
    const chosen = event.target.files?.[0]
    event.target.value = ''
    if (chosen) onFile(await resizeImage(chosen))
  }

  const button =
    'flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-primary px-4 font-semibold text-primary hover:bg-info-bg'
  return (
    <section aria-labelledby="file-title" className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-card">
      <h3 id="file-title" className="text-lg font-semibold">
        {title}
      </h3>
      {file && (
        <section aria-label="Fichier choisi" className="flex items-center gap-3 rounded-lg bg-section p-3">
          {preview ? (
            <img src={preview} alt="Aperçu de la pièce" className="size-16 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-info-bg text-info-text" aria-hidden="true">
              <span className="material-symbols-outlined">picture_as_pdf</span>
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold break-words text-heading">{file.name}</span>
            <span className="text-sm text-help">{formatSize(file.size)}</span>
          </span>
        </section>
      )}
      {progress !== null && (
        <div role="progressbar" aria-label="Envoi du fichier" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-2 w-full overflow-hidden rounded-full bg-status-neutral-bg">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={cameraId} className={button}>
          <span className="material-symbols-outlined" aria-hidden="true">photo_camera</span>
          Prendre une photo
        </label>
        <input id={cameraId} aria-label="Prendre une photo" type="file" accept="image/jpeg,image/png" capture="environment" onChange={choose} className="sr-only" />
        <label htmlFor={fileId} className={button}>
          <span className="material-symbols-outlined" aria-hidden="true">upload_file</span>
          Choisir un fichier
        </label>
        <input id={fileId} aria-label="Choisir un fichier" type="file" accept={ACCEPT} onChange={choose} className="sr-only" />
      </div>
      <p className="text-sm text-help">Formats acceptés : PDF, JPG ou PNG · {maxMb} Mo au plus</p>
      {error && (
        <p role="alert" className="flex items-center gap-1 text-sm text-error-text">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
          {error}
        </p>
      )}
    </section>
  )
}
