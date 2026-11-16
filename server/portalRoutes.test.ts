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

describe('rotas do portal', () => {
  it('cadastro pede login ou token', async () => {
    const response = await fetch(`${baseUrl}/api/portal/clientes`)
    expect(response.status).toBe(401)
    expect(((await response.json()) as { error: string }).error).toMatch(/ExPx/)
  })

  it('plano só entra pelo token do ExPx, nem com sessão do estúdio', async () => {
    const response = await fetch(`${baseUrl}/api/portal/clientes/soul-circo/planos/2026-12`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer jwt-do-estudio' },
      body: JSON.stringify({ titulo: 'x' }),
    })
    expect(response.status).toBe(403)
    expect(((await response.json()) as { error: string }).error).toMatch(/só são enviados pelo ExPx/)
  })
})
