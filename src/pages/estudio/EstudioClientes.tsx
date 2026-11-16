import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RouteLink } from '../../components/RouteLink'
import { useAuth } from '../../hooks/useAuth'
import { listClients, saveClient, slugify, type AdminAccess, type AdminClient } from '../../lib/portalAdminApi'
import { maskPhone, normalizePhone } from '../../shared/phone'
import { normalizeHex } from '../../shared/portalPlan'
import { AccessCard, ColorField, ThemePreview } from './EstudioClienteParts'
import './estudio.css'

export function EstudioClientes() {
  const { session } = useAuth()
  const [clients, setClients] = useState<AdminClient[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session) return
    const data = await listClients(session)
    setClients(data.clientes)
  }, [session])

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para listar.'))
  }, [load])

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Estúdio</p>
        <h1>Clientes</h1>
        <p className="estudio-help">
          Normalmente os clientes chegam pelo ExPx. Cadastre aqui só quando fizer o onboarding sem o ExPx por perto. Os
          planos são sempre enviados pelo ExPx.
        </p>
      </div>

      <section className="estudio-card">
        <h2>Quem já tem área</h2>
        {error ? <p className="estudio-error">{error}</p> : null}
        {!clients && !error ? <p className="estudio-help">Carregando…</p> : null}
        {clients?.length === 0 ? <p className="estudio-help">Nenhum cliente ainda.</p> : null}
        <ul className="estudio-client-list">
          {clients?.map((c) => (
            <li key={c.slug}>
              <RouteLink to={`/estudio/clientes/${c.slug}`} className="estudio-client-row">
                <span className="estudio-swatches" aria-hidden="true">
                  <i style={{ background: c.cores.principal }} />
                  <i style={{ background: c.cores.secundaria }} />
                </span>
                <span className="estudio-client-row__name">
                  {c.nome}
                  {!c.ativo ? <em> · desativado</em> : null}
                </span>
                <span className="estudio-help">
                  {c.contatosAtivos ?? 0} contato(s) · {c.planos ?? 0} plano(s)
                  {c.ultimoPlano ? ` · último: ${c.ultimoPlano}` : ''}
                </span>
              </RouteLink>
            </li>
          ))}
        </ul>
      </section>

      <NovoCliente onCreated={() => void load()} />
    </main>
  )
}

function NovoCliente({ onCreated }: { onCreated: () => void }) {
  const { session } = useAuth()
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [instagram, setInstagram] = useState('')
  const [principal, setPrincipal] = useState('#b8322a')
  const [secundaria, setSecundaria] = useState('#f9e0dc')
  const [contatoNome, setContatoNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [acessos, setAcessos] = useState<AdminAccess[]>([])
  const [created, setCreated] = useState<string | null>(null)

  const effectiveSlug = slugTouched ? slug : slugify(nome)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    setError('')
    const p = normalizeHex(principal)
    const s = normalizeHex(secundaria)
    const phone = normalizePhone(telefone)
    if (!effectiveSlug) return setError('Informe o nome do cliente.')
    if (!p || !s) return setError('Use cores no formato #rrggbb.')
    if (!contatoNome.trim() || !phone) return setError('Informe o nome e o celular (com DDD) de quem vai acessar.')

    setBusy(true)
    try {
      const result = await saveClient(
        session,
        effectiveSlug,
        {
          nome,
          instagram,
          cores: { principal: p, secundaria: s },
          contatos: [{ nome: contatoNome, telefone: phone }],
        },
        true,
      )
      setAcessos(result.acessos)
      setCreated(result.cliente.slug)
      setNome('')
      setSlug('')
      setSlugTouched(false)
      setInstagram('')
      setContatoNome('')
      setTelefone('')
      onCreated()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para cadastrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="estudio-card">
      <h2>Cadastrar cliente</h2>
      <form className="estudio-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="estudio-field">
          <span>Nome do cliente</span>
          <input value={nome} maxLength={120} onChange={(event) => setNome(event.target.value)} required />
        </label>
        <label className="estudio-field">
          <span>Endereço (slug)</span>
          <input
            value={effectiveSlug}
            maxLength={60}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            onChange={(event) => {
              setSlugTouched(true)
              setSlug(event.target.value.toLowerCase())
            }}
            required
          />
        </label>
        <p className="estudio-help">Use o mesmo slug da pasta do cliente no ExPx (ex.: soul-circo), para os planos caírem no lugar certo.</p>
        <label className="estudio-field">
          <span>Instagram</span>
          <input value={instagram} maxLength={60} placeholder="@cliente" onChange={(event) => setInstagram(event.target.value)} />
        </label>
        <div className="estudio-grid estudio-grid--2">
          <ColorField label="Cor principal" value={principal} onChange={setPrincipal} />
          <ColorField label="Cor secundária" value={secundaria} onChange={setSecundaria} />
        </div>
        <ThemePreview primary={principal} secondary={secundaria} nome={nome} />
        <div className="estudio-grid estudio-grid--2">
          <label className="estudio-field">
            <span>Quem acessa</span>
            <input value={contatoNome} maxLength={120} onChange={(event) => setContatoNome(event.target.value)} required />
          </label>
          <label className="estudio-field">
            <span>Celular</span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="(46) 9 9999-9999"
              value={telefone}
              onChange={(event) => setTelefone(maskPhone(event.target.value))}
              required
            />
          </label>
        </div>
        {error ? <p className="estudio-error">{error}</p> : null}
        <div className="estudio-actions">
          <button className="estudio-button" type="submit" disabled={busy}>
            {busy ? 'Cadastrando…' : 'Cadastrar e gerar PIN'}
          </button>
        </div>
      </form>

      {created ? (
        <p className="estudio-status">
          Cliente cadastrado. <RouteLink to={`/estudio/clientes/${created}`}>Abrir a ficha</RouteLink>
        </p>
      ) : null}
      {created && acessos.length === 0 ? (
        <p className="estudio-help">Esse celular já tinha acesso por outro cliente: entra com o mesmo PIN de antes.</p>
      ) : null}
      {acessos.map((a) => (
        <AccessCard key={a.telefone} access={a} />
      ))}
    </section>
  )
}
