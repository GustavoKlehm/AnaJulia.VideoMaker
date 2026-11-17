import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  AGENDA_COLORS,
  AGENDA_TIPOS,
  dayKey,
  emptyForm,
  formFromEvent,
  inputFromForm,
  longDayLabel,
  timeOf,
  tipoLabel,
  type AgendaEvent,
  type AgendaMember,
  type EventForm,
  type EventInput,
} from '../../lib/agenda'
import type { AgendaClient } from '../../lib/agendaData'
import { normalizeHex } from '../../shared/portalPlan'
import { ColorField } from './EstudioClienteParts'

export type DialogState = { mode: 'new'; day: string } | { mode: 'open'; event: AgendaEvent } | null

type EventDialogProps = {
  state: DialogState
  canEdit: (event: AgendaEvent) => boolean
  member: (userId: string) => AgendaMember
  clients: AgendaClient[]
  onClose: () => void
  onSave: (id: string | null, input: EventInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

/** Diálogo modal: cria, edita (se for seu) ou só mostra o evento (se for de outra pessoa). */
export function EventDialog({ state, canEdit, member, clients, onClose, onSave, onDelete }: EventDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (state && !dialog.open) dialog.showModal()
    if (!state && dialog.open) dialog.close()
  }, [state])

  const editable = state?.mode === 'new' || (state?.mode === 'open' && canEdit(state.event))
  const key = state ? (state.mode === 'new' ? `new-${state.day}` : state.event.id) : 'none'

  return (
    <dialog
      ref={ref}
      className="agenda-dialog"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
    >
      {state ? (
        <div className="agenda-dialog__body">
          {editable ? (
            <EventEditor
              key={key}
              titleId={titleId}
              event={state.mode === 'open' ? state.event : null}
              day={state.mode === 'new' ? state.day : dayKey(new Date(state.event.inicio))}
              clients={clients}
              onCancel={onClose}
              onSave={onSave}
              onDelete={onDelete}
            />
          ) : state.mode === 'open' ? (
            <EventDetails titleId={titleId} event={state.event} owner={member(state.event.ownerId)} clients={clients} onClose={onClose} />
          ) : null}
        </div>
      ) : null}
    </dialog>
  )
}

type EventEditorProps = {
  titleId: string
  event: AgendaEvent | null
  day: string
  clients: AgendaClient[]
  onCancel: () => void
  onSave: (id: string | null, input: EventInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

function EventEditor({ titleId, event, day, clients, onCancel, onSave, onDelete }: EventEditorProps) {
  const [form, setForm] = useState<EventForm>(() => (event ? formFromEvent(event) : emptyForm(day)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function set<K extends keyof EventForm>(field: K, value: EventForm[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      // Mantém o fim junto quando a data de início anda para depois dele.
      if (field === 'dataInicio' && typeof value === 'string' && next.dataFim < value) next.dataFim = value
      return next
    })
  }

  async function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault()
    const input = inputFromForm(form)
    if ('error' in input) {
      setError(input.error)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave(event?.id ?? null, input)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para salvar.')
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!event || !window.confirm(`Apagar “${event.titulo}” da agenda?`)) return
    setBusy(true)
    setError('')
    try {
      await onDelete(event.id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para apagar.')
      setBusy(false)
    }
  }

  return (
    <form className="estudio-form" onSubmit={(e) => void handleSubmit(e)}>
      <h2 id={titleId}>{event ? 'Editar evento' : 'Novo evento'}</h2>

      <fieldset className="agenda-tipos">
        <legend className="estudio-kicker">Tipo</legend>
        {AGENDA_TIPOS.map((t) => (
          <label key={t.value} className={form.tipo === t.value ? 'is-on' : undefined}>
            <input type="radio" name="tipo" value={t.value} checked={form.tipo === t.value} onChange={() => set('tipo', t.value)} />
            {t.label}
          </label>
        ))}
      </fieldset>

      <label className="estudio-field">
        <span>Título</span>
        <input
          value={form.titulo}
          maxLength={200}
          placeholder={form.tipo === 'gravacao' ? 'Ex.: Reels do lançamento' : ''}
          onChange={(e) => set('titulo', e.target.value)}
          required
          autoFocus
        />
      </label>

      {form.tipo === 'gravacao' ? (
        <label className="estudio-field">
          <span>Cliente</span>
          <select value={form.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">Sem cliente cadastrado</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="estudio-check">
        <input type="checkbox" checked={form.diaTodo} onChange={(e) => set('diaTodo', e.target.checked)} />
        Dia todo
      </label>

      <div className="estudio-grid estudio-grid--2">
        <label className="estudio-field">
          <span>{form.diaTodo ? 'Primeiro dia' : 'Começa'}</span>
          <input type="date" value={form.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} required />
        </label>
        {form.diaTodo ? null : (
          <label className="estudio-field">
            <span>Às</span>
            <input type="time" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} required />
          </label>
        )}
        <label className="estudio-field">
          <span>{form.diaTodo ? 'Último dia' : 'Termina'}</span>
          <input type="date" value={form.dataFim} min={form.dataInicio} onChange={(e) => set('dataFim', e.target.value)} required />
        </label>
        {form.diaTodo ? null : (
          <label className="estudio-field">
            <span>Às</span>
            <input type="time" value={form.horaFim} onChange={(e) => set('horaFim', e.target.value)} required />
          </label>
        )}
      </div>

      <label className="estudio-field">
        <span>Local</span>
        <input value={form.local} maxLength={200} onChange={(e) => set('local', e.target.value)} />
      </label>

      <label className="estudio-field">
        <span>Notas</span>
        <textarea value={form.notas} maxLength={4000} onChange={(e) => set('notas', e.target.value)} />
      </label>

      {error ? (
        <p className="estudio-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="estudio-actions">
        <button className="estudio-button" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
        <button className="estudio-button-ghost" type="button" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        {event ? (
          <button className="estudio-button-ghost agenda-danger" type="button" onClick={() => void handleDelete()} disabled={busy}>
            Apagar
          </button>
        ) : null}
      </div>
    </form>
  )
}

function whenText(event: AgendaEvent): string {
  const start = new Date(event.inicio)
  const end = new Date(event.fim)
  const startDay = dayKey(start)
  if (event.diaTodo) {
    const last = dayKey(new Date(end.getTime() - 1))
    return last === startDay ? `${longDayLabel(startDay)} · dia todo` : `${longDayLabel(startDay)} até ${longDayLabel(last)}`
  }
  const endDay = dayKey(end)
  return endDay === startDay
    ? `${longDayLabel(startDay)} · ${timeOf(start)} às ${timeOf(end)}`
    : `${longDayLabel(startDay)}, ${timeOf(start)} até ${longDayLabel(endDay)}, ${timeOf(end)}`
}

function EventDetails({
  titleId,
  event,
  owner,
  clients,
  onClose,
}: {
  titleId: string
  event: AgendaEvent
  owner: AgendaMember
  clients: AgendaClient[]
  onClose: () => void
}) {
  const client = clients.find((c) => c.id === event.clientId)
  return (
    <div className="estudio-form">
      <p className="estudio-kicker">{tipoLabel(event.tipo)}</p>
      <h2 id={titleId}>{event.titulo}</h2>
      <p className="agenda-owner">
        <i style={{ background: owner.cor }} aria-hidden="true" />
        {owner.nome}
      </p>
      <dl className="agenda-details">
        <dt>Quando</dt>
        <dd>{whenText(event)}</dd>
        {client ? (
          <>
            <dt>Cliente</dt>
            <dd>{client.nome}</dd>
          </>
        ) : null}
        {event.local ? (
          <>
            <dt>Local</dt>
            <dd>{event.local}</dd>
          </>
        ) : null}
        {event.notas ? (
          <>
            <dt>Notas</dt>
            <dd className="agenda-details__notes">{event.notas}</dd>
          </>
        ) : null}
      </dl>
      <p className="estudio-help">Só {owner.nome} pode mudar este evento.</p>
      <div className="estudio-actions">
        <button className="estudio-button-ghost" type="button" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  )
}

/** Nome e cor de quem está logado na agenda. */
export function ProfileEditor({
  me,
  others,
  onSave,
  onCancel,
}: {
  me: AgendaMember
  others: AgendaMember[]
  onSave: (nome: string, cor: string) => Promise<void>
  onCancel: () => void
}) {
  const [nome, setNome] = useState(me.nome)
  const [cor, setCor] = useState(me.cor)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const taken = new Set(others.map((m) => m.cor))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const hex = normalizeHex(cor)
    if (!nome.trim()) return setError('Informe como você aparece na agenda.')
    if (!hex) return setError('Use a cor no formato #rrggbb.')
    setBusy(true)
    setError('')
    try {
      await onSave(nome.trim().slice(0, 60), hex)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para salvar.')
      setBusy(false)
    }
  }

  return (
    <form className="estudio-form agenda-profile" onSubmit={(e) => void handleSubmit(e)}>
      <label className="estudio-field">
        <span>Seu nome na agenda</span>
        <input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} required />
      </label>
      <div className="agenda-palette" role="group" aria-label="Cores sugeridas">
        {AGENDA_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            style={{ background: c }}
            aria-label={`Usar ${c}${taken.has(c) ? ' (já usada por alguém)' : ''}`}
            aria-pressed={normalizeHex(cor) === c}
            className={taken.has(c) ? 'is-taken' : undefined}
            onClick={() => setCor(c)}
          />
        ))}
      </div>
      <ColorField label="Sua cor" value={cor} onChange={setCor} />
      {error ? <p className="estudio-error">{error}</p> : null}
      <div className="estudio-actions">
        <button className="estudio-button" type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
        <button className="estudio-button-ghost" type="button" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
