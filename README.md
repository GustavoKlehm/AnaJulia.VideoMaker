# Ana Julia — Videomaker

Scaffold do catálogo: Vite + React, API Express e Postgres no Supabase. Deploy na Vercel.

## Desenvolvimento

```bash
cp .env.example .env
npm install
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- API: [http://localhost:3002/api/health](http://localhost:3002/api/health)

O botão de ajuda (home e `/planos`) usa a Groq. Crie uma chave gratuita em [console.groq.com](https://console.groq.com) e coloque em `GROQ_API_KEY`. Sem ela, o painel avisa que a ajuda está indisponível e aponta o WhatsApp. Na Vercel, configure a mesma variável.

## Variáveis

Copie `.env.example` e preencha as chaves do projeto no Supabase e a `GROQ_API_KEY`. Na Vercel, configure as mesmas variáveis no painel do projeto.

## Deploy

Conecte o repositório à Vercel. O build usa `vite build` e as rotas `/api/*` passam pelo Express em `api/index.ts`.
