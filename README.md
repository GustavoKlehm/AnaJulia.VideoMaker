# Ana Julia — Videomaker

Scaffold do catálogo: Vite + React, API Express e Postgres no Supabase. Deploy na Vercel.

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3001/api/health](http://localhost:3001/api/health)

## Variáveis

Copie `.env.example` e preencha as chaves do projeto no Supabase. Na Vercel, configure as mesmas variáveis no painel do projeto.

## Deploy

Conecte o repositório à Vercel. O build usa `vite build` e as rotas `/api/*` passam pelo Express em `api/index.ts`.
