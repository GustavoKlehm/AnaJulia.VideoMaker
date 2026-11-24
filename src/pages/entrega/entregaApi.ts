import { signedUrl } from '../../lib/signedUrlCache'
import type { DeliveryCategory } from '../../shared/delivery'

/** `url` só vem nas fotos; vídeo traz só a `capa` (primeiro frame limpo). A URL do vídeo é pedida no clique. */
export type PublicFile = {
  id: string
  nome: string
  tipo: string
  tamanho: number
  /** Seção em que aparece: Fotos, Stories ou Vídeos para Reels. */
  categoria: DeliveryCategory
  criadoEm: string
  url?: string
  capa?: string
}

export type UrlMode = 'assistir' | 'baixar'

/** URL de um arquivo, gerada no clique e guardada enquanto vale (clicar de novo não gera outra). */
export function fileUrl(token: string, fileId: string, mode: UrlMode): Promise<string> {
  return signedUrl(`${fileId}:${mode}`, async () => {
    const response = await fetch(`/api/entregas/${token}/arquivos/${fileId}/url?modo=${mode}`, { cache: 'no-store' })
    const payload = (await response.json().catch(() => ({}))) as { url?: string; validaAte?: string; error?: string }
    if (!response.ok || !payload.url || !payload.validaAte) throw new Error(payload.error ?? 'Não deu para abrir o arquivo.')
    return { url: payload.url, validaAte: payload.validaAte }
  })
}
