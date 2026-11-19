import { randomBytes, randomUUID } from 'node:crypto'
import type { Request, Response, Router } from 'express'
import express from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DELIVERY_BUCKET,
  MAX_FILE_BYTES,
  cleanupCutoff,
  deliveryState,
  fileTypeFor,
  formatBytes,
  isDeliveryToken,
  parseDeliveryInput,
  safeFileName,
  todayInBrazil,
} from '../src/shared/delivery'
import { readBearerToken } from './estudioUsers'
import { matchesSyncToken } from './portalInput'
import { authorize, fail, loadClient, portalUrl, type ClientRow } from './portalRoutes'
import { getSupabase } from './supabase'

type DeliveryRow = {
  id: string
  client_id: string
  token: string
  titulo: string
  descricao: string
  data_evento: string | null
  expira_em: string | null
  ativo: boolean
  arquivos_apagados_em: string | null
  created_at: string
  updated_at: string
}

type FileRow = {
  id: string
  delivery_id: string
  path: string
  nome: string
  tipo: string
  tamanho: number
  created_at: string
}

type ClientBrief = Pick<ClientRow, 'slug' | 'nome' | 'cor_principal' | 'cor_secundaria' | 'ativo'>

type DeliveryWithClient = DeliveryRow & { cliente: ClientBrief | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLIENT_BRIEF = 'cliente:portal_clients(slug, nome, cor_principal, cor_secundaria, ativo)'
/** Validade das URLs assinadas de visualização/download. */
const SIGNED_URL_SECONDS = 6 * 60 * 60

function newToken(): string {
  return randomBytes(18).toString('base64url')
}

function bucket(db: SupabaseClient) {
  return db.storage.from(DELIVERY_BUCKET)
}

function mapDelivery(req: Request, row: DeliveryWithClient | DeliveryRow, extra: { arquivos?: number } = {}) {
  const cliente = 'cliente' in row && row.cliente ? row.cliente : null
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    dataEvento: row.data_evento,
    expiraEm: row.expira_em,
    ativo: row.ativo,
    estado: deliveryState(row, todayInBrazil()),
    arquivosApagadosEm: row.arquivos_apagados_em,
    criadoEm: row.created_at,
    link: portalUrl(req, `/entrega/${row.token}`),
    ...(cliente
      ? { cliente: { slug: cliente.slug, nome: cliente.nome, cores: { principal: cliente.cor_principal, secundaria: cliente.cor_secundaria } } }
      : {}),
    ...extra,
  }
}

function mapFile(row: FileRow, urls?: { url: string; download: string }) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    tamanho: row.tamanho,
    criadoEm: row.created_at,
    ...(urls ?? {}),
  }
}

async function loadDelivery(db: SupabaseClient, res: Response, rawId: unknown): Promise<DeliveryWithClient | null> {
  if (typeof rawId !== 'string' || !UUID.test(rawId)) {
    res.status(400).json({ error: 'Entrega inválida.' })
    return null
  }
  const { data, error } = await db.from('portal_deliveries').select(`*, ${CLIENT_BRIEF}`).eq('id', rawId).maybeSingle()
  if (error) throw error
  if (!data) {
    res.status(404).json({ error: 'Essa entrega não existe.' })
    return null
  }
  return data as DeliveryWithClient
}

async function listFiles(db: SupabaseClient, deliveryId: string): Promise<FileRow[]> {
  const { data, error } = await db
    .from('portal_delivery_files')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as FileRow[]
}

/** URLs assinadas: uma para assistir, outra que força o download com o nome original. */
async function signFiles(db: SupabaseClient, files: FileRow[]) {
  const urls = new Map<string, { url: string; download: string }>()
  if (files.length === 0) return urls
  const { data, error } = await bucket(db).createSignedUrls(
    files.map((f) => f.path),
    SIGNED_URL_SECONDS,
  )
  if (error) throw error
  for (const item of data ?? []) {
    const file = files.find((f) => f.path === item.path)
    if (file && item.signedUrl) {
      urls.set(file.id, { url: item.signedUrl, download: `${item.signedUrl}&download=${encodeURIComponent(file.nome)}` })
    }
  }
  return urls
}

async function removeObjects(db: SupabaseClient, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket(db).remove(paths.slice(i, i + 100))
    if (error) throw error
  }
}

function deliveryCounts(rows: { delivery_id: string; tamanho: number }[]) {
  const counts = new Map<string, { arquivos: number; bytes: number }>()
  for (const r of rows) {
    const c = counts.get(r.delivery_id) ?? { arquivos: 0, bytes: 0 }
    c.arquivos += 1
    c.bytes += Number(r.tamanho)
    counts.set(r.delivery_id, c)
  }
  return counts
}

async function countsFor(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return new Map<string, { arquivos: number; bytes: number }>()
  const { data, error } = await db.from('portal_delivery_files').select('delivery_id, tamanho').in('delivery_id', ids)
  if (error) throw error
  return deliveryCounts((data ?? []) as { delivery_id: string; tamanho: number }[])
}

// ---------------------------------------------------------------------------
// Estúdio e ExPx (/api/portal)
// ---------------------------------------------------------------------------

async function listAll(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const { data, error } = await db
      .from('portal_deliveries')
      .select(`*, ${CLIENT_BRIEF}`)
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) throw error
    const rows = (data ?? []) as DeliveryWithClient[]
    const counts = await countsFor(db, rows.map((r) => r.id))
    res.json({ entregas: rows.map((r) => mapDelivery(req, r, { arquivos: counts.get(r.id)?.arquivos ?? 0 })) })
  } catch (cause) {
    fail(res, cause, 'Não deu para listar as entregas.')
  }
}

async function listForClient(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return
    const { data, error } = await db
      .from('portal_deliveries')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = (data ?? []) as DeliveryRow[]
    const counts = await countsFor(db, rows.map((r) => r.id))
    res.json({ entregas: rows.map((r) => mapDelivery(req, r, { arquivos: counts.get(r.id)?.arquivos ?? 0 })) })
  } catch (cause) {
    fail(res, cause, 'Não deu para listar as entregas do cliente.')
  }
}

async function createDelivery(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const parsed = parseDeliveryInput(req.body)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  try {
    const db = getSupabase()
    const client = await loadClient(db, res, req.params.slug)
    if (!client) return
    const input = parsed.value
    const { data, error } = await db
      .from('portal_deliveries')
      .insert({
        client_id: client.id,
        token: newToken(),
        titulo: input.titulo,
        descricao: input.descricao ?? '',
        data_evento: input.dataEvento ?? null,
        expira_em: input.expiraEm ?? null,
        ativo: input.ativo ?? true,
      })
      .select(`*, ${CLIENT_BRIEF}`)
      .single()
    if (error) throw error
    res.status(201).json({ entrega: mapDelivery(req, data as DeliveryWithClient, { arquivos: 0 }) })
  } catch (cause) {
    fail(res, cause, 'Não deu para criar a entrega.')
  }
}

async function getDelivery(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const files = await listFiles(db, delivery.id)
    const urls = await signFiles(db, files)
    res.json({
      entrega: mapDelivery(req, delivery, { arquivos: files.length }),
      arquivos: files.map((f) => mapFile(f, urls.get(f.id))),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir a entrega.')
  }
}

async function updateDelivery(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const parsed = parseDeliveryInput(req.body, true)
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error })
    return
  }
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const input = parsed.value
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.titulo !== undefined) patch.titulo = input.titulo
    if (input.descricao !== undefined) patch.descricao = input.descricao
    if (input.dataEvento !== undefined) patch.data_evento = input.dataEvento
    if (input.expiraEm !== undefined) patch.expira_em = input.expiraEm
    if (input.ativo !== undefined) patch.ativo = input.ativo
    const { data, error } = await db
      .from('portal_deliveries')
      .update(patch)
      .eq('id', delivery.id)
      .select(`*, ${CLIENT_BRIEF}`)
      .single()
    if (error) throw error
    res.json({ entrega: mapDelivery(req, data as DeliveryWithClient) })
  } catch (cause) {
    fail(res, cause, 'Não deu para salvar a entrega.')
  }
}

async function newLink(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const { data, error } = await db
      .from('portal_deliveries')
      .update({ token: newToken(), updated_at: new Date().toISOString() })
      .eq('id', delivery.id)
      .select(`*, ${CLIENT_BRIEF}`)
      .single()
    if (error) throw error
    res.json({ entrega: mapDelivery(req, data as DeliveryWithClient) })
  } catch (cause) {
    fail(res, cause, 'Não deu para gerar um link novo.')
  }
}

async function deleteDelivery(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const files = await listFiles(db, delivery.id)
    await removeObjects(db, files.map((f) => f.path))
    const { error } = await db.from('portal_deliveries').delete().eq('id', delivery.id)
    if (error) throw error
    res.json({ ok: true, arquivosApagados: files.length })
  } catch (cause) {
    fail(res, cause, 'Não deu para apagar a entrega.')
  }
}

/** Passo 1 do envio: devolve uma URL assinada para o navegador (ou o ExPx) subir o arquivo direto no Storage. */
async function startUpload(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const body = (req.body ?? {}) as { nome?: unknown; tamanho?: unknown }
  const nome = typeof body.nome === 'string' ? body.nome.trim().slice(0, 200) : ''
  const tamanho = typeof body.tamanho === 'number' ? body.tamanho : NaN
  const tipo = fileTypeFor(nome)
  if (!nome || !tipo) {
    res.status(400).json({ error: `"${nome || 'arquivo'}": envie vídeo (mp4, mov, webm) ou foto (jpg, png, webp, heic).` })
    return
  }
  if (!Number.isFinite(tamanho) || tamanho <= 0) {
    res.status(400).json({ error: 'Informe o tamanho do arquivo em bytes.' })
    return
  }
  if (tamanho > MAX_FILE_BYTES) {
    res.status(413).json({ error: `"${nome}" tem ${formatBytes(tamanho)}; o limite é ${formatBytes(MAX_FILE_BYTES)}.` })
    return
  }
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const path = `${delivery.client_id}/${delivery.id}/${randomUUID().slice(0, 8)}-${safeFileName(nome)}`
    const { data, error } = await bucket(db).createSignedUploadUrl(path)
    if (error) throw error
    res.json({ path, token: data.token, signedUrl: data.signedUrl, tipo })
  } catch (cause) {
    fail(res, cause, 'Não deu para preparar o envio.')
  }
}

/** Passo 2 do envio: confere que o arquivo chegou ao Storage e registra na entrega. */
async function finishUpload(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const body = (req.body ?? {}) as { path?: unknown; nome?: unknown }
  const path = typeof body.path === 'string' ? body.path : ''
  const nome = typeof body.nome === 'string' ? body.nome.trim().slice(0, 200) : ''
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    if (!nome || !path.startsWith(`${delivery.client_id}/${delivery.id}/`) || path.includes('..')) {
      res.status(400).json({ error: 'Arquivo inválido para esta entrega.' })
      return
    }
    const { data: info, error: infoError } = await bucket(db).info(path)
    if (infoError || !info) {
      res.status(409).json({ error: `"${nome}" não chegou ao armazenamento. Tente enviar de novo.` })
      return
    }
    const meta = info as { size?: number; contentType?: string; metadata?: { size?: number; mimetype?: string } }
    const tamanho = Number(meta.size ?? meta.metadata?.size ?? 0)
    const tipo = fileTypeFor(path) ?? meta.contentType ?? meta.metadata?.mimetype ?? 'video/mp4'

    const { data, error } = await db
      .from('portal_delivery_files')
      .upsert({ delivery_id: delivery.id, path, nome, tipo, tamanho }, { onConflict: 'path' })
      .select('*')
      .single()
    if (error) throw error
    if (delivery.arquivos_apagados_em) {
      // Arquivo novo numa entrega que tinha sido limpa: volta a valer.
      await db.from('portal_deliveries').update({ arquivos_apagados_em: null }).eq('id', delivery.id)
    }
    res.status(201).json({ arquivo: mapFile(data as FileRow) })
  } catch (cause) {
    fail(res, cause, 'Não deu para registrar o arquivo.')
  }
}

async function deleteFile(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const fileId = String(req.params.fileId)
    if (!UUID.test(fileId)) {
      res.status(400).json({ error: 'Arquivo inválido.' })
      return
    }
    const { data, error } = await db
      .from('portal_delivery_files')
      .select('*')
      .eq('id', fileId)
      .eq('delivery_id', delivery.id)
      .maybeSingle()
    if (error) throw error
    if (!data) {
      res.status(404).json({ error: 'Esse arquivo não existe.' })
      return
    }
    const file = data as FileRow
    await removeObjects(db, [file.path])
    const { error: deleteError } = await db.from('portal_delivery_files').delete().eq('id', file.id)
    if (deleteError) throw deleteError
    res.json({ ok: true })
  } catch (cause) {
    fail(res, cause, 'Não deu para apagar o arquivo.')
  }
}

export function deliveryAdminRouter(): Router {
  const router = express.Router()
  const run = (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => {
    void handler(req, res)
  }

  router.get('/entregas', run(listAll))
  router.get('/entregas/:id', run(getDelivery))
  router.patch('/entregas/:id', run(updateDelivery))
  router.delete('/entregas/:id', run(deleteDelivery))
  router.post('/entregas/:id/link', run(newLink))
  router.post('/entregas/:id/arquivos/envio', run(startUpload))
  router.post('/entregas/:id/arquivos', run(finishUpload))
  router.delete('/entregas/:id/arquivos/:fileId', run(deleteFile))
  router.get('/clientes/:slug/entregas', run(listForClient))
  router.post('/clientes/:slug/entregas', run(createDelivery))

  return router
}

// ---------------------------------------------------------------------------
// Público (/api/entregas): o link que o cliente recebe, e a limpeza diária
// ---------------------------------------------------------------------------

async function publicView(req: Request, res: Response) {
  res.set('Cache-Control', 'no-store')
  res.set('X-Robots-Tag', 'noindex')
  const token = req.params.token
  if (!isDeliveryToken(token)) {
    res.status(404).json({ error: 'Esse link não existe.' })
    return
  }
  try {
    const db = getSupabase()
    const { data, error } = await db.from('portal_deliveries').select(`*, ${CLIENT_BRIEF}`).eq('token', token).maybeSingle()
    if (error) throw error
    const delivery = data as DeliveryWithClient | null
    if (!delivery || !delivery.cliente) {
      res.status(404).json({ error: 'Esse link não existe ou foi trocado por um novo. Peça o link atualizado para a Ana.' })
      return
    }
    const estado = deliveryState(delivery, todayInBrazil())
    const cliente = {
      nome: delivery.cliente.nome,
      cores: { principal: delivery.cliente.cor_principal, secundaria: delivery.cliente.cor_secundaria },
    }
    if (estado !== 'ativa' || !delivery.cliente.ativo) {
      const expired = estado === 'expirada' || estado === 'apagada'
      res.status(expired ? 410 : 404).json({
        error: expired
          ? 'Esse link venceu. Se ainda precisar dos vídeos, fale com a Ana.'
          : 'Esse link está desligado no momento. Fale com a Ana.',
        cliente,
      })
      return
    }
    const files = await listFiles(db, delivery.id)
    const urls = await signFiles(db, files)
    res.json({
      entrega: {
        titulo: delivery.titulo,
        descricao: delivery.descricao,
        dataEvento: delivery.data_evento,
        expiraEm: delivery.expira_em,
      },
      cliente,
      arquivos: files.filter((f) => urls.has(f.id)).map((f) => mapFile(f, urls.get(f.id))),
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir a entrega agora. Tente de novo em instantes.')
  }
}

/** Chamado pelo cron da Vercel. Apaga os arquivos de entregas vencidas há mais de 7 dias. */
async function cleanup(req: Request, res: Response) {
  if (!matchesSyncToken(readBearerToken(req.headers.authorization), process.env.CRON_SECRET)) {
    res.status(401).json({ error: 'Sem permissão.' })
    return
  }
  try {
    const db = getSupabase()
    const cutoff = cleanupCutoff(todayInBrazil())
    const { data, error } = await db
      .from('portal_deliveries')
      .select('id')
      .lt('expira_em', cutoff)
      .is('arquivos_apagados_em', null)
      .limit(50)
    if (error) throw error
    let arquivos = 0
    for (const { id } of (data ?? []) as { id: string }[]) {
      const files = await listFiles(db, id)
      await removeObjects(db, files.map((f) => f.path))
      const { error: delError } = await db.from('portal_delivery_files').delete().eq('delivery_id', id)
      if (delError) throw delError
      const { error: updError } = await db
        .from('portal_deliveries')
        .update({ arquivos_apagados_em: new Date().toISOString() })
        .eq('id', id)
      if (updError) throw updError
      arquivos += files.length
    }
    res.json({ ok: true, entregas: (data ?? []).length, arquivos })
  } catch (cause) {
    fail(res, cause, 'A limpeza falhou.')
  }
}

export function deliveryPublicRouter(): Router {
  const router = express.Router()
  router.get('/limpeza', (req, res) => {
    void cleanup(req, res)
  })
  router.get('/:token', (req, res) => {
    void publicView(req, res)
  })
  return router
}
