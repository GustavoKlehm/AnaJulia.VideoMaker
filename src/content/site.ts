export const slogan = 'Transformando momentos em histórias'
export const sloganLines = ['Transformando momentos', 'em histórias'] as const

export const brand = {
  wordmark: '/brand/logo-anajulia.png',
  icon: '/brand/logo-anajulia-icon.png',
  iconNegative: '/brand/logo-anajulia-icon-negativo.png',
} as const

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')

export const hero = {
  video:
    import.meta.env.VITE_HERO_VIDEO_URL ||
    `${supabaseUrl}/storage/v1/object/public/media/hero_cinematographic.MOV`,
} as const

export const whatsappPhone = '5546999343683'

export function whatsappLink(message: string): string {
  return `https://api.whatsapp.com/send/?phone=${whatsappPhone}&text=${encodeURIComponent(message)}`
}

export const contact = {
  whatsapp: whatsappLink(
    'Olá! Vim pelo site e gostaria de conhecer melhor o seu trabalho. 😊',
  ),
  instagram: 'https://www.instagram.com/anajulia.videomaker_/',
  instagramDm: 'https://ig.me/m/anajulia.videomaker_/',
} as const

export const showStories = false

export type NavItem = {
  href: string
  label: string
  route?: boolean
}

export const nav: readonly NavItem[] = [
  ...(showStories ? [{ href: '#historias', label: 'Histórias' }] : []),
  { href: '/planos', label: 'Planos', route: true },
  { href: '#sobre', label: 'Sobre' },
  { href: '#contato', label: 'Contato' },
]

export const stories: {
  id: string
  title: string
  lead: string
  media?: string
}[] = [
  {
    id: 'amor',
    title: 'Histórias de amor',
    lead: 'O olhar, o voto, o que não cabe em discurso.',
  },
  {
    id: 'familia',
    title: 'Família',
    lead: 'O cotidiano que, filmado com cuidado, vira memória.',
  },
  {
    id: 'presenca',
    title: 'Presença',
    lead: 'Ensaios e encontros onde o tempo afrouxa.',
  },
]
