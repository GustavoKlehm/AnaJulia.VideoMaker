import { describe, expect, it } from 'vitest'
import { frameStats, isCleanFrame } from './videoCover'

function pixels(values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values.flatMap((v) => [v, v, v, 255]))
}

describe('capa do vídeo', () => {
  it('descarta tela preta, branca e cor lisa', () => {
    expect(isCleanFrame(frameStats(pixels([0, 2, 4, 1])))).toBe(false)
    expect(isCleanFrame(frameStats(pixels([250, 252, 255, 251])))).toBe(false)
    expect(isCleanFrame(frameStats(pixels([120, 121, 120, 122])))).toBe(false)
  })

  it('aceita frame com imagem de verdade', () => {
    expect(isCleanFrame(frameStats(pixels([30, 200, 90, 160, 60, 220])))).toBe(true)
  })

  it('calcula brilho e variação', () => {
    const { mean, spread } = frameStats(pixels([0, 100]))
    expect(mean).toBeCloseTo(50)
    expect(spread).toBeCloseTo(50)
  })
})
