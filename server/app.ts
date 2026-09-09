import express from 'express'

const app = express()

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

export default app
