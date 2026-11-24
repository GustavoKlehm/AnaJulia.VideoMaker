import { describe, expect, it } from 'vitest'
import { isAdminFromUser, needsStudioClaim, sameAuthIdentity } from './authRole'

describe('isAdminFromUser', () => {
  it('aceita só o role admin em app_metadata', () => {
    expect(isAdminFromUser({ app_metadata: { role: 'admin' } })).toBe(true)
  })

  it('rejeita user_metadata mesmo com role admin', () => {
    expect(
      isAdminFromUser({
        app_metadata: {},
        user_metadata: { role: 'admin' },
      }),
    ).toBe(false)
  })

  it('rejeita ausência de usuário ou role', () => {
    expect(isAdminFromUser(null)).toBe(false)
    expect(isAdminFromUser({ app_metadata: { role: 'editor' } })).toBe(false)
  })
})

describe('needsStudioClaim', () => {
  it('tenta reivindicar o estúdio no primeiro login sem role', () => {
    expect(needsStudioClaim({ app_metadata: {} }, false)).toBe(true)
  })

  it('não tenta de novo depois da primeira tentativa', () => {
    expect(needsStudioClaim({ app_metadata: {} }, true)).toBe(false)
  })

  it('não reivindica quem já é admin', () => {
    expect(needsStudioClaim({ app_metadata: { role: 'admin' } }, false)).toBe(false)
  })
})

describe('sameAuthIdentity', () => {
  it('ignora sessão nova do mesmo usuário', () => {
    expect(sameAuthIdentity({ id: 'a', app_metadata: { role: 'admin' } }, { id: 'a', app_metadata: { role: 'admin' } })).toBe(true)
  })

  it('percebe troca de usuário, login, logout e mudança de papel', () => {
    expect(sameAuthIdentity({ id: 'a' }, { id: 'b' })).toBe(false)
    expect(sameAuthIdentity(null, { id: 'a' })).toBe(false)
    expect(sameAuthIdentity({ id: 'a' }, null)).toBe(false)
    expect(sameAuthIdentity({ id: 'a' }, { id: 'a', app_metadata: { role: 'admin' } })).toBe(false)
    expect(sameAuthIdentity(null, null)).toBe(true)
  })
})
