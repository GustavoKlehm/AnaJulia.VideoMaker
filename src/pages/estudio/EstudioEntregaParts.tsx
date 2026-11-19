import { useId, useState } from 'react'
import { deliveryMessage, formatBytes, todayInBrazil, type Validity } from '../../shared/delivery'

export function ValidityField({ value, onChange }: { value: Validity; onChange: (v: Validity) => void }) {
  const id = useId()
  return (
    <div className="estudio-field">
      <label htmlFor={id}>
        <span>Validade do link</span>
      </label>
      <select
        id={id}
        value={value.preset}
        onChange={(event) => onChange({ ...value, preset: event.target.value as Validity['preset'] })}
      >
        <option value="none">Não expira</option>
        <option value="7">7 dias</option>
        <option value="30">30 dias</option>
        <option value="90">90 dias</option>
        <option value="custom">Até uma data…</option>
      </select>
      {value.preset === 'custom' ? (
        <input
          type="date"
          aria-label="Último dia do link"
          min={todayInBrazil()}
          value={value.date}
          onChange={(event) => onChange({ ...value, date: event.target.value })}
        />
      ) : null}
    </div>
  )
}

/** Link da entrega com a mensagem pronta para o WhatsApp. */
export function ShareCard({ titulo, link, expiraEm, live }: { titulo: string; link: string; expiraEm: string | null; live: boolean }) {
  const [copied, setCopied] = useState<'' | 'link' | 'mensagem'>('')
  const id = useId()
  const mensagem = deliveryMessage({ titulo, link, expiraEm })

  async function copy(text: string, what: 'link' | 'mensagem') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
    } catch {
      setCopied('')
    }
  }

  return (
    <section className="estudio-card estudio-access" aria-labelledby={id}>
      <h2 id={id}>Link para o cliente</h2>
      {!live ? <p className="estudio-error">O link está fora do ar (desligado ou vencido). Ajuste em “Dados” para reativar.</p> : null}
      <p className="estudio-link">
        <a href={link} target="_blank" rel="noreferrer">
          {link}
        </a>
      </p>
      <label className="estudio-field">
        <span>Mensagem</span>
        <textarea readOnly rows={4} value={mensagem} />
      </label>
      <div className="estudio-actions">
        <button className="estudio-button" type="button" onClick={() => void copy(mensagem, 'mensagem')}>
          {copied === 'mensagem' ? 'Mensagem copiada' : 'Copiar mensagem'}
        </button>
        <a
          className="estudio-button-ghost"
          href={`https://api.whatsapp.com/send/?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noreferrer"
        >
          Enviar no WhatsApp
        </a>
        <button className="estudio-button-ghost" type="button" onClick={() => void copy(link, 'link')}>
          {copied === 'link' ? 'Link copiado' : 'Copiar só o link'}
        </button>
      </div>
    </section>
  )
}

export type QueueItem = {
  key: string
  nome: string
  tamanho: number
  progress: number
  status: 'fila' | 'enviando' | 'ok' | 'erro'
  error?: string
}

export function UploadQueue({ items }: { items: QueueItem[] }) {
  if (items.length === 0) return null
  return (
    <ul className="estudio-upload-queue" aria-live="polite">
      {items.map((item) => (
        <li key={item.key} className={`estudio-upload estudio-upload--${item.status}`}>
          <span className="estudio-upload__name">{item.nome}</span>
          <span className="estudio-help">
            {formatBytes(item.tamanho)} ·{' '}
            {item.status === 'fila'
              ? 'na fila'
              : item.status === 'enviando'
                ? `${Math.round(item.progress * 100)}%`
                : item.status === 'ok'
                  ? 'enviado'
                  : item.error}
          </span>
          {item.status === 'enviando' ? (
            <progress max={1} value={item.progress} aria-label={`Enviando ${item.nome}`} />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
