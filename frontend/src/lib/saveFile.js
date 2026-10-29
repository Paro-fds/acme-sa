/**
 * US-1024 : enregistre un fichier reçu de l'API, comme le bouton « Relevé en PDF » du directeur : le navigateur qui
 * le permet laisse choisir le dossier (`showSaveFilePicker`) ; sinon, téléchargement sous le nom proposé.
 * Rend `false` si la personne a renoncé dans la fenêtre d'enregistrement.
 */
export async function saveFile(blob, name) {
  if (window.showSaveFilePicker) {
    let handle = null
    try {
      handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'Document PDF', accept: { 'application/pdf': ['.pdf'] } }],
      })
    } catch (error) {
      if (error?.name === 'AbortError') return false
    }
    if (handle) {
      const stream = await handle.createWritable()
      await stream.write(blob)
      await stream.close()
      return true
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}
