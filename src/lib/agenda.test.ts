import { describe, expect, it } from 'vitest'
import {
  AGENDA_COLORS,
  dayKey,
  emptyForm,
  eventDays,
  formFromEvent,
  groupByDay,
  inputFromForm,
  monthGrid,
  nameFromEmail,
  pickColor,
  shiftMonth,
  timeLabel,
  type AgendaEvent,
} from './agenda'

function event(partial: Partial<AgendaEvent>): AgendaEvent {
  return {
    id: 'e1',
    ownerId: 'u1',
    tipo: 'gravacao',
    titulo: 'Gravação',
    inicio: new Date(2026, 10, 16, 9, 0).toISOString(),
    fim: new Date(2026, 10, 16, 10, 0).toISOString(),
    diaTodo: false,
    local: '',
    clientId: null,
    notas: '',
    ...partial,
  }
}

describe('monthGrid', () => {
  it('cobre o mês em semanas completas de domingo a sábado', () => {
    const weeks = monthGrid({ year: 2026, month: 10 })
    expect(weeks[0][0]).toEqual({ key: '2026-11-01', inMonth: true })
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const last = weeks[weeks.length - 1]
    expect(last[6].key).toBe('2026-12-05')
    expect(last[6].inMonth).toBe(false)
  })

  it('começa no domingo anterior ao dia 1', () => {
    const weeks = monthGrid({ year: 2026, month: 11 })
    expect(weeks[0][0].key).toBe('2026-11-29')
    expect(weeks[0][2].key).toBe('2026-12-01')
  })
})

describe('shiftMonth', () => {
  it('vira o ano', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
  })
})

describe('eventDays e groupByDay', () => {
  it('evento de horas fica no próprio dia', () => {
    expect(eventDays(event({}))).toEqual(['2026-11-16'])
  })

  it('dia inteiro termina na meia-noite seguinte sem invadir o outro dia', () => {
    const e = event({
      diaTodo: true,
      inicio: new Date(2026, 10, 16).toISOString(),
      fim: new Date(2026, 10, 18).toISOString(),
    })
    expect(eventDays(e)).toEqual(['2026-11-16', '2026-11-17'])
  })

  it('ordena dia inteiro antes e depois por horário', () => {
    const tarde = event({ id: 'a', inicio: new Date(2026, 10, 16, 15).toISOString(), fim: new Date(2026, 10, 16, 16).toISOString() })
    const manha = event({ id: 'b' })
    const todo = event({
      id: 'c',
      diaTodo: true,
      inicio: new Date(2026, 10, 16).toISOString(),
      fim: new Date(2026, 10, 17).toISOString(),
    })
    const map = groupByDay([tarde, manha, todo])
    expect(map.get('2026-11-16')?.map((e) => e.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('timeLabel', () => {
  it('mostra o intervalo no mesmo dia', () => {
    expect(timeLabel(event({}), '2026-11-16')).toBe('09:00–10:00')
  })

  it('marca início e fim de evento que atravessa a noite', () => {
    const e = event({ inicio: new Date(2026, 10, 16, 22).toISOString(), fim: new Date(2026, 10, 17, 2).toISOString() })
    expect(timeLabel(e, '2026-11-16')).toBe('22:00 →')
    expect(timeLabel(e, '2026-11-17')).toBe('→ 02:00')
  })
})

describe('formulário', () => {
  it('converte horário local em ISO', () => {
    const result = inputFromForm({ ...emptyForm('2026-11-16'), titulo: '  Reels Soul Circo ' })
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.titulo).toBe('Reels Soul Circo')
    expect(new Date(result.inicio).getHours()).toBe(9)
    expect(dayKey(new Date(result.fim))).toBe('2026-11-16')
  })

  it('recusa fim antes do início', () => {
    const result = inputFromForm({ ...emptyForm('2026-11-16'), titulo: 'x', horaInicio: '10:00', horaFim: '09:00' })
    expect(result).toEqual({ error: 'O fim não pode ser antes do início.' })
  })

  it('exige título', () => {
    expect(inputFromForm(emptyForm('2026-11-16'))).toEqual({ error: 'Dê um título para o evento.' })
  })

  it('só guarda cliente em gravação', () => {
    const result = inputFromForm({ ...emptyForm('2026-11-16'), titulo: 'x', tipo: 'evento', clientId: 'c1' })
    expect('error' in result ? null : result.clientId).toBeNull()
  })

  it('ida e volta de evento de dia inteiro mantém o último dia', () => {
    const input = inputFromForm({ ...emptyForm('2026-11-16'), titulo: 'Feira', diaTodo: true, dataFim: '2026-11-18' })
    if ('error' in input) throw new Error(input.error)
    const form = formFromEvent({ ...input, id: 'x', ownerId: 'u' })
    expect(form.dataInicio).toBe('2026-11-16')
    expect(form.dataFim).toBe('2026-11-18')
  })
})

describe('equipe', () => {
  it('escolhe a primeira cor livre', () => {
    expect(pickColor([])).toBe(AGENDA_COLORS[0])
    expect(pickColor([AGENDA_COLORS[0]])).toBe(AGENDA_COLORS[1])
  })

  it('tira um nome do e-mail', () => {
    expect(nameFromEmail('ana.julia@exemplo.com')).toBe('Ana Julia')
    expect(nameFromEmail('@x')).toBe('Equipe')
  })
})
