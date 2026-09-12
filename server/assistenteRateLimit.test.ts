import { describe, expect, it } from 'vitest'
import { allowAssistenteRequest } from './assistenteRateLimit'

describe('allowAssistenteRequest', () => {
  it('aceita até 20 pedidos por hora no mesmo IP', () => {
    const store = new Map<string, number[]>()
    const start = 1_000_000

    for (let i = 0; i < 20; i += 1) {
      expect(allowAssistenteRequest('1.1.1.1', start + i, store)).toBe(true)
    }

    expect(allowAssistenteRequest('1.1.1.1', start + 21, store)).toBe(false)
    expect(allowAssistenteRequest('2.2.2.2', start + 21, store)).toBe(true)
  })

  it('libera de novo depois de uma hora', () => {
    const store = new Map<string, number[]>()
    const start = 1_000_000

    for (let i = 0; i < 20; i += 1) {
      allowAssistenteRequest('1.1.1.1', start, store)
    }

    expect(allowAssistenteRequest('1.1.1.1', start + 60 * 60 * 1000 + 1, store)).toBe(true)
  })
})
