import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react'
import { portalTheme } from '../../lib/portalTheme'
import { stableUrl } from '../../lib/signedUrlCache'
import { formatDateBr, isDeliveryLive, isVideoType } from '../../shared/delivery'
import { EntregaFiles } from './EntregaFiles'
import type { PublicFile } from './entregaApi'
import '../cliente/portal.css'
import './entrega.css'

type PublicDelivery = {
  entrega: { titulo: string; descricao: string; dataEvento: string | null; expiraEm: string | null; criadaEm: string }
  cliente: { nome: string; cores: { principal: string; secundaria: string } }
  arquivos: PublicFile[]
  urlsValidasAte: string
}

type Failure = { message: string; cliente?: PublicDelivery['cliente'] }

const REFRESH_MS = 60_000

async function fetchDelivery(token: string): Promise<PublicDelivery> {
  const response = await fetch(`/api/entregas/${token}`, { cache: 'no-store' })
  const payload = (await response.json().catch(() => ({}))) as Partial<PublicDelivery> & { error?: string }
  if (!response.ok) {
    const failure: Failure = { message: payload.error ?? 'Não deu para abrir a entrega agora.', cliente: payload.cliente }
    throw failure
  }
  const data = payload as PublicDelivery
  // Reaproveita as URLs das fotos e capas que ainda valem: o mesmo `src` não é baixado de novo.
  return {
    ...data,
    arquivos: data.arquivos.map((f) => ({
      ...f,
      url: f.url ? stableUrl(`${f.id}:imagem`, f.url, data.urlsValidasAte) : undefined,
      capa: f.capa ? stableUrl(`${f.id}:capa`, f.capa, data.urlsValidasAte) : undefined,
    })),
  }
}

/** Mantém os arquivos que já estavam na tela (sem trocar a URL e recarregar) e acrescenta os novos. */
function mergeFiles(current: PublicFile[], next: PublicFile[]): { files: PublicFile[]; added: number } {
  const known = new Map(current.map((f) => [f.id, f]))
  let added = 0
  const files = next.map((f) => {
    const old = known.get(f.id)
    if (old) return { ...f, url: old.url ?? f.url, capa: old.capa ?? f.capa }
    added += 1
    return f
  })
  return { files, added }
}

export function EntregaPage({ token }: { token: string }) {
  const [data, setData] = useState<PublicDelivery | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(
    async (mode: 'inicial' | 'auto' | 'manual') => {
      if (mode === 'manual') setRefreshing(true)
      try {
        const next = await fetchDelivery(token)
        setFailure(null)
        setData((current) => {
          if (!current) return next
          const { files, added } = mergeFiles(current.arquivos, next.arquivos)
          if (added > 0) setNotice(added === 1 ? 'Chegou 1 arquivo novo.' : `Chegaram ${added} arquivos novos.`)
          else if (mode === 'manual') setNotice('Nada novo por enquanto.')
          return { ...next, arquivos: files }
        })
      } catch (cause) {
        if (mode !== 'auto' || (cause as Failure).cliente) {
          setFailure(cause && typeof cause === 'object' && 'message' in cause ? (cause as Failure) : { message: 'Sem conexão.' })
          if ((cause as Failure).cliente) setData(null)
        }
      } finally {
        if (mode === 'manual') setRefreshing(false)
      }
    },
    [token],
  )

  useEffect(() => {
    void refresh('inicial')
  }, [refresh])

  // Só confere sozinha no dia do evento / primeiras 24 h (a Ana subindo stories). Trocar de aba não rebusca nada.
  const live = data ? isDeliveryLive(data.entrega) : false
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh('auto')
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [live, refresh])

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

        {data ? (
          <DeliveryView
            data={data}
            token={token}
            notice={notice}
            live={live}
            refreshing={refreshing}
            onRefresh={() => void refresh('manual')}
          />
        ) : null}
      </main>

      <footer className="portal-footer">
        <span>Vídeos por Ana Julia Videomaker</span>
      </footer>
    </div>
  )
}

type DeliveryViewProps = {
  data: PublicDelivery
  token: string
  notice: string
  live: boolean
  refreshing: boolean
  onRefresh: () => void
}

function DeliveryView({ data, token, notice, live, refreshing, onRefresh }: DeliveryViewProps) {
  const { entrega, arquivos } = data
  const count = (categoria: PublicFile['categoria']) =>
    arquivos.filter((f) => (f.categoria ?? (isVideoType(f.tipo) ? 'stories' : 'foto')) === categoria).length
  const fotos = count('foto')
  const stories = count('stories')
  const reels = count('reels')
  const counts = [
    fotos ? `${fotos} ${fotos === 1 ? 'foto' : 'fotos'}` : '',
    stories ? `${stories} ${stories === 1 ? 'story' : 'stories'}` : '',
    reels ? `${reels} ${reels === 1 ? 'vídeo para Reels' : 'vídeos para Reels'}` : '',
  ].filter(Boolean)

  return (
    <>
      <div className="portal-hero portal-hero--plan">
        <p className="portal-eyebrow">{entrega.dataEvento ? `Evento em ${formatDateBr(entrega.dataEvento)}` : 'Entrega'}</p>
        <h1>{entrega.titulo}</h1>
        {entrega.descricao ? <p className="portal-pre">{entrega.descricao}</p> : null}
        <p className="portal-small">
          {counts.length ? counts.join(' · ') : 'Os arquivos ainda estão chegando.'}
          {entrega.expiraEm ? ` · disponível até ${formatDateBr(entrega.expiraEm)}` : ''}
        </p>
        <button className="portal-link-button" type="button" disabled={refreshing} onClick={onRefresh}>
          <ArrowClockwise aria-hidden="true" /> {refreshing ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      <p className="portal-saved" role="status">
        {notice}
      </p>

      {arquivos.length === 0 ? (
        <p className="portal-muted">
          {live
            ? 'Assim que a Ana enviar, os vídeos aparecem aqui. A página se atualiza sozinha.'
            : 'Assim que a Ana enviar, os vídeos aparecem aqui. Toque em “Atualizar” para conferir.'}
        </p>
      ) : (
        <EntregaFiles arquivos={arquivos} token={token} />
      )}

      <p className="portal-muted portal-small">
        Toque no vídeo para assistir. “Baixar” salva o arquivo no aparelho; “Compartilhar” abre as opções do aparelho
        (WhatsApp, Instagram, e-mail…). Para guardar tudo de uma vez, use “Baixar todos”.
      </p>
    </>
  )
}
