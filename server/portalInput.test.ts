import { describe, expect, it } from 'vitest'
import { generatePin, isWeakPin, matchesSyncToken, parseClient, parseContact } from './portalInput'

describe('parseClient', () => {
  const base = { nome: 'Soul Circo', instagram: 'soul_circo', cores: { principal: '#B8322A', secundaria: 'f9e0dc' } }

  it('normaliza instagram e cores', () => {
    const r = parseClient(base)
    expect(r).toMatchObject({
      ok: true,
      value: { instagram: '@soul_circo', corPrincipal: '#b8322a', corSecundaria: '#f9e0dc', contatos: undefined },
    })
  })

  it('normaliza os telefones dos contatos', () => {
    const r = parseClient({ ...base, contatos: [{ nome: 'Vanessa', telefone: '46 9999 9999' }] })
    expect(r).toMatchObject({ ok: true, value: { contatos: [{ nome: 'Vanessa', telefone: '46999999999' }] } })
  })

  it('recusa telefone repetido mesmo com máscara diferente', () => {
    const r = parseClient({
      ...base,
      contatos: [
        { nome: 'A', telefone: '46999999999' },
        { nome: 'B', telefone: '(46) 9 9999-9999' },
      ],
    })
    expect(r).toMatchObject({ ok: false, error: expect.stringContaining('repetido') })
  })

  it('recusa cor inválida e telefone fixo', () => {
    expect(parseClient({ ...base, cores: { principal: 'vermelho', secundaria: '#fff' } }).ok).toBe(false)
    expect(parseContact({ nome: 'A', telefone: '46 3524 1234' }).ok).toBe(false)
  })
})

describe('PIN', () => {
  it('reconhece PINs fracos', () => {
    for (const pin of ['000000', '111111', '123456', '654321', '121212', '123123']) {
      expect(isWeakPin(pin)).toBe(true)
    }
    expect(isWeakPin('482913')).toBe(false)
  })

  it('gera 6 dígitos que não são fracos', () => {
    for (let i = 0; i < 200; i += 1) {
      const pin = generatePin()
      expect(pin).toMatch(/^\d{6}$/)
      expect(isWeakPin(pin)).toBe(false)
    }
  })
})

describe('matchesSyncToken', () => {
  const token = 'x'.repeat(40)

  it('aceita só o token exato', () => {
    expect(matchesSyncToken(token, token)).toBe(true)
    expect(matchesSyncToken(`${token}y`, token)).toBe(false)
    expect(matchesSyncToken(null, token)).toBe(false)
  })

  it('fica desligado sem token configurado ou com token curto', () => {
    expect(matchesSyncToken('abc', undefined)).toBe(false)
    expect(matchesSyncToken('abc', 'abc')).toBe(false)
  })
})
