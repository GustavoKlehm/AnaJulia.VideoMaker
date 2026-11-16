import { describe, expect, it } from 'vitest'
import { calendarMonths, dayMonth, periodLabel, weekday } from './portalCalendar'

describe('calendarMonths', () => {
  it('monta dezembro de 2026 começando na terça', () => {
    const [dez] = calendarMonths('2026-12-01', '2026-12-31')
    expect(dez.label).toBe('dezembro 2026')
    expect(dez.cells.slice(0, 3)).toEqual([null, null, '2026-12-01'])
    expect(dez.cells.filter(Boolean)).toHaveLength(31)
  })

  it('cobre dois meses e a virada de ano', () => {
    expect(calendarMonths('2026-11-01', '2026-12-31').map((m) => m.key)).toEqual(['2026-11', '2026-12'])
    expect(calendarMonths('2026-12-15', '2027-01-20').map((m) => m.key)).toEqual(['2026-12', '2027-01'])
  })
})

describe('rótulos', () => {
  it('formata datas e períodos', () => {
    expect(weekday('2026-12-03')).toBe('qui')
    expect(dayMonth('2026-12-03')).toBe('3/12')
    expect(periodLabel('2026-12-01', '2026-12-31')).toBe('dezembro de 2026')
    expect(periodLabel('2026-11-01', '2026-12-31')).toBe('novembro e dezembro de 2026')
  })
})
