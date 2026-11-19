import { describe, expect, it } from 'vitest'
import {
  addDays,
  cleanupCutoff,
  deliveryMessage,
  deliveryState,
  fileTypeFor,
  formatBytes,
  isDeliveryToken,
  isIsoDate,
  parseDeliveryInput,
  safeFileName,
  todayInBrazil,
} from './delivery'

describe('arquivos', () => {
  it('deduz o tipo pela extensão', () => {
    expect(fileTypeFor('IMG_0001.MOV')).toBe('video/quicktime')
    expect(fileTypeFor('story.mp4')).toBe('video/mp4')
    expect(fileTypeFor('foto.JPEG')).toBe('image/jpeg')
    expect(fileTypeFor('projeto.zip')).toBeNull()
    expect(fileTypeFor('sem-extensao')).toBeNull()
  })

  it('limpa o nome para o Storage', () => {
    expect(safeFileName('Stories Festa 01.MOV')).toBe('stories-festa-01.mov')
    expect(safeFileName('  Aniversário da Júlia!!.mp4')).toBe('aniversario-da-julia.mp4')
    expect(safeFileName('###.mp4')).toBe('arquivo.mp4')
  })

  it('formata tamanhos', () => {
    expect(formatBytes(500)).toBe('1 KB')
    expect(formatBytes(5.5 * 1024 ** 2)).toBe('5,5 MB')
    expect(formatBytes(120 * 1024 ** 2)).toBe('120 MB')
    expect(formatBytes(2.25 * 1024 ** 3)).toBe('2,3 GB')
  })
})

describe('datas e validade', () => {
  it('valida datas ISO de verdade', () => {
    expect(isIsoDate('2026-12-03')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('03/12/2026')).toBe(false)
  })

  it('usa o dia de Brasília', () => {
    // 01:30 UTC ainda é o dia anterior em Brasília.
    expect(todayInBrazil(new Date('2026-12-04T01:30:00Z'))).toBe('2026-12-03')
  })

  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-11-28', 7)).toBe('2026-12-05')
    expect(cleanupCutoff('2026-12-05')).toBe('2026-11-28')
  })

  it('o link vale até o último dia, inclusive', () => {
    const base = { ativo: true, arquivos_apagados_em: null }
    expect(deliveryState({ ...base, expira_em: '2026-12-03' }, '2026-12-03')).toBe('ativa')
    expect(deliveryState({ ...base, expira_em: '2026-12-03' }, '2026-12-04')).toBe('expirada')
    expect(deliveryState({ ...base, expira_em: null }, '2030-01-01')).toBe('ativa')
    expect(deliveryState({ ...base, ativo: false, expira_em: null }, '2026-12-03')).toBe('desativada')
    expect(deliveryState({ ...base, expira_em: null, arquivos_apagados_em: '2026-12-10' }, '2026-12-03')).toBe('apagada')
  })
})

describe('parseDeliveryInput', () => {
  it('exige título na criação', () => {
    expect(parseDeliveryInput({}).ok).toBe(false)
    expect(parseDeliveryInput({ titulo: '  Stories 15 anos  ', expiraEm: '2026-12-31' })).toEqual({
      ok: true,
      value: { titulo: 'Stories 15 anos', expiraEm: '2026-12-31' },
    })
  })

  it('na edição aceita só o que veio e limpa datas vazias', () => {
    expect(parseDeliveryInput({ expiraEm: '', ativo: false }, true)).toEqual({
      ok: true,
      value: { expiraEm: null, ativo: false },
    })
  })

  it('recusa datas inválidas', () => {
    const r = parseDeliveryInput({ titulo: 'x', dataEvento: '31/12/2026' })
    expect(r.ok).toBe(false)
  })
})

describe('link e mensagem', () => {
  it('reconhece o token do link', () => {
    expect(isDeliveryToken('a'.repeat(24))).toBe(true)
    expect(isDeliveryToken('curto')).toBe(false)
    expect(isDeliveryToken('a'.repeat(23) + '/')).toBe(false)
  })

  it('monta a mensagem com a validade', () => {
    const msg = deliveryMessage({ titulo: 'Festa', link: 'https://x/entrega/abc', expiraEm: '2026-12-31' })
    expect(msg).toContain('https://x/entrega/abc')
    expect(msg).toContain('31/12/2026')
    expect(deliveryMessage({ titulo: 'Festa', link: 'l', expiraEm: null })).not.toContain('no ar até')
  })
})
