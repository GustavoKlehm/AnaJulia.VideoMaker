import { describe, expect, it } from 'vitest'
import { contrast, portalTheme } from './portalTheme'

describe('portalTheme', () => {
  it('mantém cores que já têm contraste', () => {
    const t = portalTheme('#b8322a', '#f9e0dc')
    expect(t['--client-primary']).toBe('#b8322a')
    expect(t['--client-secondary']).toBe('#f9e0dc')
  })

  it('escurece uma principal clara demais para os botões continuarem legíveis', () => {
    const t = portalTheme('#f19bc0', '#f6e1ea')
    expect(t['--client-primary']).not.toBe('#f19bc0')
    expect(contrast(t['--client-primary'], '#ffffff')).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--client-primary-ink'], '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })

  it('clareia uma secundária escura demais para o texto continuar legível', () => {
    const t = portalTheme('#123456', '#202020')
    expect(contrast(t['--client-secondary'], '#1a1a1a')).toBeGreaterThanOrEqual(7)
  })

  it('funciona com amarelo e branco, os piores casos', () => {
    const t = portalTheme('#ffff00', '#ffffff')
    expect(contrast(t['--client-primary'], '#ffffff')).toBeGreaterThanOrEqual(4.5)
  })
})
