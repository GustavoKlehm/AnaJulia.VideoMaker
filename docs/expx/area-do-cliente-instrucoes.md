# ExPx → Área do cliente: instruções de implantação

> Para: o agente (Claude) que trabalha no repositório **ExPx** (`C:\Users\Gustavo\Documents\ExPx`).
> Objetivo: trocar as páginas de aprovação no GitHub Pages + planilha Google pela **área do cliente** do site da Ana, alimentada pelo ExPx.
> Spec do lado do site: `AnaJulia.VideoMaker/docs/superpowers/specs/2026-11-15-area-do-cliente.md`.

---

## 1. O que muda

| Antes | Agora |
|---|---|
| `docs/<slug>/index.html` publicado no GitHub Pages | Plano enviado por API para o site da Ana. O cliente vê em `<site>/cliente` |
| Respostas na planilha Google (Apps Script, aba por cliente) | Respostas no banco do site. O ExPx puxa para `respostas.md` |
| Link aberto, sem login | Login por **celular + PIN de 6 dígitos** |
| Cores e layout copiados à mão em cada HTML | Layout único. Só mudam **duas cores** por cliente (`cliente.json`) |
| Versão "interna" em outra página | O que é interno simplesmente **não é enviado** |

**Regras que não mudam:**
- O ExPx é a fonte da verdade. A Ana cria o cliente, faz o plano e ajusta tudo aqui, e só então envia.
- **Planos só entram pelo ExPx.** O site não cria nem edita plano.
- Clientes e contatos podem ser criados pelo ExPx **ou** pelo estúdio do site (onboarding presencial). As rotas são as mesmas. Se o cliente já existir no site, o envio do ExPx atualiza (não duplica).

---

## 2. Configuração (uma vez)

No `.env` do ExPx (o `.gitignore` já impede que ele suba):

```
PORTAL_API_URL=https://<domínio do site da Ana>
EXPX_SYNC_TOKEN=<o mesmo valor configurado na Vercel>
```

- O `EXPX_SYNC_TOKEN` tem no mínimo 32 caracteres. Peça o valor ao Gustavo. **Nunca** coloque o token em arquivo dentro de `docs/` nem em commit.
- O repositório ExPx é **público** e só `docs/` sobe. Os arquivos novos (`cliente.json`, `plano.json`, `respostas.md`, o script) ficam fora de `docs/` e, portanto, não sobem. Mantenha assim.

---

## 3. `clientes/<slug>/cliente.json`

Criado no onboarding, junto com a `ficha.md`. O `<slug>` é o nome da pasta do cliente e vira o endereço no site.

```json
{
  "nome": "Soul Circo",
  "instagram": "@soul_circo",
  "cores": { "principal": "#b8322a", "secundaria": "#f9e0dc" },
  "contatos": [
    { "nome": "Vanessa Kauane", "telefone": "46 9 9999-9999" }
  ]
}
```

| Campo | Regra |
|---|---|
| `nome` | 1 a 120 caracteres |
| `instagram` | opcional. O `@` é acrescentado se faltar |
| `cores.principal` | cor de destaque (topo, botões, datas). `#rrggbb` ou `#rgb` |
| `cores.secundaria` | cor de fundo suave (cabeçalho do plano, dias com post). Normalmente um tom bem claro |
| `contatos` | quem pode entrar. **Lista completa**: quem sair da lista é desativado no próximo envio. Até 20 pessoas |
| `contatos[].telefone` | celular com DDD, em qualquer formato: `46999999999`, `46 9 9999 9999`, `(46) 9999-9999` (sem o 9 também serve), `+55…`. Fixo não é aceito |

Sobre as cores:
- Escolha a partir da identidade do cliente (`materiais/referencias/`, Instagram, logo).
- O site corrige sozinho o contraste se a principal for clara demais (ex.: rosa bebê). Mesmo assim, prefira uma principal com presença e uma secundária clara.
- As cores valem para **todos** os planos do cliente. Para trocar, edite o `cliente.json` e envie de novo.

Atualize também o `clientes/_modelo-cliente/` com um `cliente.json` de exemplo, para todo cliente novo já nascer com ele.

---

## 4. `clientes/<slug>/planos/<periodo>/plano.json`

Gerado ao final do planejamento, na mesma pasta do plano. O `<periodo>` é o nome da pasta: `2026-12`, ou `2026-11-e-12` quando o plano cobre dois meses.

```json
{
  "titulo": "Planejamento de dezembro",
  "introducao": "Aqui estão os 4 Reels de dezembro, um por semana. Cada vídeo tem o roteiro corte a corte e a legenda pronta.",
  "inicio": "2026-12-01",
  "fim": "2026-12-31",
  "itens": [
    {
      "id": "2026-12-03-matriculas",
      "data": "2026-12-03",
      "formato": "reels",
      "titulo": "Matrículas abertas: qual turma é a sua?",
      "selos": ["~40 s", "com fala"],
      "secoes": [
        { "tipo": "texto", "titulo": "Objetivo", "texto": "Avisar que as matrículas abriram e mostrar, turma por turma, o que cada uma agrega." },
        { "tipo": "cortes", "titulo": "Roteiro corte a corte", "cortes": [
          { "tempo": "0–5 s", "cena": "Dona olhando pra câmera", "tela": "Já garantiu sua vaga pra 2027? 🎪", "fala": "“Já garantiu a vaga do seu filho…”" }
        ]},
        { "tipo": "roteiro", "titulo": "Roteiro falado", "linhas": ["[caixa vazia, mãos entrando] Alguns presentes vão muito além de uma roupinha."] },
        { "tipo": "texto", "titulo": "Legenda", "texto": "🎪 Já garantiu a vaga…\n\n#circo #doisvizinhos" },
        { "tipo": "referencia", "titulo": "Referência", "url": "https://www.instagram.com/reel/DePnZT8ve9h/", "texto": "O ritmo dos cortes é parecido com este." }
      ]
    }
  ]
}
```

### Regras de validação (o site recusa com mensagem clara se falhar)

| Campo | Regra |
|---|---|
| `titulo` | até 200 caracteres |
| `introducao` | opcional, até 4000. Quebras de linha são respeitadas |
| `inicio`, `fim` | `AAAA-MM-DD`, no máximo ~3 meses de intervalo |
| `status` | opcional: `publicado` (padrão) ou `previa` (só a Ana vê) |
| `itens` | 1 a 120 posts |
| `itens[].id` | **id estável** do post: letras, números, `.` `_` `:` `-`, até 80. É ele que liga as respostas do cliente ao post entre um envio e outro. **Não mude o id de um post que já foi enviado.** Sugestão: `<data>-<palavra-chave>` |
| `itens[].data` | dentro de `inicio`..`fim` |
| `itens[].formato` | `reels`, `foto`, `carrossel`, `stories` ou `video` |
| `itens[].selos` | opcional, até 8 rótulos curtos (até 40 caracteres): duração, "com fala", "sem fala", horário… |
| `itens[].secoes` | 1 a 30, na ordem em que o cliente vai ler |

Tipos de seção:

| `tipo` | Campos | Uso |
|---|---|---|
| `texto` | `titulo`, `texto` | objetivo, ideia, texto na tela, legenda, música/áudio |
| `roteiro` | `titulo`, `linhas[]` | roteiro falado linha a linha. Trechos entre `[colchetes]` aparecem como deixa de cena |
| `cortes` | `titulo`, `cortes[]` com `tempo`, `cena`, `tela`, `fala` | roteiro corte a corte (cada corte precisa de pelo menos cena, tela ou fala) |
| `referencia` | `titulo`, `url` (https), `texto` opcional | link de referência. Para um Reel do Instagram: `https://www.instagram.com/reel/<id>/` |

### O que vai para o cliente (e o que fica no ExPx)

Só entra no `plano.json` o que o **cliente** deve ler. Padrão, seguindo as páginas que já foram aprovadas pela Ana:

| Vai para o cliente | Fica só no ExPx |
|---|---|
| Objetivo, a ideia, roteiro (cortes ou falado), texto na tela, legenda, música/áudio, referência | "Como gravar", trend/estratégia, gatilho de engajamento, notas de QA, hooks descartados, observações internas |

Na dúvida, siga a versão "cliente" da última página daquele cliente (ex.: `docs/soul-circo/index.html` versus `docs/soul-circo/interno/index.html`) ou pergunte à Ana.

### Mapeamento do formato antigo (array `V` das páginas)

| Antes (`V`) | Agora |
|---|---|
| `d` | `data` |
| `k` (`reels`/`foto`) | `formato` (carrossel de fotos → `carrossel`) |
| `t` | `titulo` |
| `dur`, `fala` | `selos`: `"~40 s"`, `"com fala"` / `"sem fala"` |
| `obj` | seção `texto` "Objetivo" |
| `ideia` | seção `texto` "A ideia" |
| `cortes: [[tempo, cena, tela, fala]]` | seção `cortes` |
| `rot: [...]` | seção `roteiro` |
| `tela` | seção `texto` "Texto na tela" |
| `leg` | seção `texto` "Legenda" |
| `audio` | seção `texto` "Música" ou "Áudio" |
| `id` (Reel de referência) | seção `referencia` com `https://www.instagram.com/reel/<id>/` |
| `trend`, `engaj`, `gravar`, `aud` | não enviar (interno) |

---

## 5. Reenviar um plano (ajustes)

O envio é **idempotente**: pode enviar quantas vezes quiser.

| Situação | O que o site faz |
|---|---|
| Post com o mesmo `id` e o **conteúdo mudou** (formato, título, selos ou seções) | Vira versão nova, volta para "para avaliar" e aparece como **"atualizado"**, com o pedido de ajuste anterior visível |
| Só a **data** mudou | Atualiza a data e mantém a aprovação |
| Post igual | Mantém a resposta |
| Post que **sumiu** do `plano.json` | Arquivado (some para o cliente; as respostas ficam guardadas). Se voltar igual, é restaurado |
| `id` novo | Post novo, para avaliar |

Fluxo de ajuste: `respostas` → a squad corrige os posts com ajuste **mantendo o `id`** → `plano` de novo.

---

## 6. Script `ferramentas/portal/portal.mjs`

Crie este arquivo exatamente como está (Node 18+, sem dependências). Ele fica fora de `docs/` e não é publicado.

```js
#!/usr/bin/env node
// Área do cliente da Ana: envia clientes e planos do ExPx para o site e puxa as respostas.
// Uso:
//   node ferramentas/portal/portal.mjs clientes
//   node ferramentas/portal/portal.mjs cliente <slug>
//   node ferramentas/portal/portal.mjs plano <slug> <periodo> [--previa]
//   node ferramentas/portal/portal.mjs respostas <slug> <periodo>
//   node ferramentas/portal/portal.mjs contato <slug> "<nome>" <telefone>
//   node ferramentas/portal/portal.mjs pin <slug> <telefone>
//   node ferramentas/portal/portal.mjs desativar <slug> <telefone>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

for (const line of existsSync(join(ROOT, '.env')) ? readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/) : []) {
  const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const API = (process.env.PORTAL_API_URL || '').replace(/\/+$/, '')
const TOKEN = process.env.EXPX_SYNC_TOKEN || ''

function die(message) {
  console.error(`✖ ${message}`)
  process.exit(1)
}

const fmtTel = (t) => String(t).replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4')
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
const isSlug = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || '')

async function api(method, path, body) {
  if (!API) die('Falta PORTAL_API_URL no .env (ex.: https://anajulia.com.br).')
  if (TOKEN.length < 32) die('Falta EXPX_SYNC_TOKEN no .env (mínimo 32 caracteres, o mesmo da Vercel).')
  let res
  try {
    res = await fetch(`${API}/api/portal${path}`, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    die(`Não consegui falar com ${API}: ${error.message}`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) die(`${res.status} — ${data.error || res.statusText}`)
  return data
}

function readJson(path) {
  if (!existsSync(path)) die(`Não achei ${path}`)
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    die(`${path} não é um JSON válido: ${error.message}`)
  }
}

function needSlug(slug) {
  if (!isSlug(slug)) die(`Slug inválido: "${slug ?? ''}". Use o nome da pasta do cliente (ex.: soul-circo).`)
}

function printAccess(list) {
  for (const a of list ?? []) {
    console.log(`\n──── Mensagem para ${a.nome} — mande pelo WhatsApp. O PIN não fica salvo em lugar nenhum. ────`)
    console.log(a.mensagem)
    console.log('────')
  }
}

function toMarkdown(r) {
  const label = { aprovado: '✅ Aprovado', ajuste: '✏️ Ajuste pedido', pendente: '⏳ Sem resposta' }
  const s = r.resumo
  const out = [
    `# Respostas — ${r.cliente.nome} · ${r.plano.titulo}`,
    '',
    `Lido em ${new Date().toLocaleString('pt-BR')}. ${s.aprovados} aprovados · ${s.ajustes} com ajuste · ${s.pendentes} sem resposta (de ${s.total}).`,
    ...(r.plano.status === 'previa' ? ['', '> Plano em PRÉVIA: o cliente ainda não vê.'] : []),
    '',
    '| Data | Post (id) | Versão | Resposta | Quem | Comentário |',
    '|---|---|---|---|---|---|',
    ...r.itens.map(
      (i) => `| ${i.data} | ${esc(i.titulo)} (\`${i.id}\`) | ${i.versao} | ${label[i.status]} | ${esc(i.autor)} | ${esc(i.comentario)} |`,
    ),
  ]
  const ajustes = r.itens.filter((i) => i.status === 'ajuste')
  if (ajustes.length) {
    out.push('', '## Ajustes para fazer (mantenha o mesmo id ao corrigir)', '')
    for (const i of ajustes) out.push(`- **${i.titulo}** (\`${i.id}\`, ${i.data}): ${i.comentario.replace(/\r?\n/g, ' ')}`)
  }
  if (r.novidades.length) {
    out.push('', '## Novidades contadas pelo cliente', '')
    for (const n of r.novidades) {
      const quando = n.quando ? ` — ${n.quando}` : ''
      const detalhes = n.detalhes ? `: ${n.detalhes.replace(/\r?\n/g, ' ')}` : ''
      out.push(`- **${n.titulo}**${quando}${detalhes} _(${n.autor}, ${new Date(n.em).toLocaleDateString('pt-BR')})_`)
    }
  }
  return `${out.join('\n')}\n`
}

const [cmd, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const args = rest.filter((a) => !a.startsWith('--'))

switch (cmd) {
  case 'clientes': {
    const r = await api('GET', '/clientes')
    for (const c of r.clientes) {
      console.log(`${c.slug.padEnd(24)} ${c.nome} · ${c.contatosAtivos} contato(s) · ${c.planos} plano(s)${c.ultimoPlano ? ` · último ${c.ultimoPlano}` : ''}${c.ativo ? '' : ' · DESATIVADO'}`)
    }
    if (!r.clientes.length) console.log('Nenhum cliente no site ainda.')
    break
  }
  case 'cliente': {
    const [slug] = args
    needSlug(slug)
    const { slug: _ignored, ...body } = readJson(join(ROOT, 'clientes', slug, 'cliente.json'))
    const r = await api('PUT', `/clientes/${slug}`, body)
    console.log(`✔ ${r.criado ? 'Cliente criado' : 'Cliente atualizado'}: ${r.cliente.nome}`)
    for (const c of r.contatos) console.log(`  • ${c.nome} ${fmtTel(c.telefone)}${c.ativo ? '' : ' (desativado)'}`)
    if (r.reaproveitados?.length) console.log(`  Já tinham login por outro cliente (mesmo PIN): ${r.reaproveitados.map(fmtTel).join(', ')}`)
    if (r.desativados?.length) console.log(`  Desativados (saíram do cliente.json): ${r.desativados.map(fmtTel).join(', ')}`)
    printAccess(r.acessos)
    break
  }
  case 'plano': {
    const [slug, periodo] = args
    needSlug(slug)
    if (!isSlug(periodo)) die('Informe o período (nome da pasta do plano), ex.: 2026-12.')
    const data = readJson(join(ROOT, 'clientes', slug, 'planos', periodo, 'plano.json'))
    if (data.periodo && data.periodo !== periodo) die(`plano.json diz periodo "${data.periodo}", mas a pasta é "${periodo}".`)
    const body = { ...data, periodo, status: flags.has('--previa') ? 'previa' : data.status || 'publicado' }
    const r = await api('PUT', `/clientes/${slug}/planos/${periodo}`, body)
    console.log(`✔ Plano ${periodo} ${r.status === 'previa' ? 'enviado como PRÉVIA (só a Ana vê)' : 'publicado para o cliente'}`)
    console.log(`  novos ${r.novos} · alterados ${r.alterados} (voltam para avaliação) · mantidos ${r.mantidos} · arquivados ${r.arquivados}`)
    console.log(`  ${r.link}`)
    break
  }
  case 'respostas': {
    const [slug, periodo] = args
    needSlug(slug)
    if (!isSlug(periodo)) die('Informe o período, ex.: 2026-12.')
    const r = await api('GET', `/clientes/${slug}/planos/${periodo}/respostas`)
    const dir = join(ROOT, 'clientes', slug, 'planos', periodo)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'respostas.json'), `${JSON.stringify(r, null, 2)}\n`)
    writeFileSync(join(dir, 'respostas.md'), toMarkdown(r))
    console.log(`✔ ${r.resumo.aprovados} aprovados · ${r.resumo.ajustes} com ajuste · ${r.resumo.pendentes} sem resposta`)
    console.log(`  Salvo em clientes/${slug}/planos/${periodo}/respostas.md`)
    break
  }
  case 'contato': {
    const [slug, nome, telefone] = args
    needSlug(slug)
    if (!nome || !telefone) die('Uso: contato <slug> "<nome>" <telefone>')
    const r = await api('POST', `/clientes/${slug}/contatos`, { nome, telefone })
    console.log(`✔ ${r.contato.nome} ${fmtTel(r.contato.telefone)} adicionado`)
    if (r.reaproveitado) console.log('  Esse celular já tinha login: entra com o mesmo PIN de antes.')
    printAccess(r.acesso ? [r.acesso] : [])
    console.log('  Lembrete: acrescente essa pessoa no cliente.json, senão o próximo envio do cliente desativa o acesso.')
    break
  }
  case 'pin': {
    const [slug, telefone] = args
    needSlug(slug)
    const tel = String(telefone ?? '').replace(/\D/g, '')
    if (!tel) die('Uso: pin <slug> <telefone>')
    const r = await api('POST', `/clientes/${slug}/contatos/${tel}/pin`)
    printAccess([r.acesso])
    break
  }
  case 'desativar': {
    const [slug, telefone] = args
    needSlug(slug)
    const tel = String(telefone ?? '').replace(/\D/g, '')
    if (!tel) die('Uso: desativar <slug> <telefone>')
    await api('DELETE', `/clientes/${slug}/contatos/${tel}`)
    console.log('✔ Acesso desativado. Tire a pessoa do cliente.json também.')
    break
  }
  default:
    die('Comandos: clientes | cliente <slug> | plano <slug> <periodo> [--previa] | respostas <slug> <periodo> | contato <slug> "<nome>" <tel> | pin <slug> <tel> | desativar <slug> <tel>')
}
```

Observação: em `pin` e `desativar`, o telefone vai na URL só com dígitos. O site também aceita o número sem o 9 e com `55` na frente, e normaliza do lado dele.

---

## 7. Nova skill: substituir `pagina-aprovacao` por `portal-cliente`

Apague `.claude/skills/pagina-aprovacao/` e crie `.claude/skills/portal-cliente/SKILL.md` com:

```markdown
---
name: portal-cliente
description: Envia clientes e planos de conteúdo da Ana para a área do cliente do site (login por celular + PIN) e puxa as respostas (aprovações, ajustes, novidades). Use sempre que a Ana pedir para publicar/enviar um planejamento, criar acesso para um cliente, gerar PIN novo, ver o que o cliente respondeu ou ajustar um plano já enviado.
---

# Área do cliente

O cliente vê os planos em <PORTAL_API_URL>/cliente, entrando com o celular e um PIN.
Tudo é enviado pelo script `ferramentas/portal/portal.mjs` (precisa de PORTAL_API_URL e EXPX_SYNC_TOKEN no .env).
Planos só entram por aqui; o site nunca cria plano.

## Cliente novo
1. Onboarding normal (ficha.md) + `clientes/<slug>/cliente.json` com nome, instagram, as duas cores e os contatos (celular com DDD).
2. `node ferramentas/portal/portal.mjs cliente <slug>`.
3. O comando mostra uma mensagem com link, telefone e PIN para cada contato novo. Entregue essa mensagem para a Ana mandar no WhatsApp do cliente. O PIN aparece uma vez só: não salve em arquivo nenhum.
4. Se o cliente já foi cadastrado pela Ana no estúdio do site, o comando só atualiza. Confira com `clientes` antes, se tiver dúvida do slug.

## Publicar um plano
1. Gere `clientes/<slug>/planos/<periodo>/plano.json` (formato em `docs/expx/area-do-cliente-instrucoes.md` do site, ou no modelo do último plano enviado). Só conteúdo para o cliente: nada de "como gravar", estratégia, QA.
2. Cada post tem um `id` estável. Nunca mude o id de um post já enviado.
3. Se a Ana quiser conferir antes: `plano <slug> <periodo> --previa` e ela abre o link logada no estúdio.
4. `node ferramentas/portal/portal.mjs plano <slug> <periodo>` publica. Passe o link para a Ana.
5. Registre na ficha.md (Histórico de planos): período, quantidade de posts e o link.

## Ver respostas e ajustar
1. `node ferramentas/portal/portal.mjs respostas <slug> <periodo>` grava `respostas.md` na pasta do plano.
2. Corrija os posts com ajuste no plano.json mantendo o mesmo id e envie de novo com `plano`. O cliente vê esses posts como "atualizado" e avalia de novo; os aprovados continuam aprovados.
3. Novidades que o cliente contou (promoção, evento) aparecem no fim do respostas.md: leve em conta no próximo planejamento.

## Acesso
- Esqueceu o PIN: `pin <slug> <telefone>`, e a Ana manda a mensagem nova.
- Pessoa nova: acrescente no cliente.json e rode `cliente <slug>` (ou `contato <slug> "<nome>" <telefone>` e depois atualize o cliente.json).
- Tirar acesso: remova do cliente.json e rode `cliente <slug>` (ou `desativar <slug> <telefone>`).

## Erros comuns
- 401/403: token ausente ou diferente do da Vercel.
- 404 "cliente não existe": envie o cliente antes do plano.
- 400: a mensagem diz o campo exato (ex.: `itens[2].data está fora do período do plano`). Corrija o JSON e reenvie.
```

---

## 8. Ajustes na squad e no onboarding

1. **`squads/@expxagents-gabriel/planejador-de-conteudo/agents/montador-calendario.md`**: além (ou no lugar) do HTML, a entrega final passa a ser `clientes/<slug>/planos/<periodo>/plano.json` no formato da seção 4, com ids estáveis e só o conteúdo para o cliente. O HTML do calendário pode continuar como prévia interna, se a Ana quiser.
2. **`despachante-producao`** (ou o último passo da squad): ao terminar, ofereça rodar `plano <slug> <periodo> --previa` e, depois do OK da Ana, `plano <slug> <periodo>`.
3. **Onboarding de cliente** (`clientes/_modelo-cliente/` e quem cria cliente novo): gerar o `cliente.json` junto com a `ficha.md`, perguntando à Ana as duas cores e o celular de quem vai aprovar.
4. **`clientes/README.md`**: acrescente `cliente.json` e `planos/<periodo>/plano.json`, `respostas.md` à árvore.
5. Remova da memória e das skills qualquer instrução de publicar em `docs/`, mexer em `ABAS` do Apps Script ou pedir para a Ana reimplantar o script.

---

## 9. Migração dos clientes atuais

Faça na ordem, um cliente por vez, e confira antes de seguir:

1. **`cliente.json`** para `glamour-beauty`, `baby-charme` e `soul-circo`. As cores atuais estão no `:root` de cada `docs/<slug>/index.html` (`--accent` → principal, `--accent-soft` → secundária). O contato está na `ficha.md`. **Peça o celular de cada contato à Ana**: as fichas não têm telefone.
2. `cliente <slug>` para cada um. Guarde as mensagens de PIN para a Ana mandar **só depois** que o plano estiver lá.
3. **Planos em andamento**: converta o array `V` da página atual (ou `pagina/v.js` da Soul Circo) para `plano.json`, usando o mapeamento da seção 4 e a versão **cliente** (não a interna). Envie com `--previa`, peça para a Ana conferir no site e depois envie sem `--previa`.
4. **Respostas antigas** (planilha): não migram automaticamente. Antes de trocar o link, leia a aba do cliente na planilha e, para cada post já aprovado lá, avise a Ana. O cliente precisará aprovar de novo no site, ou a Ana segue o mês corrente pela planilha e o site vale a partir do próximo plano. **Pergunte à Ana qual dos dois ela prefere** para cada cliente.
5. **Links antigos**: depois que o cliente estiver usando o site, troque `docs/<slug>/index.html` por um redirecionamento (e apague `docs/soul-circo/interno/`):
   ```html
   <!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=<PORTAL_API_URL>/cliente">
   <title>Área do cliente</title><p>O planejamento agora fica na <a href="<PORTAL_API_URL>/cliente">área do cliente</a>.</p>
   ```
   Commit e push só desses arquivos em `docs/`.
6. Quando os três estiverem migrados: avise o Gustavo para desativar a implantação do Apps Script (a planilha pode ficar como histórico).

---

## 10. Como testar antes de mexer em cliente real

1. `node ferramentas/portal/portal.mjs clientes` responde sem erro (token ok).
2. Crie um cliente de teste `teste-expx` com o celular do Gustavo, envie um `plano.json` pequeno com `--previa`, abra o link logado como Ana e confira o visual com as cores.
3. Envie sem `--previa`, entre em `/cliente` com o celular e o PIN, aprove um post e peça ajuste em outro.
4. `respostas teste-expx <periodo>`: o `respostas.md` deve mostrar as duas respostas.
5. Mude o texto do post com ajuste (mesmo id), envie de novo: o resultado deve dizer `alterados 1`, e no site o post aparece como "atualizado".
6. Remova o contato do `cliente.json` e rode `cliente teste-expx`: o login deve parar de ver o plano. Depois peça ao Gustavo para apagar o cliente de teste.

---

## 11. Entregas de vídeo (opcional, 2026-11-19)

O site agora tem **entregas**: a Ana sobe vídeos/fotos e o cliente recebe um link `/entrega/<token>` que abre sem login. Hoje isso é feito pela tela do estúdio (`/estudio/entregas`) e **não exige nada do ExPx**. Nada do que está acima mudou.

Se um dia o ExPx quiser criar entregas, as rotas aceitam o mesmo `EXPX_SYNC_TOKEN`. Resumo (detalhes em `AnaJulia.VideoMaker/docs/superpowers/specs/2026-11-19-entregas.md`):

- `POST /api/portal/clientes/<slug>/entregas` com `{ "titulo": "...", "dataEvento": "AAAA-MM-DD", "expiraEm": "AAAA-MM-DD" }` → devolve `entrega.id` e `entrega.link`.
- Para cada arquivo: `POST /api/portal/entregas/<id>/arquivos/envio` `{ nome, tamanho }` → `PUT` do arquivo na `signedUrl` com `content-type: tipo` → `POST /api/portal/entregas/<id>/arquivos` `{ path, nome }`.
- O link e a validade aparecem na resposta; o cliente precisa existir antes (mesmo `slug`).
- No `PUT`, mande também `cache-control: max-age=31536000` (o arquivo nunca muda; economiza banda do Supabase).
- Para a capa de um vídeo aparecer, suba junto uma foto com o mesmo nome + `-still` (ex.: `IMG_1234.MOV` e `IMG_1234-still.jpeg`).
- Desde 2026-11-23, `GET /api/portal/entregas/<id>` **não traz mais** `url`/`download` dos vídeos (só `url` das fotos e `capa` dos vídeos). Para assistir ou baixar: `GET /api/portal/entregas/<id>/arquivos/<fileId>/url?modo=assistir|baixar` → `{ url, validaAte }`.
