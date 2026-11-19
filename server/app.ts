import express from 'express'
import { createStudioUser, listStudioUsers, promoteStudioUser } from './estudioRoutes'
import { deliveryAdminRouter, deliveryPublicRouter } from './deliveryRoutes'
import { portalRouter } from './portalRoutes'

const app = express()

// Planos do ExPx com roteiro completo passam fácil de 100 kB.
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/estudio/users', (req, res) => {
  void listStudioUsers(req, res)
})

app.post('/api/estudio/users', (req, res) => {
  void createStudioUser(req, res)
})

app.post('/api/estudio/users/promote', (req, res) => {
  void promoteStudioUser(req, res)
})

app.use('/api/portal', portalRouter())
app.use('/api/portal', deliveryAdminRouter())
app.use('/api/entregas', deliveryPublicRouter())

export default app
