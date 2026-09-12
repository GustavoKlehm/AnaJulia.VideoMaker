import { ASSISTENTE_SYSTEM, type ChatTurn } from './assistenteKnowledge'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-20b'
const TIMEOUT_MS = 20_000
const MAX_ATTEMPTS = 2

export class GroqRequestError extends Error {
  readonly status: number
  readonly retryable: boolean

  constructor(status: number, retryable: boolean) {
    super('groq failed')
    this.status = status
    this.retryable = retryable
  }
}

function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503
}

async function completeOnce(
  messages: ChatTurn[],
  knowledge: string,
  apiKey: string,
  fetchFn: typeof fetch,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetchFn(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${ASSISTENTE_SYSTEM}\n\n${knowledge}` },
          ...messages,
        ],
      }),
    })

    if (!response.ok) {
      throw new GroqRequestError(response.status, isRetryable(response.status))
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return payload.choices?.[0]?.message?.content ?? ''
  } catch (error) {
    if (error instanceof GroqRequestError) {
      throw error
    }
    throw new GroqRequestError(0, true)
  } finally {
    clearTimeout(timer)
  }
}

export async function askGroq(
  messages: ChatTurn[],
  knowledge: string,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  let lastError: GroqRequestError | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await completeOnce(messages, knowledge, apiKey, fetchFn)
    } catch (error) {
      if (!(error instanceof GroqRequestError) || !error.retryable || attempt === MAX_ATTEMPTS) {
        throw error
      }
      lastError = error
    }
  }

  throw lastError ?? new GroqRequestError(0, true)
}
