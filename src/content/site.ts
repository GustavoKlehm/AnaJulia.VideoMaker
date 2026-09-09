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

export const contact = {
  whatsapp:
    'https://api.whatsapp.com/send/?phone=5546999343683&text=Ol%C3%A1%21+Vim+pelo+site+e+gostaria+de+conhecer+melhor+o+seu+trabalho.+%F0%9F%98%8A',
  instagram: 'https://www.instagram.com/anajulia.storymaker_/',
  instagramDm: 'https://ig.me/m/anajulia.storymaker_/',
} as const

export const showStories = false

export const nav = [
  ...(showStories ? [{ href: '#historias', label: 'Histórias' }] : []),
  { href: '#sobre', label: 'Sobre' },
  { href: '#contato', label: 'Contato' },
] as const

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
