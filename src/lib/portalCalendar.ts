export const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export type CalendarMonth = {
  key: string
  label: string
  /** Células da grade: null = espaço antes do dia 1; string = data ISO. */
  cells: (string | null)[]
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Meses (grade domingo→sábado) que cobrem o período do plano. */
export function calendarMonths(inicio: string, fim: string): CalendarMonth[] {
  const [y0, m0] = inicio.split('-').map(Number)
  const [y1, m1] = fim.split('-').map(Number)
  const months: CalendarMonth[] = []
  let y = y0
  let m = m0
  while (y < y1 || (y === y1 && m <= m1)) {
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const cells: (string | null)[] = Array.from({ length: first }, () => null)
    for (let d = 1; d <= days; d += 1) cells.push(`${y}-${pad(m)}-${pad(d)}`)
    months.push({ key: `${y}-${pad(m)}`, label: `${MONTHS[m - 1]} ${y}`, cells })
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    if (months.length > 6) break
  }
  return months
}

export function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function dayMonth(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d}/${pad(m)}`
}

/** "dezembro de 2026" ou "novembro e dezembro de 2026". */
export function periodLabel(inicio: string, fim: string): string {
  const months = calendarMonths(inicio, fim)
  const [y0] = inicio.split('-')
  const [y1] = fim.split('-')
  const names = months.map((mo) => mo.label.split(' ')[0])
  if (y0 !== y1) return `${months[0].label} a ${months[months.length - 1].label}`
  const joined = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
  return `${joined} de ${y0}`
}
