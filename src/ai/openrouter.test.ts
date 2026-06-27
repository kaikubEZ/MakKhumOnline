// src/ai/openrouter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askAI } from './openrouter'

describe('askAI', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns response text on first model success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '42' } }] }),
    }))

    const result = await askAI('test-key', 'pick a pit')
    expect(result).toBe('42')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('tries next model on HTTP error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const result = await askAI('test-key', 'say something')
    expect(result).toBe('hi')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('returns null when all models fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    const result = await askAI('test-key', 'any')
    expect(result).toBeNull()
  })
})
