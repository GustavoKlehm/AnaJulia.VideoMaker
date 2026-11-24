/**
 * "Baixar todos": fila que baixa os arquivos da entrega um de cada vez.
 *
 * - Chrome/Edge no computador: a pessoa escolhe uma pasta uma vez e cada arquivo é gravado direto nela
 *   (streaming, sem carregar o vídeo inteiro na memória), com progresso. Rodar de novo pula o que já está lá.
 * - Demais navegadores (celular, Safari, Firefox): cada download é entregue ao navegador, um de cada vez,
 *   com um intervalo entre eles. O navegador pode pedir permissão para baixar vários arquivos.
 */

export type DownloadItem = { id: string; nome: string; tamanho: number }

export type DownloadProgress = {
  /** Arquivo da vez (começa em 0). */
  index: number
  total: number
  /** Bytes já gravados (só no modo pasta). */
  bytes: number
  totalBytes: number
}

export type DownloadResult = { ok: number; skipped: number; failed: string[] }

type WritableFile = WritableStream<Uint8Array>
type FileHandleLike = { getFile(): Promise<File>; createWritable(): Promise<WritableFile> }
export type FolderHandle = {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>
}
type PickerWindow = Window & {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite'; id?: string }) => Promise<FolderHandle>
}

/** Intervalo entre um download e outro quando quem baixa é o navegador. */
const BROWSER_GAP_MS = 2500

export function canPickFolder(): boolean {
  return typeof window !== 'undefined' && typeof (window as PickerWindow).showDirectoryPicker === 'function'
}

/** Precisa ser chamada direto no clique (o navegador só abre o seletor com um gesto da pessoa). */
export function pickFolder(): Promise<FolderHandle> {
  const picker = (window as PickerWindow).showDirectoryPicker
  if (!picker) return Promise.reject(new Error('sem seletor de pasta'))
  return picker.call(window, { mode: 'readwrite', id: 'entrega' })
}

export function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

/** Nomes repetidos na mesma entrega viram "nome (2).ext" para um não sobrescrever o outro. */
export function uniqueNames(items: DownloadItem[]): string[] {
  const used = new Map<string, number>()
  return items.map(({ nome }) => {
    const key = nome.toLowerCase()
    const count = (used.get(key) ?? 0) + 1
    used.set(key, count)
    if (count === 1) return nome
    const dot = nome.lastIndexOf('.')
    return dot > 0 ? `${nome.slice(0, dot)} (${count})${nome.slice(dot)}` : `${nome} (${count})`
  })
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Cancelado.', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      window.clearTimeout(timer)
      reject(new DOMException('Cancelado.', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

async function alreadyThere(folder: FolderHandle, name: string, size: number): Promise<boolean> {
  try {
    const file = await (await folder.getFileHandle(name)).getFile()
    return file.size === size && size > 0
  } catch {
    return false
  }
}

/** Grava cada arquivo na pasta escolhida, um de cada vez. */
export async function downloadToFolder(
  folder: FolderHandle,
  items: DownloadItem[],
  getUrl: (id: string) => Promise<string>,
  onProgress: (progress: DownloadProgress) => void,
  signal: AbortSignal,
): Promise<DownloadResult> {
  const names = uniqueNames(items)
  const totalBytes = items.reduce((sum, item) => sum + item.tamanho, 0)
  const result: DownloadResult = { ok: 0, skipped: 0, failed: [] }
  let bytes = 0

  for (const [index, item] of items.entries()) {
    if (signal.aborted) throw new DOMException('Cancelado.', 'AbortError')
    const name = names[index]
    onProgress({ index, total: items.length, bytes, totalBytes })

    if (await alreadyThere(folder, name, item.tamanho)) {
      result.skipped += 1
      bytes += item.tamanho
      continue
    }

    const before = bytes
    try {
      const response = await fetch(await getUrl(item.id), { signal })
      if (!response.ok || !response.body) throw new Error(String(response.status))
      const writable = await (await folder.getFileHandle(name, { create: true })).createWritable()
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytes += chunk.byteLength
          onProgress({ index, total: items.length, bytes, totalBytes })
          controller.enqueue(chunk)
        },
      })
      // pipeTo fecha o arquivo no fim; se cancelar, o arquivo pela metade é descartado.
      await response.body.pipeThrough(counter).pipeTo(writable, { signal })
      result.ok += 1
    } catch (cause) {
      if (isAbort(cause) || signal.aborted) throw new DOMException('Cancelado.', 'AbortError')
      bytes = before + item.tamanho
      result.failed.push(item.nome)
    }
  }

  onProgress({ index: items.length, total: items.length, bytes: totalBytes, totalBytes })
  return result
}

/** Entrega cada download ao navegador, um de cada vez (ele mostra o andamento na lista de downloads dele). */
export async function downloadViaBrowser(
  items: DownloadItem[],
  getUrl: (id: string) => Promise<string>,
  onProgress: (progress: DownloadProgress) => void,
  signal: AbortSignal,
): Promise<DownloadResult> {
  const totalBytes = items.reduce((sum, item) => sum + item.tamanho, 0)
  const result: DownloadResult = { ok: 0, skipped: 0, failed: [] }

  for (const [index, item] of items.entries()) {
    if (signal.aborted) throw new DOMException('Cancelado.', 'AbortError')
    onProgress({ index, total: items.length, bytes: 0, totalBytes })
    try {
      const url = await getUrl(item.id)
      // A URL já força o download com o nome original (Content-Disposition), então a página não sai do lugar.
      const link = document.createElement('a')
      link.href = url
      link.rel = 'noopener'
      link.style.display = 'none'
      document.body.append(link)
      link.click()
      link.remove()
      result.ok += 1
    } catch {
      result.failed.push(item.nome)
    }
    if (index < items.length - 1) await wait(BROWSER_GAP_MS, signal)
  }

  onProgress({ index: items.length, total: items.length, bytes: 0, totalBytes })
  return result
}
