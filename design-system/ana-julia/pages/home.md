# Home Page Overrides

> **PROJECT:** Ana Julia
> **Page Type:** Editorial cinematográfico — hero-centric + histórias em capítulos
> Rules here **override** `design-system/ana-julia/MASTER.md`.

---

## Concept

Editorial cinematográfico: papel e cinema, sem cards. O audiovisual (ou o quadro-título) é o protagonista. Slogan oficial: **Transformando momentos em histórias**.

## Layout

1. **Hero cinema** (`#inicio`) — viewport inteiro, `--color-cinema`. Slogan em Playfair itálico. Sem logo preta sobre o escuro.
2. **Marca** (`#marca`) — papel `#F8F8F8`, logo oficial PNG, respiro amplo.
3. **Histórias** (`#historias`) — cada trabalho é um capítulo full-bleed, não uma galeria.
4. **Sobre** (`#sobre`) — pouco texto, no papel.
5. **Contato** (`#contato`) — um convite, sem formulário-card.

Nav fixa, discreta: Histórias · Sobre · Contato. No hero, tipo `--color-on-cinema`; no papel, `--color-foreground`. Sem logo no header (a marca preta some no cinema).

## Motion

Scroll reveal sutil (opacity + 12px, ~380ms). Sem parallax, pin ou stagger elástico. `prefers-reduced-motion`: estado final visível. Vídeo do hero: Storage `media/hero_cinematographic.MOV`, autoplay mudo + loop, pause e para fora da tela; sem autoplay se reduced-motion.

## Media

- Wordmark: `public/brand/logo-anajulia.png` (seção marca)
- Ícone: `logo-anajulia-icon.png` no papel; `logo-anajulia-icon-negativo.png` no cinema e no favicon escuro
- Hero: bucket público `media` → `hero_cinematographic.MOV` (`VITE_HERO_VIDEO_URL`)
- Capítulos aceitam `poster` / `src` em `src/content/site.ts` quando houver filmes reais

## Anti-patterns on this page

- Grid de thumbnails, cards, sombras, gradientes, bordas
- Acento cromático
- Texto longo no hero
