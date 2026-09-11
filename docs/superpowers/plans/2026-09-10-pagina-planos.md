# Página de Planos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar a proposta de valores da Ana Julia como uma página `/planos` no site, com os preços vindo de um módulo de dados testado.

**Architecture:** Os preços, entregáveis, adicionais e regras vivem em `src/content/pricing.ts` como fonte única da verdade, testados por Vitest para não saírem do piso da fórmula quando a tabela for revisada. Um roteador próprio de ~25 linhas (sem dependência nova) decide entre `HomePage` e `PlanosPage` a partir de `window.location.pathname`. A página é paper-only (sem cinema), segue o design system e destaca o pacote recomendado por peso de borda e rótulo, nunca por cor.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest (novo), CSS puro com tokens, deploy Vercel.

## Global Constraints

- Spec de referência: `docs/superpowers/specs/2026-09-10-proposta-valores-design.md`. Todo preço e texto comercial vem de lá.
- Design system: `design-system/ana-julia/MASTER.md` + o override de página criado na Task 2.
- **Proibido acento cromático.** Nenhum hex solto — apenas variáveis de `src/styles/tokens.css`.
- Cantos retos (`border-radius: 0`), sem sombra, hairline `1px solid var(--color-border)` antes de elevação.
- Sem emoji como ícone. Ícones apenas via `@phosphor-icons/react`.
- Hover entre 150–300ms, sem `translateY` ou mudança de bounds.
- Contraste mínimo 4.5:1. `:focus-visible` visível usando `--color-ring`.
- `prefers-reduced-motion: reduce` respeitado — estado final imediato.
- Responsivo em 375px, 768px, 1024px e 1440px, sem scroll horizontal.
- Interface e copy em **português**; código, tipos e identificadores em **inglês**.
- `verbatimModuleSyntax` está ligado: importações de tipo precisam usar `import type`.
- `noUnusedLocals` e `noUnusedParameters` estão ligados: variável não usada quebra o build.
- Custo-hora `HOURLY_COST = 50` e margem `MARGIN = 1.3`. Nenhum pacote pode custar menos que `hours × HOURLY_COST × MARGIN`.

---

### Task 1: Módulo de dados de preços com Vitest

Cria a fonte única da verdade dos preços e o teste que impede a tabela de sair do lugar nas revisões semestrais.

**Files:**
- Create: `src/content/pricing.ts`
- Create: `src/content/pricing.test.ts`
- Modify: `src/content/site.ts`
- Modify: `vite.config.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces:
  - `HOURLY_COST: number`, `MARGIN: number`
  - `type Tier = { id: string; name: string; capture: string; delivery: readonly string[]; hours: number; price: number; featured: boolean }`
  - `type PricingLine = { id: string; title: string; lead: string; display: 'exact' | 'from'; unit: 'project' | 'month'; tiers: readonly Tier[] }`
  - `type AddOn = { id: string; label: string; value: string }`
  - `type Piece = { id: string; name: string; purpose: string; body: string }`
  - `type Rule = { id: string; title: string; body: string }`
  - `lines: readonly PricingLine[]`, `addOns: readonly AddOn[]`, `pieces: readonly Piece[]`, `rules: readonly Rule[]`
  - `custom: { title: string; lead: string; floor: number }`
  - `formatBRL(value: number): string`
  - De `src/content/site.ts`: `whatsappPhone: string` e `whatsappLink(message: string): string`

- [ ] **Step 1: Instalar o Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Configurar o Vitest no Vite**

Substitua o conteúdo de `vite.config.ts` por:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Adicionar o script de teste**

Em `package.json`, dentro de `"scripts"`, adicione as duas linhas abaixo depois de `"start"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Escrever o teste que vai falhar**

Crie `src/content/pricing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  HOURLY_COST,
  MARGIN,
  addOns,
  custom,
  formatBRL,
  lines,
  pieces,
  rules,
} from './pricing'
import { whatsappLink } from './site'

const allTiers = lines.flatMap((line) => line.tiers)

describe('tabela de preços', () => {
  it('nenhum pacote fica abaixo do piso da fórmula', () => {
    for (const tier of allTiers) {
      const floor = tier.hours * HOURLY_COST * MARGIN
      expect(tier.price, `${tier.id} abaixo do piso`).toBeGreaterThanOrEqual(floor)
    }
  })

  it('nenhum pacote passa de 25% acima do piso', () => {
    for (const tier of allTiers) {
      const floor = tier.hours * HOURLY_COST * MARGIN
      expect(tier.price, `${tier.id} arredondado demais`).toBeLessThanOrEqual(floor * 1.25)
    }
  })

  it('nenhum pacote fica abaixo do piso absoluto do personalizado', () => {
    for (const tier of allTiers) {
      expect(tier.price).toBeGreaterThanOrEqual(custom.floor)
    }
  })

  it('cada linha tem no máximo um pacote destacado', () => {
    for (const line of lines) {
      const featured = line.tiers.filter((tier) => tier.featured)
      expect(featured.length, `linha ${line.id}`).toBeLessThanOrEqual(1)
    }
  })

  it('os destacados são exatamente o História e o Ritmo', () => {
    const featured = allTiers.filter((tier) => tier.featured).map((tier) => tier.id)
    expect(featured).toEqual(['historia', 'ritmo'])
  })

  it('os ids são únicos em todo o catálogo', () => {
    const ids = allTiers.map((tier) => tier.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('os preços sobem dentro de cada linha', () => {
    for (const line of lines) {
      const prices = line.tiers.map((tier) => tier.price)
      const sorted = [...prices].sort((a, b) => a - b)
      expect(prices, `linha ${line.id}`).toEqual(sorted)
    }
  })

  it('existem as três linhas na ordem do catálogo', () => {
    expect(lines.map((line) => line.id)).toEqual(['momentos', 'ocasioes', 'marcas'])
  })

  it('a linha Marcas é cobrada por mês', () => {
    const marcas = lines.find((line) => line.id === 'marcas')
    expect(marcas?.unit).toBe('month')
  })
})

describe('conteúdo de apoio', () => {
  it('o dicionário cobre filme, teaser e cortes', () => {
    const ids = pieces.map((piece) => piece.id)
    expect(ids).toContain('filme')
    expect(ids).toContain('teaser')
    expect(ids).toContain('cortes')
  })

  it('as regras comerciais cobrem sinal, revisões e direitos', () => {
    const ids = rules.map((rule) => rule.id)
    expect(ids).toContain('sinal')
    expect(ids).toContain('revisoes')
    expect(ids).toContain('direitos')
  })

  it('todo adicional tem valor preenchido', () => {
    for (const addOn of addOns) {
      expect(addOn.value.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('formatação', () => {
  it('formata em real sem centavos', () => {
    expect(formatBRL(690).replace(/\u00a0/g, ' ')).toBe('R$ 690')
  })

  it('formata milhar com separador', () => {
    expect(formatBRL(1190).replace(/\u00a0/g, ' ')).toBe('R$ 1.190')
  })

  it('monta o link de WhatsApp com a mensagem codificada', () => {
    const link = whatsappLink('Olá!')
    expect(link).toBe('https://api.whatsapp.com/send/?phone=5546999343683&text=Ol%C3%A1!')
  })
})
```

- [ ] **Step 5: Rodar o teste para confirmar que falha**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./pricing"`.

- [ ] **Step 6: Extrair o link de WhatsApp em `src/content/site.ts`**

Substitua o bloco `export const contact = { ... }` (linhas 18–23) por:

```ts
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
```

- [ ] **Step 7: Criar o módulo de preços**

Crie `src/content/pricing.ts`:

```ts
export const HOURLY_COST = 50
export const MARGIN = 1.3

export type Tier = {
  id: string
  name: string
  capture: string
  delivery: readonly string[]
  hours: number
  price: number
  featured: boolean
}

export type PricingLine = {
  id: string
  title: string
  lead: string
  display: 'exact' | 'from'
  unit: 'project' | 'month'
  tiers: readonly Tier[]
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
    lead: 'Ensaios, pré-wedding, família, gestante, aniversário. Para guardar um capítulo da sua própria história.',
    display: 'exact',
    unit: 'project',
    tiers: [
      {
        id: 'retrato',
        name: 'Retrato',
        capture: '1h de captação, 1 locação',
        delivery: ['1 filme de até 60s, vertical ou horizontal — você escolhe'],
        hours: 5.5,
        price: 390,
        featured: false,
      },
      {
        id: 'historia',
        name: 'História',
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
    lead: '15 anos, batizado, formatura, casamento civil, confraternização. Um dia inteiro ou meio período.',
    display: 'from',
    unit: 'project',
    tiers: [
      {
        id: 'captacao-meia',
        name: 'Só captação — meia diária',
        capture: 'Até 4h de cobertura',
        delivery: ['Material bruto organizado, entregue por link'],
        hours: 6.5,
        price: 450,
        featured: false,
      },
      {
        id: 'captacao-diaria',
        name: 'Só captação — diária',
        capture: 'Até 8h de cobertura',
        delivery: ['Material bruto organizado, entregue por link'],
        hours: 11,
        price: 790,
        featured: false,
      },
      {
        id: 'meia-diaria',
        name: 'Meia diária',
        capture: 'Até 4h de cobertura',
        delivery: ['1 filme de até 3 min', '1 corte vertical'],
        hours: 13,
        price: 890,
        featured: false,
      },
      {
        id: 'diaria',
        name: 'Diária',
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
    lead: 'Conteúdo recorrente para comércio e serviço. Eu vou até você filmar — não é edição de material que você manda.',
    display: 'from',
    unit: 'month',
    tiers: [
      {
        id: 'presenca',
        name: 'Presença',
        capture: '1h30 de captação por mês',
        delivery: ['2 peças verticais de até 45s', '1 rodada de revisão por peça'],
        hours: 6.5,
        price: 490,
        featured: false,
      },
      {
        id: 'ritmo',
        name: 'Ritmo',
        capture: '3h de captação por mês',
        delivery: ['4 peças verticais de até 45s', '1 rodada de revisão por peça'],
        hours: 12,
        price: 890,
        featured: true,
      },
      {
        id: 'narrativa',
        name: 'Narrativa',
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
  { id: 'drone', label: 'Drone, via parceiro', value: 'Sob consulta' },
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
    body: 'O trailer do filme, de 30 a 60 segundos. Mesmo material, edição nova do zero: abre com o plano mais forte, corta rápido na batida da trilha e prende nos dois primeiros segundos. É a peça que faz alguém perguntar quem filmou.',
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
    body: 'Esta tabela vale por 15 dias a partir do envio da proposta.',
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
```

- [ ] **Step 8: Rodar os testes para confirmar que passam**

Run: `npm test`
Expected: PASS — 14 testes passando.

- [ ] **Step 9: Verificar lint e build**

Run: `npm run lint && npm run build`
Expected: sem erro. Se `tsc` reclamar de `src/content/pricing.test.ts`, confirme que `vitest` está em `devDependencies`.

- [ ] **Step 10: Commit**

```bash
git add src/content/pricing.ts src/content/pricing.test.ts src/content/site.ts vite.config.ts package.json package-lock.json
git commit -m "Cria o modulo de precos com testes de consistencia da tabela"
```

---

### Task 2: Rota `/planos`, navegação e contrato de design

Coloca a página no ar vazia, com rota funcionando em dev e em produção, e escreve o override de design system que governa as tasks seguintes.

**Files:**
- Create: `src/lib/router.ts`
- Create: `src/lib/router.test.ts`
- Create: `src/components/RouteLink.tsx`
- Create: `src/pages/PlanosPage.tsx`
- Create: `src/pages/PlanosPage.css`
- Create: `design-system/ana-julia/pages/planos.md`
- Modify: `src/App.tsx`
- Modify: `src/content/site.ts`
- Modify: `src/components/SiteHeader.tsx`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `whatsappLink` de `src/content/site.ts` (Task 1).
- Produces:
  - `type Route = 'home' | 'planos'`
  - `resolveRoute(pathname: string): Route`
  - `navHref(item: NavItem, route: Route): string`
  - `useRoute(): Route`
  - `navigate(to: string): void`
  - `type NavItem = { href: string; label: string; route?: boolean }` exportado de `src/content/site.ts`
  - `<RouteLink to="/planos" className="...">…</RouteLink>`
  - `<PlanosPage />`

- [ ] **Step 1: Escrever o teste que vai falhar**

Crie `src/lib/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { navHref, resolveRoute } from './router'

describe('resolveRoute', () => {
  it('reconhece a rota de planos', () => {
    expect(resolveRoute('/planos')).toBe('planos')
  })

  it('ignora barra final', () => {
    expect(resolveRoute('/planos/')).toBe('planos')
  })

  it('trata a raiz como home', () => {
    expect(resolveRoute('/')).toBe('home')
  })

  it('trata rota desconhecida como home', () => {
    expect(resolveRoute('/qualquer-coisa')).toBe('home')
  })
})

describe('navHref', () => {
  it('mantém a âncora quando já está na home', () => {
    expect(navHref({ href: '#sobre', label: 'Sobre' }, 'home')).toBe('#sobre')
  })

  it('aponta a âncora para a home quando está em outra rota', () => {
    expect(navHref({ href: '#sobre', label: 'Sobre' }, 'planos')).toBe('/#sobre')
  })

  it('mantém o caminho de rota em qualquer página', () => {
    const item = { href: '/planos', label: 'Planos', route: true }
    expect(navHref(item, 'home')).toBe('/planos')
    expect(navHref(item, 'planos')).toBe('/planos')
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./router"`.

- [ ] **Step 3: Criar o roteador**

Crie `src/lib/router.ts`:

```ts
import { useEffect, useState } from 'react'
import type { NavItem } from '../content/site'

export type Route = 'home' | 'planos'

export function resolveRoute(pathname: string): Route {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized === '/planos' ? 'planos' : 'home'
}

export function navHref(item: NavItem, route: Route): string {
  if (item.route) {
    return item.href
  }
  return route === 'home' ? item.href : `/${item.href}`
}

export function navigate(to: string): void {
  if (window.location.pathname === to) {
    return
  }
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => resolveRoute(window.location.pathname))

  useEffect(() => {
    function sync() {
      setRoute(resolveRoute(window.location.pathname))
    }

    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  return route
}
```

- [ ] **Step 4: Declarar o tipo de navegação e a entrada do menu**

Em `src/content/site.ts`, substitua o bloco `export const nav = [ ... ] as const` (linhas 26–31) por:

```ts
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
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

Run: `npm test`
Expected: PASS — os 7 testes de rota somados aos 14 da Task 1, totalizando 21.

- [ ] **Step 6: Criar o link de rota**

Crie `src/components/RouteLink.tsx`:

```tsx
import type { MouseEvent, ReactNode } from 'react'
import { navigate } from '../lib/router'

type RouteLinkProps = {
  to: string
  className?: string
  children: ReactNode
}

export function RouteLink({ to, className, children }: RouteLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    navigate(to)
    window.scrollTo({ top: 0 })
  }

  return (
    <a className={className} href={to} onClick={handleClick}>
      {children}
    </a>
  )
}
```

- [ ] **Step 7: Fazer o header funcionar nas duas rotas**

Substitua o conteúdo de `src/components/SiteHeader.tsx` por:

```tsx
import { brand, nav } from '../content/site'
import { navHref, useRoute } from '../lib/router'
import { RouteLink } from './RouteLink'
import './SiteHeader.css'

type SiteHeaderProps = {
  onCinema: boolean
}

export function SiteHeader({ onCinema }: SiteHeaderProps) {
  const route = useRoute()

  return (
    <header className={`site-header${onCinema ? ' site-header--cinema' : ''}`}>
      <RouteLink className="site-header__brand" to="/">
        <img
          src={onCinema ? brand.iconNegative : brand.icon}
          width={820}
          height={820}
          alt="Ana Julia"
        />
      </RouteLink>
      <nav className="site-header__nav" aria-label="Principal">
        {nav.map((item) =>
          item.route ? (
            <RouteLink key={item.href} to={item.href}>
              {item.label}
            </RouteLink>
          ) : (
            <a key={item.href} href={navHref(item, route)}>
              {item.label}
            </a>
          ),
        )}
      </nav>
    </header>
  )
}
```

- [ ] **Step 8: Criar a página vazia**

Crie `src/pages/PlanosPage.tsx`:

```tsx
import { SiteHeader } from '../components/SiteHeader'
import { Reveal } from '../components/Reveal'
import './PlanosPage.css'

export function PlanosPage() {
  return (
    <>
      <a className="skip-link" href="#planos-conteudo">
        Ir ao conteúdo
      </a>
      <SiteHeader onCinema={false} />

      <main className="planos" id="planos-conteudo">
        <section className="planos__intro">
          <Reveal>
            <p className="planos__eyebrow">Planos</p>
            <h1 className="planos__title">Quanto custa guardar um momento</h1>
            <p className="planos__lead">
              Cada plano diz exatamente quanto tempo eu fico com você, o que você
              recebe e em quanto tempo. Sem valor escondido e sem surpresa no meio
              do caminho.
            </p>
          </Reveal>
        </section>
      </main>
    </>
  )
}
```

- [ ] **Step 9: Criar o CSS base da página**

Crie `src/pages/PlanosPage.css`:

```css
.planos {
  background: var(--color-background);
  color: var(--color-foreground);
}

.planos__intro {
  min-height: 72svh;
  display: grid;
  place-items: center;
  padding: calc(var(--space-3xl) + var(--space-lg)) var(--space-md) var(--space-3xl);
  text-align: center;
}

.planos__eyebrow {
  margin: 0 0 var(--space-lg);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-muted-foreground);
}

.planos__title {
  margin: 0 auto;
  max-width: 18ch;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 6vw, 3.6rem);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.planos__lead {
  margin: var(--space-lg) auto 0;
  max-width: 46ch;
  font-size: 1rem;
  font-weight: 300;
  line-height: 1.6;
  color: var(--color-muted-foreground);
}

@media (min-width: 768px) {
  .planos__intro {
    padding-left: var(--space-xl);
    padding-right: var(--space-xl);
  }
}
```

- [ ] **Step 10: Ligar a rota no App**

Substitua o conteúdo de `src/App.tsx` por:

```tsx
import { useRoute } from './lib/router'
import { HomePage } from './pages/HomePage'
import { PlanosPage } from './pages/PlanosPage'

export default function App() {
  const route = useRoute()

  return route === 'planos' ? <PlanosPage /> : <HomePage />
}
```

- [ ] **Step 11: Fazer o Vercel servir a rota**

Substitua o conteúdo de `vercel.json` por:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

A regra de `/api` vem primeiro porque as rewrites são avaliadas em ordem. Arquivos estáticos continuam sendo servidos porque o Vercel checa o filesystem antes das rewrites.

- [ ] **Step 12: Escrever o override de design system da página**

Crie `design-system/ana-julia/pages/planos.md`:

```markdown
# Planos Page Overrides

> **PROJECT:** Ana Julia
> **Page Type:** Catálogo editorial — tabela de planos em papel
> Rules here **override** `design-system/ana-julia/MASTER.md`.

---

## Concept

Papel do começo ao fim. Sem cinema, sem vídeo, sem full-bleed. A página é um
documento editorial: o cliente lê, compara e decide. Preço é informação, não
promoção.

## Layout

1. **Intro** (`#planos-conteudo`) — título serif e lead curto, centralizados.
2. **Linhas** — Momentos, Ocasiões e Marcas, cada uma numa faixa separada por
   hairline superior. Dentro de cada linha, os planos em grid auto-fit.
3. **Personalizado** — bloco de texto centralizado, sem preço, com CTA.
4. **Adicionais** — lista de duas colunas, rótulo à esquerda e valor à direita.
5. **Peças** — dicionário de filme, teaser, cortes e bruto.
6. **Regras** — condições comerciais em blocos curtos.
7. **CTA final** — WhatsApp e Direct, igual ao contato da home.

## Destaque do plano recomendado

O design system proíbe acento cromático, então o plano recomendado **não pode**
ser destacado por cor, fundo colorido ou badge chamativo. O destaque vem de:

- borda `1px solid var(--color-foreground)` em vez de `var(--color-border)`
- rótulo "Mais escolhido" em Inter 500, uppercase, `--tracking-label`
- nada de escala, sombra ou deslocamento — o card não pode mudar de tamanho

## Cards nesta página

A home proíbe cards; esta página os permite, porque é tabela comparativa. Mesmo
assim: cantos retos, fundo `--color-card`, hairline, sem sombra, sem hover que
mude o bounding box.

## Motion

Apenas o `Reveal` já existente (opacity + 12px, ~380ms), no máximo um por faixa.
Sem stagger, sem parallax. `prefers-reduced-motion`: estado final imediato.

## Anti-patterns on this page

- Acento cromático, badge colorido, gradiente
- Preço riscado ou contador de urgência falsa
- Tabela com mais de 6 linhas de comparação
- Hover que muda layout
```

- [ ] **Step 13: Verificar a rota em dev**

Run: `npm run dev:client`
Verifique manualmente:
- `http://localhost:5173/` mostra a home;
- `http://localhost:5173/planos` mostra a intro da página de planos;
- clicar em "Planos" no header navega sem recarregar;
- o botão voltar do navegador retorna para a home;
- estando em `/planos`, clicar em "Sobre" leva para `/#sobre`.

Encerre o servidor depois.

- [ ] **Step 14: Verificar testes, lint e build**

Run: `npm test && npm run lint && npm run build`
Expected: tudo passando.

- [ ] **Step 15: Commit**

```bash
git add src/lib/router.ts src/lib/router.test.ts src/components/RouteLink.tsx src/components/SiteHeader.tsx src/pages/PlanosPage.tsx src/pages/PlanosPage.css src/App.tsx src/content/site.ts vercel.json design-system/ana-julia/pages/planos.md
git commit -m "Adiciona a rota de planos com roteamento proprio e contrato de design"
```

---

### Task 3: Linhas de planos com o destaque do recomendado

Renderiza as três linhas a partir de `lines`, incluindo o destaque sem cor do História e do Ritmo.

**Files:**
- Create: `src/components/PlanTier.tsx`
- Modify: `src/pages/PlanosPage.tsx`
- Modify: `src/pages/PlanosPage.css`

**Interfaces:**
- Consumes: `lines`, `formatBRL`, `type PricingLine`, `type Tier` de `src/content/pricing.ts`; `whatsappLink` de `src/content/site.ts`.
- Produces: `<PlanTier tier={tier} unit={unit} />`, onde `unit` é `'project' | 'month'`.

**Decisão de exibição (`line.display`):** a spec pede preço público na linha Momentos e "a partir de" em Ocasiões e Marcas. A leitura adotada, e que deve ser seguida à risca: linhas com `display: 'from'` ganham uma **chamada "A partir de R$ X"** no cabeçalho da linha, usando o menor preço da linha, e os planos individuais continuam mostrando o próprio preço. A manchete é "a partir de"; o detalhe permanece transparente. Linhas com `display: 'exact'` não mostram essa chamada.

- [ ] **Step 1: Criar o componente de plano**

Crie `src/components/PlanTier.tsx`:

```tsx
import type { PricingLine, Tier } from '../content/pricing'
import { formatBRL } from '../content/pricing'
import { whatsappLink } from '../content/site'

type PlanTierProps = {
  tier: Tier
  unit: PricingLine['unit']
}

export function PlanTier({ tier, unit }: PlanTierProps) {
  const classes = `tier${tier.featured ? ' tier--featured' : ''}`

  return (
    <article className={classes}>
      <p className="tier__flag">{tier.featured ? 'Mais escolhido' : ''}</p>
      <h3 className="tier__name">{tier.name}</h3>
      <p className="tier__price">
        {formatBRL(tier.price)}
        {unit === 'month' ? <span className="tier__unit">/mês</span> : null}
      </p>
      <p className="tier__capture">{tier.capture}</p>
      <ul className="tier__delivery">
        {tier.delivery.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <a
        className="tier__cta"
        href={whatsappLink(
          `Olá! Vim pelo site e queria saber mais sobre o plano ${tier.name}.`,
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        Quero este
      </a>
    </article>
  )
}
```

- [ ] **Step 2: Renderizar as linhas na página**

Em `src/pages/PlanosPage.tsx`, substitua o bloco de imports e adicione a seção das linhas logo depois de `</section>` da intro. O arquivo inteiro fica:

```tsx
import { SiteHeader } from '../components/SiteHeader'
import { PlanTier } from '../components/PlanTier'
import { Reveal } from '../components/Reveal'
import type { PricingLine } from '../content/pricing'
import { formatBRL, lines } from '../content/pricing'
import './PlanosPage.css'

function startingAt(line: PricingLine): string {
  const lowest = Math.min(...line.tiers.map((tier) => tier.price))
  const suffix = line.unit === 'month' ? '/mês' : ''
  return `A partir de ${formatBRL(lowest)}${suffix}`
}

export function PlanosPage() {
  return (
    <>
      <a className="skip-link" href="#planos-conteudo">
        Ir ao conteúdo
      </a>
      <SiteHeader onCinema={false} />

      <main className="planos" id="planos-conteudo">
        <section className="planos__intro">
          <Reveal>
            <p className="planos__eyebrow">Planos</p>
            <h1 className="planos__title">Quanto custa guardar um momento</h1>
            <p className="planos__lead">
              Cada plano diz exatamente quanto tempo eu fico com você, o que você
              recebe e em quanto tempo. Sem valor escondido e sem surpresa no meio
              do caminho.
            </p>
          </Reveal>
        </section>

        {lines.map((line) => (
          <section className="line" key={line.id} aria-labelledby={`linha-${line.id}`}>
            <div className="line__inner">
              <Reveal className="line__head">
                <h2 className="line__title" id={`linha-${line.id}`}>
                  {line.title}
                </h2>
                {line.display === 'from' ? (
                  <p className="line__from">{startingAt(line)}</p>
                ) : null}
                <p className="line__lead">{line.lead}</p>
              </Reveal>
              <div className="tiers">
                {line.tiers.map((tier) => (
                  <PlanTier key={tier.id} tier={tier} unit={line.unit} />
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  )
}
```

- [ ] **Step 3: Estilizar as linhas e os planos**

Adicione ao final de `src/pages/PlanosPage.css`:

```css
.line {
  padding: var(--space-3xl) var(--space-md);
  border-top: 1px solid var(--color-border);
}

.line__inner {
  width: min(68rem, 100%);
  margin-inline: auto;
}

.line__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.75rem, 4.5vw, 2.75rem);
  font-weight: 400;
  line-height: 1.15;
}

.line__from {
  margin: var(--space-sm) 0 0;
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-muted-foreground);
}

.line__lead {
  margin: var(--space-md) 0 0;
  max-width: 52ch;
  font-size: 0.95rem;
  font-weight: 300;
  line-height: 1.6;
  color: var(--color-muted-foreground);
}

.tiers {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.tier {
  display: flex;
  flex-direction: column;
  padding: var(--space-md);
  background: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
  border-radius: 0;
}

.tier--featured {
  border-color: var(--color-foreground);
}

.tier__flag {
  /* min-height reserva o espaço do rótulo nos planos não destacados,
     mantendo os títulos alinhados entre os cards da mesma linha */
  margin: 0 0 var(--space-md);
  min-height: 1rem;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-muted-foreground);
}

.tier__name {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 400;
  line-height: 1.2;
}

.tier__price {
  margin: var(--space-sm) 0 0;
  font-family: var(--font-serif);
  font-size: 2.15rem;
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.tier__unit {
  margin-left: var(--space-xs);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 300;
  color: var(--color-muted-foreground);
}

.tier__capture {
  margin: var(--space-md) 0 0;
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.5;
}

.tier__delivery {
  flex: 1;
  margin: var(--space-md) 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  font-size: 0.9rem;
  font-weight: 300;
  line-height: 1.5;
  color: var(--color-muted-foreground);
}

.tier__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: var(--space-lg);
  padding: 12px 24px;
  background: transparent;
  color: var(--color-foreground);
  border: 1px solid var(--color-foreground);
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: opacity var(--duration-hover) ease;
}

.tier--featured .tier__cta {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.tier__cta:hover {
  opacity: 0.72;
}

@media (min-width: 768px) {
  .line {
    padding-left: var(--space-xl);
    padding-right: var(--space-xl);
  }

  .tiers {
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  }
}
```

- [ ] **Step 4: Conferir visualmente**

Run: `npm run dev:client` e abra `http://localhost:5173/planos`.
Verifique:
- Momentos mostra 3 planos, Ocasiões mostra 4, Marcas mostra 3;
- Momentos **não** tem a chamada "A partir de"; Ocasiões mostra "A partir de R$ 450" e Marcas mostra "A partir de R$ 490/mês";
- História e Ritmo têm borda preta e o rótulo "Mais escolhido"; os outros têm borda cinza e o rótulo ocupa o mesmo espaço em branco, sem desalinhar os títulos;
- os planos da linha Marcas mostram "/mês";
- nenhum card muda de tamanho no hover;
- em 375px os planos empilham em uma coluna sem scroll horizontal.

Encerre o servidor depois.

- [ ] **Step 5: Verificar testes, lint e build**

Run: `npm test && npm run lint && npm run build`
Expected: tudo passando.

- [ ] **Step 6: Commit**

```bash
git add src/components/PlanTier.tsx src/pages/PlanosPage.tsx src/pages/PlanosPage.css
git commit -m "Renderiza as linhas de planos com destaque sem acento cromatico"
```

---

### Task 4: Personalizado e adicionais

Fecha a parte de preço com o plano sob orçamento e a lista de adicionais.

**Files:**
- Modify: `src/pages/PlanosPage.tsx`
- Modify: `src/pages/PlanosPage.css`

**Interfaces:**
- Consumes: `addOns`, `custom`, `formatBRL` de `src/content/pricing.ts`; `whatsappLink` de `src/content/site.ts`.
- Produces: nada novo além do markup.

- [ ] **Step 1: Adicionar as seções**

Em `src/pages/PlanosPage.tsx`, ajuste o import de `pricing` e o import de `site`, e insira as duas seções logo depois do `{lines.map(...)}`:

```tsx
import { addOns, custom, formatBRL, lines } from '../content/pricing'
import { whatsappLink } from '../content/site'
```

```tsx
        <section className="line" aria-labelledby="linha-personalizado">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-personalizado">
                {custom.title}
              </h2>
              <p className="line__lead">{custom.lead}</p>
              <p className="custom__floor">
                Orçamento mínimo de {formatBRL(custom.floor)}.
              </p>
              <a
                className="tier__cta custom__cta"
                href={whatsappLink(
                  'Olá! Vim pelo site e queria um orçamento personalizado.',
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pedir orçamento
              </a>
            </Reveal>
          </div>
        </section>

        <section className="line" aria-labelledby="linha-adicionais">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-adicionais">
                Adicionais
              </h2>
              <p className="line__lead">
                Valem para qualquer plano e sempre aparecem discriminados no
                orçamento, nunca embutidos no total.
              </p>
            </Reveal>
            <dl className="addons">
              {addOns.map((addOn) => (
                <div className="addons__row" key={addOn.id}>
                  <dt>{addOn.label}</dt>
                  <dd>{addOn.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
```

- [ ] **Step 2: Estilizar**

Adicione ao final de `src/pages/PlanosPage.css`:

```css
.line__inner--narrow {
  width: min(46rem, 100%);
}

.custom__floor {
  margin: var(--space-lg) 0 0;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.custom__cta {
  margin-top: var(--space-md);
  align-self: flex-start;
}

.addons {
  margin: var(--space-xl) 0 0;
  border-top: 1px solid var(--color-border);
}

.addons__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm) var(--space-md);
  padding: var(--space-md) 0;
  border-bottom: 1px solid var(--color-border);
}

.addons__row dt {
  flex: 1 1 16rem;
  font-size: 0.9rem;
  font-weight: 300;
  line-height: 1.5;
  color: var(--color-muted-foreground);
}

.addons__row dd {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
}
```

- [ ] **Step 3: Conferir visualmente**

Run: `npm run dev:client` e abra `http://localhost:5173/planos`.
Verifique que o piso aparece como "Orçamento mínimo de R$ 350", que os 8 adicionais listam rótulo à esquerda e valor à direita, e que em 375px o valor quebra para baixo do rótulo sem cortar texto.

Encerre o servidor depois.

- [ ] **Step 4: Verificar testes, lint e build**

Run: `npm test && npm run lint && npm run build`
Expected: tudo passando.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlanosPage.tsx src/pages/PlanosPage.css
git commit -m "Adiciona o plano personalizado e a lista de adicionais"
```

---

### Task 5: Dicionário de peças e regras comerciais

Explica o que o cliente recebe e sob quais condições — é o conteúdo que justifica a diferença de preço entre os planos.

**Files:**
- Modify: `src/pages/PlanosPage.tsx`
- Modify: `src/pages/PlanosPage.css`

**Interfaces:**
- Consumes: `pieces`, `rules` de `src/content/pricing.ts`; `contact` de `src/content/site.ts`; `InstagramLogo` e `WhatsappLogo` de `@phosphor-icons/react`.
- Produces: nada novo além do markup.

- [ ] **Step 1: Adicionar as seções e o CTA final**

Em `src/pages/PlanosPage.tsx`, ajuste os imports e insira as três seções depois da seção de adicionais:

```tsx
import { InstagramLogo, WhatsappLogo } from '@phosphor-icons/react'
import { addOns, custom, formatBRL, lines, pieces, rules } from '../content/pricing'
import { contact, whatsappLink } from '../content/site'
```

```tsx
        <section className="line" aria-labelledby="linha-pecas">
          <div className="line__inner">
            <Reveal>
              <h2 className="line__title" id="linha-pecas">
                O que é cada peça
              </h2>
              <p className="line__lead">
                O filme é para guardar, o teaser é para postar, os cortes são para
                não sumir do feed. Cada um dá um trabalho diferente — é por isso que
                os planos custam preços diferentes.
              </p>
            </Reveal>
            <div className="pieces">
              {pieces.map((piece) => (
                <article className="piece" key={piece.id}>
                  <h3 className="piece__name">{piece.name}</h3>
                  <p className="piece__purpose">{piece.purpose}</p>
                  <p className="piece__body">{piece.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="line" aria-labelledby="linha-regras">
          <div className="line__inner">
            <Reveal>
              <h2 className="line__title" id="linha-regras">
                Como funciona
              </h2>
              <p className="line__lead">
                As mesmas condições para todo mundo, combinadas antes de começar.
              </p>
            </Reveal>
            <div className="rules">
              {rules.map((rule) => (
                <article className="rule" key={rule.id}>
                  <h3 className="rule__title">{rule.title}</h3>
                  <p className="rule__body">{rule.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="line planos__cta-final" aria-labelledby="linha-contato">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-contato">
                Conte o momento que você quer guardar
              </h2>
              <div className="planos__links">
                <a
                  className="tier__cta"
                  href={whatsappLink(
                    'Olá! Vim pela página de planos e queria conversar sobre um projeto.',
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsappLogo size={20} weight="regular" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  className="tier__cta"
                  href={contact.instagramDm}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramLogo size={20} weight="regular" aria-hidden="true" />
                  Direct
                </a>
              </div>
            </Reveal>
          </div>
        </section>
```

- [ ] **Step 2: Estilizar**

Adicione ao final de `src/pages/PlanosPage.css`:

```css
.pieces,
.rules {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-lg);
  margin-top: var(--space-xl);
}

.piece,
.rule {
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.piece__name,
.rule__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1.25;
}

.piece__purpose {
  margin: var(--space-xs) 0 0;
  font-size: 0.62rem;
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--color-muted-foreground);
}

.piece__body,
.rule__body {
  margin: var(--space-sm) 0 0;
  font-size: 0.9rem;
  font-weight: 300;
  line-height: 1.6;
  color: var(--color-muted-foreground);
}

.planos__cta-final {
  text-align: center;
}

.planos__cta-final .line__title {
  max-width: 20ch;
  margin-inline: auto;
}

.planos__links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-md);
  margin-top: var(--space-xl);
}

.planos__links .tier__cta {
  gap: var(--space-sm);
  margin-top: 0;
}

@media (min-width: 768px) {
  .pieces {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-xl);
  }

  .rules {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-xl);
  }
}

@media (min-width: 1024px) {
  .rules {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

- [ ] **Step 3: Conferir visualmente**

Run: `npm run dev:client` e abra `http://localhost:5173/planos`.
Verifique que aparecem as 4 peças e as 8 regras, que os ícones do Phosphor renderizam nos dois botões finais e que em 1024px as regras ficam em 4 colunas sem texto espremido.

Encerre o servidor depois.

- [ ] **Step 4: Verificar testes, lint e build**

Run: `npm test && npm run lint && npm run build`
Expected: tudo passando.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PlanosPage.tsx src/pages/PlanosPage.css
git commit -m "Adiciona o dicionario de pecas, as regras comerciais e o CTA final"
```

---

### Task 6: Acessibilidade, responsividade e fechamento

Passa o pente fino do checklist de pré-entrega do design system e liga a página de planos à home.

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/pages/PlanosPage.css`

**Interfaces:**
- Consumes: `RouteLink` de `src/components/RouteLink.tsx` (Task 2).
- Produces: nada novo.

- [ ] **Step 1: Garantir foco visível e reduced-motion na página**

Adicione ao final de `src/pages/PlanosPage.css`:

```css
.planos a:focus-visible,
.planos .tier__cta:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .tier__cta,
  .planos a {
    transition: none;
  }
}
```

- [ ] **Step 2: Levar o visitante da home para os planos**

Em `src/pages/HomePage.tsx`, adicione o import do `RouteLink` junto dos outros imports de componente:

```tsx
import { RouteLink } from '../components/RouteLink'
```

E, dentro da seção `#sobre`, logo depois do `<Reveal className="about__echo">`, adicione:

```tsx
            <Reveal>
              <RouteLink className="about__link" to="/planos">
                Ver planos e valores
              </RouteLink>
            </Reveal>
```

- [ ] **Step 3: Estilizar o link da home**

Adicione ao final de `src/pages/HomePage.css`:

```css
.about__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  margin-top: var(--space-xl);
  padding: 12px 24px;
  color: var(--color-foreground);
  border: 1px solid var(--color-foreground);
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: opacity var(--duration-hover) ease;
}

.about__link:hover {
  opacity: 0.72;
}

.about__link:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Rodar o checklist de pré-entrega**

Run: `npm run dev:client` e percorra `http://localhost:5173/planos` conferindo cada item:
- Larguras 375px, 768px, 1024px e 1440px sem scroll horizontal.
- Navegação só por teclado: Tab percorre skip-link, marca, menu, todos os CTAs, e o anel de foco é visível em todos.
- O skip-link leva ao conteúdo.
- Nenhum hex solto no CSS novo: `Select-String -Path src/pages/PlanosPage.css -Pattern '#[0-9a-fA-F]{3,8}'` não retorna nada.
- Nenhum emoji usado como ícone.
- Com `prefers-reduced-motion: reduce` ativo no DevTools, o conteúdo aparece já no estado final.
- A home continua íntegra, com o vídeo do hero e o novo botão "Ver planos e valores" na seção Sobre.

Encerre o servidor depois.

- [ ] **Step 5: Verificar testes, lint e build**

Run: `npm test && npm run lint && npm run build`
Expected: tudo passando.

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx src/pages/HomePage.css src/pages/PlanosPage.css
git commit -m "Liga a home aos planos e fecha acessibilidade e responsividade"
```
