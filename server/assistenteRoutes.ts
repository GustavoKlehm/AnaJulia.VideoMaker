import type { Request, Response } from 'express'
import { loadAssistenteCatalog } from './assistenteCms'
import { GroqRequestError, askGroq } from './assistenteGroq'
import {
  catalogToKnowledge,
  parseAssistenteBody,
  parseModelPayload,
} from './assistenteKnowledge'
import { allowAssistenteRequest } from './assistenteRateLimit'

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress ?? 'unknown'
}

const UNAVAILABLE =
  'A ajuda automática está indisponível agora. Me chama no WhatsApp que eu te oriento.'

export async function postAssistente(req: Request, res: Response): Promise<void> {
  const parsed = parseAssistenteBody(req.body)
  if ('error' in parsed) {
    res.status(400).json({ error: parsed.error })
    return
  }

  if (!allowAssistenteRequest(clientIp(req))) {
    res.status(429).json({
      error: 'Muitas perguntas agora. Tenta de novo em instantes, ou fala comigo no WhatsApp.',
    })
    return
  }

  const apiKey = process.env.GROQ_API_KEY?.trim()
  if (!apiKey) {
    res.status(503).json({ error: UNAVAILABLE })
    return
  }

  try {
    const catalog = await loadAssistenteCatalog()
    const raw = await askGroq(parsed.messages, catalogToKnowledge(catalog), apiKey)
    const payload = parseModelPayload(raw, catalog)
    if (!payload) {
      res.status(502).json({
        error: 'Não consegui montar a resposta. Tenta de novo ou fala comigo no WhatsApp.',
      })
      return
    }
    res.json(payload)
  } catch (error) {
    if (error instanceof GroqRequestError && error.retryable) {
      res.status(429).json({
        error: 'A ajuda ficou ocupada agora. Tenta de novo em instantes, ou fala comigo no WhatsApp.',
      })
      return
    }
    res.status(502).json({ error: UNAVAILABLE })
  }
}
