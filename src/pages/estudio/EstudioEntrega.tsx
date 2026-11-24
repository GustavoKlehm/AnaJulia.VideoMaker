import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { DeliveryVideo } from '../../components/DeliveryVideo'
import { RouteLink } from '../../components/RouteLink'
import { useAuth } from '../../hooks/useAuth'
import {
  deleteDelivery,
  deleteDeliveryFile,
  getDelivery,
  getDeliveryFileUrl,
  renewDeliveryLink,
  updateDelivery,
  updateDeliveryFile,
  uploadDeliveryCover,
  uploadDeliveryFile,
  type AdminDelivery,
  type DeliveryFile,
} from '../../lib/deliveryAdminApi'
import { navigate } from '../../lib/router'
import { signedUrl, stableUrl } from '../../lib/signedUrlCache'
import { getSupabase } from '../../lib/supabase'
import { captureVideoCover } from '../../lib/videoCover'
import {
  ACCEPTED_EXTENSIONS,
  CATEGORY_LABEL,
  DELIVERY_CATEGORIES,
  DELIVERY_STATE_LABEL,
  MAX_FILE_BYTES,
  fileTypeFor,
  formatBytes,
  formatDateBr,
  isVideoType,
  validityFromDate,
  validityToDate,
  type DeliveryCategory,
} from '../../shared/delivery'
import { ShareCard, UploadQueue, ValidityField, type QueueItem } from './EstudioEntregaParts'
import './estudio.css'

type Detail = { entrega: AdminDelivery; arquivos: DeliveryFile[] }

export function EstudioEntrega({ id }: { id: string }) {
  const { session } = useAuth()
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  // Seção dos vídeos do próximo envio (fotos vão sempre para Stories).
  const [videoCategory, setVideoCategory] = useState<DeliveryCategory>('stories')
  const [covers, setCovers] = useState<{ done: number; total: number; failed: number } | null>(null)
  const uploading = queue.some((q) => q.status === 'fila' || q.status === 'enviando')
  const inputRef = useRef<HTMLInputElement>(null)

  // `session` só muda quando troca o usuário (useAuth), então isto não roda de novo ao trocar de aba.
  const load = useCallback(async () => {
    if (!session) return
    const next = await getDelivery(session, id)
    // Fotos e capas mantêm a URL que já estava valendo: recarregar a lista não baixa as imagens de novo.
    setDetail({
      entrega: next.entrega,
      arquivos: next.arquivos.map((f) => ({
        ...f,
        url: f.url ? stableUrl(`${f.id}:imagem`, f.url, next.urlsValidasAte) : undefined,
        capa: f.capa ? stableUrl(`${f.id}:capa`, f.capa, next.urlsValidasAte) : undefined,
      })),
    })
  }, [session, id])

  /** URL gerada só no clique (assistir/baixar) e guardada enquanto vale. */
  const fileUrl = useCallback(
    (fileId: string, modo: 'assistir' | 'baixar') => {
      if (!session) return Promise.reject(new Error('Sua sessão caiu. Entre de novo no estúdio.'))
      return signedUrl(`${fileId}:${modo}`, () => getDeliveryFileUrl(session, id, fileId, modo))
    },
    [session, id],
  )

  useEffect(() => {
    load().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para abrir a entrega.'))
  }, [load])

  useEffect(() => {
    if (!uploading) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [uploading])

  async function act(action: () => Promise<void>, ok: string) {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      await action()
      setStatus(ok)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu certo.')
    } finally {
      setBusy(false)
    }
  }

  function patchQueue(key: string, patch: Partial<QueueItem>) {
    setQueue((current) => current.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length === 0) return
    setError('')
    setStatus('')

    const categoria = videoCategory
    const items: (QueueItem & { file: File })[] = files.map((file, i) => {
      const invalid = !fileTypeFor(file.name)
        ? 'formato não aceito (use mp4, mov, webm, jpg, png, webp ou heic)'
        : file.size > MAX_FILE_BYTES
          ? `maior que ${formatBytes(MAX_FILE_BYTES)}`
          : ''
      return {
        key: `${Date.now()}-${i}-${file.name}`,
        nome: file.name,
        tamanho: file.size,
        progress: 0,
        status: invalid ? 'erro' : 'fila',
        error: invalid || undefined,
        file,
      }
    })
    setQueue((current) => [...current.filter((q) => q.status !== 'ok'), ...items.map(({ file: _file, ...q }) => q)])

    let sent = 0
    for (const item of items) {
      if (item.status === 'erro') continue
      patchQueue(item.key, { status: 'enviando' })
      try {
        // Sessão atualizada a cada arquivo: um lote grande pode passar da validade do login.
        const { data } = await getSupabase().auth.getSession()
        if (!data.session) throw new Error('Sua sessão caiu. Entre de novo no estúdio.')
        const arquivo = await uploadDeliveryFile(data.session, id, item.file, (progress) => patchQueue(item.key, { progress }), {
          categoria,
        })
        // Capa do vídeo tirada do arquivo local (sem baixar nada). Opcional: se falhar, o envio vale do mesmo jeito.
        if (isVideoType(arquivo.tipo)) {
          const jpeg = await captureVideoCover(item.file)
          if (jpeg) await uploadDeliveryCover(data.session, id, arquivo.id, jpeg).catch(() => undefined)
        }
        patchQueue(item.key, { status: 'ok', progress: 1 })
        sent += 1
      } catch (cause) {
        patchQueue(item.key, { status: 'erro', error: cause instanceof Error ? cause.message : 'falhou' })
      }
    }
    if (sent > 0) {
      setStatus(sent === 1 ? '1 arquivo enviado.' : `${sent} arquivos enviados.`)
      await load().catch(() => undefined)
    }
  }

  /**
   * Gera a capa dos vídeos que ainda não têm (enviados antes desta função existir, ou cuja capa falhou).
   * Abre cada vídeo pela URL só até achar um frame limpo e para de baixar.
   */
  async function generateMissingCovers(videos: DeliveryFile[]) {
    if (!session || videos.length === 0) return
    setError('')
    setStatus('')
    let failed = 0
    setCovers({ done: 0, total: videos.length, failed })
    for (const [index, video] of videos.entries()) {
      try {
        // URL nova (não a do cache): a do player pode estar no cache do navegador sem CORS, e aí o frame não pode ser lido.
        const { url } = await getDeliveryFileUrl(session, id, video.id, 'assistir')
        const jpeg = await captureVideoCover(url)
        if (!jpeg) throw new Error('sem frame')
        await uploadDeliveryCover(session, id, video.id, jpeg)
      } catch {
        failed += 1
      }
      setCovers({ done: index + 1, total: videos.length, failed })
    }
    await load().catch(() => undefined)
    setCovers(null)
    const ok = videos.length - failed
    if (ok > 0) setStatus(ok === 1 ? '1 capa gerada.' : `${ok} capas geradas.`)
    if (failed > 0) {
      setError(
        failed === 1
          ? '1 vídeo ficou sem capa: este navegador não conseguiu abrir o formato dele.'
          : `${failed} vídeos ficaram sem capa: este navegador não conseguiu abrir o formato deles.`,
      )
    }
  }

  if (!detail) {
    return (
      <main className="estudio-page">
        <RouteLink to="/estudio/entregas">← Entregas</RouteLink>
        {error ? <p className="estudio-error">{error}</p> : <p className="estudio-help">Carregando…</p>}
      </main>
    )
  }

  const { entrega, arquivos } = detail
  const total = arquivos.reduce((sum, f) => sum + f.tamanho, 0)
  const withoutCover = arquivos.filter((f) => isVideoType(f.tipo) && !f.capa)

  return (
    <main className="estudio-page">
      <div>
        <RouteLink to="/estudio/entregas">← Entregas</RouteLink>
        <p className="estudio-kicker">
          Entrega ·{' '}
          {entrega.cliente ? <RouteLink to={`/estudio/clientes/${entrega.cliente.slug}`}>{entrega.cliente.nome}</RouteLink> : null}
        </p>
        <h1>{entrega.titulo}</h1>
        <p className="estudio-help">
          <span className={`estudio-state estudio-state--${entrega.estado}`}>{DELIVERY_STATE_LABEL[entrega.estado]}</span>{' '}
          {entrega.dataEvento ? `Evento em ${formatDateBr(entrega.dataEvento)} · ` : ''}
          {entrega.expiraEm ? `link até ${formatDateBr(entrega.expiraEm)}` : 'link sem validade'}
        </p>
      </div>

      {error ? <p className="estudio-error">{error}</p> : null}
      {status ? <p className="estudio-status">{status}</p> : null}

      <section className="estudio-card">
        <h2>Arquivos</h2>
        <p className="estudio-help">
          {arquivos.length === 0
            ? 'Nada enviado ainda. Pode subir aos poucos durante o evento: o cliente vê os novos quando atualiza a página.'
            : `${arquivos.length} arquivo(s) · ${formatBytes(total)}`}
        </p>
        <fieldset className="estudio-category-choice">
          <legend className="estudio-help">Os vídeos deste envio vão para (fotos vão sempre para Stories, na ordem de envio):</legend>
          {(['stories', 'reels'] as const).map((value) => (
            <label key={value} className="estudio-check">
              <input
                type="radio"
                name="categoria-envio"
                value={value}
                checked={videoCategory === value}
                onChange={() => setVideoCategory(value)}
              />
              {CATEGORY_LABEL[value]}
            </label>
          ))}
        </fieldset>
        <div className="estudio-actions">
          <input
            ref={inputRef}
            className="estudio-visually-hidden"
            type="file"
            multiple
            accept={['video/*', 'image/*', ...ACCEPTED_EXTENSIONS].join(',')}
            onChange={(event) => void handleFiles(event)}
          />
          <button className="estudio-button" type="button" onClick={() => inputRef.current?.click()}>
            {uploading ? 'Adicionar mais à fila' : 'Escolher vídeos e fotos'}
          </button>
        </div>
        {uploading ? <p className="estudio-help">Não feche esta página até terminar o envio.</p> : null}
        {covers ? (
          <p className="estudio-help" role="status">
            Gerando capas: {covers.done} de {covers.total}…
          </p>
        ) : withoutCover.length > 0 && !uploading ? (
          <div className="estudio-actions">
            <p className="estudio-help">
              {withoutCover.length === 1 ? '1 vídeo está sem capa.' : `${withoutCover.length} vídeos estão sem capa.`}
            </p>
            <button
              className="estudio-button-ghost"
              type="button"
              disabled={busy}
              onClick={() => void generateMissingCovers(withoutCover)}
            >
              Gerar capas
            </button>
          </div>
        ) : null}
        <UploadQueue items={queue} />

        {/* Mesma divisão e ordem que o cliente vê. */}
        {DELIVERY_CATEGORIES.map((categoria) => {
          const group = arquivos.filter((f) => f.categoria === categoria)
          if (group.length === 0) return null
          return (
            <div key={categoria} className="estudio-delivery-group">
              <h3>
                {CATEGORY_LABEL[categoria]} <span className="estudio-help">({group.length})</span>
              </h3>
              <ul className="estudio-delivery-files">
                {group.map((f) => (
                  <li key={f.id} className="estudio-delivery-file">
                    {isVideoType(f.tipo) ? (
                      <DeliveryVideo nome={f.nome} capa={f.capa} muted load={() => fileUrl(f.id, 'assistir')} />
                    ) : f.url ? (
                      <img src={f.url} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <div className="estudio-delivery-file__empty" />
                    )}
                    <p className="estudio-client-row__name">{f.nome}</p>
                    <p className="estudio-help">{formatBytes(f.tamanho)}</p>
                    {isVideoType(f.tipo) ? (
                      <label className="estudio-field estudio-delivery-file__category">
                        <span>Seção</span>
                        <select
                          value={f.categoria}
                          disabled={busy}
                          onChange={(event) => {
                            const next = event.target.value as DeliveryCategory
                            if (!session) return
                            void act(async () => {
                              await updateDeliveryFile(session, id, f.id, { categoria: next })
                              await load()
                            }, `Vídeo movido para ${CATEGORY_LABEL[next]}.`)
                          }}
                        >
                          <option value="stories">{CATEGORY_LABEL.stories}</option>
                          <option value="reels">{CATEGORY_LABEL.reels}</option>
                        </select>
                      </label>
                    ) : null}
                    <div className="estudio-actions">
                      <button
                        className="estudio-button-ghost"
                        type="button"
                        onClick={() => {
                          setError('')
                          fileUrl(f.id, 'baixar')
                            .then((url) => window.location.assign(url))
                            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não deu para baixar.'))
                        }}
                      >
                        Baixar
                      </button>
                      <button
                        className="estudio-button-ghost"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (!session || !window.confirm(`Apagar "${f.nome}"? O cliente deixa de ver este arquivo.`)) return
                          void act(async () => {
                            await deleteDeliveryFile(session, id, f.id)
                            await load()
                          }, 'Arquivo apagado.')
                        }}
                      >
                        Apagar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>

      <ShareCard titulo={entrega.titulo} link={entrega.link} expiraEm={entrega.expiraEm} live={entrega.estado === 'ativa'} />

      <DadosEntrega
        key={`${entrega.titulo}|${entrega.descricao}|${entrega.dataEvento}|${entrega.expiraEm}|${entrega.ativo}`}
        entrega={entrega}
        busy={busy}
        onSave={(input) =>
          act(async () => {
            if (!session) return
            await updateDelivery(session, id, input)
            await load()
          }, 'Entrega salva.')
        }
      />

      <section className="estudio-card">
        <h2>Mais opções</h2>
        <div className="estudio-actions">
          <button
            className="estudio-button-ghost"
            type="button"
            disabled={busy}
            onClick={() => {
              if (!session || !window.confirm('Gerar um link novo? O link antigo para de funcionar na hora.')) return
              void act(async () => {
                await renewDeliveryLink(session, id)
                await load()
              }, 'Link novo gerado. Envie de novo para o cliente.')
            }}
          >
            Gerar link novo
          </button>
          <button
            className="estudio-button-ghost estudio-button-danger"
            type="button"
            disabled={busy || uploading}
            onClick={() => {
              if (
                !session ||
                !window.confirm(`Apagar a entrega "${entrega.titulo}" e os ${arquivos.length} arquivo(s)? Não dá para desfazer.`)
              )
                return
              void act(async () => {
                await deleteDelivery(session, id)
                navigate('/estudio/entregas')
              }, 'Entrega apagada.')
            }}
          >
            Apagar entrega
          </button>
        </div>
      </section>
    </main>
  )
}

function DadosEntrega({
  entrega,
  busy,
  onSave,
}: {
  entrega: AdminDelivery
  busy: boolean
  onSave: (input: { titulo: string; descricao: string; dataEvento: string | null; expiraEm: string | null; ativo: boolean }) => Promise<void>
}) {
  const [titulo, setTitulo] = useState(entrega.titulo)
  const [descricao, setDescricao] = useState(entrega.descricao)
  const [dataEvento, setDataEvento] = useState(entrega.dataEvento ?? '')
  const [validity, setValidity] = useState(() => validityFromDate(entrega.expiraEm))
  const [ativo, setAtivo] = useState(entrega.ativo)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const expiraEm = validityToDate(validity)
    if (validity.preset === 'custom' && !expiraEm) {
      setError('Escolha a data de validade.')
      return
    }
    setError('')
    await onSave({ titulo, descricao, dataEvento: dataEvento || null, expiraEm, ativo })
  }

  return (
    <section className="estudio-card">
      <h2>Dados</h2>
      <form className="estudio-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="estudio-field">
          <span>Título</span>
          <input value={titulo} maxLength={200} onChange={(event) => setTitulo(event.target.value)} required />
        </label>
        <div className="estudio-grid estudio-grid--2">
          <label className="estudio-field">
            <span>Data do evento</span>
            <input type="date" value={dataEvento} onChange={(event) => setDataEvento(event.target.value)} />
          </label>
          <ValidityField value={validity} onChange={setValidity} />
        </div>
        {entrega.arquivosApagadosEm ? (
          <p className="estudio-help">
            Os arquivos desta entrega foram apagados depois do vencimento. Para reutilizar, aumente a validade e suba os
            arquivos de novo.
          </p>
        ) : (
          <p className="estudio-help">Depois de vencer, o link sai do ar e os arquivos são apagados 7 dias depois.</p>
        )}
        <label className="estudio-field">
          <span>Mensagem para o cliente</span>
          <textarea rows={3} maxLength={4000} value={descricao} onChange={(event) => setDescricao(event.target.value)} />
        </label>
        <label className="estudio-check">
          <input type="checkbox" checked={ativo} onChange={(event) => setAtivo(event.target.checked)} />
          Link no ar (desmarcado, ninguém consegue abrir a entrega)
        </label>
        {error ? <p className="estudio-error">{error}</p> : null}
        <div className="estudio-actions">
          <button className="estudio-button" type="submit" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </section>
  )
}
