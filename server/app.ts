import express from 'express'
import { postAssistente } from './assistenteRoutes'
import { createStudioUser, listStudioUsers, promoteStudioUser } from './estudioRoutes'

const app = express()

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/assistente', (req, res) => {
  void postAssistente(req, res)
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

export default app
