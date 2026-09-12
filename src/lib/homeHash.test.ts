import { describe, expect, it } from 'vitest'
import { hashTargetId } from './homeHash'

describe('hashTargetId', () => {
  it('extrai o id da âncora', () => {
    expect(hashTargetId('#sobre')).toBe('sobre')
    expect(hashTargetId('#contato')).toBe('contato')
    expect(hashTargetId('#marca')).toBe('marca')
    expect(hashTargetId('#historias')).toBe('historias')
  })

  it('rejeita hash vazio', () => {
    expect(hashTargetId('')).toBeNull()
    expect(hashTargetId('#')).toBeNull()
  })

  it('rejeita âncora desconhecida', () => {
    expect(hashTargetId('#inicio')).toBeNull()
    expect(hashTargetId('#qualquer')).toBeNull()
  })
})
