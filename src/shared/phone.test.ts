import { describe, expect, it } from 'vitest'
import { isValidPin, loginEmailForPhone, maskPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each([
    '46999999999',
    '469 9999 9999',
    '46 9 9999 9999',
    '46 9 99999999',
    '(46) 99999-9999',
    '(46) 9 9999-9999',
    '46-9-9999-9999',
    '+55 46 99999-9999',
    '5546999999999',
    '046999999999',
    '+55 (46) 9 9999-9999',
  ])('aceita %s', (input) => {
    expect(normalizePhone(input)).toBe('46999999999')
  })

  it.each(['46 9999 9999', '4699999999', '(46) 9999-9999', '+55 46 9999-9999', '55 46 9999 9999'])(
    'insere o 9 que faltou em %s',
    (input) => {
      expect(normalizePhone(input)).toBe('46999999999')
    },
  )

  it('insere o 9 também em celulares que começam com 8, 7 ou 6', () => {
    expect(normalizePhone('46 8812 3456')).toBe('46988123456')
    expect(normalizePhone('11 7123 4567')).toBe('11971234567')
  })

  it.each(['46 3524 1234', '', '999', '46 9999 999', '00 99999 9999', '46 8 9999 9999', '469999999999'])(
    'recusa %s',
    (input) => {
      expect(normalizePhone(input)).toBeNull()
    },
  )
})

describe('maskPhone', () => {
  it('aplica a máscara (XX) X XXXX-XXXX enquanto digita', () => {
    expect(maskPhone('4')).toBe('(4')
    expect(maskPhone('46')).toBe('(46')
    expect(maskPhone('469')).toBe('(46) 9')
    expect(maskPhone('46999')).toBe('(46) 9 99')
    expect(maskPhone('4699999')).toBe('(46) 9 9999')
    expect(maskPhone('46999999')).toBe('(46) 9 9999-9')
    expect(maskPhone('46999999999')).toBe('(46) 9 9999-9999')
  })

  it('ignora o que passa de 11 dígitos e símbolos', () => {
    expect(maskPhone('(46) 9 9999-99999')).toBe('(46) 9 9999-9999')
  })
})

describe('login', () => {
  it('monta o e-mail sintético', () => {
    expect(loginEmailForPhone('46999999999')).toBe('46999999999@portal.anajulia.app')
  })

  it('PIN tem 6 dígitos', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12345a')).toBe(false)
  })
})
