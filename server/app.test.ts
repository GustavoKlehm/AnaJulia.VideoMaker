import { createServer } from 'node:http'
import { afterAll, describe, expect, it } from 'vitest'
import app from './app'

const server = createServer(app)

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
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

describe('estudio user routes', () => {
  it('pede login em JSON, não 404 HTML', async () => {
    const response = await fetch(`${baseUrl}/api/estudio/users`)
    const payload = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(payload.error).toMatch(/estúdio/i)
  })

  it('cadastra só com sessão', async () => {
    const response = await fetch(`${baseUrl}/api/estudio/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nova@site.com',
        password: 'segredo12',
        promote: true,
      }),
    })
    const payload = (await response.json()) as { error: string }
    expect(response.status).toBe(401)
    expect(payload.error).toMatch(/estúdio/i)
  })
})
