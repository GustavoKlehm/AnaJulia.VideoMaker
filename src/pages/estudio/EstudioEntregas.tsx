import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RouteLink } from '../../components/RouteLink'
import { useAuth } from '../../hooks/useAuth'
import { createDelivery, listDeliveries, type AdminDelivery } from '../../lib/deliveryAdminApi'
import { listClients, saveClient, slugify, type AdminClient } from '../../lib/portalAdminApi'
import { navigate } from '../../lib/router'
import { DELIVERY_STATE_LABEL, formatDateBr, validityToDate, type Validity } from '../../shared/delivery'
import { ValidityField } from './EstudioEntregaParts'
import './estudio.css'

const NEW_CLIENT = '__novo'

export function EstudioEntregas() {
  const { session } = useAuth()
  const [entregas, setEntregas] = useState<AdminDelivery[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    setEntregas((await listDeliveries(session)).entregas)
  }, [session])

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para listar.'))
  }, [load])

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Estúdio</p>
        <h1>Entregas</h1>
        <p className="estudio-help">
          Suba os vídeos (stories do evento, vídeo final, fotos) e mande o link para o cliente. O link abre sem login; quem
          tem acesso à área do cliente também vê a entrega lá.
        </p>
      </div>

      <NovaEntrega />

      <section className="estudio-card">
        <h2>Todas as entregas</h2>
        {error ? <p className="estudio-error">{error}</p> : null}
        {!entregas && !error ? <p className="estudio-help">Carregando…</p> : null}
        {entregas?.length === 0 ? <p className="estudio-help">Nenhuma entrega ainda.</p> : null}
        <DeliveryList entregas={entregas ?? []} showClient />
      </section>
    </main>
  )
}

export function DeliveryList({ entregas, showClient = false }: { entregas: AdminDelivery[]; showClient?: boolean }) {
  return (
    <ul className="estudio-client-list">
      {entregas.map((e) => (
        <li key={e.id}>
          <RouteLink to={`/estudio/entregas/${e.id}`} className="estudio-client-row">
            {showClient && e.cliente ? (
              <span className="estudio-swatches" aria-hidden="true">
                <i style={{ background: e.cliente.cores.principal }} />
                <i style={{ background: e.cliente.cores.secundaria }} />
              </span>
            ) : null}
            <span className="estudio-client-row__name">
              {e.titulo} <span className={`estudio-state estudio-state--${e.estado}`}>{DELIVERY_STATE_LABEL[e.estado]}</span>
            </span>
            <span className="estudio-help">
              {[
                showClient ? e.cliente?.nome : null,
                e.dataEvento ? formatDateBr(e.dataEvento) : null,
                `${e.arquivos ?? 0} arquivo(s)`,
                e.expiraEm ? `até ${formatDateBr(e.expiraEm)}` : 'sem validade',
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </RouteLink>
        </li>
      ))}
    </ul>
  )
}

function NovaEntrega() {
  const { session } = useAuth()
  const [clients, setClients] = useState<AdminClient[]>([])
  const [clientSlug, setClientSlug] = useState(() => new URLSearchParams(window.location.search).get('cliente') ?? '')
  const [novoNome, setNovoNome] = useState('')
  const [titulo, setTitulo] = useState('')
  const [dataEvento, setDataEvento] = useState('')
  const [descricao, setDescricao] = useState('')
  const [validity, setValidity] = useState<Validity>({ preset: 'none', date: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    listClients(session)
      .then((data) => setClients(data.clientes.filter((c) => c.ativo)))
      .catch(() => setError('Não deu para carregar os clientes.'))
  }, [session])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    setError('')
    const expiraEm = validityToDate(validity)
    if (validity.preset === 'custom' && !expiraEm) return setError('Escolha a data de validade.')
    if (!titulo.trim()) return setError('Dê um título para a entrega.')

    let slug = clientSlug
    setBusy(true)
    try {
      if (clientSlug === NEW_CLIENT) {
        slug = slugify(novoNome)
        if (!slug) throw new Error('Informe o nome do cliente novo.')
        // Cliente de evento nasce com as cores da Ana; dá para trocar depois na ficha.
        await saveClient(
          session,
          slug,
          { nome: novoNome.trim(), instagram: '', cores: { principal: '#b8322a', secundaria: '#f9e0dc' } },
          true,
        )
      }
      if (!slug) throw new Error('Escolha o cliente.')
      const { entrega } = await createDelivery(session, slug, {
        titulo,
        descricao,
        dataEvento: dataEvento || null,
        expiraEm,
      })
      navigate(`/estudio/entregas/${entrega.id}`)
      window.scrollTo({ top: 0 })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para criar a entrega.')
      setBusy(false)
    }
  }

  return (
    <section className="estudio-card">
      <h2>Nova entrega</h2>
      <form className="estudio-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="estudio-field">
          <span>Cliente</span>
          <select value={clientSlug} onChange={(event) => setClientSlug(event.target.value)} required>
            <option value="" disabled>
              Escolha…
            </option>
            {clients.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
            <option value={NEW_CLIENT}>+ Cliente novo (evento)</option>
          </select>
        </label>
        {clientSlug === NEW_CLIENT ? (
          <>
            <label className="estudio-field">
              <span>Nome do cliente novo</span>
              <input
                value={novoNome}
                maxLength={120}
                placeholder="Ex.: Laura 15 anos"
                onChange={(event) => setNovoNome(event.target.value)}
                required
              />
            </label>
            <p className="estudio-help">
              Entra no cadastro de clientes sem login. Se a pessoa quiser acessar pela área do cliente, adicione o celular
              dela na ficha depois.
            </p>
          </>
        ) : null}
        <label className="estudio-field">
          <span>Título</span>
          <input
            value={titulo}
            maxLength={200}
            placeholder="Ex.: Stories da festa"
            onChange={(event) => setTitulo(event.target.value)}
            required
          />
        </label>
        <div className="estudio-grid estudio-grid--2">
          <label className="estudio-field">
            <span>Data do evento (opcional)</span>
            <input type="date" value={dataEvento} onChange={(event) => setDataEvento(event.target.value)} />
          </label>
          <ValidityField value={validity} onChange={setValidity} />
        </div>
        <label className="estudio-field">
          <span>Mensagem para o cliente (opcional)</span>
          <textarea
            rows={3}
            maxLength={4000}
            value={descricao}
            placeholder="Aparece no topo da página de entrega."
            onChange={(event) => setDescricao(event.target.value)}
          />
        </label>
        {error ? <p className="estudio-error">{error}</p> : null}
        <div className="estudio-actions">
          <button className="estudio-button" type="submit" disabled={busy}>
            {busy ? 'Criando…' : 'Criar e subir arquivos'}
          </button>
        </div>
      </form>
    </section>
  )
}
