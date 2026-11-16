import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { RouteLink } from '../../components/RouteLink'
import { useAuth } from '../../hooks/useAuth'
import { periodLabel } from '../../lib/portalCalendar'
import {
  addContact,
  getClient,
  newPin,
  removeContact,
  saveClient,
  type AdminAccess,
  type AdminClient,
  type AdminContact,
  type AdminPlan,
} from '../../lib/portalAdminApi'
import { formatPhone, maskPhone, normalizePhone } from '../../shared/phone'
import { normalizeHex } from '../../shared/portalPlan'
import { AccessCard, ColorField, ThemePreview } from './EstudioClienteParts'
import './estudio.css'

type Detail = { cliente: AdminClient; contatos: AdminContact[]; planos: AdminPlan[] }

export function EstudioCliente({ slug }: { slug: string }) {
  const { session } = useAuth()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [acessos, setAcessos] = useState<AdminAccess[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!session) return
    setDetail(await getClient(session, slug))
  }, [session, slug])

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para abrir o cliente.'))
  }, [load])

  async function act(action: () => Promise<void>, ok: string) {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await action()
      await load()
      setStatus(ok)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu certo.')
    } finally {
      setBusy(false)
    }
  }

  if (!detail) {
    return (
      <main className="estudio-page">
        <RouteLink to="/estudio/clientes">← Clientes</RouteLink>
        {error ? <p className="estudio-error">{error}</p> : <p className="estudio-help">Carregando…</p>}
      </main>
    )
  }

  const { cliente, contatos, planos } = detail

  return (
    <main className="estudio-page">
      <div>
        <RouteLink to="/estudio/clientes">← Clientes</RouteLink>
        <p className="estudio-kicker">Cliente · {cliente.slug}</p>
        <h1>{cliente.nome}</h1>
      </div>

      {error ? <p className="estudio-error">{error}</p> : null}
      {status ? <p className="estudio-status">{status}</p> : null}
      {acessos.map((a) => (
        <AccessCard key={`${a.telefone}-${a.pin}`} access={a} />
      ))}

      <section className="estudio-card">
        <h2>Planos</h2>
        <p className="estudio-help">Os planos chegam pelo ExPx. Aqui é só para acompanhar.</p>
        {planos.length === 0 ? <p className="estudio-help">Nenhum plano enviado ainda.</p> : null}
        <ul className="estudio-client-list">
          {planos.map((p) => (
            <li key={p.periodo}>
              <RouteLink to={`/cliente/${cliente.slug}/${p.periodo}`} className="estudio-client-row">
                <span className="estudio-client-row__name">
                  {p.titulo}
                  {p.status === 'previa' ? <em> · prévia</em> : null}
                </span>
                <span className="estudio-help">
                  {periodLabel(p.inicio, p.fim)} · {p.resumo.aprovados} aprovados · {p.resumo.ajustes} com ajuste ·{' '}
                  {p.resumo.pendentes} sem resposta
                </span>
              </RouteLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="estudio-card">
        <h2>Quem acessa</h2>
        {contatos.length === 0 ? <p className="estudio-help">Ninguém ainda.</p> : null}
        <ul className="estudio-client-list">
          {contatos.map((c) => (
            <li key={c.telefone} className="estudio-contact">
              <div>
                <p className="estudio-client-row__name">
                  {c.nome}
                  {!c.ativo ? <em> · desativado</em> : null}
                </p>
                <p className="estudio-help">{formatPhone(c.telefone)}</p>
              </div>
              <div className="estudio-actions">
                {c.ativo ? (
                  <>
                    <button
                      className="estudio-button-ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!session || !window.confirm(`Gerar um PIN novo para ${c.nome}? O PIN antigo para de funcionar.`)) return
                        void act(async () => {
                          const r = await newPin(session, cliente.slug, c.telefone)
                          setAcessos([r.acesso])
                        }, 'PIN novo gerado.')
                      }}
                    >
                      PIN novo
                    </button>
                    <button
                      className="estudio-button-ghost"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!session || !window.confirm(`Tirar o acesso de ${c.nome}?`)) return
                        void act(() => removeContact(session, cliente.slug, c.telefone).then(() => undefined), 'Acesso desativado.')
                      }}
                    >
                      Desativar
                    </button>
                  </>
                ) : (
                  <button
                    className="estudio-button-ghost"
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        if (!session) return
                        await addContact(session, cliente.slug, { nome: c.nome, telefone: c.telefone })
                      }, 'Acesso reativado com o PIN de antes. Se a pessoa não lembrar, gere um PIN novo.')
                    }
                  >
                    Reativar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <NovoContato
          busy={busy}
          onAdd={(nome, telefone) =>
            act(async () => {
              if (!session) return
              const r = await addContact(session, cliente.slug, { nome, telefone })
              setAcessos(r.acesso ? [r.acesso] : [])
            }, 'Contato adicionado.')
          }
        />
      </section>

      <DadosCliente
        key={`${cliente.nome}${cliente.cores.principal}${cliente.cores.secundaria}${cliente.ativo}`}
        cliente={cliente}
        busy={busy}
        onSave={(payload) =>
          act(async () => {
            if (!session) return
            await saveClient(session, cliente.slug, payload)
          }, 'Dados salvos.')
        }
      />
    </main>
  )
}

function NovoContato({ busy, onAdd }: { busy: boolean; onAdd: (nome: string, telefone: string) => Promise<void> }) {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const phone = normalizePhone(telefone)
    if (!nome.trim() || !phone) {
      setError('Informe o nome e um celular com DDD.')
      return
    }
    setError('')
    await onAdd(nome, phone)
    setNome('')
    setTelefone('')
  }

  return (
    <form className="estudio-form" onSubmit={(event) => void handleSubmit(event)}>
      <h3>Adicionar pessoa</h3>
      <div className="estudio-grid estudio-grid--2">
        <label className="estudio-field">
          <span>Nome</span>
          <input value={nome} maxLength={120} onChange={(event) => setNome(event.target.value)} />
        </label>
        <label className="estudio-field">
          <span>Celular</span>
          <input
            type="tel"
            inputMode="tel"
            placeholder="(46) 9 9999-9999"
            value={telefone}
            onChange={(event) => setTelefone(maskPhone(event.target.value))}
          />
        </label>
      </div>
      {error ? <p className="estudio-error">{error}</p> : null}
      <div className="estudio-actions">
        <button className="estudio-button" type="submit" disabled={busy}>
          Adicionar e gerar PIN
        </button>
      </div>
    </form>
  )
}

function DadosCliente({
  cliente,
  busy,
  onSave,
}: {
  cliente: AdminClient
  busy: boolean
  onSave: (payload: { nome: string; instagram: string; cores: { principal: string; secundaria: string }; ativo: boolean }) => Promise<void>
}) {
  const [nome, setNome] = useState(cliente.nome)
  const [instagram, setInstagram] = useState(cliente.instagram)
  const [principal, setPrincipal] = useState(cliente.cores.principal)
  const [secundaria, setSecundaria] = useState(cliente.cores.secundaria)
  const [ativo, setAtivo] = useState(cliente.ativo)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const p = normalizeHex(principal)
    const s = normalizeHex(secundaria)
    if (!p || !s) {
      setError('Use cores no formato #rrggbb.')
      return
    }
    setError('')
    await onSave({ nome, instagram, cores: { principal: p, secundaria: s }, ativo })
  }

  return (
    <section className="estudio-card">
      <h2>Dados e cores</h2>
      <p className="estudio-help">Se o cliente também for atualizado pelo ExPx, o próximo envio de lá sobrescreve estes dados.</p>
      <form className="estudio-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="estudio-field">
          <span>Nome</span>
          <input value={nome} maxLength={120} onChange={(event) => setNome(event.target.value)} required />
        </label>
        <label className="estudio-field">
          <span>Instagram</span>
          <input value={instagram} maxLength={60} onChange={(event) => setInstagram(event.target.value)} />
        </label>
        <div className="estudio-grid estudio-grid--2">
          <ColorField label="Cor principal" value={principal} onChange={setPrincipal} />
          <ColorField label="Cor secundária" value={secundaria} onChange={setSecundaria} />
        </div>
        <ThemePreview primary={principal} secondary={secundaria} nome={nome} />
        <label className="estudio-check">
          <input type="checkbox" checked={ativo} onChange={(event) => setAtivo(event.target.checked)} />
          Cliente ativo (desmarcado, ninguém do cliente consegue ver os planos)
        </label>
        {error ? <p className="estudio-error">{error}</p> : null}
        <div className="estudio-actions">
          <button className="estudio-button" type="submit" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </section>
  )
}
