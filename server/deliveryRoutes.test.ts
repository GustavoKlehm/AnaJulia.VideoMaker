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

describe('rotas de entrega', () => {
  it('gerenciar entregas pede login do estúdio ou token do ExPx', async () => {
    for (const [method, path] of [
      ['GET', '/api/portal/entregas'],
      ['POST', '/api/portal/clientes/soul-circo/entregas'],
      ['POST', '/api/portal/entregas/00000000-0000-0000-0000-000000000000/arquivos/envio'],
    ] as const) {
      const response = await fetch(`${baseUrl}${path}`, { method })
      expect(response.status).toBe(401)
    }
  })

  it('link com formato inválido não chega no banco', async () => {
    const response = await fetch(`${baseUrl}/api/entregas/curto`)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('limpeza só roda com o segredo do cron', async () => {
    const response = await fetch(`${baseUrl}/api/entregas/limpeza`, {
      headers: { Authorization: 'Bearer errado' },
    })
    expect(response.status).toBe(401)
  })
})
