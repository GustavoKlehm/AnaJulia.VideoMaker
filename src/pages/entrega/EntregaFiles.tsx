import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DownloadSimple, GridNine, ShareNetwork, Square, SquaresFour, X, type Icon } from '@phosphor-icons/react'
import { DeliveryVideo } from '../../components/DeliveryVideo'
import {
  CATEGORY_ITEM_LABEL,
  CATEGORY_LABEL,
  DELIVERY_CATEGORIES,
  formatBytes,
  isVideoType,
} from '../../shared/delivery'
import {
  canPickFolder,
  downloadToFolder,
  downloadViaBrowser,
  isAbort,
  pickFolder,
  type DownloadProgress,
  type DownloadResult,
  type FolderHandle,
} from './downloadAll'
import { fileUrl, type PublicFile } from './entregaApi'

/** Acima disso o "Compartilhar" não carrega o arquivo na memória do aparelho: compartilha o link da entrega. */
const SHARE_LIMIT_BYTES = 400 * 1024 ** 2

type Density = 'grande' | 'media' | 'pequena'

const DENSITY_KEY = 'aj:entrega:densidade'
const DENSITIES: { value: Density; label: string; icon: Icon }[] = [
  { value: 'grande', label: 'Cards grandes', icon: Square },
  { value: 'media', label: 'Cards médios', icon: SquaresFour },
  { value: 'pequena', label: 'Cards pequenos', icon: GridNine },
]

function readDensity(): Density {
  try {
    const saved = window.localStorage.getItem(DENSITY_KEY)
    if (saved === 'grande' || saved === 'media' || saved === 'pequena') return saved
  } catch {
    // Aba anônima ou armazenamento bloqueado: fica o padrão.
  }
  return 'media'
}

/** Densidade da grade, lembrada neste aparelho. Padrão: médio (2 por linha no celular). */
function useDensity(): [Density, (next: Density) => void] {
  const [density, setDensity] = useState<Density>(readDensity)
  function update(next: Density) {
    setDensity(next)
    try {
      window.localStorage.setItem(DENSITY_KEY, next)
    } catch {
      // Sem armazenamento: vale só enquanto a página estiver aberta.
    }
  }
  return [density, update]
}

/**
 * Seções na ordem fixa (Fotos, Stories, Reels); dentro de cada uma, a ordem em que a Ana subiu.
 * O nome que a câmera dá ("IMG_4821.MOV") não diz nada: cada item vira "Story 3", "Reel 1", "Foto 2".
 */
function groupFiles(arquivos: PublicFile[]) {
  return DELIVERY_CATEGORIES.map((categoria) => {
    const files = arquivos.filter((f) => (f.categoria ?? (isVideoType(f.tipo) ? 'stories' : 'foto')) === categoria)
    return {
      categoria,
      items: files.map((file, index) => ({ file, label: `${CATEGORY_ITEM_LABEL[categoria]} ${index + 1}` })),
    }
  }).filter((group) => group.items.length > 0)
}

/** Lista dos arquivos da entrega: "Baixar todos", seletor de densidade e as seções. */
export function EntregaFiles({ arquivos, token }: { arquivos: PublicFile[]; token: string }) {
  const [density, setDensity] = useDensity()
  const groups = groupFiles(arquivos)

  return (
    <div className="entrega-files">
      <div className="entrega-toolbar">
        <DownloadAll arquivos={arquivos} token={token} />
        <div className="entrega-density" role="group" aria-label="Tamanho dos cards">
          {DENSITIES.map(({ value, label, icon: DensityIcon }) => (
            <button
              key={value}
              className="entrega-density__option"
              type="button"
              aria-pressed={density === value}
              aria-label={label}
              title={label}
              onClick={() => setDensity(value)}
            >
              <DensityIcon aria-hidden="true" weight={density === value ? 'fill' : 'regular'} />
            </button>
          ))}
        </div>
      </div>

      {groups.map(({ categoria, items }) => (
        <section key={categoria} className="entrega-group" aria-labelledby={`entrega-${categoria}`}>
          <h2 className="entrega-group__title" id={`entrega-${categoria}`}>
            {CATEGORY_LABEL[categoria]} <span className="entrega-group__count">{items.length}</span>
          </h2>
          <ul className={`entrega-grid entrega-grid--${density}`}>
            {items.map(({ file, label }) => (
              <FileCard key={file.id} file={file} token={token} label={label} compact={density !== 'grande'} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

type BulkMode = 'pasta' | 'navegador'

type BulkState =
  | { status: 'idle' }
  | { status: 'running'; mode: BulkMode; progress: DownloadProgress }
  | { status: 'done'; mode: BulkMode; result: DownloadResult }
  | { status: 'error'; message: string }

/** "Baixar todos": fila que baixa um arquivo de cada vez (ver downloadAll.ts). */
function DownloadAll({ arquivos, token }: { arquivos: PublicFile[]; token: string }) {
  const [state, setState] = useState<BulkState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const totalBytes = arquivos.reduce((sum, f) => sum + f.tamanho, 0)

  // Saiu da página no meio: para a fila.
  useEffect(() => () => controller.current?.abort(), [])

  async function start() {
    const items = arquivos.map((f) => ({ id: f.id, nome: f.nome, tamanho: f.tamanho }))
    const getUrl = (id: string) => fileUrl(token, id, 'baixar')

    // O seletor de pasta precisa abrir direto no clique, antes de qualquer outra espera.
    let folder: FolderHandle | null = null
    if (canPickFolder()) {
      try {
        folder = await pickFolder()
      } catch (cause) {
        if (isAbort(cause)) return // fechou o seletor sem escolher
        folder = null // seletor bloqueado: quem baixa é o navegador
      }
    }

    const abort = new AbortController()
    controller.current = abort
    const mode: BulkMode = folder ? 'pasta' : 'navegador'
    const onProgress = (progress: DownloadProgress) => setState({ status: 'running', mode, progress })
    onProgress({ index: 0, total: items.length, bytes: 0, totalBytes })
    try {
      const result = folder
        ? await downloadToFolder(folder, items, getUrl, onProgress, abort.signal)
        : await downloadViaBrowser(items, getUrl, onProgress, abort.signal)
      setState({ status: 'done', mode, result })
    } catch (cause) {
      setState(isAbort(cause) ? { status: 'idle' } : { status: 'error', message: 'O download parou. Tente de novo.' })
    } finally {
      controller.current = null
    }
  }

  return (
    <div className="entrega-bulk">
      {state.status === 'running' ? (
        <button className="portal-button portal-button--ghost" type="button" onClick={() => controller.current?.abort()}>
          <X aria-hidden="true" /> Cancelar
        </button>
      ) : (
        <button className="portal-button" type="button" onClick={() => void start()}>
          <DownloadSimple aria-hidden="true" /> Baixar todos
          <span className="entrega-bulk__size">
            {arquivos.length} · {formatBytes(totalBytes)}
          </span>
        </button>
      )}
      <BulkStatus state={state} />
    </div>
  )
}

function BulkStatus({ state }: { state: BulkState }) {
  if (state.status === 'idle') return null

  if (state.status === 'error') {
    return (
      <p className="portal-error portal-small entrega-bulk__status" role="status">
        {state.message}
      </p>
    )
  }

  if (state.status === 'running') {
    const { index, total, bytes, totalBytes } = state.progress
    const current = Math.min(index + 1, total)
    return (
      <div className="entrega-bulk__status" role="status">
        {state.mode === 'pasta' ? (
          <>
            <p className="portal-small">
              Baixando {current} de {total} · {formatBytes(bytes)} de {formatBytes(totalBytes)}
            </p>
            <progress max={totalBytes || 1} value={bytes} />
          </>
        ) : (
          <>
            <p className="portal-small">
              Baixando {current} de {total}. Se o navegador perguntar, permita baixar vários arquivos.
            </p>
            <progress max={total} value={index} />
          </>
        )}
      </div>
    )
  }

  const { ok, skipped, failed } = state.result
  return (
    <div className="entrega-bulk__status" role="status">
      <p className="portal-small">
        {state.mode === 'pasta'
          ? `Pronto: ${ok} ${ok === 1 ? 'arquivo salvo' : 'arquivos salvos'} na pasta escolhida${
              skipped ? ` (${skipped} já ${skipped === 1 ? 'estava' : 'estavam'} lá)` : ''
            }.`
          : `Pronto: ${ok} ${ok === 1 ? 'download enviado' : 'downloads enviados'} para o navegador. Acompanhe na lista de downloads dele.`}
      </p>
      {failed.length ? (
        <p className="portal-error portal-small">
          {failed.length === 1 ? '1 arquivo não baixou.' : `${failed.length} arquivos não baixaram.`} Toque em “Baixar
          todos” de novo{state.mode === 'pasta' ? ' (os que já estão na pasta são pulados)' : ''}.
        </p>
      ) : null}
    </div>
  )
}

/** O navegador sabe compartilhar arquivos (celular, Chrome/Edge no Windows, Safari no Mac)? */
function supportsFileShare(): boolean {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'teste.mp4', { type: 'video/mp4' })] })
    )
  } catch {
    return false
  }
}

function canShareThis(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/** Texto no card grande; nos menores, só o ícone (o texto fica para leitores de tela e no title). */
function ActionLabel({ icon, text, compact }: { icon: ReactNode; text: string; compact: boolean }) {
  if (!compact) {
    return (
      <>
        {icon} {text}
      </>
    )
  }
  return (
    <>
      {icon}
      <span className="portal-visually-hidden">{text}</span>
    </>
  )
}

type ShareState = 'idle' | 'preparing' | 'ready' | 'copied' | 'error'

const SHARE_TEXT: Record<ShareState, string> = {
  idle: 'Compartilhar',
  preparing: 'Preparando…',
  ready: 'Toque para compartilhar',
  copied: 'Link copiado',
  error: 'Compartilhar',
}

type FileCardProps = { file: PublicFile; token: string; label: string; compact: boolean }

function FileCard({ file, token, label, compact }: FileCardProps) {
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [downloadState, setDownloadState] = useState<'idle' | 'opening' | 'error'>('idle')
  const prepared = useRef<File | null>(null)
  const video = isVideoType(file.tipo)

  // "Baixar": salva o arquivo original no aparelho (a URL só é gerada no clique).
  async function download() {
    setDownloadState('opening')
    try {
      window.location.assign(await fileUrl(token, file.id, 'baixar'))
      setDownloadState('idle')
    } catch {
      setDownloadState('error')
    }
  }

  async function shareFile(shared: File) {
    try {
      await navigator.share({ files: [shared] })
      setShareState('idle')
    } catch (cause) {
      // Preparar o arquivo demorou e o navegador não considera mais o toque: precisa de outro toque.
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') setShareState('ready')
      else setShareState('idle') // cancelou a folha de compartilhamento
    }
  }

  /** Sem compartilhamento de arquivo (ou arquivo grande demais para a memória do aparelho): compartilha o link. */
  async function shareLink() {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: document.title, url })
      } catch {
        // Cancelou.
      }
      setShareState('idle')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareState('copied')
    } catch {
      setShareState('error')
    }
  }

  // "Compartilhar": abre o compartilhar nativo (WhatsApp, Instagram, e-mail…) com o próprio arquivo.
  async function share() {
    if (prepared.current) {
      await shareFile(prepared.current)
      return
    }
    if (!supportsFileShare() || file.tamanho > SHARE_LIMIT_BYTES) {
      await shareLink()
      return
    }
    setShareState('preparing')
    try {
      const response = await fetch(await fileUrl(token, file.id, 'assistir'))
      if (!response.ok) throw new Error(String(response.status))
      const shared = new File([await response.blob()], file.nome, { type: file.tipo })
      if (!canShareThis(shared)) throw new Error('não compartilhável')
      prepared.current = shared
    } catch {
      setShareState('error')
      return
    }
    await shareFile(prepared.current)
  }

  const shareText = SHARE_TEXT[shareState]
  const downloadText = downloadState === 'opening' ? 'Abrindo…' : 'Baixar'
  const titleFor = (text: string) => (compact ? `${text} · ${label}` : undefined)

  return (
    <li className="entrega-card">
      {video ? (
        <DeliveryVideo nome={label} capa={file.capa} load={() => fileUrl(token, file.id, 'assistir')} />
      ) : (
        <img src={file.url} alt={label} loading="lazy" decoding="async" />
      )}
      <div className="entrega-card__body">
        <p className="portal-muted portal-small">{formatBytes(file.tamanho)}</p>
        <div className={`entrega-card__actions${compact ? ' entrega-card__actions--icons' : ''}`}>
          <button
            className="portal-button"
            type="button"
            disabled={downloadState === 'opening'}
            title={titleFor(downloadText)}
            onClick={() => void download()}
          >
            <ActionLabel compact={compact} text={downloadText} icon={<DownloadSimple aria-hidden="true" />} />
          </button>
          <button
            className="portal-button portal-button--ghost"
            type="button"
            disabled={shareState === 'preparing'}
            title={titleFor(shareText)}
            onClick={() => void share()}
          >
            <ActionLabel
              compact={compact}
              text={shareText}
              icon={<ShareNetwork aria-hidden="true" weight={shareState === 'ready' ? 'fill' : 'regular'} />}
            />
          </button>
        </div>
        {shareState === 'ready' && compact ? <p className="portal-small entrega-card__hint">Toque de novo para compartilhar.</p> : null}
        {shareState === 'copied' ? <p className="portal-small entrega-card__hint">Link da entrega copiado.</p> : null}
        {shareState === 'error' ? (
          <p className="portal-error portal-small">{compact ? 'Não deu. Use “Baixar”.' : 'Não deu para compartilhar. Use “Baixar”.'}</p>
        ) : null}
        {downloadState === 'error' ? (
          <p className="portal-error portal-small">
            {compact ? 'Falhou. Tente de novo.' : 'Não deu para baixar agora. Tente de novo em instantes.'}
          </p>
        ) : null}
      </div>
    </li>
  )
}
