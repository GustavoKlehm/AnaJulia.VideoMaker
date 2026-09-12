import { describe, expect, it } from 'vitest'
import {
  mapStudioMember,
  parseCreateUserBody,
  parsePromoteBody,
  readBearerToken,
} from './estudioUsers'

describe('parseCreateUserBody', () => {
  it('aceita e-mail, senha e promoção', () => {
    expect(
      parseCreateUserBody({
        email: ' ana@site.com ',
        password: 'segredo12',
        promote: true,
      }),
    ).toEqual({
      email: 'ana@site.com',
      password: 'segredo12',
      promote: true,
    })
  })

  it('recusa senha curta ou e-mail vazio', () => {
    expect(parseCreateUserBody({ email: 'ana@site.com', password: '123' })).toEqual({
      error: 'A senha precisa de pelo menos 8 caracteres.',
    })
    expect(parseCreateUserBody({ email: 'ana', password: 'segredo12' })).toEqual({
      error: 'Informa um e-mail válido.',
    })
  })
})

describe('parsePromoteBody', () => {
  it('aceita o e-mail de quem já existe', () => {
    expect(parsePromoteBody({ email: ' ANA@site.com ' })).toEqual({
      email: 'ana@site.com',
    })
  })
})

describe('mapStudioMember', () => {
  it('lê o admin só em app_metadata', () => {
    expect(
      mapStudioMember({
        id: '1',
        email: 'ana@site.com',
        app_metadata: { role: 'admin' },
        user_metadata: {},
      }),
    ).toEqual({ id: '1', email: 'ana@site.com', admin: true })

    expect(
      mapStudioMember({
        id: '2',
        email: 'outra@site.com',
        app_metadata: {},
        user_metadata: { role: 'admin' },
      }),
    ).toEqual({ id: '2', email: 'outra@site.com', admin: false })
  })
})

describe('readBearerToken', () => {
  it('lê o JWT do header', () => {
    expect(readBearerToken('Bearer abc.def')).toBe('abc.def')
    expect(readBearerToken(undefined)).toBeNull()
  })
})
