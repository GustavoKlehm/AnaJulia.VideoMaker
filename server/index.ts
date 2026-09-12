import 'dotenv/config'
import app from './app'



const port = Number(process.env.PORT) || 3002 // Vite proxies /api here. Avoid 3001 — other local apps use it.


app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})


