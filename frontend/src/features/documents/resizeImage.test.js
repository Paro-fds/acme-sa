import { describe, expect, it, vi } from 'vitest'
import { MAX_IMAGE_SIDE, resizeImage, targetSize } from './resizeImage.js'

function fakeCanvas() {
  const context = { drawImage: vi.fn() }
  return {
    width: 0,
    height: 0,
    context,
    getContext: () => context,
    toBlob: vi.fn((done, type) => done(new Blob(['image réduite'], { type }))),
  }
}

const image = (width, height) => ({ width, height, close: vi.fn() })
const photo = (name = 'photo.jpg', type = 'image/jpeg') => new File(['x'.repeat(5000)], name, { type })

describe('targetSize (US-13 CA-02)', () => {
  it('le plus grand côté est ramené à 1600 px en gardant les proportions', () => {
    expect(MAX_IMAGE_SIDE).toBe(1600)
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(targetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('une image de 1600 px ou moins garde sa taille', () => {
    expect(targetSize(1600, 900)).toEqual({ width: 1600, height: 900 })
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})

describe('resizeImage (US-13 CA-02)', () => {
  it('une photo de 4000 px de large est réduite à 1600 px avant l’envoi', async () => {
    const canvas = fakeCanvas()
    const bitmap = image(4000, 3000)

    const resized = await resizeImage(photo(), { loadImage: async () => bitmap, createCanvas: () => canvas })

    expect([canvas.width, canvas.height]).toEqual([1600, 1200])
    expect(canvas.context.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1600, 1200)
    expect(resized).toBeInstanceOf(File)
    expect(resized.name).toBe('photo.jpg')
    expect(resized.type).toBe('image/jpeg')
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('un PNG reste un PNG', async () => {
    const canvas = fakeCanvas()

    const resized = await resizeImage(photo('scan.png', 'image/png'), {
      loadImage: async () => image(2400, 2400),
      createCanvas: () => canvas,
    })

    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined)
    expect(resized.type).toBe('image/png')
  })

  it('une petite image est envoyée telle quelle', async () => {
    const original = photo()
    const createCanvas = vi.fn()

    const result = await resizeImage(original, { loadImage: async () => image(1200, 800), createCanvas })

    expect(result).toBe(original)
    expect(createCanvas).not.toHaveBeenCalled()
  })

  it('un PDF n’est jamais transformé', async () => {
    const pdf = new File(['%PDF-1.7'], 'diplome.pdf', { type: 'application/pdf' })
    const loadImage = vi.fn()

    expect(await resizeImage(pdf, { loadImage })).toBe(pdf)
    expect(loadImage).not.toHaveBeenCalled()
  })

  it('si le navigateur ne sait pas lire l’image, le fichier d’origine est envoyé', async () => {
    const original = photo()

    const result = await resizeImage(original, {
      loadImage: async () => {
        throw new Error('format non pris en charge')
      },
    })

    expect(result).toBe(original)
  })
})
