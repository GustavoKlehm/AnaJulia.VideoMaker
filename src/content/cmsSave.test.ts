import { describe, expect, it } from 'vitest'
import { slugify } from './cmsSave'

describe('slugify', () => {
  it('gera id seguro a partir do nome do plano', () => {
    expect(slugify('Meia diária')).toBe('meia-diaria')
    expect(slugify('  História  ')).toBe('historia')
  })
})
