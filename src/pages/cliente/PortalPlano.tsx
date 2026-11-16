import { useCallback, useEffect, useId, useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowLeft, Check, PencilSimple, SignOut, Trash } from '@phosphor-icons/react'
import { RouteLink } from '../../components/RouteLink'
import { calendarMonths, dayMonth, periodLabel, weekday, WEEKDAYS_SHORT } from '../../lib/portalCalendar'
import {
  addNote,
  approvePending,
  deleteNote,
  loadPlan,
  submitReview,
  type PlanBundle,
  type PortalItemView,
} from '../../lib/portalData'
import { portalTheme } from '../../lib/portalTheme'
import { summarize, type ItemStatus } from '../../shared/portalStatus'
import { FormatChip, ProgressText, Section, StatusChip } from './PortalParts'

type PortalPlanoProps = {
  slug: string
  periodo: string
  userId: string
  isAdmin: boolean
  onSignOut: () => void
}

function itemAnchor(item: PortalItemView) {
  return `post-${item.chave.replace(/[^A-Za-z0-9_-]/g, '-')}`
}

function messageFrom(cause: unknown, fallback: string) {
  const text = cause instanceof Error ? cause.message : ''
  // Mensagens escritas para o cliente nas funções do banco.
  if (/^(Escreva|Sem permissão|Post não encontrado|Plano não encontrado|Conte o que)/.test(text)) return text
  return fallback
}

export function PortalPlano({ slug, periodo, userId, isAdmin, onSignOut }: PortalPlanoProps) {
  const [bundle, setBundle] = useState<PlanBundle | null | undefined>(undefined)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    const next = await loadPlan(slug, periodo, userId)
    setBundle(next)
  }, [slug, periodo, userId])

  useEffect(() => {
    reload().catch(() => setError('Não deu para carregar o plano agora. Tente de novo em instantes.'))
  }, [reload])

  useEffect(() => {
    if (bundle) document.title = `${bundle.plan.titulo} — ${bundle.client.nome}`
  }, [bundle])

  if (bundle === null) {
    return (
      <div className="portal">
        <main className="portal-main portal-gate">
          <h1>Esse plano não está disponível</h1>
          <p className="portal-muted">Ele pode ainda não ter sido liberado pela Ana, ou o endereço está diferente.</p>
          <RouteLink className="portal-button" to="/cliente">
            Ver meus planos
          </RouteLink>
        </main>
      </div>
    )
  }

  if (!bundle) {
    return (
      <main className="portal portal-gate" aria-busy={!error}>
        {error ? <p className="portal-error" role="alert">{error}</p> : <p>Carregando o plano…</p>}
      </main>
    )
  }

  const { client, plan, items, memberName } = bundle
  const canAnswer = Boolean(memberName) && plan.status === 'publicado'
  const resumo = summarize(items.map((i) => i.review))
  const theme = portalTheme(client.cor_principal, client.cor_secundaria) as CSSProperties
  const byDay = new Map<string, PortalItemView[]>()
  for (const item of items) byDay.set(item.data, [...(byDay.get(item.data) ?? []), item])

  return (
    <div className="portal" style={theme}>
      <a className="portal-skip" href="#conteudo">
        Ir ao plano
      </a>
      <header className="portal-top">
        <RouteLink className="portal-link-button" to="/cliente">
          <ArrowLeft aria-hidden="true" /> Meus planos
        </RouteLink>
        <span className="portal-top__name">{client.nome}</span>
        <button className="portal-link-button" type="button" onClick={onSignOut}>
          <SignOut aria-hidden="true" /> Sair
        </button>
      </header>

      <main className="portal-main" id="conteudo">
        {isAdmin && !memberName ? (
          <p className="portal-banner" role="note">
            Você está vendo como Ana: só leitura. As respostas são do cliente.
          </p>
        ) : null}
        {plan.status === 'previa' ? (
          <p className="portal-banner" role="note">
            Prévia: o cliente ainda não vê este plano. Envie pelo ExPx com status publicado para liberar.
          </p>
        ) : null}

        <section className="portal-hero portal-hero--plan" aria-labelledby="plano-titulo">
          <p className="portal-eyebrow">
            {client.nome} · {periodLabel(plan.inicio, plan.fim)}
          </p>
          <h1 id="plano-titulo">{plan.titulo}</h1>
          {plan.introducao ? <p className="portal-lead portal-pre">{plan.introducao}</p> : null}

          <dl className="portal-counters" aria-label="Andamento">
            <div className="portal-counters__ok">
              <dt>Aprovados</dt>
              <dd>{resumo.aprovados}</dd>
            </div>
            <div className="portal-counters__fix">
              <dt>Com ajuste</dt>
              <dd>{resumo.ajustes}</dd>
            </div>
            <div className="portal-counters__wait">
              <dt>Para avaliar</dt>
              <dd>{resumo.pendentes}</dd>
            </div>
          </dl>

          {canAnswer ? (
            <ol className="portal-steps">
              <li>Veja no calendário quando sai cada post.</li>
              <li>Leia cada post com calma.</li>
              <li>
                Toque em <b>Aprovar</b> ou em <b>Pedir ajuste</b> e conte o que mudar.
              </li>
            </ol>
          ) : null}
        </section>

        <section className="portal-calendar" aria-labelledby="cal-titulo">
          <h2 id="cal-titulo">Calendário</h2>
          <div className="portal-calendar__months">
            {calendarMonths(plan.inicio, plan.fim).map((month) => (
              <div key={month.key} className="portal-month">
                <h3>{month.label}</h3>
                <div className="portal-month__grid" role="table" aria-label={month.label}>
                  <div className="portal-month__row" role="row">
                    {WEEKDAYS_SHORT.map((w) => (
                      <span key={w} role="columnheader" className="portal-month__wd">
                        {w}
                      </span>
                    ))}
                  </div>
                  {Array.from({ length: Math.ceil(month.cells.length / 7) }, (_, row) => (
                    <div className="portal-month__row" role="row" key={row}>
                      {month.cells.slice(row * 7, row * 7 + 7).map((iso, i) => (
                        <CalendarDay key={iso ?? `e${row}-${i}`} iso={iso} posts={iso ? (byDay.get(iso) ?? []) : []} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ul className="portal-legend" aria-label="Legenda">
            <li>
              <i className="portal-dot portal-dot--ok" /> aprovado
            </li>
            <li>
              <i className="portal-dot portal-dot--fix" /> pediu ajuste
            </li>
            <li>
              <i className="portal-dot portal-dot--wait" /> para avaliar
            </li>
          </ul>
        </section>

        <section className="portal-posts" aria-labelledby="posts-titulo">
          <h2 id="posts-titulo">Os posts, um por um</h2>
          {items.map((item) => (
            <PostCard key={item.id} item={item} canAnswer={canAnswer} onChanged={reload} />
          ))}
        </section>

        {canAnswer && resumo.pendentes > 0 ? (
          <ApproveRest planId={plan.id} pending={resumo.pendentes} onDone={reload} />
        ) : null}

        <Novidades bundle={bundle} canWrite={canAnswer} userId={userId} onChanged={reload} />
      </main>

      <footer className="portal-footer">
        <ProgressText resumo={resumo} />
        <span>Planejamento feito por Ana Julia Videomaker</span>
      </footer>
    </div>
  )
}

function dotClass(status: ItemStatus) {
  return status === 'aprovado' ? 'portal-dot--ok' : status === 'ajuste' ? 'portal-dot--fix' : 'portal-dot--wait'
}

function CalendarDay({ iso, posts }: { iso: string | null; posts: PortalItemView[] }) {
  if (!iso) return <span role="cell" className="portal-day portal-day--empty" />
  const day = Number(iso.slice(8))
  if (posts.length === 0) {
    return (
      <span role="cell" className="portal-day">
        {day}
      </span>
    )
  }
  const label = posts.map((p) => `${p.titulo} (${p.review.status === 'pendente' ? 'para avaliar' : p.review.status})`).join('; ')
  return (
    <span role="cell" className="portal-day portal-day--has">
      <a href={`#${itemAnchor(posts[0])}`} aria-label={`Dia ${day}: ${label}`}>
        {day}
        <span className="portal-day__dots" aria-hidden="true">
          {posts.map((p) => (
            <i key={p.id} className={`portal-dot ${dotClass(p.review.status)}`} />
          ))}
        </span>
      </a>
    </span>
  )
}

function PostCard({ item, canAnswer, onChanged }: { item: PortalItemView; canAnswer: boolean; onChanged: () => Promise<void> }) {
  const { review } = item
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const textId = useId()
  const errorId = useId()

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await action()
      await onChanged()
      setEditing(false)
      setSaved(done)
    } catch (cause) {
      setError(messageFrom(cause, 'Não deu para salvar. Confira a internet e tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  function openFix() {
    setDraft(review.status === 'ajuste' ? review.comentario : '')
    setEditing(true)
    setSaved('')
  }

  function handleFix(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) {
      setError('Escreva o que você quer que mude neste post.')
      return
    }
    void run(() => submitReview(item.id, 'ajuste', draft.trim()), 'Pedido de ajuste enviado para a Ana.')
  }

  const cardClass = `portal-post portal-post--${review.status}`

  return (
    <article className={cardClass} id={itemAnchor(item)} aria-labelledby={`${itemAnchor(item)}-t`}>
      <div className="portal-post__date" aria-hidden="true">
        <span className="portal-post__day">{dayMonth(item.data)}</span>
        <span className="portal-post__wd">{weekday(item.data)}</span>
      </div>

      <div className="portal-post__body">
        <div className="portal-post__head">
          <h3 id={`${itemAnchor(item)}-t`}>
            <span className="portal-visually-hidden">
              {dayMonth(item.data)}, {weekday(item.data)}:{' '}
            </span>
            {item.titulo}
          </h3>
          <div className="portal-post__chips">
            <FormatChip formato={item.formato} />
            {item.selos.map((selo) => (
              <span key={selo} className="portal-chip">
                {selo}
              </span>
            ))}
            <StatusChip status={review.status} updated={review.atualizado} />
          </div>
        </div>

        {review.atualizado ? (
          <p className="portal-updated" role="note">
            A Ana atualizou este post
            {review.ajusteAnterior ? <> depois do seu pedido: “{review.ajusteAnterior.comentario}”</> : null}. Dá uma olhada de novo?
          </p>
        ) : null}

        {item.secoes.map((section, i) => (
          <Section key={i} section={section} />
        ))}

        <div className="portal-decide">
          {review.status === 'ajuste' && !editing ? (
            <div className="portal-fix-note">
              <p>
                <b>{review.autor ? `${review.autor} pediu:` : 'Ajuste pedido:'}</b> {review.comentario}
              </p>
            </div>
          ) : null}

          {canAnswer && !editing ? (
            <div className="portal-actions">
              <button
                type="button"
                className="portal-button portal-button--ok"
                aria-pressed={review.status === 'aprovado'}
                disabled={busy || review.status === 'aprovado'}
                onClick={() => void run(() => submitReview(item.id, 'aprovado'), 'Aprovação salva.')}
              >
                <Check aria-hidden="true" /> {review.status === 'aprovado' ? 'Aprovado' : 'Aprovar'}
              </button>
              <button
                type="button"
                className="portal-button portal-button--ghost"
                aria-pressed={review.status === 'ajuste'}
                disabled={busy}
                onClick={openFix}
              >
                <PencilSimple aria-hidden="true" /> {review.status === 'ajuste' ? 'Editar pedido' : 'Pedir ajuste'}
              </button>
            </div>
          ) : null}

          {canAnswer && editing ? (
            <form className="portal-form" onSubmit={handleFix}>
              <label className="portal-field" htmlFor={textId}>
                <span>O que você quer que mude neste post?</span>
                <textarea
                  id={textId}
                  value={draft}
                  maxLength={4000}
                  rows={4}
                  autoFocus
                  placeholder="Ex.: trocar a frase do começo, mostrar outra turma, mudar a música…"
                  onChange={(event) => setDraft(event.target.value)}
                  aria-describedby={error ? errorId : undefined}
                />
              </label>
              <div className="portal-actions">
                <button className="portal-button" type="submit" disabled={busy}>
                  {busy ? 'Enviando…' : 'Enviar pedido de ajuste'}
                </button>
                <button className="portal-button portal-button--ghost" type="button" disabled={busy} onClick={() => setEditing(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

          <p className="portal-small portal-saved" role="status" aria-live="polite">
            {saved}
          </p>
          {error ? (
            <p className="portal-error" id={errorId} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function ApproveRest({ planId, pending, onDone }: { planId: string; pending: number; onDone: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function approve() {
    setBusy(true)
    setError('')
    try {
      await approvePending(planId)
      await onDone()
      setConfirming(false)
    } catch (cause) {
      setError(messageFrom(cause, 'Não deu para aprovar agora. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="portal-card portal-approve" aria-labelledby="aprovar-titulo">
      <h2 id="aprovar-titulo">Gostou do resto?</h2>
      <p className="portal-muted">
        Aprove de uma vez {pending === 1 ? 'o post que falta' : `os ${pending} posts que faltam`}. Os que já têm pedido de ajuste
        continuam como estão.
      </p>
      {confirming ? (
        <div className="portal-actions">
          <button className="portal-button portal-button--ok" type="button" disabled={busy} onClick={() => void approve()}>
            <Check aria-hidden="true" /> {busy ? 'Aprovando…' : `Sim, aprovar ${pending}`}
          </button>
          <button className="portal-button portal-button--ghost" type="button" disabled={busy} onClick={() => setConfirming(false)}>
            Voltar
          </button>
        </div>
      ) : (
        <button className="portal-button" type="button" onClick={() => setConfirming(true)}>
          Aprovar {pending === 1 ? 'o que falta' : `os ${pending} que faltam`}
        </button>
      )}
      {error ? <p className="portal-error" role="alert">{error}</p> : null}
    </section>
  )
}

function Novidades({
  bundle,
  canWrite,
  userId,
  onChanged,
}: {
  bundle: PlanBundle
  canWrite: boolean
  userId: string
  onChanged: () => Promise<void>
}) {
  const [titulo, setTitulo] = useState('')
  const [quando, setQuando] = useState('')
  const [detalhes, setDetalhes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const ids = { titulo: useId(), quando: useId(), detalhes: useId() }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!titulo.trim()) {
      setError('Conte em poucas palavras qual é a novidade.')
      return
    }
    setBusy(true)
    setError('')
    setSaved('')
    try {
      await addNote({ clientId: bundle.client.id, planId: bundle.plan.id, titulo, detalhes, quando })
      setTitulo('')
      setQuando('')
      setDetalhes('')
      await onChanged()
      setSaved('Novidade enviada. A Ana encaixa nos próximos conteúdos.')
    } catch (cause) {
      setError(messageFrom(cause, 'Não deu para enviar agora. Tente de novo.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    setError('')
    try {
      await deleteNote(id)
      await onChanged()
    } catch {
      setError('Não deu para apagar agora.')
    } finally {
      setBusy(false)
    }
  }

  if (!canWrite && bundle.notes.length === 0) return null

  return (
    <section className="portal-card portal-notes" aria-labelledby="novidades-titulo">
      <h2 id="novidades-titulo">Tem novidade por aí?</h2>
      <p className="portal-muted">
        Promoção, lançamento, evento ou alguma data especial? Conte aqui e a Ana encaixa nos próximos conteúdos.
      </p>

      {canWrite ? (
        <form className="portal-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="portal-field" htmlFor={ids.titulo}>
            <span>O que é</span>
            <input
              id={ids.titulo}
              value={titulo}
              maxLength={200}
              placeholder="Ex.: Espetáculo de fim de ano"
              onChange={(event) => setTitulo(event.target.value)}
            />
          </label>
          <label className="portal-field" htmlFor={ids.quando}>
            <span>Quando</span>
            <input
              id={ids.quando}
              value={quando}
              maxLength={200}
              placeholder="Ex.: 20 de dezembro, às 19h"
              onChange={(event) => setQuando(event.target.value)}
            />
          </label>
          <label className="portal-field" htmlFor={ids.detalhes}>
            <span>Detalhes</span>
            <textarea
              id={ids.detalhes}
              value={detalhes}
              maxLength={4000}
              rows={3}
              placeholder="Local, valores, prazos…"
              onChange={(event) => setDetalhes(event.target.value)}
            />
          </label>
          <div className="portal-actions">
            <button className="portal-button" type="submit" disabled={busy}>
              {busy ? 'Enviando…' : 'Enviar novidade'}
            </button>
          </div>
          <p className="portal-small portal-saved" role="status" aria-live="polite">
            {saved}
          </p>
          {error ? <p className="portal-error" role="alert">{error}</p> : null}
        </form>
      ) : null}

      {bundle.notes.length > 0 ? (
        <ul className="portal-note-list">
          {bundle.notes.map((note) => (
            <li key={note.id}>
              <div>
                <p className="portal-note-list__title">{note.titulo}</p>
                {note.quando ? <p className="portal-small">{note.quando}</p> : null}
                {note.detalhes ? <p className="portal-pre portal-small">{note.detalhes}</p> : null}
                <p className="portal-small portal-muted">
                  {note.autor_nome} · {new Date(note.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {canWrite && note.autor_id === userId ? (
                <button
                  className="portal-icon-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void handleDelete(note.id)}
                  aria-label={`Apagar a novidade “${note.titulo}”`}
                >
                  <Trash aria-hidden="true" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
