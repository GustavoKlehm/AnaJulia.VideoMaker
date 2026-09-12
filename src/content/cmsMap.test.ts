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
  it('usa o fallback quando as linhas vêm vazias', () => {
    const catalog = mapPricing({
      lines: [],
      tiers: [],
      addOns: [],
      pieces: [],
      rules: [],
      custom: null,
      ocasioes: null,
    })
    expect(catalog.lines.map((line) => line.id)).toEqual(
      fallbackPricing.lines.map((line) => line.id),
    )
  })

  it('agrupa tiers na linha e ordena', () => {
    const catalog = mapPricing({
      lines: [
        {
          id: 'momentos',
          title: 'Momentos',
          promise: 'P',
          lead: 'L',
          prompt: '?',
          display: 'exact',
          unit: 'project',
          sort_order: 0,
        },
      ],
      tiers: [
        {
          id: 'historia',
          line_id: 'momentos',
          name: 'História',
          need: 'N',
          capture: '2h',
          delivery: ['filme'],
          hours: 10,
          price: 690,
          featured: true,
          sort_order: 1,
        },
        {
          id: 'retrato',
          line_id: 'momentos',
          name: 'Retrato',
          need: 'N',
          capture: '1h',
          delivery: ['filme'],
          hours: 5,
          price: 390,
          featured: false,
          sort_order: 0,
        },
      ],
      addOns: [
        { id: 'hora-extra', label: 'Hora', value: 'R$ 120', sort_order: 0 },
      ],
      pieces: [
        { id: 'filme', name: 'Filme', purpose: 'Guardar', body: 'B', sort_order: 0 },
      ],
      rules: [{ id: 'sinal', title: 'Sinal', body: '30%', sort_order: 0 }],
      custom: { title: 'Personalizado', lead: 'Lead', floor: 350 },
      ocasioes: {
        receive_prompt: 'Receber?',
        time_prompt: 'Tempo?',
        bruto_label: 'Bruto',
        bruto_lead: 'Lead bruto',
        editado_label: 'Editado',
        editado_lead: 'Lead editado',
        meia_label: 'Meia',
        meia_lead: '4h',
        diaria_label: 'Diária',
        diaria_lead: '8h',
      },
    })

    expect(catalog.lines[0]?.tiers.map((tier) => tier.id)).toEqual([
      'retrato',
      'historia',
    ])
    expect(catalog.custom.floor).toBe(350)
    expect(catalog.ocasioesChoices.bruto.label).toBe('Bruto')
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
