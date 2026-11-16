/** Domínio do e-mail sintético que serve de login do cliente no Supabase Auth. */
export const PORTAL_LOGIN_DOMAIN = 'portal.anajulia.app'

/**
 * Normaliza um celular brasileiro para 11 dígitos (DDD + 9 + 8 dígitos).
 * Aceita máscara, espaços, +55/55/0 na frente e o número sem o 9 inicial.
 * Devolve null quando não é um celular válido.
 */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')

  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  if (digits.length > 10 && digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '')
  }

  if (digits.length === 10 && /^[1-9]{2}[6-9]/.test(digits)) {
    digits = `${digits.slice(0, 2)}9${digits.slice(2)}`
  }

  return /^[1-9]{2}9\d{8}$/.test(digits) ? digits : null
}

/** Máscara progressiva para o campo de login: (XX) X XXXX-XXXX. */
export function maskPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length === 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`
}

/** Exibição de um telefone já normalizado. */
export function formatPhone(normalized: string): string {
  return maskPhone(normalized)
}

export function loginEmailForPhone(normalized: string): string {
  return `${normalized}@${PORTAL_LOGIN_DOMAIN}`
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}
