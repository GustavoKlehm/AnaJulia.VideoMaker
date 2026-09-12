export const HOURLY_COST = 50
export const MARGIN = 1.3

export type Tier = {
  id: string
  name: string
  need: string
  capture: string
  delivery: string[]
  hours: number
  price: number
  featured: boolean
}

export type PricingLine = {
  id: string
  title: string
  promise: string
  lead: string
  prompt: string
  display: 'exact' | 'from'
  unit: 'project' | 'month'
  tiers: Tier[]
}

export type AddOn = {
  id: string
  label: string
  value: string
}

export type Piece = {
  id: string
  name: string
  purpose: string
  body: string
}

export type Rule = {
  id: string
  title: string
  body: string
}

export const lines: readonly PricingLine[] = [
  {
    id: 'momentos',
    title: 'Momentos',
    promise: 'Pequenas histórias que merecem ser lembradas.',
    lead: 'Ensaios, pré-wedding, família, gestante, aniversário. Para guardar um capítulo da sua própria história.',
    prompt: 'Como você quer guardar esse momento?',
    display: 'exact',
    unit: 'project',
    tiers: [
      {
        id: 'retrato',
        name: 'Retrato',
        need: 'Para registrar um momento pontual.',
        capture: '1h de captação, 1 locação',
        delivery: ['1 filme de até 60s, vertical ou horizontal — você escolhe'],
        hours: 5.5,
        price: 390,
        featured: false,
      },
      {
        id: 'historia',
        name: 'História',
        need: 'Para contar esse momento com mais detalhes.',
        capture: '2h de captação, até 2 locações',
        delivery: [
          '1 filme de até 2 min, vertical ou horizontal — você escolhe',
          '2 cortes verticais de 30s',
        ],
        hours: 10.5,
        price: 690,
        featured: true,
      },
      {
        id: 'capitulo',
        name: 'Capítulo',
        need: 'Para viver e registrar a experiência de forma mais completa.',
        capture: '4h de captação, até 3 locações, com direção prévia',
        delivery: ['1 filme de até 4 min', '1 teaser de 60s', '3 cortes verticais'],
        hours: 18,
        price: 1190,
        featured: false,
      },
    ],
  },
  {
    id: 'ocasioes',
    title: 'Ocasiões',
    promise: 'Dias que merecem ser vividos e registrados por inteiro.',
    lead: '15 anos, batizado, formatura, casamento civil, confraternização. Um dia inteiro ou meio período.',
    prompt: 'Como você quer receber esse registro?',
    display: 'from',
    unit: 'project',
    tiers: [
      {
        id: 'captacao-meia',
        name: 'Só captação — meia diária',
        need: 'O material registrado, organizado, sem edição.',
        capture: 'Até 4h de cobertura',
        delivery: ['Material bruto organizado, entregue por link'],
        hours: 6.5,
        price: 450,
        featured: false,
      },
      {
        id: 'captacao-diaria',
        name: 'Só captação — diária',
        need: 'O material registrado, organizado, sem edição.',
        capture: 'Até 8h de cobertura',
        delivery: ['Material bruto organizado, entregue por link'],
        hours: 11,
        price: 790,
        featured: false,
      },
      {
        id: 'meia-diaria',
        name: 'Meia diária',
        need: 'Conteúdo tratado e pronto para assistir e compartilhar.',
        capture: 'Até 4h de cobertura',
        delivery: ['1 filme de até 3 min', '1 corte vertical'],
        hours: 13,
        price: 890,
        featured: false,
      },
      {
        id: 'diaria',
        name: 'Diária',
        need: 'Conteúdo tratado e pronto para assistir e compartilhar.',
        capture: 'Até 8h de cobertura',
        delivery: ['1 filme de até 5 min', '1 teaser', '2 cortes verticais'],
        hours: 24,
        price: 1590,
        featured: false,
      },
    ],
  },
  {
    id: 'marcas',
    title: 'Marcas',
    promise: 'Histórias que sua marca quer contar.',
    lead: 'Conteúdo recorrente para comércio e serviço. Eu vou até você filmar — não é edição de material que você manda.',
    prompt: 'Qual ritmo combina com sua marca?',
    display: 'from',
    unit: 'month',
    tiers: [
      {
        id: 'presenca',
        name: 'Presença',
        need: 'Duas peças por mês, uma ida.',
        capture: '1h30 de captação por mês',
        delivery: ['2 peças verticais de até 45s', '1 rodada de revisão por peça'],
        hours: 6.5,
        price: 490,
        featured: false,
      },
      {
        id: 'ritmo',
        name: 'Ritmo',
        need: 'Quatro peças por mês, uma ida.',
        capture: '3h de captação por mês',
        delivery: ['4 peças verticais de até 45s', '1 rodada de revisão por peça'],
        hours: 12,
        price: 890,
        featured: true,
      },
      {
        id: 'narrativa',
        name: 'Narrativa',
        need: 'Oito peças por mês, em duas idas.',
        capture: '6h de captação por mês, em 2 idas',
        delivery: ['8 peças verticais de até 45s', '1 rodada de revisão por peça'],
        hours: 22,
        price: 1490,
        featured: false,
      },
    ],
  },
]

export const custom = {
  title: 'Personalizado',
  lead: 'Seu momento não cabe em nenhum dos planos? Me conta o que você quer guardar e eu monto um orçamento com a mesma régua: horas de captação, edição e deslocamento, sem surpresa no meio do caminho.',
  floor: 350,
}

export const addOns: readonly AddOn[] = [
  {
    id: 'peca-extra',
    label: 'Peça vertical extra, a partir de material já captado',
    value: 'R$ 180',
  },
  { id: 'hora-extra', label: 'Hora extra de captação no dia', value: 'R$ 120' },
  { id: 'revisao-extra', label: 'Rodada de revisão além das inclusas', value: 'R$ 150' },
  { id: 'outro-formato', label: 'Versão no outro formato (reenquadramento)', value: 'R$ 90' },
  { id: 'versao-extra', label: 'Versão com legenda ou sem trilha', value: 'R$ 90' },
  { id: 'urgencia', label: 'Entrega em até 48h', value: '+40%' },
  {
    id: 'deslocamento',
    label: 'Deslocamento acima de 20 km de Dois Vizinhos',
    value: 'R$ 2,00/km rodado',
  },
]

export const pieces: readonly Piece[] = [
  {
    id: 'filme',
    name: 'Filme',
    purpose: 'Para guardar',
    body: 'A peça principal, de 1 a 5 minutos conforme o plano. Feita para ser assistida inteira, sentada. Tem narrativa: abre situando o lugar, desenvolve mostrando as pessoas, fecha num momento de emoção. Cortes longos, áudio ambiente presente, trilha por baixo sem dominar.',
  },
  {
    id: 'teaser',
    name: 'Teaser',
    purpose: 'Para postar',
    body: 'O trailer do filme, de 30 a 60 segundos. Mesmo material, edição nova do zero: abre com o plano mais forte, corta rápido na batida da trilha e prende nos dois primeiros segundos.',
  },
  {
    id: 'cortes',
    name: 'Cortes verticais',
    purpose: 'Para não sumir do feed',
    body: 'De 30 a 45 segundos, um momento isolado cada, sempre vertical. Servem para alimentar o feed nas semanas seguintes sem repetir a mesma peça. Um corte, um assunto, legenda quando tem fala.',
  },
  {
    id: 'bruto',
    name: 'Material bruto',
    purpose: 'Para quem só quer a captação',
    body: 'O que sai do cartão, sem edição, organizado em pastas e com os takes inutilizáveis descartados. Disponível apenas na linha Ocasiões.',
  },
]

export const rules: readonly Rule[] = [
  {
    id: 'sinal',
    title: 'Sinal e pagamento',
    body: '30% para reservar a data e o saldo na entrega do arquivo final. Antes do sinal a data fica em aberto. Pix à vista tem 5% de desconto e, acima de R$ 690, parcelo em até 3x sem juros.',
  },
  {
    id: 'revisoes',
    title: 'Revisões',
    body: 'Duas rodadas inclusas nas linhas Momentos e Ocasiões, uma rodada por peça na linha Marcas. Você tem 7 dias após receber a prévia para pedir ajustes. Trocar música, ajustar corte e mudar cor é revisão; incluir cena que não foi filmada é trabalho novo.',
  },
  {
    id: 'prazos',
    title: 'Prazos de entrega',
    body: 'Contados a partir da captação: Retrato em 7 dias úteis, História em 10, Capítulo em 15, meia diária em 20 e diária em 25.',
  },
  {
    id: 'deslocamento',
    title: 'Deslocamento',
    body: 'Incluso até 20 km de Dois Vizinhos. Acima disso, R$ 2,00 por km rodado ida e volta, sempre discriminado no orçamento.',
  },
  {
    id: 'direitos',
    title: 'Direitos de uso',
    body: 'O material é seu, para sempre, inclusive para uso comercial. Eu mantenho o direito de usar no portfólio e nas minhas redes — e você pode vetar isso por escrito na assinatura.',
  },
  {
    id: 'remarcacao',
    title: 'Cancelamento e remarcação',
    body: 'O sinal não é devolvido, porque ele reservou a data. A remarcação é permitida uma vez, com aviso de 48h, para uma nova data em até 90 dias.',
  },
  {
    id: 'trilha',
    title: 'Trilha sonora',
    body: 'Biblioteca licenciada inclusa. Se você quiser uma música específica, precisa ter a licença dela — sem isso o Instagram derruba o áudio do seu vídeo.',
  },
  {
    id: 'validade',
    title: 'Validade',
    body: 'A proposta de preços enviada tem validade de 15 dias a partir do envio.',
  },
]

export const ocasioesChoices = {
  receivePrompt: 'Como você quer receber esse registro?',
  timePrompt: 'Quanto tempo você precisa?',
  bruto: {
    id: 'bruto' as const,
    label: 'Só captação',
    lead: 'Você recebe todo o material registrado.',
  },
  editado: {
    id: 'editado' as const,
    label: 'Captação + edição',
    lead: 'Você recebe os conteúdos tratados e prontos para assistir e compartilhar.',
  },
  meia: { id: 'meia' as const, label: 'Meia diária', lead: 'Até 4 horas.' },
  diaria: { id: 'diaria' as const, label: 'Diária', lead: 'Até 8 horas.' },
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
