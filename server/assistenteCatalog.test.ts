import { describe, expect, it } from 'vitest'
import { fallbackAssistenteCatalog } from './assistenteCatalog'
import { catalogToKnowledge } from './assistenteKnowledge'

describe('fallbackAssistenteCatalog', () => {
  it('o pacote de fallback traz preço e regra do catálogo', () => {
    const pack = catalogToKnowledge(fallbackAssistenteCatalog())
    expect(pack).toContain('690')
    expect(pack).toContain('30% para reservar a data')
    expect(pack).toContain('Dois Vizinhos')
    expect(pack).toContain('edição + meia diária → meia-diaria')
    expect(pack).toContain('Não assuma Ocasiões só porque o tema é casamento')
    expect(pack).toContain('Não pergunte só Retrato, História ou Capítulo')
  })
})
