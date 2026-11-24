import { useState } from 'react'
import { fileUrl, type PublicFile } from './entregaApi'

/** Acima disso o "Compartilhar" não carrega o arquivo na memória do aparelho: compartilha o link da entrega. */
const SHARE_LIMIT_BYTES = 400 * 1024 ** 2
/** Quantos arquivos preparados ficam guardados (cada vídeo pode ter centenas de MB). */
const MAX_PREPARED = 2

export type ShareState = 'idle' | 'preparing' | 'ready' | 'copied' | 'error'
export type DownloadState = 'idle' | 'opening' | 'error'

const SHARE_TEXT: Record<ShareState, string> = {
  idle: 'Compartilhar',
  preparing: 'Preparando…',
  ready: 'Pronto: toque para compartilhar',
  copied: 'Link copiado',
  error: 'Compartilhar',
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

function sharesAsFile(file: PublicFile): boolean {
  return supportsFileShare() && file.tamanho <= SHARE_LIMIT_BYTES
}

// ---------------------------------------------------------------------------
// Arquivos já preparados para o compartilhar
//
// O navegador só abre o compartilhar logo depois de um toque (alguns segundos no Chrome, menos no iPhone).
// Foto baixa rápido e cabe nesse tempo; vídeo grande não. Por isso o vídeo que a pessoa está vendo é
// preparado antes do toque, e o "Compartilhar" abre na hora.
// ---------------------------------------------------------------------------

const prepared = new Map<string, File>()
const preparing = new Map<string, Promise<File>>()

function remember(id: string, file: File) {
  prepared.delete(id)
  prepared.set(id, file)
  while (prepared.size > MAX_PREPARED) prepared.delete(prepared.keys().next().value as string)
}

function prepareShareFile(file: PublicFile, token: string): Promise<File> {
  const ready = prepared.get(file.id)
  if (ready) return Promise.resolve(ready)
  const inFlight = preparing.get(file.id)
  if (inFlight) return inFlight
  const request = (async () => {
    const response = await fetch(await fileUrl(token, file.id, 'assistir'))
    if (!response.ok) throw new Error(String(response.status))
    const shared = new File([await response.blob()], file.nome, { type: file.tipo })
    if (!canShareThis(shared)) throw new Error('não compartilhável')
    remember(file.id, shared)
    return shared
  })().finally(() => preparing.delete(file.id))
  preparing.set(file.id, request)
  return request
}

/** Aparelho de toque (celular/tablet): é onde o compartilhar com arquivo é usado de verdade. */
function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

/**
 * Prepara o arquivo antes do toque em "Compartilhar", quando a pessoa está vendo o vídeo
 * (tela cheia ou tocando no card). Só no celular/tablet: no computador o compartilhar é raro e
 * não vale baixar o vídeo de novo à toa. Fotos não precisam (baixam a tempo no próprio toque).
 */
export function prepareShareAhead(file: PublicFile, token: string) {
  if (!file.tipo.startsWith('video/') || !isTouchDevice() || !sharesAsFile(file)) return
  void prepareShareFile(file, token).catch(() => undefined)
}

/** O toque que pediu o compartilhar ainda vale? (Sem a API, tenta: no pior caso o navegador recusa.) */
function stillActivated(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
  return activation ? activation.isActive : true
}

/**
 * "Baixar" e "Compartilhar" de um arquivo da entrega (usado no card e na tela cheia).
 * - Baixar: salva o original no aparelho (a URL só é gerada no clique).
 * - Compartilhar: compartilhar nativo com o próprio arquivo; sem suporte, ou arquivo grande demais,
 *   compartilha o link da entrega; sem compartilhar nativo, copia o link.
 */
export function useFileActions(file: PublicFile, token: string) {
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')

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
      // O navegador não considerou mais o toque (preparar demorou): o arquivo está pronto, falta um toque.
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') setShareState('ready')
      else setShareState('idle') // cancelou a folha de compartilhamento
    }
  }

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

  async function share() {
    // Já preparado: abre o compartilhar ainda dentro do toque (nada de espera antes do navigator.share).
    const ready = prepared.get(file.id)
    if (ready) {
      await shareFile(ready)
      return
    }
    if (!sharesAsFile(file)) {
      await shareLink()
      return
    }
    setShareState('preparing')
    let shared: File
    try {
      shared = await prepareShareFile(file, token)
    } catch {
      setShareState('error')
      return
    }
    // Terminou a tempo: abre direto. Se o toque já expirou, o arquivo fica pronto e basta tocar de novo.
    if (stillActivated()) await shareFile(shared)
    else setShareState('ready')
  }

  return {
    shareState,
    downloadState,
    shareText: SHARE_TEXT[shareState],
    downloadText: downloadState === 'opening' ? 'Abrindo…' : 'Baixar',
    share,
    download,
  }
}
