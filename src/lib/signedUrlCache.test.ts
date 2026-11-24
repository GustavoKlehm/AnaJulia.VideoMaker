import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cachedUrl, clearSignedUrlCache, rememberUrl, signedUrl, stableUrl } from './signedUrlCache'

const HOUR = 60 * 60 * 1000

describe('signedUrlCache', () => {
  beforeEach(() => clearSignedUrlCache())

  it('mantém a mesma URL enquanto ela vale, mesmo vindo outra na busca seguinte', () => {
    const now = 1_000_000
    expect(stableUrl('a', 'url-1', now + 6 * HOUR, now)).toBe('url-1')
    expect(stableUrl('a', 'url-2', now + 6 * HOUR, now + HOUR)).toBe('url-1')
  })

  it('troca a URL quando faltam menos de 5 minutos para vencer', () => {
    const now = 1_000_000
    rememberUrl('b', 'velha', now + 4 * 60 * 1000)
    expect(cachedUrl('b', now)).toBeNull()
    expect(stableUrl('b', 'nova', now + 6 * HOUR, now)).toBe('nova')
  })

  it('busca a URL do clique uma vez só, mesmo com cliques repetidos', async () => {
    const fetcher = vi.fn(async () => ({ url: 'assinada', validaAte: new Date(Date.now() + 6 * HOUR).toISOString() }))
    const [first, second] = await Promise.all([signedUrl('c', fetcher), signedUrl('c', fetcher)])
    expect(first).toBe('assinada')
    expect(second).toBe('assinada')
    expect(await signedUrl('c', fetcher)).toBe('assinada')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('não guarda nada se a busca falhar', async () => {
    await expect(signedUrl('d', () => Promise.reject(new Error('fora do ar')))).rejects.toThrow('fora do ar')
    expect(cachedUrl('d')).toBeNull()
  })
})
