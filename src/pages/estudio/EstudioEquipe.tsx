import { useEffect, useState, type FormEvent } from 'react'
import { createStudioUser, listStudioUsers, promoteStudioUser, type StudioMember } from '../../lib/estudioApi'
import { useAuth } from '../../hooks/useAuth'
import './estudio.css'

export function EstudioEquipe() {
  const { session } = useAuth()
  const [users, setUsers] = useState<StudioMember[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [promote, setPromote] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function load() {
    if (!session) {
      return
    }
    const data = await listStudioUsers(session)
    setUsers(data.users)
  }

  useEffect(() => {
    void load().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não deu para abrir a equipe.')
    })
  }, [session])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    if (!session) {
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await createStudioUser(session, { email, password, promote })
      setEmail('')
      setPassword('')
      await load()
      setStatus(promote ? 'Cadastro feito. Já entra com a chave.' : 'Cadastro feito. Ainda falta promover.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para cadastrar.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePromote(memberEmail: string) {
    if (!session) {
      return
    }
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await promoteStudioUser(session, memberEmail)
      await load()
      setStatus('Promovida. Na próxima entrada a chave já vale.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para promover.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Estúdio</p>
        <h1>Equipe</h1>
        <p className="estudio-help">
          Cadastra quem pode entrar no backstage e promove para ter a chave de admin.
        </p>
      </div>

      <section className="estudio-card">
        <h2>Cadastrar</h2>
        <form className="estudio-form" onSubmit={(event) => void handleCreate(event)}>
          <label className="estudio-field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="estudio-field">
            <span>Senha (mínimo 8)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="estudio-check">
            <input
              type="checkbox"
              checked={promote}
              onChange={(event) => setPromote(event.target.checked)}
            />
            Promover agora
          </label>
          <div className="estudio-actions">
            <button className="estudio-button" type="submit" disabled={busy}>
              {busy ? 'Salvando…' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </section>

      <section className="estudio-card">
        <h2>Quem já tem login</h2>
        {users.length === 0 ? <p className="estudio-help">Ninguém listado ainda.</p> : null}
        {users.map((member) => (
          <article className="estudio-card" key={member.id}>
            <h3>{member.email}</h3>
            {member.admin ? (
              <p className="estudio-status">Tem a chave</p>
            ) : (
              <button
                className="estudio-button-ghost"
                type="button"
                disabled={busy}
                onClick={() => void handlePromote(member.email)}
              >
                Promover
              </button>
            )}
          </article>
        ))}
      </section>

      {error ? <p className="estudio-error">{error}</p> : null}
      {status ? <p className="estudio-status">{status}</p> : null}
    </main>
  )
}
