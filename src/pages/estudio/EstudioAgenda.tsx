import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useAuth } from '../../hooks/useAuth'
import {
  dayKey,
  fallbackColor,
  gridRange,
  groupByDay,
  longDayLabel,
  monthGrid,
  monthLabel,
  shiftMonth,
  timeLabel,
  tipoLabel,
  type AgendaEvent,
  type AgendaMember,
  type EventInput,
  type MonthCursor,
} from '../../lib/agenda'
import {
  createEvent,
  deleteEvent,
  ensureOwnProfile,
  listAgendaClients,
  listEvents,
  listMembers,
  saveOwnProfile,
  updateEvent,
  type AgendaClient,
} from '../../lib/agendaData'
import { WEEKDAYS_SHORT } from '../../lib/portalCalendar'
import { EventDialog, ProfileEditor, type DialogState } from './EstudioAgendaParts'
import './estudio.css'
import './agenda.css'

const MAX_CHIPS = 3

export function EstudioAgenda() {
  const { user } = useAuth()
  const today = dayKey(new Date())
  const [cursor, setCursor] = useState<MonthCursor>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selected, setSelected] = useState(today)
  const [loaded, setLoaded] = useState<{ from: string; events: AgendaEvent[] } | null>(null)
  const [members, setMembers] = useState<AgendaMember[]>([])
  const [clients, setClients] = useState<AgendaClient[]>([])
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [dialog, setDialog] = useState<DialogState>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [error, setError] = useState('')

  const weeks = useMemo(() => monthGrid(cursor), [cursor])
  const range = useMemo(() => gridRange(weeks), [weeks])

  const loadEvents = useCallback(async () => {
    const list = await listEvents(range.from, range.to)
    setLoaded({ from: range.from, events: list })
  }, [range])
  // Enquanto o mês novo não chega, a grade mostra "carregando" em vez dos eventos do mês anterior.
  const events = loaded?.from === range.from ? loaded.events : null

  useEffect(() => {
    loadEvents().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para abrir a agenda.'))
  }, [loadEvents])

  // Equipe e clientes: uma vez. O perfil é criado na primeira visita.
  useEffect(() => {
    if (!user) return
    listMembers()
      .then((list) => ensureOwnProfile(user.id, user.email ?? '', list))
      .then(setMembers)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para carregar a equipe.'))
    listAgendaClients()
      .then(setClients)
      .catch(() => setClients([]))
  }, [user])

  // Outra pessoa pode ter mexido na agenda enquanto a aba estava em segundo plano.
  useEffect(() => {
    function refresh() {
      if (document.visibilityState === 'visible') void loadEvents().catch(() => undefined)
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [loadEvents])

  const memberOf = useCallback(
    (userId: string): AgendaMember =>
      members.find((m) => m.userId === userId) ?? { userId, nome: 'Equipe', cor: fallbackColor(userId) },
    [members],
  )

  const visible = useMemo(() => (events ?? []).filter((e) => !hidden.has(e.ownerId)), [events, hidden])
  const byDay = useMemo(() => groupByDay(visible), [visible])
  const clientName = useCallback((id: string | null) => clients.find((c) => c.id === id)?.nome, [clients])

  const me = user ? members.find((m) => m.userId === user.id) : undefined
  // Quem tem evento no mês mas ainda não tem perfil também aparece na legenda.
  const legend = useMemo(() => {
    const ids = new Set(members.map((m) => m.userId))
    const extra = (events ?? []).filter((e) => !ids.has(e.ownerId)).map((e) => memberOf(e.ownerId))
    return [...members, ...extra.filter((m, i) => extra.findIndex((x) => x.userId === m.userId) === i)]
  }, [members, events, memberOf])

  function goTo(next: MonthCursor) {
    setCursor(next)
    const first = dayKey(new Date(next.year, next.month, 1))
    setSelected(next.year === new Date().getFullYear() && next.month === new Date().getMonth() ? today : first)
  }

  function toggleMember(userId: string) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleSave(id: string | null, input: EventInput) {
    if (id) await updateEvent(id, input)
    else await createEvent(input)
    setDialog(null)
    setSelected(dayKey(new Date(input.inicio)))
    const start = new Date(input.inicio)
    if (start.getFullYear() !== cursor.year || start.getMonth() !== cursor.month) {
      setCursor({ year: start.getFullYear(), month: start.getMonth() })
    } else {
      await loadEvents()
    }
  }

  async function handleDelete(id: string) {
    await deleteEvent(id)
    setDialog(null)
    await loadEvents()
  }

  async function handleProfile(nome: string, cor: string) {
    if (!user) return
    await saveOwnProfile(user.id, nome, cor)
    setMembers(await listMembers())
    setEditingProfile(false)
  }

  const dayEvents = byDay.get(selected) ?? []

  return (
    <main className="estudio-page estudio-page--wide agenda">
      <div className="agenda-head">
        <div>
          <p className="estudio-kicker">Estúdio</p>
          <h1>Agenda</h1>
        </div>
        <button className="estudio-button" type="button" onClick={() => setDialog({ mode: 'new', day: selected })}>
          Novo evento
        </button>
      </div>

      <section className="agenda-team" aria-label="Equipe">
        <ul className="agenda-legend">
          {legend.map((m) => {
            const off = hidden.has(m.userId)
            return (
              <li key={m.userId}>
                <button
                  type="button"
                  aria-pressed={!off}
                  title={off ? `Mostrar eventos de ${m.nome}` : `Esconder eventos de ${m.nome}`}
                  onClick={() => toggleMember(m.userId)}
                >
                  <i style={{ background: m.cor }} aria-hidden="true" />
                  {m.nome}
                  {m.userId === user?.id ? <em> (você)</em> : null}
                </button>
              </li>
            )
          })}
        </ul>
        {me && !editingProfile ? (
          <button className="agenda-link" type="button" onClick={() => setEditingProfile(true)}>
            Mudar meu nome ou cor
          </button>
        ) : null}
        {me && editingProfile ? (
          <ProfileEditor
            me={me}
            others={members.filter((m) => m.userId !== me.userId)}
            onSave={handleProfile}
            onCancel={() => setEditingProfile(false)}
          />
        ) : null}
      </section>

      {error ? <p className="estudio-error">{error}</p> : null}

      <div className="agenda-layout">
        <section className="agenda-month" aria-labelledby="agenda-mes">
          <div className="agenda-toolbar">
            <button type="button" className="agenda-nav" aria-label="Mês anterior" onClick={() => goTo(shiftMonth(cursor, -1))}>
              ‹
            </button>
            <h2 id="agenda-mes" aria-live="polite">
              {monthLabel(cursor)}
            </h2>
            <button type="button" className="agenda-nav" aria-label="Próximo mês" onClick={() => goTo(shiftMonth(cursor, 1))}>
              ›
            </button>
            <button
              type="button"
              className="estudio-button-ghost agenda-today"
              onClick={() => {
                const now = new Date()
                setCursor({ year: now.getFullYear(), month: now.getMonth() })
                setSelected(today)
              }}
            >
              Hoje
            </button>
          </div>

          <div className="agenda-grid" aria-busy={events === null}>
            {WEEKDAYS_SHORT.map((w) => (
              <div key={w} className="agenda-grid__weekday" aria-hidden="true">
                {w}
              </div>
            ))}
            {weeks.flat().map((day) => {
              const list = byDay.get(day.key) ?? []
              const classes = [
                'agenda-day',
                day.inMonth ? '' : 'is-out',
                day.key === today ? 'is-today' : '',
                day.key === selected ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <div key={day.key} className={classes} onClick={() => setSelected(day.key)}>
                  <button
                    type="button"
                    className="agenda-day__num"
                    aria-label={`${longDayLabel(day.key)}${list.length ? `, ${list.length} evento(s)` : ''}`}
                    aria-pressed={day.key === selected}
                    onClick={() => setSelected(day.key)}
                  >
                    {Number(day.key.slice(8))}
                  </button>
                  <ul className="agenda-day__chips">
                    {list.slice(0, MAX_CHIPS).map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="agenda-chip"
                          style={{ '--agenda-color': memberOf(e.ownerId).cor } as CSSProperties}
                          onClick={(click) => {
                            click.stopPropagation()
                            setSelected(day.key)
                            setDialog({ mode: 'open', event: e })
                          }}
                        >
                          {e.diaTodo ? null : <span className="agenda-chip__time">{timeLabel(e, day.key)}</span>}
                          {e.titulo}
                        </button>
                      </li>
                    ))}
                    {list.length > MAX_CHIPS ? <li className="agenda-day__more">+{list.length - MAX_CHIPS}</li> : null}
                  </ul>
                  <span className="agenda-day__dots" aria-hidden="true">
                    {list.slice(0, 4).map((e) => (
                      <i key={e.id} style={{ background: memberOf(e.ownerId).cor }} />
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="agenda-dayview" aria-labelledby="agenda-dia">
          <div className="agenda-dayview__head">
            <h2 id="agenda-dia">{longDayLabel(selected)}</h2>
            <button className="agenda-link" type="button" onClick={() => setDialog({ mode: 'new', day: selected })}>
              + Adicionar
            </button>
          </div>
          {events === null ? <p className="estudio-help">Carregando…</p> : null}
          {events !== null && dayEvents.length === 0 ? <p className="estudio-help">Nada marcado neste dia.</p> : null}
          <ul className="agenda-list">
            {dayEvents.map((e) => {
              const owner = memberOf(e.ownerId)
              const client = clientName(e.clientId)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    className="agenda-item"
                    style={{ '--agenda-color': owner.cor } as CSSProperties}
                    onClick={() => setDialog({ mode: 'open', event: e })}
                  >
                    <span className="agenda-item__time">{timeLabel(e, selected)}</span>
                    <span className="agenda-item__title">{e.titulo}</span>
                    <span className="agenda-item__meta">
                      {tipoLabel(e.tipo)}
                      {client ? ` · ${client}` : ''}
                      {e.local ? ` · ${e.local}` : ''} · {owner.nome}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <EventDialog
        state={dialog}
        canEdit={(e) => e.ownerId === user?.id}
        member={memberOf}
        clients={clients}
        onClose={() => setDialog(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </main>
  )
}
