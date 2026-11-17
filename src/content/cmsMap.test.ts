import { describe, expect, it } from 'vitest'
import { fallbackPricing, fallbackSite } from './fallback'
import { mapPricing, mapSite, planWhatsappMessage } from './cmsMap'
import { whatsappLink } from './site'

describe('mapSite', () => {
  it('usa o fallback quando o banco não responde', () => {
    const site = mapSite(null, [], null)
    expect(site.slogan).toBe(fallbackSite.slogan)
    expect(site.heroVideo).toBe(fallbackSite.heroVideo)
    expect(site.showStories).toBe(false)
    expect(site.stories).toHaveLength(3)
  })

  it('aplica settings, stories e o vídeo do hero pelo media_asset', () => {
    const site = mapSite(
      {
        slogan: 'Novo slogan',
        slogan_line_1: 'Linha um',
        slogan_line_2: 'linha dois',
        roles_line: 'Diretora · Videomaker',
        about_heading: 'Quem sou',
        about_p1: 'Primeiro.',
        about_p2: 'Segundo.',
        about_cta_label: 'Ver valores',
        contact_heading: 'Fala comigo',
        contact_lead: 'Me conta',
        instagram_lead: 'No Insta',
        whatsapp_phone: '5511999999999',
        whatsapp_home_message: 'Oi home',
        whatsapp_plan_template: 'Quero o plano {name}',
        whatsapp_custom_message: 'Quero personalizado',
        whatsapp_planos_cta_message: 'Quero conversar',
        instagram_url: 'https://instagram.com/x',
        instagram_dm_url: 'https://ig.me/m/x',
        seo_title: 'Título',
        seo_description: 'Desc',
        show_stories: true,
        hero_media_id: 9,
        planos_eyebrow: 'Valores',
        planos_heading: 'O que guardar?',
        planos_lead: 'Lead planos',
        planos_addons_lead: 'Lead addons',
        planos_pieces_heading: 'Peças',
        planos_pieces_lead: 'Lead peças',
        planos_rules_title: 'Regras',
        planos_rules_lead: 'Lead regras',
        planos_cta_heading: 'Vamos',
      },
      [
        {
          id: 'amor',
          title: 'Amor',
          lead: 'Lead amor',
          media_id: 3,
          sort_order: 0,
        },
      ],
      {
        9: {
          id: 9,
          public_url: 'https://cdn.example/hero.mov',
          kind: 'video',
          alt: '',
        },
        3: {
          id: 3,
          public_url: 'https://cdn.example/amor.jpg',
          kind: 'image',
          alt: 'Amor',
        },
      },
    )

    expect(site.slogan).toBe('Novo slogan')
    expect(site.sloganLines).toEqual(['Linha um', 'linha dois'])
    expect(site.heroVideo).toBe('https://cdn.example/hero.mov')
    expect(site.showStories).toBe(true)
    expect(site.stories[0]?.media).toBe('https://cdn.example/amor.jpg')
    expect(site.whatsappPhone).toBe('5511999999999')
  })
})

describe('mapPricing', () => {
  const empty = {
    lines: [],
    categories: [],
    services: [],
    tiers: [],
    addOns: [],
    pieces: [],
    rules: [],
    custom: null,
  }

  const line = {
    id: 'momentos',
    title: 'Momentos',
    promise: 'P',
    hint: 'H',
    lead: 'L',
    prompt: '?',
    display: 'exact',
    unit: 'project',
    sort_order: 0,
  }

  it('usa o fallback quando as linhas vêm vazias', () => {
    const catalog = mapPricing(empty)
    expect(catalog.lines.map((item) => item.id)).toEqual(
      fallbackPricing.lines.map((item) => item.id),
    )
  })

  it('usa o fallback quando o banco ainda não tem categorias', () => {
    const catalog = mapPricing({ ...empty, lines: [line] })
    expect(catalog.lines[0]?.categories.length).toBeGreaterThan(0)
  })

  it('monta linha, categoria, serviço e planos em ordem', () => {
    const tier = {
      line_id: 'momentos',
      service_id: 'ensaios-videomaker',
      need: 'N',
      capture: '1h',
      delivery: ['Reel'],
      featured: false,
    }
    const catalog = mapPricing({
      ...empty,
      lines: [line],
      categories: [
        {
          id: 'ensaios',
          line_id: 'momentos',
          title: 'Ensaios',
          promise: 'P',
          hint: '',
          combo_mode: 'paired',
          combo_discount: '0.1500',
          combo_note: 'Nota',
          sort_order: 0,
        },
      ],
      services: [
        { id: 'ensaios-videomaker', category_id: 'ensaios', title: 'Videomaker', lead: 'L', sort_order: 0 },
      ],
      tiers: [
        { ...tier, id: 'historia', name: 'História', hours: 10, price: 690, sort_order: 1 },
        { ...tier, id: 'retrato', name: 'Retrato', hours: 5.5, price: 450, sort_order: 0 },
        { ...tier, id: 'solto', service_id: null, name: 'Sem serviço', hours: 1, price: 1, sort_order: 2 },
      ],
      custom: { title: 'Personalizado', lead: 'Lead', floor: 350 },
    })

    const category = catalog.lines[0]?.categories[0]
    expect(category?.comboMode).toBe('paired')
    expect(category?.comboDiscount).toBe(0.15)
    expect(category?.services[0]?.tiers.map((item) => item.id)).toEqual(['retrato', 'historia'])
    expect(catalog.custom.floor).toBe(350)
    expect(catalog.lines[0]?.hint).toBe('H')
  })
})

describe('mensagens', () => {
  it('substitui o nome do plano no template', () => {
    expect(planWhatsappMessage('Quero o {name}', 'História')).toBe('Quero o História')
  })

  it('monta WhatsApp com telefone informado', () => {
    const link = whatsappLink('Olá!', '5511999999999')
    expect(link).toBe(
      'https://api.whatsapp.com/send/?phone=5511999999999&text=Ol%C3%A1!',
    )
  })
})
