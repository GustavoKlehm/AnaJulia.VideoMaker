import { useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  CaretLeft,
  CaretRight,
  DownloadSimple,
  Pause,
  Play,
  ShareNetwork,
  SpeakerHigh,
  SpeakerSlash,
  X,
} from '@phosphor-icons/react'
import { CATEGORY_LABEL, isVideoType, type DeliveryCategory } from '../../shared/delivery'
import { fileUrl, type PublicFile } from './entregaApi'
import { prepareShareAhead, useFileActions } from './useFileActions'
import './storyViewer.css'

export type ViewerItem = { file: PublicFile; label: string; categoria: DeliveryCategory }

/** Quanto tempo cada foto fica na tela. */
const PHOTO_MS = 5000
/** Segurar o dedo/mouse por mais que isso pausa (e soltar continua), em vez de passar. */
const HOLD_MS = 250

type StoryViewerProps = {
  items: ViewerItem[]
  startIndex: number
  token: string
  onClose: () => void
}

/**
 * Tela cheia no estilo dos stories: barrinhas de progresso no topo (uma por item da seção), passa sozinho
 * quando o vídeo acaba ou depois de 5 s na foto, setas/toques para voltar e avançar, segurar para pausar,
 * som, pausa, Baixar e Compartilhar. Enquanto um item está na tela, o próximo já vai carregando.
 */
export function StoryViewer({ items, startIndex, token, onClose }: StoryViewerProps) {
  const [index, setIndex] = useState(startIndex)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const [muted, setMuted] = useState(false)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [buffering, setBuffering] = useState(false)
  const [photoReady, setPhotoReady] = useState(false)
  const [failed, setFailed] = useState(false)
  // Compartilhando o item: segura o avanço automático para o item não trocar no meio.
  const [sharing, setSharing] = useState(false)

  const videos = useRef(new Map<string, HTMLVideoElement>())
  const fill = useRef<HTMLSpanElement | null>(null)
  const elapsed = useRef(0)
  const closeButton = useRef<HTMLButtonElement | null>(null)
  const press = useRef<{ timer: number } | null>(null)

  const current = items[index]
  const isVideo = isVideoType(current.file.tipo)
  const running = !paused && !held && !sharing
  const section = items.filter((item) => item.categoria === current.categoria)
  const positionInSection = section.indexOf(current)

  function goTo(next: number) {
    elapsed.current = 0
    setPhotoReady(false)
    setFailed(false)
    setBuffering(false)
    setPaused(false)
    const video = videos.current.get(items[next].file.id)
    if (video) video.currentTime = 0
    setIndex(next)
  }

  function goNext() {
    if (index >= items.length - 1) onClose()
    else goTo(index + 1)
  }

  function goPrevious() {
    if (index > 0) {
      goTo(index - 1)
      return
    }
    // No primeiro item, "voltar" recomeça.
    elapsed.current = 0
    const video = videos.current.get(current.file.id)
    if (video) video.currentTime = 0
  }

  // Barrinha, teclado e "acabou o vídeo" rodam fora do ciclo do React: usam sempre a versão atual destas funções.
  // (O onClose também fica aqui, para os efeitos de abrir/fechar não rodarem de novo se o pai recriar a função.)
  const latest = useRef({ next: goNext, previous: goPrevious, close: onClose })
  useEffect(() => {
    latest.current = { next: goNext, previous: goPrevious, close: onClose }
  })

  // URL dos vídeos: o atual, o próximo (para já ir carregando) e o anterior (voltar sem esperar).
  useEffect(() => {
    let alive = true
    for (const i of [index, index + 1, index - 1]) {
      const item = items[i]
      if (!item || !isVideoType(item.file.tipo) || urls[item.file.id]) continue
      fileUrl(token, item.file.id, 'assistir')
        .then((url) => {
          if (alive) setUrls((known) => ({ ...known, [item.file.id]: url }))
        })
        .catch(() => {
          if (alive && i === index) setFailed(true)
        })
    }
    return () => {
      alive = false
    }
  }, [index, items, token, urls])

  // Item que ficou um instante na tela: já prepara o arquivo para o "Compartilhar" abrir na hora (só no celular).
  // O instante evita baixar de novo o que a pessoa só passou rápido.
  useEffect(() => {
    const timer = window.setTimeout(() => prepareShareAhead(current.file, token), 1500)
    return () => window.clearTimeout(timer)
  }, [current.file, token])

  // Próxima foto: baixa já, para aparecer na hora.
  useEffect(() => {
    const next = items[index + 1]
    if (next && !isVideoType(next.file.tipo) && next.file.url) {
      const image = new Image()
      image.src = next.file.url
    }
  }, [index, items])

  // Toca só o vídeo atual; os outros (o próximo carregando, o anterior) ficam parados.
  useEffect(() => {
    for (const [id, video] of videos.current) {
      if (id !== current.file.id) {
        if (!video.paused) video.pause()
        continue
      }
      // O som vem do atributo `muted` do <video> (o React aplica); aqui só toca ou pausa.
      if (!running) {
        video.pause()
        continue
      }
      video.play().catch((cause: unknown) => {
        // Navegador não deixou tocar com som sem um toque: toca mudo (o botão de som continua ali).
        if (cause instanceof DOMException && cause.name === 'NotAllowedError' && !video.muted) setMuted(true)
      })
    }
  }, [current.file.id, running, muted, urls])

  // Barrinha do item atual: tempo do vídeo, ou 5 s da foto (parando junto com a pausa).
  useEffect(() => {
    let frame = 0
    let last = performance.now()
    function tick(now: number) {
      const delta = now - last
      last = now
      let progress = 0
      if (isVideo) {
        const video = videos.current.get(current.file.id)
        if (video && video.duration > 0) progress = video.currentTime / video.duration
      } else {
        if (photoReady && running) elapsed.current += delta
        progress = elapsed.current / PHOTO_MS
        if (progress >= 1) {
          latest.current.next()
          return
        }
      }
      if (fill.current) fill.current.style.transform = `scaleX(${Math.min(1, progress)})`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [current.file.id, isVideo, photoReady, running])

  // Teclado: setas, espaço (pausa), M (som), Esc (fecha).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') latest.current.close()
      else if (event.key === 'ArrowRight') latest.current.next()
      else if (event.key === 'ArrowLeft') latest.current.previous()
      else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        setPaused((value) => !value)
      } else if (event.key.toLowerCase() === 'm') setMuted((value) => !value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Abre: trava a rolagem da página e leva o foco para o "fechar". Fecha: devolve tudo e sai da tela cheia.
  // Se a pessoa sair da tela cheia pelo Esc do navegador, o visualizador fecha junto.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus()
    let wasFullscreen = Boolean(document.fullscreenElement)
    function onFullscreenChange() {
      const now = Boolean(document.fullscreenElement)
      if (wasFullscreen && !now) latest.current.close()
      wasFullscreen = now
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.body.style.overflow = overflow
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
      previous?.focus?.()
    }
  }, [])

  // Toque/clique na mídia: terço esquerdo volta, o resto avança; segurar pausa enquanto estiver pressionado.
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    press.current = { timer: window.setTimeout(() => setHeld(true), HOLD_MS) }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const pressed = press.current
    press.current = null
    if (!pressed) return
    window.clearTimeout(pressed.timer)
    if (held) {
      setHeld(false)
      return
    }
    const box = event.currentTarget.getBoundingClientRect()
    if (event.clientX - box.left < box.width / 3) goPrevious()
    else goNext()
  }

  function onPointerCancel() {
    if (press.current) window.clearTimeout(press.current.timer)
    press.current = null
    setHeld(false)
  }

  const loadingVideo = isVideo && (!urls[current.file.id] || buffering)
  const loading = !failed && (loadingVideo || (!isVideo && !photoReady))

  return (
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`${current.label}, tela cheia`}>
      <button
        className="story-viewer__nav story-viewer__nav--prev"
        type="button"
        aria-label="Anterior"
        onClick={goPrevious}
      >
        <CaretLeft weight="bold" aria-hidden="true" />
      </button>

      <div className="story-viewer__stage">
        <div className="story-viewer__media">
          {isVideo && current.file.capa ? <img className="story-viewer__poster" src={current.file.capa} alt="" /> : null}

          {[index - 1, index, index + 1].map((i) => {
            const item = items[i]
            if (!item || !isVideoType(item.file.tipo) || !urls[item.file.id]) return null
            const active = i === index
            return (
              <video
                key={item.file.id}
                ref={(element) => {
                  if (element) videos.current.set(item.file.id, element)
                  else videos.current.delete(item.file.id)
                }}
                className={`story-viewer__video${active ? ' is-current' : ''}`}
                src={urls[item.file.id]}
                poster={item.file.capa}
                playsInline
                preload={i === index - 1 ? 'metadata' : 'auto'}
                muted={active ? muted : true}
                aria-label={item.label}
                onEnded={active ? () => latest.current.next() : undefined}
                onWaiting={active ? () => setBuffering(true) : undefined}
                onPlaying={active ? () => setBuffering(false) : undefined}
                onCanPlay={active ? () => setBuffering(false) : undefined}
                onError={active ? () => setFailed(true) : undefined}
              />
            )
          })}

          {!isVideo ? (
            <img
              key={current.file.id}
              className="story-viewer__photo"
              src={current.file.url}
              alt={current.label}
              onLoad={() => setPhotoReady(true)}
              onError={() => {
                setFailed(true)
                setPhotoReady(true)
              }}
            />
          ) : null}

          {loading ? <span className="story-viewer__spinner" aria-label="Carregando" /> : null}
          {failed ? <p className="story-viewer__message">Não deu para abrir este arquivo. Toque para o próximo.</p> : null}
          {paused ? (
            <span className="story-viewer__paused" aria-hidden="true">
              <Play weight="fill" />
            </span>
          ) : null}
        </div>

        <div
          className="story-viewer__tap"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onPointerLeave={onPointerCancel}
          onContextMenu={(event) => event.preventDefault()}
        />

        <div className="story-viewer__top">
          <div className="story-viewer__bars" aria-hidden="true">
            {section.map((item, i) => (
              <span className="story-viewer__bar" key={item.file.id}>
                <span
                  className="story-viewer__fill"
                  ref={i === positionInSection ? fill : undefined}
                  style={i < positionInSection ? { transform: 'scaleX(1)' } : undefined}
                />
              </span>
            ))}
          </div>
          <div className="story-viewer__header">
            <p className="story-viewer__title">
              <strong>{current.label}</strong>
              <span>
                {CATEGORY_LABEL[current.categoria]} · {positionInSection + 1} de {section.length}
              </span>
            </p>
            <div className="story-viewer__controls">
              {isVideo ? (
                <button
                  type="button"
                  aria-label={muted ? 'Ativar o som' : 'Tirar o som'}
                  title={muted ? 'Ativar o som (M)' : 'Tirar o som (M)'}
                  onClick={() => setMuted((value) => !value)}
                >
                  {muted ? <SpeakerSlash aria-hidden="true" /> : <SpeakerHigh aria-hidden="true" />}
                </button>
              ) : null}
              <button
                type="button"
                aria-label={paused ? 'Continuar' : 'Pausar'}
                title={paused ? 'Continuar (espaço)' : 'Pausar (espaço)'}
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? <Play weight="fill" aria-hidden="true" /> : <Pause weight="fill" aria-hidden="true" />}
              </button>
              <button ref={closeButton} type="button" aria-label="Fechar" title="Fechar (Esc)" onClick={onClose}>
                <X aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <ViewerActions key={current.file.id} file={current.file} token={token} onBusyChange={setSharing} />
      </div>

      <button className="story-viewer__nav story-viewer__nav--next" type="button" aria-label="Próximo" onClick={goNext}>
        <CaretRight weight="bold" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Baixar e Compartilhar do item na tela (estado próprio por item: some ao passar para o próximo). */
type ViewerActionsProps = { file: PublicFile; token: string; onBusyChange: (busy: boolean) => void }

function ViewerActions({ file, token, onBusyChange }: ViewerActionsProps) {
  const actions = useFileActions(file, token)
  const busy = actions.shareBusy
  useEffect(() => {
    onBusyChange(busy)
  }, [busy, onBusyChange])
  // Trocou de item (ou fechou): libera o avanço.
  useEffect(() => () => onBusyChange(false), [onBusyChange])
  return (
    <div className="story-viewer__actions">
      <button
        className="story-viewer__action"
        type="button"
        disabled={actions.downloadState === 'opening'}
        onClick={() => void actions.download()}
      >
        <DownloadSimple aria-hidden="true" /> {actions.downloadText}
      </button>
      <button
        className="story-viewer__action"
        type="button"
        disabled={actions.shareState === 'preparing'}
        onClick={() => void actions.share()}
      >
        <ShareNetwork aria-hidden="true" weight={actions.shareState === 'ready' ? 'fill' : 'regular'} /> {actions.shareText}
      </button>
      {actions.shareState === 'copied' ? <p className="story-viewer__note">Link da entrega copiado.</p> : null}
      {actions.shareState === 'ready' ? <p className="story-viewer__note">Pronto! Toque para compartilhar.</p> : null}
      {actions.shareState === 'error' ? (
        <p className="story-viewer__note">Não deu para compartilhar este arquivo. Use “Baixar”.</p>
      ) : null}
      {actions.downloadState === 'error' ? <p className="story-viewer__note">Não deu para baixar agora. Tente de novo.</p> : null}
    </div>
  )
}
