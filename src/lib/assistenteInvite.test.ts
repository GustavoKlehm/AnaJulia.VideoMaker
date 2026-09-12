import { describe, expect, it } from 'vitest'
import {
  ASSISTENTE_INVITE_KEY,
  dismissAssistenteInvite,
  isAssistenteInviteDismissed,
} from './assistenteInvite'

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem(key: string) {
      return data[key] ?? null
    },
    setItem(key: string, value: string) {
      data[key] = value
    },
  }
}

describe('assistenteInvite', () => {
  it('começa visível quando a sessão ainda não dispensou', () => {
    expect(isAssistenteInviteDismissed(memoryStorage())).toBe(false)
  })

  it('some depois de dispensar ou abrir o chat', () => {
    const storage = memoryStorage()
    dismissAssistenteInvite(storage)
    expect(storage.getItem(ASSISTENTE_INVITE_KEY)).toBe('1')
    expect(isAssistenteInviteDismissed(storage)).toBe(true)
  })
})
