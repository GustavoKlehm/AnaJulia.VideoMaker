/**
 * Tema white-label do portal: a partir das duas cores do cliente, gera as variáveis CSS
 * garantindo contraste legível (WCAG AA 4.5:1) mesmo quando a cor escolhida é clara demais.
 */

type Rgb = [number, number, number]

const WHITE: Rgb = [255, 255, 255]
const INK: Rgb = [26, 26, 26]

function toRgb(hex: string): Rgb {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`
}

function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const la = luminance(toRgb(a))
  const lb = luminance(toRgb(b))
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Escurece (ou clareia) `color` até ter o contraste mínimo contra `against`. */
function ensureContrast(color: string, against: string, min: number, toward: Rgb): string {
  if (contrast(color, against) >= min) return color
  const base = toRgb(color)
  for (let step = 1; step <= 20; step += 1) {
    const candidate = toHex(mix(base, toward, step / 20))
    if (contrast(candidate, against) >= min) return candidate
  }
  return toHex(toward)
}

export type PortalTheme = Record<
  | '--client-primary'
  | '--client-on-primary'
  | '--client-primary-ink'
  | '--client-secondary'
  | '--client-on-secondary'
  | '--client-tint',
  string
>

export function portalTheme(primary: string, secondary: string): PortalTheme {
  const white = toHex(WHITE)
  const ink = toHex(INK)

  // Botões: cor principal com texto branco; se não der contraste, escurece a principal.
  const buttonBg = ensureContrast(primary, white, 4.5, [0, 0, 0])
  // Texto de destaque sobre o fundo claro.
  const primaryInk = ensureContrast(primary, white, 4.5, [0, 0, 0])
  // Superfície secundária com texto escuro; se a secundária for escura demais, clareia.
  const surface = ensureContrast(secondary, ink, 7, WHITE)
  // Fundo bem suave para a página, derivado da secundária.
  const tint = toHex(mix(toRgb(surface), WHITE, 0.65))

  return {
    '--client-primary': buttonBg,
    '--client-on-primary': white,
    '--client-primary-ink': primaryInk,
    '--client-secondary': surface,
    '--client-on-secondary': ink,
    '--client-tint': tint,
  }
}
