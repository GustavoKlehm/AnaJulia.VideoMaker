import type { LineId } from './planosState'

export type AssistenteTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistenteRecommendation = {
  tipo: LineId
  plano: string
}

export type AssistenteReply = {
  reply: string
  recommendation: AssistenteRecommendation | null
  customQuote: boolean
}

export function customQuoteWhatsappMessage(opener: string, userNotes: string[]): string {
  const notes = userNotes.map((note) => note.trim()).filter((note) => note.length > 0)
  if (notes.length === 0) {
    return opener
  }
  return `${opener}\n\nPedido:\n${notes.map((note) => `• ${note}`).join('\n')}`
}

const FALLBACK =
  'A ajuda automática falhou. Me chama no WhatsApp que eu te oriento.'

export function messageForAssistenteFailure(_status: number, error?: string): string {
  if (error && !/GROQ|api key|token|Bearer/i.test(error)) {
    return error
  }
  return FALLBACK
}

export async function askAssistente(messages: AssistenteTurn[]): Promise<AssistenteReply> {
  const response = await fetch('/api/assistente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string
    reply?: string
    recommendation?: AssistenteRecommendation | null
    customQuote?: boolean
  }

  if (!response.ok || typeof payload.reply !== 'string') {
    throw new Error(messageForAssistenteFailure(response.status, payload.error))
  }

  return {
    reply: payload.reply,
    recommendation: payload.recommendation ?? null,
    customQuote: payload.customQuote === true,
  }
}
