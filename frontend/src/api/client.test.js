import { describe, expect, it, vi } from 'vitest'
import { ApiError, request } from './client.js'

function mockFetch(status, body) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  )
}

describe('request', () => {
  it('préfixe les routes par /api et renvoie le JSON', async () => {
    const fetchMock = mockFetch(200, { status: 'ok' })

    await expect(request('/health')).resolves.toEqual({ status: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith('/api/health', expect.objectContaining({ method: 'GET' }))
  })

  it("envoie le corps en JSON", async () => {
    const fetchMock = mockFetch(200, {})

    await request('/auth/identify', { method: 'POST', body: { last_name: 'JOSEPH' } })

    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.body).toBe('{"last_name":"JOSEPH"}')
  })

  it("transforme une erreur de l'API en ApiError avec code et message", async () => {
    mockFetch(401, { error: { code: 'IDENTITY_NOT_RECOGNIZED', message: 'Informations non reconnues.' } })

    const error = await request('/auth/identify', { method: 'POST', body: {} }).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
    expect(error.code).toBe('IDENTITY_NOT_RECOGNIZED')
    expect(error.message).toBe('Informations non reconnues.')
  })

  it("US-101 : les informations complémentaires de l'erreur (retry_after) sont conservées", async () => {
    mockFetch(423, { error: { code: 'ACCOUNT_LOCKED', message: 'Trop de tentatives.', retry_after: 270 } })

    const error = await request('/auth/login', { method: 'POST', body: {} }).catch((e) => e)

    expect(error.code).toBe('ACCOUNT_LOCKED')
    expect(error.details).toEqual({ retry_after: 270 })
  })

  it('signale une erreur réseau avec un message compréhensible', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await request('/health').catch((e) => e)

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.message).toBe('Le serveur est injoignable. Vérifiez votre connexion.')
  })
})
