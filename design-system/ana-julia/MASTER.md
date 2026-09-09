# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/ana-julia/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Ana Julia
**Generated:** 2026-09-08 (ui-ux-pro-max) · **Brand lock:** `logo-anajulia.png` + ícone `logo-anajulia-icon.png`
**Category:** Videomaker portfolio / catalog
**Design Dials:** Variance 2/10 (Centered / Minimal) | Motion 2/10 (Subtle) | Density 2/10 (Spacious)

**Skill:** `.cursor/skills/ui-ux-pro-max` — style *Minimalism & Swiss Style*; home = editorial cinematográfico (hero + capítulos); type *Classic Elegant* (Playfair Display + Inter).

**Slogan:** Transformando momentos em histórias.

The catalog suggested a blue accent. **Do not use it.** The logo is black ink on a transparent PNG. Brand assets override generated palettes.

---

## Global Rules

### Color Palette

Sampled from the official logo. Tokens live in `src/styles/tokens.css`.

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#000000` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#3F3F46` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#000000` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8F8F8` | `--color-background` |
| Foreground | `#000000` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#000000` | `--color-card-foreground` |
| Muted | `#E8E8E8` | `--color-muted` |
| Muted Foreground | `#525252` | `--color-muted-foreground` |
| Border | `#E8E8E8` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#000000` | `--color-ring` |
| Cinema | `#0A0A0A` | `--color-cinema` |
| On Cinema | `#F8F8F8` | `--color-on-cinema` |
| Cinema Muted | `#A3A3A3` | `--color-cinema-muted` |

**Color Notes:** Paper `#F8F8F8` for marca/sobre. Cinema `#0A0A0A` for hero and story chapters. No chromatic accents. Hairline borders before shadows. Logo preta só sobre papel.

### Typography

- **Heading Font:** Playfair Display (echoes the serif **A** in the monogram)
- **Body Font:** Inter
- **Labels / wordmarks:** Inter 500, uppercase, `letter-spacing: 0.28em` (STORYMAKER / VIDEOMAKER)
- **Mood:** elegant, editorial, premium, high contrast
- **Google Fonts:** [Playfair Display + Inter](https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
```

### Brand assets

| File | Use |
|------|-----|
| `public/brand/logo-anajulia.png` | Wordmark horizontal. Seções amplas, papel. |
| `public/brand/logo-anajulia-icon.png` | Monograma AJ preto. Header no papel, favicon em tema claro. |
| `public/brand/logo-anajulia-icon-negativo.png` | Monograma AJ branco. Header no cinema, favicon em tema escuro. |

- Do not recolor, crop the monogram, or replace letters with a text approximation
- Prefer the official negative PNG over CSS `filter: invert`
- Favicon follows `prefers-color-scheme` (`index.html`)
- Wordmark: `alt` with name + role. Icon in header: `alt="Ana Julia"`
- `max-width: 100%`; keep generous clear space around the mark

### Spacing Variables

*Density: 2/10 — Spacious*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps |
| `--space-sm` | `8px` | Icon gaps, inline spacing |
| `--space-md` | `24px` | Standard padding |
| `--space-lg` | `32px` | Section padding |
| `--space-xl` | `48px` | Large gaps |
| `--space-2xl` | `64px` | Section margins |
| `--space-3xl` | `96px` | Hero padding |

### Shadow Depths

Prefer no elevation. Use `--color-border` first.

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `none` | Default |
| `--shadow-md` | `0 1px 0 var(--color-border)` | Hairline lift only if needed |
| `--shadow-lg` | `0 1px 0 var(--color-border)` | Same — do not add soft shadows |
| `--shadow-xl` | `0 1px 0 var(--color-border)` | Same |

---

## Component Specs

### Buttons

```css
.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  padding: 12px 24px;
  border: 1px solid var(--color-primary);
  border-radius: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: opacity 200ms ease;
  cursor: pointer;
}

.btn-primary:hover { opacity: 0.72; }

.btn-secondary {
  background: transparent;
  color: var(--color-foreground);
  border: 1px solid var(--color-foreground);
  padding: 12px 24px;
  border-radius: 0;
  font-family: var(--font-sans);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: opacity 200ms ease;
  cursor: pointer;
}
```

Square corners. No translateY hover (layout must not shift).

### Cards

```css
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-md);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: 0;
  font-size: 16px;
  background: var(--color-card);
  color: var(--color-foreground);
}

.input:focus {
  border-color: var(--color-ring);
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

---

## Style Guidelines

**Style:** Minimalism & Swiss Style, locked to the logo.

**Keywords:** Clean, spacious, high contrast, geometric, essential, editorial

**Key Effects:** Subtle hover (200–250ms), no parallax, no chromatic accents, type hierarchy over decoration.

### Page Pattern (default, when a page file does not exist)

**Pattern Name:** Editorial cinematográfico

- Hero cinema + capítulos de história (não masonry de cards)
- Papel para marca, sobre e contato
- CTA: capítulo + convite no rodapé — sem botão sticky colorido

---

## Motion

Subtle scroll reveal (opacity + 12px, ~380ms). No GSAP unless a page truly needs it.

- Honor `prefers-reduced-motion: reduce` (no motion, final state immediately)
- Do not hide below-the-fold content with `opacity: 0` as the default render (use `html.js-motion`)
- Hero video: click-to-play, pause control, stop off-screen; never autoplay under reduced motion
- Animate at most 1–2 elements per view
- No parallax, pin, or scroll-jacking

---

## Anti-Patterns (Do NOT Use)

- ❌ Blue or any chromatic accent (including the catalog `#2563EB`)
- ❌ Rounded “SaaS” cards and pill buttons
- ❌ Emojis as icons — Phosphor (`@phosphor-icons/react`) when icons are needed
- ❌ Recoloring or redrawing the logo
- ❌ Layout-shifting hovers (`translateY`, scale that changes bounds)
- ❌ Low contrast text — 4.5:1 minimum (`--color-muted-foreground` is `#525252` on paper)
- ❌ Invisible focus — use `--color-ring`
- ❌ Instant state changes — 150–300ms transitions

---

## Pre-Delivery Checklist

- [ ] Tokens from `src/styles/tokens.css` only — no ad-hoc hex on screens
- [ ] Official logo path and proportions
- [ ] No emoji icons
- [ ] `cursor: pointer` on clickable elements
- [ ] Hover 150–300ms without layout shift
- [ ] Text contrast ≥ 4.5:1
- [ ] Visible `:focus-visible`
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px — no horizontal scroll
