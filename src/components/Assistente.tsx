import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { PaperPlaneTilt, WhatsappLogo, X } from '@phosphor-icons/react'
import { useCms } from '../content/cmsContext'
import { whatsappLink } from '../content/site'
import {
  askAssistente,
  customQuoteWhatsappMessage,
  type AssistenteRecommendation,
  type AssistenteTurn,
} from '../lib/assistenteApi'
import { dismissAssistenteInvite, isAssistenteInviteDismissed } from '../lib/assistenteInvite'
import { navigate } from '../lib/router'
import { planosHref, planosStateFromRecommendation } from '../lib/planosState'
import './Assistente.css'

type ThreadItem = AssistenteTurn & {
  recommendation?: AssistenteRecommendation | null
  customQuote?: boolean
  failed?: boolean
}

const MAX_TURNS = 8
const INVITE_TITLE = 'Não sabe qual plano escolher?'
const INVITE_LEAD = 'Posso te ajudar a encontrar o certo.'

export function Assistente() {
  const { site } = useCms()
  const titleId = useId()
  const dialogId = useId()
  const fieldId = useId()
  const fieldRef = useRef<HTMLInputElement>(null)
  const launchRef = useRef<HTMLButtonElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [invite, setInvite] = useState(() => !isAssistenteInviteDismissed())
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [thread, setThread] = useState<ThreadItem[]>([])

  const whatsappHref = whatsappLink(site.messages.planosCta, site.whatsappPhone)
  const customWhatsappHref = whatsappLink(
    customQuoteWhatsappMessage(
      site.messages.custom,
      thread.filter((item) => item.role === 'user').map((item) => item.content),
    ),
    site.whatsappPhone,
  )

  function keepFieldFocus() {
    fieldRef.current?.focus()
  }

  useEffect(() => {
    if (!open) {
      return
    }
    keepFieldFocus()

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeChat()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open && !busy) {
      keepFieldFocus()
    }
  }, [open, busy])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [thread, status])

  function hideInvite() {
    dismissAssistenteInvite()
    setInvite(false)
  }

  function dismissInvite() {
    hideInvite()
    launchRef.current?.focus()
  }

  function openChat() {
    hideInvite()
    setOpen(true)
  }

  function closeChat() {
    setOpen(false)
    launchRef.current?.focus()
  }

  function toggleChat() {
    if (open) {
      closeChat()
      return
    }
    openChat()
  }

  async function send(event: FormEvent) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || busy) {
      return
    }

    const nextThread: ThreadItem[] = [...thread, { role: 'user' as const, content }].slice(-MAX_TURNS)
    setThread(nextThread)
    setDraft('')
    setBusy(true)
    setStatus('Pensando…')
    keepFieldFocus()

    try {
      const payload = await askAssistente(
        nextThread
          .filter((item) => !item.failed)
          .map((item) => ({ role: item.role, content: item.content })),
      )
      setThread((current) => [
        ...current,
        {
          role: 'assistant',
          content: payload.reply,
          recommendation: payload.recommendation,
          customQuote: payload.customQuote,
        },
      ])
      setStatus('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'A ajuda automática falhou. Me chama no WhatsApp.'
      setThread((current) => [...current, { role: 'assistant', content: message, failed: true }])
      setStatus('')
    } finally {
      setBusy(false)
      keepFieldFocus()
    }
  }

  function openPlan(recommendation: AssistenteRecommendation) {
    const state = planosStateFromRecommendation(recommendation)
    if (!state) {
      return
    }
    setOpen(false)
    navigate(planosHref(state))
  }

  const icon = site.brand.icon

  return (
    <div className="assistente-root">
      {invite && !open ? (
        <div className="assistente__invite">
          <img src={site.brand.icon} width={820} height={820} alt="" />
          <button type="button" className="assistente__invite-open" onClick={openChat}>
            <strong>{INVITE_TITLE}</strong>
            <span>{INVITE_LEAD}</span>
          </button>
          <button type="button" className="assistente__invite-dismiss" onClick={dismissInvite}>
            <X size={16} weight="regular" aria-hidden="true" />
            <span className="assistente__sr">Dispensar convite</span>
          </button>
        </div>
      ) : null}

      {open ? (
        <section
          id={dialogId}
          className="assistente"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="assistente__bar">
            <h2 id={titleId} className="assistente__title">
              Ajuda para escolher um plano
            </h2>
            <button type="button" className="assistente__close" onClick={closeChat}>
              <X size={18} weight="regular" aria-hidden="true" />
              <span className="assistente__sr">Fechar ajuda</span>
            </button>
          </header>

          <div ref={logRef} className="assistente__log">
            <p className="assistente__intro">
              Posso te ajudar a escolher um plano ou tirar dúvida de preço, prazo e o que entra.
            </p>
            {thread.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`assistente__bubble assistente__bubble--${item.role}${item.failed ? ' assistente__bubble--fail' : ''}`}
              >
                <p>{item.content}</p>
                {item.recommendation ? (
                  <button
                    type="button"
                    className="assistente__plan"
                    onClick={() => openPlan(item.recommendation!)}
                  >
                    Ver este plano
                  </button>
                ) : null}
                {item.customQuote ? (
                  <a
                    className="assistente__plan"
                    href={customWhatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsappLogo size={16} weight="regular" aria-hidden="true" />
                    Pedir proposta no WhatsApp
                  </a>
                ) : null}
                {item.failed ? (
                  <a
                    className="assistente__zap"
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsappLogo size={16} weight="regular" aria-hidden="true" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ))}
            <p className="assistente__sr" role="status" aria-atomic="true">
              {status}
            </p>
          </div>

          <form className="assistente__form" onSubmit={(event) => void send(event)}>
            <label className="assistente__sr" htmlFor={fieldId}>
              Sua pergunta
            </label>
            <input
              ref={fieldRef}
              id={fieldId}
              className="assistente__field"
              type="text"
              enterKeyHint="send"
              maxLength={500}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Conta o que você quer guardar"
            />
            <button className="assistente__send" type="submit" disabled={busy || draft.trim() === ''}>
              <PaperPlaneTilt size={18} weight="regular" aria-hidden="true" />
              <span>Enviar</span>
            </button>
          </form>

          <p className="assistente__foot">
            Fora do catálogo,{' '}
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              me chama no WhatsApp
            </a>
            .
          </p>
        </section>
      ) : null}

      <button
        ref={launchRef}
        type="button"
        className="assistente__launch"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={toggleChat}
      >
        {open ? (
          <X size={22} weight="regular" aria-hidden="true" />
        ) : (
          <img src={icon} width={820} height={820} alt="" />
        )}
        <span>{open ? 'Fechar ajuda' : 'Ajuda para escolher um plano'}</span>
      </button>
    </div>
  )
}
