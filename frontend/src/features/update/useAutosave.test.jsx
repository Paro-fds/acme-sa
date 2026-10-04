import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { NETWORK_FAILURE_MESSAGE, useAutosave } from './useAutosave.js'
import { ApiError } from '../../api/client.js'

const field = (code, required, value, original = value) => ({
  code,
  required,
  value,
  original_value: original,
  modified: value !== original,
})

const FIELDS = [
  field('telephone_number', true, '+50937221111'),
  field('address_line_1', false, '12 rue Capois, Port-au-Prince'),
]
const INITIAL = { telephone_number: '+50937221111', address_line_1: '12 rue Capois, Port-au-Prince' }

function setup({ save = vi.fn().mockResolvedValue({ updated_at: '2026-10-04T14:32:00' }), onError, fields = FIELDS } = {}) {
  const hook = renderHook(({ values }) => useAutosave({ fields, values, save, onError }), {
    initialProps: { values: INITIAL },
  })
  const type = (values) => hook.rerender({ values: { ...INITIAL, ...values } })
  return { ...hook, save, type }
}

const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('useAutosave (US-10)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('CA-01 : enregistre 2 secondes après la dernière frappe', async () => {
    const { save, type, result } = setup()

    type({ telephone_number: '+509 3722' })
    await wait(1500)
    type({ telephone_number: '+509 3722 2222' })
    await wait(1999)
    expect(save).not.toHaveBeenCalled()

    await wait(1)
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith({ telephone_number: '+509 3722 2222' })
    expect(result.current.savedAt).toBe('2026-10-04T14:32:00')
    expect(result.current.error).toBeNull()
  })

  it('n’envoie rien tant qu’aucune valeur ne change', async () => {
    const { save } = setup()

    await wait(5000)

    expect(save).not.toHaveBeenCalled()
  })

  it('une valeur déjà enregistrée n’est pas renvoyée', async () => {
    const { save, type } = setup()

    type({ telephone_number: '+509 3722 2222' })
    await wait(2000)
    type({ telephone_number: '+509 3722 2222', address_line_1: '5 rue Pavée, Jacmel' })
    await wait(2000)

    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({ address_line_1: '5 rue Pavée, Jacmel' })
  })

  it('CA-04 : seuls les champs valides sont envoyés ; le champ invalide est signalé', async () => {
    const { save, type, result } = setup()

    type({ telephone_number: '12ab', address_line_1: '5 rue Pavée, Jacmel' })
    await wait(2000)

    expect(save).toHaveBeenCalledWith({ address_line_1: '5 rue Pavée, Jacmel' })
    expect(result.current.invalidCodes).toEqual(['telephone_number'])
  })

  it('CA-04 : rien n’est envoyé si tous les champs modifiés sont invalides', async () => {
    const { save, type, result } = setup()

    type({ telephone_number: '12ab' })
    await wait(2000)

    expect(save).not.toHaveBeenCalled()
    expect(result.current.invalidCodes).toEqual(['telephone_number'])
  })

  it('une valeur remise à l’origine est renvoyée pour supprimer le changement du brouillon', async () => {
    const fields = [field('telephone_number', true, '+509 3722 2222', '+50937221111'), FIELDS[1]]
    const save = vi.fn().mockResolvedValue({ updated_at: '2026-10-04T14:33:00' })
    const { rerender } = renderHook(({ values }) => useAutosave({ fields, values, save }), {
      initialProps: { values: { ...INITIAL, telephone_number: '+509 3722 2222' } },
    })

    rerender({ values: INITIAL })
    await wait(2000)

    expect(save).toHaveBeenCalledWith({ telephone_number: '+50937221111' })
  })

  it('CA-05 : un échec réseau affiche le message, puis une nouvelle tentative a lieu à la modification suivante', async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Le serveur est injoignable.'))
      .mockResolvedValueOnce({ updated_at: '2026-10-04T14:35:00' })
    const { type, result } = setup({ save })

    type({ telephone_number: '+509 3722 2222' })
    await wait(2000)
    expect(result.current.error).toBe(NETWORK_FAILURE_MESSAGE)
    expect(NETWORK_FAILURE_MESSAGE).toBe('Enregistrement impossible. Vérifiez votre connexion.')

    type({ telephone_number: '+509 3722 2222', address_line_1: '5 rue Pavée, Jacmel' })
    await wait(2000)

    expect(save).toHaveBeenLastCalledWith({ telephone_number: '+509 3722 2222', address_line_1: '5 rue Pavée, Jacmel' })
    expect(result.current.error).toBeNull()
    expect(result.current.savedAt).toBe('2026-10-04T14:35:00')
  })

  it('les autres erreurs (session expirée, mise à jour soumise…) sont confiées à l’écran', async () => {
    const apiError = new ApiError(401, 'SESSION_EXPIRED', 'Votre session a expiré. Reconnectez-vous.')
    const onError = vi.fn()
    const { type, result } = setup({ save: vi.fn().mockRejectedValue(apiError), onError })

    type({ telephone_number: '+509 3722 2222' })
    await wait(2000)

    expect(onError).toHaveBeenCalledWith(apiError)
    expect(result.current.error).toBeNull()
  })

  it('flush() enregistre immédiatement sans attendre le délai (changement d’étape, bouton manuel)', async () => {
    const { save, type, result } = setup()

    type({ telephone_number: '+509 3722 2222' })
    let saved
    await act(async () => {
      saved = await result.current.flush()
    })

    expect(saved).toBe(true)
    expect(save).toHaveBeenCalledOnce()
    await wait(2000)
    expect(save).toHaveBeenCalledOnce()
  })

  it('flush() signale l’échec', async () => {
    const save = vi.fn().mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Le serveur est injoignable.'))
    const { type, result } = setup({ save })

    type({ telephone_number: '+509 3722 2222' })
    let saved
    await act(async () => {
      saved = await result.current.flush()
    })

    expect(saved).toBe(false)
    expect(result.current.error).toBe(NETWORK_FAILURE_MESSAGE)
  })
})
