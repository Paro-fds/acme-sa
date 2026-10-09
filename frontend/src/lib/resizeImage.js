/**
 * US-13 CA-02 : les photos de plus de 1600 px sont réduites dans le navigateur avant l'envoi
 * (photos d'appareil souvent > 5 Mo, réseau mobile lent).
 */

export const MAX_IMAGE_SIDE = 1600
const JPEG_QUALITY = 0.85

/** Dimensions réduites : le plus grand côté ramené à `max`, proportions conservées. */
export function targetSize(width, height, max = MAX_IMAGE_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

const defaultLoadImage = (file) => createImageBitmap(file)
const defaultCreateCanvas = () => document.createElement('canvas')

/**
 * Renvoie le fichier réduit (même nom, même type) ou le fichier d'origine
 * s'il n'est pas une image JPG/PNG, s'il est déjà assez petit ou si le navigateur ne sait pas le lire.
 */
export async function resizeImage(
  file,
  { max = MAX_IMAGE_SIDE, loadImage = defaultLoadImage, createCanvas = defaultCreateCanvas } = {},
) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) return file

  let image
  try {
    image = await loadImage(file)
  } catch {
    return file
  }
  try {
    const size = targetSize(image.width, image.height, max)
    if (size.width === image.width && size.height === image.height) return file

    const canvas = createCanvas()
    canvas.width = size.width
    canvas.height = size.height
    canvas.getContext('2d').drawImage(image, 0, 0, size.width, size.height)
    const quality = file.type === 'image/jpeg' ? JPEG_QUALITY : undefined
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, quality))
    return blob ? new File([blob], file.name, { type: file.type, lastModified: file.lastModified }) : file
  } finally {
    image.close?.()
  }
}
