import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DownloadSimple, ShareFat } from '@phosphor-icons/react'
import { portalTheme } from '../../lib/portalTheme'
import { formatBytes, formatDateBr, isVideoType } from '../../shared/delivery'
import '../cliente/portal.css'
import './entrega.css'

type PublicFile = { id: string; nome: string; tipo: string; tamanho: number; criadoEm: string; url: string; download: string }

type PublicDelivery = {
  entrega: { titulo: string; descricao: string; dataEvento: string | null; expiraEm: string | null }
  cliente: { nome: string; cores: { principal: string; secundaria: string } }
  arquivos: PublicFile[]
}

type Failure = { message: string; cliente?: PublicDelivery['cliente'] }

/** Acima disso o "salvar no celular" não carrega o arquivo na memória do aparelho; fica só o download. */
const SHARE_LIMIT_BYTES = 400 * 1024 ** 2
const REFRESH_MS = 60_000

async function fetchDelivery(token: string): Promise<PublicDelivery> {
  const response = await fetch(`/api/entregas/${token}`, { cache: 'no-store' })
  const payload = (await response.json().catch(() => ({}))) as Partial<PublicDelivery> & { error?: string }
  if (!response.ok) {
    const failure: Failure = { message: payload.error ?? 'Não deu para abrir a entrega agora.', cliente: payload.cliente }
    throw failure
  }
  return payload as PublicDelivery
}

/** Mantém os arquivos que já estavam na tela (sem trocar a URL e recarregar o vídeo) e acrescenta os novos. */
function mergeFiles(current: PublicFile[], next: PublicFile[]): { files: PublicFile[]; added: number } {
  const known = new Map(current.map((f) => [f.id, f]))
  let added = 0
  const files = next.map((f) => {
    const old = known.get(f.id)
    if (old) return old
    added += 1
    return f
  })
  return { files, added }
}

export function EntregaPage({ token }: { token: string }) {
  const [data, setData] = useState<PublicDelivery | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [notice, setNotice] = useState('')

  const refresh = useCallback(
    async (initial: boolean) => {
      try {
        const next = await fetchDelivery(token)
        setFailure(null)
        setData((current) => {
          if (!current) return next
          const { files, added } = mergeFiles(current.arquivos, next.arquivos)
          if (added > 0) setNotice(added === 1 ? 'Chegou 1 arquivo novo.' : `Chegaram ${added} arquivos novos.`)
          return { ...next, arquivos: files }
        })
      } catch (cause) {
        if (initial || (cause as Failure).cliente) {
          setFailure(cause && typeof cause === 'object' && 'message' in cause ? (cause as Failure) : { message: 'Sem conexão.' })
          if ((cause as Failure).cliente) setData(null)
        }
      }
    },
    [token],
  )

  useEffect(() => {
    void refresh(true)
    // Durante o evento a Ana vai subindo os stories: a página confere de tempos em tempos.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(false)
    }, REFRESH_MS)
    function onVisible() {
      if (document.visibilityState === 'visible') void refresh(false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    document.title = data ? `${data.entrega.titulo} — Ana Julia` : 'Entrega — Ana Julia'
  }, [data])

  const cliente = data?.cliente ?? failure?.cliente
  const style = cliente ? (portalTheme(cliente.cores.principal, cliente.cores.secundaria) as CSSProperties) : undefined

  return (
    <div className="portal" style={style}>
      <header className="portal-top">
        <span className="portal-top__name">{cliente?.nome ?? 'Ana Julia Videomaker'}</span>
      </header>

      <main className="portal-main" id="conteudo">
        {!data && !failure ? (
          <p className="portal-muted" aria-busy="true">
            Abrindo…
          </p>
        ) : null}

        {failure && !data ? (
          <div className="portal-hero">
            <p className="portal-eyebrow">Entrega</p>
            <h1>Não deu para abrir</h1>
            <p className="portal-lead">{failure.message}</p>
          </div>
        ) : null}

        {data ? <DeliveryView data={data} notice={notice} /> : null}
      </main>

      <footer className="portal-footer">
        <span>Vídeos por Ana Julia Videomaker</span>
      </footer>
    </div>
  )
}

function DeliveryView({ data, notice }: { data: PublicDelivery; notice: string }) {
  const { entrega, arquivos } = data
  const videos = arquivos.filter((f) => isVideoType(f.tipo)).length
  const fotos = arquivos.length - videos
  const counts = [
    videos ? `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}` : '',
    fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : '',
  ].filter(Boolean)

  return (
    <>
      <div className="portal-hero portal-hero--plan">
        <p className="portal-eyebrow">{entrega.dataEvento ? `Evento em ${formatDateBr(entrega.dataEvento)}` : 'Entrega'}</p>
        <h1>{entrega.titulo}</h1>
        {entrega.descricao ? <p className="portal-pre">{entrega.descricao}</p> : null}
        <p className="portal-small">
          {counts.length ? counts.join(' e ') : 'Os arquivos ainda estão chegando.'}
          {entrega.expiraEm ? ` · disponível até ${formatDateBr(entrega.expiraEm)}` : ''}
        </p>
      </div>

      <p className="portal-saved" role="status">
        {notice}
      </p>

      {arquivos.length === 0 ? (
        <p className="portal-muted">Assim que a Ana enviar, os vídeos aparecem aqui. A página se atualiza sozinha.</p>
      ) : (
        <ul className="entrega-grid">
          {arquivos.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </ul>
      )}

      <p className="portal-muted portal-small">
        No celular, use “Salvar no celular” para mandar o vídeo direto para a galeria ou para o Instagram. No computador,
        use “Baixar”.
      </p>
    </>
  )
}

function canShareFiles(): boolean {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'teste.mp4', { type: 'video/mp4' })] })
    )
  } catch {
    return false
  }
}

function FileCard({ file }: { file: PublicFile }) {
  const [shareState, setShareState] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle')
  const prepared = useRef<File | null>(null)
  const [shareable] = useState(() => canShareFiles() && file.tamanho <= SHARE_LIMIT_BYTES)
  const video = isVideoType(file.tipo)

  // O compartilhamento precisa acontecer logo depois do toque; por isso o arquivo é preparado antes.
  async function prepare() {
    setShareState('preparing')
    try {
      const response = await fetch(file.url)
      if (!response.ok) throw new Error(String(response.status))
      const blob = await response.blob()
      const shared = new File([blob], file.nome, { type: file.tipo })
      if (!navigator.canShare({ files: [shared] })) throw new Error('não compartilhável')
      prepared.current = shared
      setShareState('ready')
    } catch {
      setShareState('error')
    }
  }

  async function share() {
    if (!prepared.current) return
    try {
      await navigator.share({ files: [prepared.current] })
    } catch {
      // Cancelar a folha de compartilhamento também cai aqui; não é erro.
    }
  }

  return (
    <li className="entrega-card">
      {video ? (
        <video src={file.url} controls playsInline preload="metadata" aria-label={file.nome} />
      ) : (
        <img src={file.url} alt={file.nome} loading="lazy" />
      )}
      <div className="entrega-card__body">
        <p className="entrega-card__name">{file.nome}</p>
        <p className="portal-muted portal-small">{formatBytes(file.tamanho)}</p>
        <div className="entrega-card__actions">
          {shareable ? (
            shareState === 'ready' ? (
              <button className="portal-button" type="button" onClick={() => void share()}>
                <ShareFat aria-hidden="true" /> Toque para salvar
              </button>
            ) : (
              <button
                className="portal-button"
                type="button"
                disabled={shareState === 'preparing'}
                onClick={() => void prepare()}
              >
                <ShareFat aria-hidden="true" /> {shareState === 'preparing' ? 'Preparando…' : 'Salvar no celular'}
              </button>
            )
          ) : null}
          <a className={`portal-button${shareable ? ' portal-button--ghost' : ''}`} href={file.download}>
            <DownloadSimple aria-hidden="true" /> Baixar
          </a>
        </div>
        {shareState === 'error' ? (
          <p className="portal-error portal-small">Não deu para preparar. Use “Baixar”.</p>
        ) : null}
      </div>
    </li>
  )
}
