export const ASSISTENTE_INVITE_KEY = 'assistente-invite-dismissed'

export function isAssistenteInviteDismissed(storage: Pick<Storage, 'getItem'> = sessionStorage): boolean {
  try {
    return storage.getItem(ASSISTENTE_INVITE_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissAssistenteInvite(storage: Pick<Storage, 'setItem'> = sessionStorage): void {
  try {
    storage.setItem(ASSISTENTE_INVITE_KEY, '1')
  } catch {
    // sessionStorage pode falhar em modo privado
  }
}
