import { useState, type FormEvent } from 'react'
import './estudio.css'

type EstudioLoginProps = {
  onSignIn: (email: string, password: string) => Promise<void>
  onReset: (email: string) => Promise<void>
}

export function EstudioLogin({ onSignIn, onReset }: EstudioLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await onSignIn(email, password)
    } catch {
      setError('Essa chave não abriu. Confere o e-mail e a senha.')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      setError('Escreve o e-mail para eu mandar o reset.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onReset(email)
      setNotice('Se o e-mail existir, a caixa de entrada ganhou um link.')
    } catch {
      setError('Não deu para enviar o reset agora.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="estudio-login">
      <div className="estudio-login__card">
        <p className="estudio-kicker">Backstage</p>
        <h1>Corta. É dos nossos.</h1>
        <p className="estudio-login__lead">
          O estúdio é só da Ana Júlia. Entra com o e-mail e a senha.
        </p>
        <form className="estudio-form" onSubmit={handleSubmit}>
          <label className="estudio-field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="estudio-field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error ? <p className="estudio-error">{error}</p> : null}
          {notice ? <p className="estudio-status">{notice}</p> : null}
          <div className="estudio-actions">
            <button className="estudio-button" type="submit" disabled={busy}>
              {busy ? 'Abrindo…' : 'Entrar'}
            </button>
            <button
              className="estudio-button-ghost"
              type="button"
              onClick={() => void handleReset()}
              disabled={busy}
            >
              Esqueci a senha
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
