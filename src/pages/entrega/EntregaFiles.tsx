import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { CornersOut, DownloadSimple, GridNine, ShareNetwork, Square, SquaresFour, X, type Icon } from '@phosphor-icons/react'
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
import { requestPageFullscreen } from './fullscreen'
import { StoryViewer, type ViewerItem } from './StoryViewer'
import { prepareShareAhead, useFileActions } from './useFileActions'

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
 * Seções Stories (fotos e vídeos misturados) e Reels; dentro de cada uma, a ordem em que a Ana subiu,
 * que é a sequência em que ela postou. O nome que a câmera dá ("IMG_4821.MOV") não diz nada:
 * cada item vira "Story 3", "Reel 1".
 */
function groupFiles(arquivos: PublicFile[]) {
  return DELIVERY_CATEGORIES.map((categoria) => {
    const files = arquivos.filter((f) => (f.categoria ?? 'stories') === categoria)
    return {
      categoria,
      items: files.map((file, index) => ({ file, label: `${CATEGORY_ITEM_LABEL[categoria]} ${index + 1}` })),
    }
  }).filter((group) => group.items.length > 0)
}

/** Lista dos arquivos da entrega: "Baixar todos", seletor de densidade e as seções. */
export function EntregaFiles({ arquivos, token }: { arquivos: PublicFile[]; token: string }) {
  const [density, setDensity] = useDensity()
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const groups = groupFiles(arquivos)
  // Sequência da tela cheia: Stories e depois Reels, na mesma ordem da página.
  const sequence: ViewerItem[] = groups.flatMap(({ categoria, items }) => items.map((item) => ({ ...item, categoria })))

  function openViewer(fileId: string) {
    const start = sequence.findIndex((item) => item.file.id === fileId)
    if (start < 0) return
    // Algum vídeo tocando no card para, senão o som fica por cima da tela cheia.
    document.querySelectorAll<HTMLVideoElement>('.entrega-grid video').forEach((video) => video.pause())
    requestPageFullscreen() // precisa ser no clique
    setViewerIndex(start)
  }

  const closeViewer = useCallback(() => setViewerIndex(null), [])

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
              <FileCard
                key={file.id}
                file={file}
                token={token}
                label={label}
                compact={density !== 'grande'}
                onExpand={() => openViewer(file.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      {viewerIndex !== null && sequence[viewerIndex] ? (
        <StoryViewer items={sequence} startIndex={viewerIndex} token={token} onClose={closeViewer} />
      ) : null}
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

type FileCardProps = { file: PublicFile; token: string; label: string; compact: boolean; onExpand: () => void }

function FileCard({ file, token, label, compact, onExpand }: FileCardProps) {
  const actions = useFileActions(file, token)
  const video = isVideoType(file.tipo)
  const titleFor = (text: string) => (compact ? `${text} · ${label}` : undefined)

  return (
    <li className="entrega-card">
      <div className="entrega-card__media">
        {video ? (
          <DeliveryVideo
            nome={label}
            capa={file.capa}
            load={() => {
              // Começou a ver: já prepara o arquivo para o "Compartilhar" abrir na hora (só no celular).
              prepareShareAhead(file, token)
              return fileUrl(token, file.id, 'assistir')
            }}
          />
        ) : (
          <button className="entrega-card__photo" type="button" aria-label={`Ver ${label} em tela cheia`} onClick={onExpand}>
            <img src={file.url} alt="" loading="lazy" decoding="async" />
          </button>
        )}
        <button
          className="entrega-card__expand"
          type="button"
          aria-label={`Ver ${label} em tela cheia`}
          title="Tela cheia"
          onClick={onExpand}
        >
          <CornersOut weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div className="entrega-card__body">
        <p className="portal-muted portal-small">{formatBytes(file.tamanho)}</p>
        <div className={`entrega-card__actions${compact ? ' entrega-card__actions--icons' : ''}`}>
          <button
            className="portal-button"
            type="button"
            disabled={actions.downloadState === 'opening'}
            title={titleFor(actions.downloadText)}
            onClick={() => void actions.download()}
          >
            <ActionLabel compact={compact} text={actions.downloadText} icon={<DownloadSimple aria-hidden="true" />} />
          </button>
          <button
            className="portal-button portal-button--ghost"
            type="button"
            disabled={actions.shareState === 'preparing'}
            title={titleFor(actions.shareText)}
            onClick={() => void actions.share()}
          >
            <ActionLabel
              compact={compact}
              text={actions.shareText}
              icon={<ShareNetwork aria-hidden="true" weight={actions.shareState === 'ready' ? 'fill' : 'regular'} />}
            />
          </button>
        </div>
        {actions.shareState === 'ready' && compact ? (
          <p className="portal-small entrega-card__hint">Pronto! Toque para compartilhar.</p>
        ) : null}
        {actions.shareState === 'copied' ? <p className="portal-small entrega-card__hint">Link da entrega copiado.</p> : null}
        {actions.shareState === 'error' ? (
          <p className="portal-error portal-small">{compact ? 'Não deu. Use “Baixar”.' : 'Não deu para compartilhar. Use “Baixar”.'}</p>
        ) : null}
        {actions.downloadState === 'error' ? (
          <p className="portal-error portal-small">
            {compact ? 'Falhou. Tente de novo.' : 'Não deu para baixar agora. Tente de novo em instantes.'}
          </p>
        ) : null}
      </div>
    </li>
  )
}
