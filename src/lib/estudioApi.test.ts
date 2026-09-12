import { describe, expect, it } from 'vitest'
import { messageForFailedStudioResponse } from './estudioApi'

describe('messageForFailedStudioResponse', () => {
  it('explica 404 de API ausente', () => {
    expect(messageForFailedStudioResponse(404)).toMatch(/API do estúdio/)
  })

  it('usa a mensagem genérica nos outros erros', () => {
    expect(messageForFailedStudioResponse(502)).toBe('O estúdio não respondeu.')
  })
})
