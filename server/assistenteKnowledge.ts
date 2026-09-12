export type AssistenteLineId = 'momentos' | 'ocasioes' | 'marcas'

export type AssistenteTier = {
  id: string
  name: string
  need: string
  capture: string
  delivery: string[]
  price: number
}

export type AssistenteLine = {
  id: string
  title: string
  promise: string
  lead: string
  tiers: AssistenteTier[]
}

export type AssistenteCatalog = {
  slogan: string
  about: { heading: string; p1: string; p2: string }
  contact: { heading: string; lead: string }
  lines: AssistenteLine[]
  addOns: { label: string; value: string }[]
  pieces: { name: string; purpose: string; body: string }[]
  rules: { title: string; body: string }[]
  custom: { title: string; lead: string; floor: number }
}

export type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistenteRecommendation = {
  tipo: AssistenteLineId
  plano: string
}

export type AssistenteReply = {
  reply: string
  recommendation: AssistenteRecommendation | null
  customQuote: boolean
}

const LINE_IDS = new Set<AssistenteLineId>(['momentos', 'ocasioes', 'marcas'])
const MAX_TURNS = 8
const MAX_CHARS = 500

const OCASIOES_GUIDE = `## Como escolher Ocasiões
São só duas perguntas, nesta ordem:
1. Como recebe: só captação (bruto) ou captação + edição.
2. Quanto tempo: meia diária / meio período (até 4h) ou diária / dia inteiro (até 8h).

A combinação define o plano. Não existe terceira pergunta.
- só captação + meia diária → captacao-meia
- só captação + diária → captacao-diaria
- edição + meia diária → meia-diaria
- edição + diária → diaria

Se a pessoa já disse edição e meio período, o plano é meia-diaria. Não pergunte se prefere meia diária ou diária: isso já foi o tempo.`

const LINE_GUIDE = `## Qual linha: Momentos ou Ocasiões
Casamento, 15 anos, batizado, formatura ou festa não definem a linha sozinhos.
Pergunte primeiro se quer a cobertura do evento inteiro ou só um momento.

- Evento inteiro, o dia, a cerimônia e a festa, meio período ou diária → Ocasiões. Depois use "Como escolher Ocasiões".
- Só um momento (entrada, voto, um recorte, ensaio, casamento simples) → Momentos. Depois use "Como escolher Momentos".
- Casamento simples sem mais detalhe: explique os três e, se a pessoa não souber escolher, o meio-termo é História (id: historia).
Não assuma Ocasiões só porque o tema é casamento.`

const MOMENTOS_GUIDE = `## Como escolher Momentos
Pergunte na linguagem da necessidade, não pelos nomes: como você quer guardar esse momento?
- Instante pontual, 1h, um filme curto → retrato
- Contar com mais detalhe, 2h, filme + cortes → historia (meio-termo)
- Viver o encontro com mais tempo, 4h, filme + teaser + cortes → capitulo

Se a pessoa disser que não sei o que é Retrato, História ou Capítulo: explique cada um em uma frase (necessidade, tempo, o que recebe) e, na mesma resposta, diga que História é o meio-termo se ainda estiver em dúvida. Não repita a mesma pergunta pelos nomes.
Não pergunte só Retrato, História ou Capítulo.`

const FORMAT_GUIDE = `## Como formatar a resposta
Use quebras de linha reais (\\n) no campo reply. Quando houver duas ou mais opções, uma opção por linha, começando com "• ".
Pergunta no topo, lista no meio, fecho depois da lista.
Não junte opções com ponto e vírgula nem em um único parágrafo.

Exemplo obrigatório quando for explicar Momentos:
Como você quer guardar esse momento?

• Instante pontual — 1h, um filme curto (Retrato)
• Mais detalhe — 2h, filme de até 2 min + cortes (História, meio-termo)
• Mais tempo — 4h, filme + teaser + cortes (Capítulo)

Se ainda estiver em dúvida, História é o meio-termo.`

const RULES_GUIDE = `## Como responder regras
Cancelamento e remarcação estão no catálogo, na seção Regras. Responda com o texto das regras.
Não recuse pergunta de cancelamento, remarcação, sinal, prazo, deslocamento, revisão, trilha ou direitos.
Responda só a regra pedida, em 2 ou 3 frases. Não cole a seção Regras inteira.
Isso não é política partidária nem assunto de WhatsApp, a menos que a pessoa queira negociar uma exceção.`

const COMPOSE_GUIDE = `## Como montar um pedido especial
Antes de personalizado, tente plano-base + adicionais, com os preços do catálogo.
Exemplo: evento de 8h com edição em Dois Vizinhos → diaria. Filme de até 5 min já cabe. Cortes/teaser inclusos são os do plano; peça vertical extra a R$ 180; versão no outro formato (horizontal) a R$ 90. Deslocamento incluso na cidade.
Mostre a conta em lista. Não invente um total que o catálogo não fecha. Não diga que "não se encaixa em nenhum plano" se a Diária ou outro plano cobre a captação.
Personalizado só quando a captação ou a entrega não tiverem plano-base, ou quando a pessoa recusar o plano sugerido e pedir proposta personalizada. Aí customQuote: true, recommendation: null, e diga que vamos analisar a demanda e montar a proposta no WhatsApp. Não prometa enviar proposta, orçamento ou e-mail por aqui.`

export function catalogToKnowledge(catalog: AssistenteCatalog): string {
  const lines = catalog.lines
    .map((line) => {
      const tiers = line.tiers
        .map((tier) => {
          const delivery = tier.delivery.map((item) => `    - ${item}`).join('\n')
          return `  - ${tier.name} (id: ${tier.id}) — R$ ${tier.price}\n    Necessidade: ${tier.need}\n    Captação: ${tier.capture}\n    Entrega:\n${delivery}`
        })
        .join('\n')
      return `## ${line.title} (id: ${line.id})\n${line.promise}\n${line.lead}\n${tiers}`
    })
    .join('\n\n')

  const lineIds = new Set(catalog.lines.map((line) => line.id))
  const hasOcasioes = lineIds.has('ocasioes')
  const hasMomentos = lineIds.has('momentos')
  const hasLineChoice = hasOcasioes && hasMomentos

  const addOns = catalog.addOns.map((item) => `- ${item.label}: ${item.value}`).join('\n')
  const pieces = catalog.pieces
    .map((item) => `- ${item.name} (${item.purpose}): ${item.body}`)
    .join('\n')
  const rules = catalog.rules.map((item) => `- ${item.title}: ${item.body}`).join('\n')

  return [
    `# Catálogo do site Ana Julia`,
    `Slogan: ${catalog.slogan}`,
    `## ${catalog.about.heading}`,
    catalog.about.p1,
    catalog.about.p2,
    `## ${catalog.contact.heading}`,
    catalog.contact.lead,
    lines,
    hasLineChoice ? LINE_GUIDE : '',
    hasMomentos ? MOMENTOS_GUIDE : '',
    hasOcasioes ? OCASIOES_GUIDE : '',
    FORMAT_GUIDE,
    RULES_GUIDE,
    COMPOSE_GUIDE,
    `## ${catalog.custom.title} (a partir de R$ ${catalog.custom.floor})`,
    catalog.custom.lead,
    `## Adicionais`,
    addOns,
    `## Peças`,
    pieces,
    `## Regras`,
    rules,
  ]
    .filter((block) => block.length > 0)
    .join('\n\n')
}

function extractJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
      try {
        return JSON.parse(fenced[1]) as unknown
      } catch {
        return null
      }
    }
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as unknown
      } catch {
        return null
      }
    }
    return null
  }
}

export function parseModelPayload(
  raw: string,
  catalog: AssistenteCatalog,
): AssistenteReply | null {
  const parsed = extractJson(raw)
  if (parsed === null) {
    return null
  }

  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const reply = (parsed as { reply?: unknown }).reply
  if (typeof reply !== 'string' || reply.trim() === '') {
    return null
  }

  return {
    reply: reply.trim(),
    recommendation: sanitizeRecommendation((parsed as { recommendation?: unknown }).recommendation, catalog),
    customQuote: (parsed as { customQuote?: unknown }).customQuote === true,
  }
}

function sanitizeRecommendation(
  raw: unknown,
  catalog: AssistenteCatalog,
): AssistenteRecommendation | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const tipo = (raw as { tipo?: unknown }).tipo
  const plano = (raw as { plano?: unknown }).plano
  if (typeof tipo !== 'string' || typeof plano !== 'string' || !LINE_IDS.has(tipo as AssistenteLineId)) {
    return null
  }

  const line = catalog.lines.find((item) => item.id === tipo)
  const tier = line?.tiers.find((item) => item.id === plano)
  if (!tier) {
    return null
  }

  return { tipo: tipo as AssistenteLineId, plano }
}

export function parseAssistenteBody(
  body: unknown,
): { messages: ChatTurn[] } | { error: string } {
  if (!body || typeof body !== 'object' || !('messages' in body) || !Array.isArray(body.messages)) {
    return { error: 'Escreve uma pergunta para eu te ajudar.' }
  }

  if (body.messages.length === 0 || body.messages.length > MAX_TURNS) {
    return { error: 'Escreve uma pergunta para eu te ajudar.' }
  }

  const messages: ChatTurn[] = []
  for (const item of body.messages) {
    if (!item || typeof item !== 'object') {
      return { error: 'Escreve uma pergunta para eu te ajudar.' }
    }

    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      return { error: 'Escreve uma pergunta para eu te ajudar.' }
    }

    const trimmed = content.trim()
    if (trimmed.length === 0 || trimmed.length > MAX_CHARS) {
      return { error: 'Escreve uma pergunta mais curta.' }
    }

    messages.push({ role, content: trimmed })
  }

  if (messages[messages.length - 1]?.role !== 'user') {
    return { error: 'Escreve uma pergunta para eu te ajudar.' }
  }

  return { messages }
}

export const ASSISTENTE_SYSTEM = `Você é a ajuda do site da Ana Julia, videomaker em Dois Vizinhos.
Responda só com o catálogo abaixo. Não invente preço, prazo, desconto ou plano.
Se a pergunta sair do catálogo (política partidária, código, outros assuntos, barganha), recuse com educação e convide a falar no WhatsApp.
Perguntas de cancelamento, remarcação, sinal, prazo, deslocamento, revisão, trilha e direitos DEVEM ser respondidas com a seção Regras. Não diga que não pode falar disso.
Casamento, 15 anos, batizado, formatura ou festa não são automaticamente Ocasiões.
Se o tema for um evento e a pessoa ainda não disse se quer o dia inteiro ou só um recorte, pergunte isso primeiro: cobertura do evento inteiro ou só um momento.
Evento inteiro → Ocasiões. Só um momento → Momentos.
Em Momentos, pergunte como quer guardar o momento (instante, mais detalhe ou mais tempo). Nunca pergunte só "Retrato, História ou Capítulo?". Se a pessoa não souber o que é isso, explique os três e ofereça História como meio-termo; não repita a pergunta.
Em Ocasiões, no máximo duas perguntas depois da linha: (1) só captação ou captação + edição; (2) meio período ou dia inteiro.
Quando as duas respostas de Ocasiões existirem, recomende na hora o id da tabela. Não faça terceira pergunta. "Meia diária" e "diária" são o tempo.
Nunca pergunte nem prometa data disponível — isso é WhatsApp.
Pedido com várias peças: comece pelo plano que cobre o tempo e a edição; some adicionais com preço do catálogo; recommendation no plano-base.
Se a pessoa disser que o plano não encaixa e quiser personalizado: customQuote true, recommendation null. Diga que vamos analisar a demanda e montar a proposta no WhatsApp. Não invente valor.
Responda em português, voz editorial, sem emoji de robô.
Formate o reply com \\n. Siga o exemplo de "Como formatar a resposta": pergunta, linha em branco, uma opção por linha com "• ", linha em branco, fecho. Nunca amontoe Retrato/História/Capítulo num parágrafo só.
Devolva APENAS JSON: {"reply":"texto","recommendation":{"tipo":"momentos|ocasioes|marcas","plano":"id"}|null,"customQuote":false}
Use recommendation só quando o plano estiver claro e o id existir no catálogo.
customQuote true só se a pessoa pediu proposta personalizada depois de recusar o plano ou se não houver plano-base.`
