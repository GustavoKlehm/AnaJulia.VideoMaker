import { MONTHS, WEEKDAYS_SHORT } from './portalCalendar'

/** Lógica da agenda do estúdio, sem React nem Supabase (testável). Datas no fuso do navegador. */

export type AgendaTipo = 'compromisso' | 'gravacao' | 'evento' | 'outro'

export const AGENDA_TIPOS: { value: AgendaTipo; label: string }[] = [
  { value: 'gravacao', label: 'Gravação' },
  { value: 'compromisso', label: 'Compromisso' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
]

export function tipoLabel(tipo: AgendaTipo): string {
  return AGENDA_TIPOS.find((t) => t.value === tipo)?.label ?? 'Outro'
}

/** Cores que se distinguem bem entre si e com texto escuro por cima de um tom claro delas. */
export const AGENDA_COLORS = [
  '#b8322a',
  '#2d5b9a',
  '#2f7a4f',
  '#8a4fa3',
  '#c27a12',
  '#1f7a8c',
  '#a33a6b',
  '#5b6b2e',
]

export type AgendaEvent = {
  id: string
  ownerId: string
  tipo: AgendaTipo
  titulo: string
  inicio: string
  fim: string
  diaTodo: boolean
  local: string
  clientId: string | null
  notas: string
}

export type AgendaMember = { userId: string; nome: string; cor: string }

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Data local → "2026-11-16". */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "2026-11-16" → meia-noite local desse dia. */
export function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, amount: number): string {
  const date = parseDay(key)
  date.setDate(date.getDate() + amount)
  return dayKey(date)
}

export type MonthCursor = { year: number; month: number }

export function shiftMonth(cursor: MonthCursor, amount: number): MonthCursor {
  const date = new Date(cursor.year, cursor.month + amount, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function monthLabel(cursor: MonthCursor): string {
  return `${MONTHS[cursor.month]} ${cursor.year}`
}

export type GridDay = { key: string; inMonth: boolean }

/** Semanas completas (domingo → sábado) que cobrem o mês. */
export function monthGrid(cursor: MonthCursor): GridDay[][] {
  const first = new Date(cursor.year, cursor.month, 1)
  const start = dayKey(new Date(cursor.year, cursor.month, 1 - first.getDay()))
  const weeks: GridDay[][] = []
  let key = start
  do {
    const week: GridDay[] = []
    for (let i = 0; i < 7; i += 1) {
      week.push({ key, inMonth: parseDay(key).getMonth() === cursor.month })
      key = addDays(key, 1)
    }
    weeks.push(week)
  } while (parseDay(key).getMonth() === cursor.month)
  return weeks
}

/** Intervalo [início, fim) em ISO para buscar os eventos visíveis na grade. */
export function gridRange(weeks: GridDay[][]): { from: string; to: string } {
  const firstKey = weeks[0][0].key
  const lastKey = weeks[weeks.length - 1][6].key
  return {
    from: parseDay(firstKey).toISOString(),
    to: parseDay(addDays(lastKey, 1)).toISOString(),
  }
}

/** Dias (chaves locais) que o evento ocupa. Dia inteiro termina na meia-noite seguinte (exclusiva). */
export function eventDays(event: Pick<AgendaEvent, 'inicio' | 'fim'>): string[] {
  const start = new Date(event.inicio)
  const endInclusive = new Date(Math.max(start.getTime(), new Date(event.fim).getTime() - 1))
  const last = dayKey(endInclusive)
  const days: string[] = []
  let key = dayKey(start)
  while (key <= last && days.length < 366) {
    days.push(key)
    key = addDays(key, 1)
  }
  return days
}

function compareEvents(a: AgendaEvent, b: AgendaEvent): number {
  if (a.diaTodo !== b.diaTodo) return a.diaTodo ? -1 : 1
  return a.inicio.localeCompare(b.inicio) || a.titulo.localeCompare(b.titulo)
}

export function groupByDay(events: AgendaEvent[]): Map<string, AgendaEvent[]> {
  const map = new Map<string, AgendaEvent[]>()
  for (const event of events) {
    for (const key of eventDays(event)) {
      const list = map.get(key)
      if (list) list.push(event)
      else map.set(key, [event])
    }
  }
  for (const list of map.values()) list.sort(compareEvents)
  return map
}

export function timeOf(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Texto curto de horário para um dia específico da grade. */
export function timeLabel(event: AgendaEvent, day: string): string {
  if (event.diaTodo) return 'Dia todo'
  const start = new Date(event.inicio)
  const end = new Date(event.fim)
  const startsToday = dayKey(start) === day
  const endsToday = dayKey(end) === day
  if (startsToday && endsToday) return `${timeOf(start)}–${timeOf(end)}`
  if (startsToday) return `${timeOf(start)} →`
  if (endsToday) return `→ ${timeOf(end)}`
  return 'Dia todo'
}

/** "seg, 16 de novembro" */
export function longDayLabel(key: string): string {
  const date = parseDay(key)
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()} de ${MONTHS[date.getMonth()]}`
}

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------

export type EventForm = {
  tipo: AgendaTipo
  titulo: string
  dataInicio: string
  horaInicio: string
  dataFim: string
  horaFim: string
  diaTodo: boolean
  local: string
  clientId: string
  notas: string
}

export type EventInput = Omit<AgendaEvent, 'id' | 'ownerId'>

export function emptyForm(day: string): EventForm {
  return {
    tipo: 'gravacao',
    titulo: '',
    dataInicio: day,
    horaInicio: '09:00',
    dataFim: day,
    horaFim: '10:00',
    diaTodo: false,
    local: '',
    clientId: '',
    notas: '',
  }
}

export function formFromEvent(event: AgendaEvent): EventForm {
  const start = new Date(event.inicio)
  const end = new Date(event.fim)
  const lastDay = event.diaTodo ? addDays(dayKey(end), -1) : dayKey(end)
  return {
    tipo: event.tipo,
    titulo: event.titulo,
    dataInicio: dayKey(start),
    horaInicio: timeOf(start),
    dataFim: lastDay < dayKey(start) ? dayKey(start) : lastDay,
    horaFim: timeOf(end),
    diaTodo: event.diaTodo,
    local: event.local,
    clientId: event.clientId ?? '',
    notas: event.notas,
  }
}

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

function at(day: string, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const date = parseDay(day)
  date.setHours(h, m, 0, 0)
  return date
}

export function inputFromForm(form: EventForm): EventInput | { error: string } {
  const titulo = form.titulo.trim()
  if (!titulo) return { error: 'Dê um título para o evento.' }
  if (titulo.length > 200) return { error: 'O título pode ter até 200 caracteres.' }
  if (!DAY_PATTERN.test(form.dataInicio)) return { error: 'Escolha a data de início.' }
  const dataFim = DAY_PATTERN.test(form.dataFim) ? form.dataFim : form.dataInicio

  let inicio: Date
  let fim: Date
  if (form.diaTodo) {
    if (dataFim < form.dataInicio) return { error: 'O último dia não pode ser antes do primeiro.' }
    inicio = parseDay(form.dataInicio)
    fim = parseDay(addDays(dataFim, 1))
  } else {
    if (!TIME_PATTERN.test(form.horaInicio) || !TIME_PATTERN.test(form.horaFim)) {
      return { error: 'Informe o horário de início e de fim.' }
    }
    inicio = at(form.dataInicio, form.horaInicio)
    fim = at(dataFim, form.horaFim)
    if (fim < inicio) return { error: 'O fim não pode ser antes do início.' }
  }

  return {
    tipo: form.tipo,
    titulo,
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    diaTodo: form.diaTodo,
    local: form.local.trim().slice(0, 200),
    clientId: form.tipo === 'gravacao' && form.clientId ? form.clientId : null,
    notas: form.notas.trim().slice(0, 4000),
  }
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------

/** Primeira cor da paleta que ninguém usa; se todas estiverem em uso, repete em ordem. */
export function pickColor(used: string[]): string {
  const free = AGENDA_COLORS.find((c) => !used.includes(c))
  return free ?? AGENDA_COLORS[used.length % AGENDA_COLORS.length]
}

/** "ana.julia@x.com" → "Ana Julia" */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
  return (name || 'Equipe').slice(0, 60)
}

/** Cor de quem não tem perfil ainda: estável a partir do id. */
export function fallbackColor(userId: string): string {
  let hash = 0
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AGENDA_COLORS[hash % AGENDA_COLORS.length]
}
