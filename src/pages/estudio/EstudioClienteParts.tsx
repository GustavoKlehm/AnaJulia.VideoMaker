import { useId, useState } from 'react'
import type { AdminAccess } from '../../lib/portalAdminApi'
import { portalTheme } from '../../lib/portalTheme'
import { formatPhone } from '../../shared/phone'
import { normalizeHex } from '../../shared/portalPlan'

/** PIN recém-gerado: aparece uma vez, com a mensagem pronta para o WhatsApp. */
export function AccessCard({ access }: { access: AdminAccess }) {
  const [copied, setCopied] = useState(false)
  const id = useId()

  async function copy() {
    try {
      await navigator.clipboard.writeText(access.mensagem)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="estudio-card estudio-access" aria-labelledby={id}>
      <h3 id={id}>
        Acesso de {access.nome} · {formatPhone(access.telefone)}
      </h3>
      <p className="estudio-access__pin">
        PIN <b>{access.pin}</b>
      </p>
      <p className="estudio-help">O PIN só aparece agora. Envie para o cliente antes de sair desta tela.</p>
      <label className="estudio-field">
        <span>Mensagem</span>
        <textarea readOnly rows={5} value={access.mensagem} />
      </label>
      <div className="estudio-actions">
        <button className="estudio-button" type="button" onClick={() => void copy()}>
          {copied ? 'Copiada' : 'Copiar mensagem'}
        </button>
        <a
          className="estudio-button-ghost"
          href={`https://api.whatsapp.com/send/?phone=55${access.telefone}&text=${encodeURIComponent(access.mensagem)}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir no WhatsApp
        </a>
      </div>
    </section>
  )
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const id = useId()
  const valid = normalizeHex(value)
  return (
    <div className="estudio-field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <div className="estudio-color">
        <input
          type="color"
          aria-label={`${label}: seletor`}
          value={valid ?? '#000000'}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          id={id}
          type="text"
          value={value}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}

/** Mostra como as duas cores ficam no portal, já com o ajuste automático de contraste. */
export function ThemePreview({ primary, secondary, nome }: { primary: string; secondary: string; nome: string }) {
  const p = normalizeHex(primary)
  const s = normalizeHex(secondary)
  if (!p || !s) return <p className="estudio-error">Use cores no formato #rrggbb.</p>
  const theme = portalTheme(p, s)
  const adjusted = theme['--client-primary'] !== p || theme['--client-secondary'] !== s
  return (
    <div className="estudio-theme-preview" aria-label="Prévia das cores no portal">
      <div style={{ background: theme['--client-primary'], color: theme['--client-on-primary'] }} className="estudio-theme-preview__top">
        {nome || 'Nome do cliente'}
      </div>
      <div style={{ background: theme['--client-secondary'], color: theme['--client-on-secondary'] }} className="estudio-theme-preview__hero">
        <span style={{ color: theme['--client-primary-ink'] }}>Planejamento de dezembro</span>
        <span className="estudio-theme-preview__button" style={{ background: theme['--client-primary'], color: theme['--client-on-primary'] }}>
          Aprovar
        </span>
      </div>
      {adjusted ? (
        <p className="estudio-help">Uma das cores ficou clara ou escura demais para leitura; o portal ajusta o tom automaticamente.</p>
      ) : null}
    </div>
  )
}
