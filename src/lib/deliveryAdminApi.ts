import type { Session } from '@supabase/supabase-js'
import type { DeliveryInput, DeliveryState } from '../shared/delivery'
import { estudioRequest } from './estudioApi'

/** Entregas de vídeo: mesmas rotas que o ExPx pode usar (/api/portal), chamadas com a sessão do estúdio. */

export type AdminDelivery = {
  id: string
  titulo: string
  descricao: string
  dataEvento: string | null
  expiraEm: string | null
  ativo: boolean
  estado: DeliveryState
  arquivosApagadosEm: string | null
  criadoEm: string
  link: string
  cliente?: { slug: string; nome: string; cores: { principal: string; secundaria: string } }
  arquivos?: number
}

export type DeliveryFile = {
  id: string
  nome: string
  tipo: string
  tamanho: number
  criadoEm: string
  /** Só nas fotos. A URL dos vídeos é pedida no clique (getDeliveryFileUrl). */
  url?: string
  /** Vídeo: URL do "-still" casado com ele. */
  capa?: string
  /** Foto "-still": nome do vídeo de que ela é capa. */
  capaDe?: string
}

export function listDeliveries(session: Session) {
  return estudioRequest<{ entregas: AdminDelivery[] }>('/api/portal/entregas', session)
}

export function listClientDeliveries(session: Session, slug: string) {
  return estudioRequest<{ entregas: AdminDelivery[] }>(`/api/portal/clientes/${encodeURIComponent(slug)}/entregas`, session)
}

export function createDelivery(session: Session, slug: string, input: DeliveryInput) {
  return estudioRequest<{ entrega: AdminDelivery }>(`/api/portal/clientes/${encodeURIComponent(slug)}/entregas`, session, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getDelivery(session: Session, id: string) {
  return estudioRequest<{ entrega: AdminDelivery; arquivos: DeliveryFile[]; urlsValidasAte: string }>(
    `/api/portal/entregas/${id}`,
    session,
  )
}

/** URL de um arquivo para assistir ou baixar (o original, com o nome do arquivo), gerada só quando pedida. */
export function getDeliveryFileUrl(session: Session, id: string, fileId: string, modo: 'assistir' | 'baixar') {
  return estudioRequest<{ url: string; validaAte: string }>(
    `/api/portal/entregas/${id}/arquivos/${fileId}/url?modo=${modo}`,
    session,
  )
}

export function updateDelivery(session: Session, id: string, input: DeliveryInput) {
  return estudioRequest<{ entrega: AdminDelivery }>(`/api/portal/entregas/${id}`, session, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteDelivery(session: Session, id: string) {
  return estudioRequest<{ ok: true }>(`/api/portal/entregas/${id}`, session, { method: 'DELETE' })
}

export function renewDeliveryLink(session: Session, id: string) {
  return estudioRequest<{ entrega: AdminDelivery }>(`/api/portal/entregas/${id}/link`, session, { method: 'POST' })
}

export function deleteDeliveryFile(session: Session, id: string, fileId: string) {
  return estudioRequest<{ ok: true }>(`/api/portal/entregas/${id}/arquivos/${fileId}`, session, { method: 'DELETE' })
}

/** Sobe direto para o R2 pela URL assinada, com progresso (fetch não informa progresso de envio). */
function putWithProgress(
  signedUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    // Os cabeçalhos entram na assinatura da URL: vão exatamente como a API devolveu.
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      // O R2 responde erro em XML (<Message>…</Message>).
      const message = /<Message>([^<]*)<\/Message>/.exec(xhr.responseText)?.[1] ?? ''
      if (xhr.status === 413 || /maximum allowed size|too large/i.test(message)) {
        reject(new Error(`"${file.name}" passou do limite de tamanho do armazenamento.`))
      } else {
        reject(new Error(`"${file.name}" não subiu (${message || `erro ${xhr.status}`}).`))
      }
    }
    xhr.onerror = () => reject(new Error(`"${file.name}" não subiu: a conexão caiu. Tente de novo.`))
    xhr.onabort = () => reject(new DOMException('Envio cancelado.', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(file)
  })
}

/** Envio completo de um arquivo: pede a URL, sobe e registra na entrega. */
export async function uploadDeliveryFile(
  session: Session,
  id: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<DeliveryFile> {
  const start = await estudioRequest<{ path: string; signedUrl: string; tipo: string; headers?: Record<string, string> }>(
    `/api/portal/entregas/${id}/arquivos/envio`,
    session,
    { method: 'POST', body: JSON.stringify({ nome: file.name, tamanho: file.size }) },
  )
  await putWithProgress(start.signedUrl, file, start.headers ?? { 'content-type': start.tipo }, onProgress, signal)
  const done = await estudioRequest<{ arquivo: DeliveryFile }>(`/api/portal/entregas/${id}/arquivos`, session, {
    method: 'POST',
    body: JSON.stringify({ path: start.path, nome: file.name }),
  })
  return done.arquivo
}
