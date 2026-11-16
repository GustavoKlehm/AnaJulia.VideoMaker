import { useId, useState, type FormEvent } from 'react'
import { whatsappLink } from '../../content/site'
import { isValidPin, maskPhone, normalizePhone } from '../../shared/phone'

type PortalLoginProps = {
  onSignIn: (phone: string, pin: string) => Promise<void>
}

export function PortalLogin({ onSignIn }: PortalLoginProps) {
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const phoneId = useId()
  const pinId = useId()
  const errorId = useId()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!normalizePhone(phone)) {
      setError('Confira o telefone: DDD e número do celular.')
      return
    }
    if (!isValidPin(pin)) {
      setError('O PIN tem 6 números.')
      return
    }
    setBusy(true)
    try {
      await onSignIn(phone, pin)
    } catch {
      setError('Telefone ou PIN não conferem. Confira e tente de novo.')
      setBusy(false)
    }
  }

  return (
    <main className="portal portal-login">
      <div className="portal-login__card">
        <img className="portal-login__logo" src="/brand/logo-anajulia.png" alt="Ana Julia Videomaker" />
        <div>
          <p className="portal-eyebrow">Área do cliente</p>
          <h1>Seu planejamento de conteúdo</h1>
          <p className="portal-muted">Entre com o seu celular e o PIN que a Ana enviou pelo WhatsApp.</p>
        </div>

        <form className="portal-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
          <label className="portal-field" htmlFor={phoneId}>
            <span>Celular</span>
            <input
              id={phoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="(46) 9 9999-9999"
              value={phone}
              onChange={(event) => setPhone(maskPhone(event.target.value))}
              onBlur={() => {
                const normalized = normalizePhone(phone)
                if (normalized) setPhone(maskPhone(normalized))
              }}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? errorId : undefined}
              required
            />
          </label>
          <label className="portal-field" htmlFor={pinId}>
            <span>PIN</span>
            <input
              id={pinId}
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="\d{6}"
              maxLength={6}
              placeholder="6 números"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? errorId : undefined}
              required
            />
          </label>
          {error ? (
            <p className="portal-error" id={errorId} role="alert">
              {error}
            </p>
          ) : null}
          <button className="portal-button" type="submit" disabled={busy}>
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="portal-muted portal-small">
          Esqueceu o PIN?{' '}
          <a href={whatsappLink('Oi, Ana! Preciso de um PIN novo para a área do cliente.')} target="_blank" rel="noreferrer">
            Peça um novo para a Ana
          </a>
          .
        </p>
      </div>
    </main>
  )
}
