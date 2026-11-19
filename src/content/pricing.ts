/** Piso por hora trabalhada: custo × margem. Nenhum plano deve render menos que isso. */
export const HOURLY_COST = 50
export const MARGIN = 1.3

export type Tier = {
  id: string
  name: string
  need: string
  capture: string
  delivery: string[]
  /** Horas internas estimadas (captação, deslocamento, edição, conversa). Não aparece no site. */
  hours: number
  price: number
  featured: boolean
}

export type Service = {
  id: string
  title: string
  lead: string
  tiers: Tier[]
}

/**
 * Como a aba "Os dois" combina os dois serviços da categoria:
 * - none: sem combo;
 * - paired: o mesmo nível nos dois (Instante com Instante...), porque a cobertura é a mesma;
 * - free: o cliente escolhe um plano de cada serviço.
 */
export type ComboMode = 'none' | 'paired' | 'free'

export type Category = {
  id: string
  title: string
  promise: string
  hint: string
  comboMode: ComboMode
  /** Desconto sobre a soma dos dois planos, de 0 a 1. */
  comboDiscount: number
  comboNote: string
  services: Service[]
}

export type PricingLine = {
  id: string
  title: string
  promise: string
  hint: string
  lead: string
  prompt: string
  display: 'exact' | 'from'
  unit: 'project' | 'month'
  categories: Category[]
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

/** Soma os dois planos, aplica o desconto e arredonda para a dezena. */
export function comboPrice(first: number, second: number, discount: number): number {
  return Math.round(((first + second) * (1 - discount)) / 10) * 10
}

export function hasCombo(category: Category): boolean {
  if (category.comboMode === 'none' || category.services.length !== 2) {
    return false
  }
  if (category.comboMode === 'paired') {
    const [first, second] = category.services
    return first.tiers.length > 0 && first.tiers.length === second.tiers.length
  }
  return category.services.every((service) => service.tiers.length > 0)
}

export type ComboPair = {
  first: Tier
  second: Tier
  full: number
  price: number
}

export function comboPair(category: Category, first: Tier, second: Tier): ComboPair {
  return {
    first,
    second,
    full: first.price + second.price,
    price: comboPrice(first.price, second.price, category.comboDiscount),
  }
}

/** Pares do combo "paired": o mesmo nível nos dois serviços. */
export function pairedCombos(category: Category): ComboPair[] {
  if (category.comboMode !== 'paired' || !hasCombo(category)) {
    return []
  }
  const [first, second] = category.services
  return first.tiers.map((tier, index) => comboPair(category, tier, second.tiers[index]))
}

export function categoryTiers(category: Category): Tier[] {
  return category.services.flatMap((service) => service.tiers)
}

export function lineTiers(line: PricingLine): Tier[] {
  return line.categories.flatMap(categoryTiers)
}

export function discountLabel(discount: number): string {
  return `${Math.round(discount * 100)}%`
}

type TierInput = Omit<Tier, 'featured'> & { featured?: boolean }

function tier(input: TierInput): Tier {
  return { featured: false, ...input }
}

const MATERIAL_BRUTO = 'Todo o material gravado entregue por link em até 48h'

function stories(count: number): string {
  return `Até ${count} stories publicados em tempo real`
}

function reels(curtos: number): string[] {
  return [
    '1 Reel de melhores momentos (até 90s)',
    `${curtos} ${curtos === 1 ? 'Reel curto' : 'Reels curtos'} (30 a 45s)`,
  ]
}

const STORYMAKER_LEAD =
  'Stories gravados e publicados durante o evento, no perfil que você escolher. Quem não está lá acompanha tudo ao vivo.'
const VIDEOMAKER_LEAD =
  'Reels editados com calma depois do evento, para guardar e postar. A cobertura tem o mesmo tempo do storymaker.'
const COMBO_NOTE =
  'A Ana faz os dois no mesmo evento: stories durante e Reels depois, com a mesma filmagem vertical.'

export const lines: readonly PricingLine[] = [
  {
    id: 'momentos',
    title: 'Momentos',
    promise: 'Pequenas histórias que merecem ser lembradas.',
    hint: 'Ex.: casamentos, eventos, aniversários, chá revelação, ensaios.',
    lead: 'Stories em tempo real, Reels editados depois, ou os dois. Escolha o tipo de momento e o tempo de cobertura.',
    prompt: 'O que você vai celebrar?',
    display: 'exact',
    unit: 'project',
    categories: [
      {
        id: 'casamentos',
        title: 'Casamentos',
        promise: 'O sim, a festa e tudo o que acontece entre um e outro.',
        hint: 'Cerimônia, festa e making of da noiva.',
        comboMode: 'paired',
        comboDiscount: 0.15,
        comboNote: COMBO_NOTE,
        services: [
          {
            id: 'casamentos-storymaker',
            title: 'Storymaker',
            lead: STORYMAKER_LEAD,
            tiers: [
              tier({
                id: 'casamentos-story-instante',
                name: 'Instante',
                need: 'Só a cerimônia, contada em tempo real.',
                capture: 'Até 2h de cobertura, 1 local',
                delivery: [stories(15), MATERIAL_BRUTO],
                hours: 4.5,
                price: 550,
              }),
              tier({
                id: 'casamentos-story-enredo',
                name: 'Enredo',
                need: 'Cerimônia e festa, do sim à pista.',
                capture: 'Até 5h de cobertura, até 2 locais',
                delivery: [stories(35), MATERIAL_BRUTO],
                hours: 8,
                price: 950,
                featured: true,
              }),
              tier({
                id: 'casamentos-story-jornada',
                name: 'Jornada',
                need: 'O dia inteiro: making of da noiva, cerimônia e festa.',
                capture: 'Até 8h de cobertura, até 3 locais',
                delivery: [stories(50), MATERIAL_BRUTO],
                hours: 11.5,
                price: 1390,
              }),
            ],
          },
          {
            id: 'casamentos-videomaker',
            title: 'Videomaker',
            lead: VIDEOMAKER_LEAD,
            tiers: [
              tier({
                id: 'casamentos-video-instante',
                name: 'Instante',
                need: 'A cerimônia em Reels.',
                capture: 'Até 2h de cobertura, 1 local',
                delivery: reels(2),
                hours: 10,
                price: 790,
              }),
              tier({
                id: 'casamentos-video-enredo',
                name: 'Enredo',
                need: 'Cerimônia e festa, do sim à pista.',
                capture: 'Até 5h de cobertura, até 2 locais',
                delivery: reels(4),
                hours: 17,
                price: 1390,
                featured: true,
              }),
              tier({
                id: 'casamentos-video-jornada',
                name: 'Jornada',
                need: 'O dia inteiro: making of da noiva, cerimônia e festa.',
                capture: 'Até 8h de cobertura, até 3 locais',
                delivery: reels(7),
                hours: 25,
                price: 1890,
              }),
            ],
          },
        ],
      },
      {
        id: 'eventos',
        title: 'Eventos',
        promise: 'Para empresas que querem mostrar o que aconteceu, enquanto acontece.',
        hint: 'Ex.: eventos corporativos, confraternizações, lançamentos, palestras.',
        comboMode: 'paired',
        comboDiscount: 0.15,
        comboNote: COMBO_NOTE,
        services: [
          {
            id: 'eventos-storymaker',
            title: 'Storymaker',
            lead: STORYMAKER_LEAD,
            tiers: [
              tier({
                id: 'eventos-story-instante',
                name: 'Instante',
                need: 'Palestras, lançamentos e encontros curtos.',
                capture: 'Até 2h de cobertura, 1 local',
                delivery: [stories(15), MATERIAL_BRUTO],
                hours: 4,
                price: 450,
              }),
              tier({
                id: 'eventos-story-enredo',
                name: 'Enredo',
                need: 'O evento inteiro, da chegada ao encerramento.',
                capture: 'Até 5h de cobertura, 1 local',
                delivery: [stories(35), MATERIAL_BRUTO],
                hours: 7,
                price: 790,
                featured: true,
              }),
              tier({
                id: 'eventos-story-jornada',
                name: 'Jornada',
                need: 'Eventos longos ou em dois espaços.',
                capture: 'Até 8h de cobertura, até 2 locais',
                delivery: [stories(50), MATERIAL_BRUTO],
                hours: 10.5,
                price: 1090,
              }),
            ],
          },
          {
            id: 'eventos-videomaker',
            title: 'Videomaker',
            lead: VIDEOMAKER_LEAD,
            tiers: [
              tier({
                id: 'eventos-video-instante',
                name: 'Instante',
                need: 'Palestras, lançamentos e encontros curtos.',
                capture: 'Até 2h de cobertura, 1 local',
                delivery: reels(2),
                hours: 10,
                price: 690,
              }),
              tier({
                id: 'eventos-video-enredo',
                name: 'Enredo',
                need: 'O evento inteiro, da chegada ao encerramento.',
                capture: 'Até 5h de cobertura, 1 local',
                delivery: reels(4),
                hours: 16.5,
                price: 1290,
                featured: true,
              }),
              tier({
                id: 'eventos-video-jornada',
                name: 'Jornada',
                need: 'Eventos longos ou em dois espaços.',
                capture: 'Até 8h de cobertura, até 2 locais',
                delivery: reels(6),
                hours: 23.5,
                price: 1690,
              }),
            ],
          },
        ],
      },
      {
        id: 'festas',
        title: 'Festas e comemorações',
        promise: 'As festas que reúnem quem você ama.',
        hint: 'Ex.: aniversários, chá revelação, chá de bebê, batizados.',
        comboMode: 'paired',
        comboDiscount: 0.15,
        comboNote: COMBO_NOTE,
        services: [
          {
            id: 'festas-storymaker',
            title: 'Storymaker',
            lead: STORYMAKER_LEAD,
            tiers: [
              tier({
                id: 'festas-story-instante',
                name: 'Instante',
                need: 'Parabéns, revelação e os momentos-chave.',
                capture: 'Até 2h de cobertura, 1 local',
                delivery: [stories(15), MATERIAL_BRUTO],
                hours: 4,
                price: 390,
              }),
              tier({
                id: 'festas-story-enredo',
                name: 'Enredo',
                need: 'A festa toda, da chegada dos convidados ao bolo.',
                capture: 'Até 5h de cobertura, 1 local',
                delivery: [stories(35), MATERIAL_BRUTO],
                hours: 7,
                price: 690,
                featured: true,
              }),
              tier({
                id: 'festas-story-jornada',
                name: 'Jornada',
                need: 'Festas longas, do preparo ao fim da noite.',
                capture: 'Até 8h de cobertura, 1 local',
                delivery: [stories(50), MATERIAL_BRUTO],
                hours: 10,
                price: 990,
              }),
            ],
          },
          {
            id: 'festas-videomaker',
            title: 'Videomaker',
            lead: VIDEOMAKER_LEAD,
            tiers: [
              tier({
                id: 'festas-video-instante',
                name: 'Instante',
                need: 'Parabéns, revelação e os momentos-chave.',
                capture: 'Até 2h de cobertura, 1 local',
                delivery: reels(1),
                hours: 8.5,
                price: 590,
              }),
              tier({
                id: 'festas-video-enredo',
                name: 'Enredo',
                need: 'A festa toda, da chegada dos convidados ao bolo.',
                capture: 'Até 5h de cobertura, 1 local',
                delivery: reels(3),
                hours: 15,
                price: 1090,
                featured: true,
              }),
              tier({
                id: 'festas-video-jornada',
                name: 'Jornada',
                need: 'Festas longas, do preparo ao fim da noite.',
                capture: 'Até 8h de cobertura, 1 local',
                delivery: reels(5),
                hours: 21.5,
                price: 1590,
              }),
            ],
          },
        ],
      },
      {
        id: 'ensaios',
        title: 'Ensaios',
        promise: 'Um capítulo da sua história, filmado com calma.',
        hint: 'Ex.: gestante, família, casal, pré-wedding, 15 anos.',
        comboMode: 'none',
        comboDiscount: 0,
        comboNote: '',
        services: [
          {
            id: 'ensaios-videomaker',
            title: 'Videomaker',
            lead: 'Reels editados a partir do ensaio, para guardar e postar.',
            tiers: [
              tier({
                id: 'retrato',
                name: 'Retrato',
                need: 'Um ensaio curto, num lugar só.',
                capture: '1h de captação, 1 local',
                delivery: ['1 Reel de até 60s', '1 Reel curto de até 30s'],
                hours: 6.5,
                price: 450,
              }),
              tier({
                id: 'historia',
                name: 'História',
                need: 'Um ensaio com mais de um cenário.',
                capture: '2h de captação, até 2 locais',
                delivery: ['1 Reel de até 90s', '2 Reels curtos (30 a 45s)'],
                hours: 10,
                price: 690,
                featured: true,
              }),
              tier({
                id: 'capitulo',
                name: 'Capítulo',
                need: 'Um ensaio pensado em detalhe.',
                capture: '3h de captação, até 3 locais, com roteiro e referências combinados antes',
                delivery: ['1 Reel de até 90s', '4 Reels curtos (30 a 45s)'],
                hours: 15,
                price: 1090,
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'marcas',
    title: 'Marcas',
    promise: 'Histórias que sua marca quer contar.',
    hint: 'Para fortalecer a presença digital da sua empresa.',
    lead: 'Conteúdo recorrente para comércio e serviço: vídeo filmado no seu negócio, o Instagram cuidado de perto, ou os dois.',
    prompt: 'Do que sua marca precisa?',
    display: 'from',
    unit: 'month',
    categories: [
      {
        id: 'marcas-conteudo',
        title: 'Conteúdo mensal',
        promise: 'Vídeo, social media ou os dois.',
        hint: '',
        comboMode: 'free',
        comboDiscount: 0.05,
        comboNote:
          'Escolha um plano de cada. Os Reels filmados pela Ana entram como publicações bônus no Social media, fora do limite do plano.',
        services: [
          {
            id: 'marcas-video',
            title: 'Vídeo',
            lead: 'A Ana vai até o seu negócio, filma e entrega Reels editados. Legenda e postagem ficam com o Social media.',
            tiers: [
              tier({
                id: 'essencial',
                name: 'Essencial',
                need: 'Para o pequeno negócio que está começando a aparecer.',
                capture: '1 ida por mês, até 1h de captação',
                delivery: ['2 Reels de até 45s', '1 rodada de revisão por Reel'],
                hours: 5.5,
                price: 390,
              }),
              tier({
                id: 'presenca',
                name: 'Presença',
                need: 'Para manter o perfil ativo o mês inteiro.',
                capture: '1 ida por mês, até 1h30 de captação',
                delivery: ['4 Reels de até 45s', '1 rodada de revisão por Reel'],
                hours: 9.5,
                price: 790,
              }),
              tier({
                id: 'ritmo',
                name: 'Ritmo',
                need: 'Para aparecer toda semana.',
                capture: '2 idas por mês, até 1h30 de captação cada',
                delivery: ['6 Reels de até 45s', '1 rodada de revisão por Reel'],
                hours: 15,
                price: 1190,
                featured: true,
              }),
              tier({
                id: 'narrativa',
                name: 'Narrativa',
                need: 'Para a marca que quer contar sua história com frequência.',
                capture: '3 idas por mês, até 1h30 de captação cada',
                delivery: ['8 Reels de até 45s', '1 rodada de revisão por Reel'],
                hours: 20.5,
                price: 1690,
              }),
            ],
          },
          {
            id: 'marcas-social',
            title: 'Social media',
            lead: 'A Ana cuida do seu Instagram: calendário, artes, legendas e postagem direto na sua conta.',
            tiers: [
              tier({
                id: 'constancia',
                name: 'Constância',
                need: 'Para manter o perfil ativo, com cerca de 2 publicações por semana.',
                capture: 'Até 8 publicações por mês',
                delivery: [
                  'Calendário do mês aprovado antes de começar',
                  'Artes ou fotos tratadas, sempre com legenda',
                  'Postagem feita direto na sua conta',
                  'Relatório mensal',
                ],
                hours: 9,
                price: 650,
              }),
              tier({
                id: 'destaque',
                name: 'Destaque',
                need: 'Para aparecer cerca de 3 vezes por semana, também nos stories.',
                capture: 'Até 12 publicações por mês',
                delivery: [
                  'Calendário do mês aprovado antes de começar',
                  'Artes ou fotos tratadas, sempre com legenda',
                  'Stories: repost de cada publicação e 1 enquete ou caixinha por semana',
                  'Postagem feita direto na sua conta',
                  'Relatório mensal',
                ],
                hours: 14,
                price: 990,
                featured: true,
              }),
            ],
          },
        ],
      },
    ],
  },
]

export const custom = {
  title: 'Personalizado',
  lead: 'Seu momento não cabe em nenhum dos planos? Me conta o que você quer guardar e eu monto um orçamento com a mesma régua: horas de cobertura, edição e deslocamento, sem surpresa no meio do caminho.',
  floor: 350,
}

export const addOns: readonly AddOn[] = [
  { id: 'hora-extra', label: 'Hora extra de cobertura no dia', value: 'R$ 200' },
  {
    id: 'peca-extra',
    label: 'Reel extra, ou edição de vídeo bruto enviado pelo cliente',
    value: 'R$ 180',
  },
  { id: 'revisao-extra', label: 'Rodada de revisão além das inclusas', value: 'R$ 150' },
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
    id: 'stories',
    name: 'Stories em tempo real',
    purpose: 'Para viver junto',
    body: 'Gravados e publicados durante o evento, no perfil que você escolher. Quem não pôde ir acompanha ao vivo, e quem foi revê no mesmo dia. Depois, todo o material gravado chega por link.',
  },
  {
    id: 'reel-momentos',
    name: 'Reel de melhores momentos',
    purpose: 'Para guardar',
    body: 'Até 90 segundos com o resumo do dia, editado com calma depois do evento. Abre com o plano mais forte, segue a batida da trilha e fecha num momento de emoção.',
  },
  {
    id: 'reels-curtos',
    name: 'Reels curtos',
    purpose: 'Para não sumir do feed',
    body: 'De 30 a 45 segundos, um momento isolado cada, sempre vertical. Servem para postar nas semanas seguintes sem repetir a mesma peça. Na linha Marcas, são os Reels do mês.',
  },
  {
    id: 'estatico',
    name: 'Post estático',
    purpose: 'Para o feed respirar',
    body: 'Uma arte com a identidade da sua marca (cores, fontes e logo) ou uma foto sua tratada e recortada para o feed. Vai com a legenda escrita, pronto para publicar.',
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
    body: 'Uma rodada por Reel. Você tem 7 dias após receber a prévia para pedir ajustes. Trocar música, ajustar corte e mudar cor é revisão; incluir cena que não foi filmada é trabalho novo. Stories saem em tempo real e não têm revisão.',
  },
  {
    id: 'prazos',
    title: 'Prazos de entrega',
    body: 'Stories na hora e material gravado em até 48h. Reels de festas, eventos e ensaios em até 10 dias úteis; de casamentos, em até 15 dias úteis.',
  },
  {
    id: 'mensal',
    title: 'Planos mensais',
    body: 'Tempo mínimo de 3 meses. O material para o mês chega até o dia 20 do mês anterior, e o calendário aprovado em até 3 dias úteis vale como aprovado se não houver resposta. Publicações não usadas no mês não acumulam.',
  },
  {
    id: 'social-escopo',
    title: 'O que o Social media inclui',
    body: 'Calendário, artes ou fotos tratadas, legendas, postagem na sua conta e relatório. Não inclui responder comentários e mensagens nem anúncios pagos. Editar vídeo bruto que você gravou é cobrado à parte.',
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

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
