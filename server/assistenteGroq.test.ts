import { describe, expect, it } from 'vitest'
import { askGroq } from './assistenteGroq'

function jsonReply(reply: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ reply, recommendation: null }) } }],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('askGroq', () => {
  it('tenta de novo uma vez quando a Groq responde 429', async () => {
    let calls = 0
    const fetchFn: typeof fetch = async () => {
      calls += 1
      if (calls === 1) {
        return new Response('rate limited', { status: 429 })
      }
      return jsonReply('Como você quer guardar esse momento?')
    }

    const raw = await askGroq([{ role: 'user', content: 'Só um recorte' }], 'pacote', 'gsk_test', fetchFn)

    expect(calls).toBe(2)
    expect(raw).toContain('Como você quer guardar esse momento?')
  })

  it('desiste depois da segunda falha e marca como temporário', async () => {
    const fetchFn: typeof fetch = async () => new Response('rate limited', { status: 429 })

    await expect(
      askGroq([{ role: 'user', content: 'Só um recorte' }], 'pacote', 'gsk_test', fetchFn),
    ).rejects.toMatchObject({ retryable: true, status: 429 })
  })
})
