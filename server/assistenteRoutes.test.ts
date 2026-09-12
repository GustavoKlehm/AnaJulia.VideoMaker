import { createServer } from 'node:http'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import app from './app'

const server = createServer(app)
const previousKey = process.env.GROQ_API_KEY

async function listen(): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('server address missing')
  }
  return `http://127.0.0.1:${address.port}`
}

const baseUrl = await listen()

afterAll(async () => {
  if (previousKey === undefined) {
    delete process.env.GROQ_API_KEY
  } else {
    process.env.GROQ_API_KEY = previousKey
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

describe('POST /api/assistente', () => {
  beforeEach(() => {
    delete process.env.GROQ_API_KEY
  })

  it('rejeita corpo vazio', async () => {
    const response = await fetch(`${baseUrl}/api/assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const payload = (await response.json()) as { error: string }
    expect(response.status).toBe(400)
    expect(payload.error).toMatch(/pergunta/i)
  })

  it('rejeita mensagem longa', async () => {
    const response = await fetch(`${baseUrl}/api/assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'x'.repeat(501) }],
      }),
    })
    expect(response.status).toBe(400)
  })

  it('avisa quando a chave da IA não está configurada', async () => {
    const response = await fetch(`${baseUrl}/api/assistente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Quanto custa o História?' }],
      }),
    })
    const payload = (await response.json()) as { error: string }
    expect(response.status).toBe(503)
    expect(payload.error).toMatch(/whatsapp/i)
    expect(payload.error).not.toMatch(/GROQ|api key|token/i)
  })
})
