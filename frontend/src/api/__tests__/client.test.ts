import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, b64ToBytes, getJson, postJson, postMultipart } from '@/api/client'

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getJson parses a JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    await expect(getJson('/profile')).resolves.toEqual({ ok: true })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it('getJson throws ApiError with the backend detail on non-2xx', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'profile not found' }),
    })
    const error = await getJson('/profile').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(404)
    expect((error as ApiError).message).toBe('profile not found')
  })

  it('postJson sends a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    })
    globalThis.fetch = fetchMock
    await postJson('/hearing/test', { ear: 'right' })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(init.body).toBe(JSON.stringify({ ear: 'right' }))
  })

  it('postMultipart builds a FormData body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stages: [] }),
    })
    globalThis.fetch = fetchMock
    await postMultipart('/hearing/process', {
      file: new Blob(['fake'], { type: 'audio/wav' }),
      profile: '{}',
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('b64ToBytes decodes base64 correctly', () => {
    const bytes = b64ToBytes(btoa('hello'))
    expect(bytes).toHaveLength(5)
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111])
  })
})
