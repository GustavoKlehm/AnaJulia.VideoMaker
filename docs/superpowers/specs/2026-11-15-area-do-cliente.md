# Área do cliente — spec

Data: 2026-11-15 · Status: aprovado, em implementação

## Objetivo

Trocar as páginas de aprovação do ExPx (GitHub Pages + planilha Google) por uma área logada no site da Ana, onde cada cliente entra com o telefone e um PIN, vê os planejamentos mensais, aprova cada post ou pede ajuste com um comentário, e conta novidades (promoção, evento).

## Decisões

| Tema | Decisão |
|---|---|
| Login | Telefone + PIN de 6 dígitos. Sem SMS. Por baixo é um usuário do Supabase Auth com e-mail sintético `<telefone>@portal.anajulia.app` e o PIN como senha. |
| Fonte da verdade | O ExPx. Clientes e contatos podem ser cadastrados pelo ExPx **ou** pelo estúdio (onboarding presencial), usando **as mesmas rotas da API**. |
| Planos | Criados e alterados **somente pelo ExPx** (rota exige o token do ExPx). O site só exibe. |
| Ajustes | Um comentário por post. A conversa detalhada a Ana faz direto com o cliente. |
| Vídeo extra | Fora do escopo por enquanto. |
| Visual | Um layout único (white-label). Cada cliente tem cor principal e secundária, usadas em todos os planos dele. |
| Versão interna | Fica no ExPx. Só o que o ExPx manda no plano é visível ao cliente. |

## Telefone

Aceita com ou sem máscara, com ou sem `+55`/`55`/`0` na frente, e com ou sem o 9 inicial:
`46999999999`, `469 9999 9999`, `46 9999 9999`, `46 9 9999 9999`, `46 9 99999999`, `(46) 99999-9999`, `+55 46 9999-9999`.

Regra: tira tudo que não é dígito, tira `55`/`0` de prefixo, e se sobrarem 10 dígitos com o número começando em 6–9 (celular sem o 9), insere o 9. O resultado precisa ter 11 dígitos no formato `DD9XXXXXXXX`. Fixo não é aceito. Na tela de login o campo usa a máscara `(XX) X XXXX-XXXX`.

## Modelo de dados

- `portal_clients`: slug, nome, instagram, cor_principal, cor_secundaria, ativo.
- `portal_contacts`: client_id, user_id, nome, telefone (11 dígitos), ativo. Um mesmo telefone pode ser contato de mais de um cliente e usa o mesmo login.
- `portal_plans`: client_id, periodo (ex.: `2026-12`), titulo, introducao, inicio, fim, status (`previa` | `publicado`), enviado_em.
- `portal_items`: plan_id, chave (id estável vindo do ExPx), data, formato, titulo, selos, secoes (jsonb), hash, versao, ordem, arquivado.
- `portal_reviews`: só inserção. item_id, versao, status (`aprovado` | `ajuste`), comentario, autor.
- `portal_notes`: as "novidades" que o cliente conta.

O status de um post é a última resposta **da versão atual**. Sem resposta nessa versão = pendente.

RLS: o cliente lê só os clientes de que é contato ativo e só planos `publicado`. Escritas do cliente passam por funções (`portal_review`, `portal_approve_pending`, `portal_add_note`, `portal_delete_note`) que conferem a permissão. Escritas de cadastro e plano passam pela API com service role. Admin (`is_admin()`) lê tudo.

## Reenvio de um plano

Idempotente: cliente pelo slug, plano por `slug + periodo`, post pela `chave`.

- Conteúdo mudou (formato, título, selos ou seções): `versao + 1`, volta a pendente, aparece como "atualizado" e o comentário anterior fica no histórico.
- Só a data mudou: atualiza a data e mantém a resposta.
- Post igual: mantém a resposta.
- Post que sumiu do envio: arquivado (respostas preservadas). Se voltar igual, é restaurado.

## Formato do plano (enviado pelo ExPx)

```json
{
  "periodo": "2026-12",
  "titulo": "Planejamento de dezembro",
  "introducao": "Aqui estão os 4 Reels de dezembro…",
  "inicio": "2026-12-01",
  "fim": "2026-12-31",
  "status": "publicado",
  "itens": [
    {
      "id": "2026-12-03-matriculas",
      "data": "2026-12-03",
      "formato": "reels",
      "titulo": "Matrículas abertas: qual turma é a sua?",
      "selos": ["~40 s", "com fala"],
      "secoes": [
        { "tipo": "texto", "titulo": "Objetivo", "texto": "…" },
        { "tipo": "cortes", "titulo": "Roteiro corte a corte",
          "cortes": [{ "tempo": "0–5 s", "cena": "…", "tela": "…", "fala": "…" }] },
        { "tipo": "roteiro", "titulo": "Fala", "linhas": ["[cena] frase…"] },
        { "tipo": "referencia", "titulo": "Referência", "url": "https://www.instagram.com/reel/…", "texto": "…" }
      ]
    }
  ]
}
```

Formatos: `reels`, `foto`, `carrossel`, `stories`, `video`. Tipos de seção: `texto`, `roteiro`, `cortes`, `referencia`.

## API (`/api/portal`)

Autenticação: `Authorization: Bearer <EXPX_SYNC_TOKEN>` (ExPx) ou `Bearer <JWT de admin>` (estúdio).

| Método | Rota | Quem | O quê |
|---|---|---|---|
| GET | `/clientes` | ExPx, estúdio | lista clientes |
| PUT | `/clientes/:slug` | ExPx, estúdio | cria/atualiza cliente; com `contatos`, sincroniza a lista e devolve os PINs novos |
| GET | `/clientes/:slug` | ExPx, estúdio | cliente, contatos e resumo dos planos |
| POST | `/clientes/:slug/contatos` | ExPx, estúdio | adiciona um contato (devolve PIN se o login for novo) |
| DELETE | `/clientes/:slug/contatos/:telefone` | ExPx, estúdio | desativa o contato |
| POST | `/clientes/:slug/contatos/:telefone/pin` | ExPx, estúdio | gera PIN novo |
| PUT | `/clientes/:slug/planos/:periodo` | **só ExPx** | envia o plano |
| GET | `/clientes/:slug/planos/:periodo/respostas` | ExPx, estúdio | respostas e novidades |

O PIN só aparece na resposta da API, uma vez. Não é guardado em lugar nenhum além do hash do Supabase Auth.

## Telas

- `/cliente`: login (telefone + PIN) e lista de planos.
- `/cliente/:slug/:periodo`: o plano, com calendário, cards, Aprovar / Pedir ajuste, "Aprovar os que faltam" e Novidades. Admin vê em modo leitura (inclusive planos em prévia).
- `/estudio/clientes`: lista e cadastro de cliente.
- `/estudio/clientes/:slug`: dados, cores, contatos (adicionar, novo PIN, desativar) e planos com resumo.

## Fora do escopo agora

Vídeo extra, notificações (e-mail/WhatsApp), comentários em conversa, migração dos clientes atuais (feita pelo ExPx depois, com as instruções em `docs/expx/`).
