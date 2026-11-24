import { randomBytes, randomUUID } from 'node:crypto'
import type { Request, Response, Router } from 'express'
import express from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_FILE_BYTES,
  categoryFor,
  cleanupCutoff,
  deliveryState,
  fileTypeFor,
  formatBytes,
  isDeliveryToken,
  isVideoCategory,
  isVideoType,
  parseDeliveryInput,
  safeFileName,
  type DeliveryCategory,
  todayInBrazil,
} from '../src/shared/delivery.js'
import { readBearerToken } from './estudioUsers.js'
import { matchesSyncToken } from './portalInput.js'
import { authorize, fail, loadClient, portalUrl, type ClientRow } from './portalRoutes.js'
import {
  SIGNED_URL_SECONDS,
  presignUpload,
  removeFiles,
  signGet,
  signGetMany,
  statUpload,
  type StorageKind,
  type StoredFile,
} from './deliveryStorage.js'
import { getSupabase } from './supabase.js'

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
  storage: StorageKind
  /** Capa do vídeo (JPEG no R2). */
  capa_path: string | null
  /** Seção na página do cliente. */
  categoria: DeliveryCategory
}

type ClientBrief = Pick<ClientRow, 'slug' | 'nome' | 'cor_principal' | 'cor_secundaria' | 'ativo'>

type DeliveryWithClient = DeliveryRow & { cliente: ClientBrief | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CLIENT_BRIEF = 'cliente:portal_clients(slug, nome, cor_principal, cor_secundaria, ativo)'

function newToken(): string {
  return randomBytes(18).toString('base64url')
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

/** `url` só vem para imagens; `capa` é a URL da capa do vídeo (primeiro frame limpo, gerado no envio). */
type FileExtras = { url?: string; capa?: string }

function mapFile(row: FileRow, extras: FileExtras = {}) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    tamanho: row.tamanho,
    // Antes da migration da categoria, a coluna não existe: deduz pelo tipo.
    categoria: row.categoria ?? categoryFor(row.tipo, undefined),
    criadoEm: row.created_at,
    ...Object.fromEntries(Object.entries(extras).filter(([, v]) => v !== undefined)),
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

/** Até quando as URLs assinadas agora valem (calculado antes de assinar, para nunca passar do real). */
function signedUntil(): string {
  return new Date(Date.now() + SIGNED_URL_SECONDS * 1000).toISOString()
}

/**
 * Assina só as imagens (fotos e capas dos vídeos). Vídeo nunca vem assinado na lista: a URL dele é pedida
 * no clique (rota .../url), senão cada vídeo ganharia uma URL nova a cada busca e o navegador baixaria de novo.
 */
/** Caminho da capa de um vídeo: fica no R2, ao lado do vídeo. */
function coverPathFor(file: FileRow): string {
  return `${file.path}.capa.jpg`
}

/** Tudo o que um arquivo ocupa no armazenamento (o próprio arquivo e, se for vídeo, a capa). */
function storedObjects(files: FileRow[]): StoredFile[] {
  return files.flatMap((f) => [
    { path: f.path, storage: f.storage },
    ...(f.capa_path ? [{ path: f.capa_path, storage: 'r2' as const }] : []),
  ])
}

/**
 * Lista para as telas. Assina só imagens: as fotos e as capas dos vídeos. Vídeo nunca vem assinado na lista:
 * a URL dele é pedida no clique (rota .../url), senão o navegador baixaria tudo de novo a cada busca.
 */
async function filesForView(files: FileRow[], forClient: boolean) {
  const urlsValidasAte = signedUntil()
  const photos = files.filter((f) => !isVideoType(f.tipo))
  const covers = files.flatMap((f) =>
    isVideoType(f.tipo) && f.capa_path ? [{ id: f.id, path: f.capa_path, storage: 'r2' as const }] : [],
  )
  const [photoUrls, coverUrls] = await Promise.all([signGetMany(photos), signGetMany(covers)])
  const photoById = new Map([...photoUrls].map(([file, url]) => [file.id, url]))
  const coverById = new Map([...coverUrls].map(([file, url]) => [file.id, url]))

  const arquivos = files
    // Foto que não deu para assinar (sumiu do armazenamento) não aparece para o cliente.
    .filter((f) => !forClient || isVideoType(f.tipo) || photoById.has(f.id))
    .map((f) => mapFile(f, { url: photoById.get(f.id), capa: coverById.get(f.id) }))
  return { arquivos, urlsValidasAte }
}

type UrlMode = 'assistir' | 'baixar'

function parseUrlMode(raw: unknown): UrlMode | null {
  return raw === 'assistir' || raw === 'baixar' ? raw : null
}

/** Uma URL só, gerada no clique: para assistir, ou forçando o download com o nome original. */
async function signOne(file: FileRow, mode: UrlMode) {
  const validaAte = signedUntil()
  const url = await signGet(file, mode === 'baixar' ? file.nome : undefined)
  return { url, validaAte }
}

async function loadFile(db: SupabaseClient, res: Response, deliveryId: string, rawFileId: unknown): Promise<FileRow | null> {
  const fileId = String(rawFileId)
  if (!UUID.test(fileId)) {
    res.status(400).json({ error: 'Arquivo inválido.' })
    return null
  }
  const { data, error } = await db
    .from('portal_delivery_files')
    .select('*')
    .eq('id', fileId)
    .eq('delivery_id', deliveryId)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    res.status(404).json({ error: 'Esse arquivo não existe.' })
    return null
  }
  return data as FileRow
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
    const { arquivos, urlsValidasAte } = await filesForView(files, false)
    res.json({ entrega: mapDelivery(req, delivery, { arquivos: files.length }), arquivos, urlsValidasAte })
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir a entrega.')
  }
}

/** URL de um arquivo, pedida no clique (assistir ou baixar). */
async function getFileUrl(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const mode = parseUrlMode(req.query.modo)
  if (!mode) {
    res.status(400).json({ error: 'Use modo=assistir ou modo=baixar.' })
    return
  }
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const file = await loadFile(db, res, delivery.id, req.params.fileId)
    if (!file) return
    res.set('Cache-Control', 'no-store')
    res.json(await signOne(file, mode))
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir o arquivo.')
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
    await removeFiles(storedObjects(files))
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
    // Envio novo vai sempre para o R2. O PUT precisa mandar exatamente os `headers` devolvidos.
    const { signedUrl, headers } = await presignUpload(path, tipo)
    res.json({ path, signedUrl, tipo, headers })
  } catch (cause) {
    fail(res, cause, 'Não deu para preparar o envio.')
  }
}

/** Passo 2 do envio: confere que o arquivo chegou ao Storage e registra na entrega. */
async function finishUpload(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const body = (req.body ?? {}) as { path?: unknown; nome?: unknown; categoria?: unknown }
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
    const info = await statUpload(path)
    if (!info) {
      res.status(409).json({ error: `"${nome}" não chegou ao armazenamento. Tente enviar de novo.` })
      return
    }
    const tamanho = info.size
    const tipo = fileTypeFor(path) ?? info.contentType ?? 'video/mp4'

    const { data, error } = await db
      .from('portal_delivery_files')
      .upsert(
        { delivery_id: delivery.id, path, nome, tipo, tamanho, storage: 'r2', categoria: categoryFor(tipo, body.categoria) },
        { onConflict: 'path' },
      )
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
    const file = await loadFile(db, res, delivery.id, req.params.fileId)
    if (!file) return
    await removeFiles(storedObjects([file]))
    const { error: deleteError } = await db.from('portal_delivery_files').delete().eq('id', file.id)
    if (deleteError) throw deleteError
    res.json({ ok: true })
  } catch (cause) {
    fail(res, cause, 'Não deu para apagar o arquivo.')
  }
}

/** Troca a seção de um vídeo (Stories ↔ Reels). Foto fica sempre em Fotos. */
async function updateFile(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  const categoria = (req.body as { categoria?: unknown } | undefined)?.categoria
  if (!isVideoCategory(categoria)) {
    res.status(400).json({ error: 'Use categoria "stories" ou "reels".' })
    return
  }
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const file = await loadFile(db, res, delivery.id, req.params.fileId)
    if (!file) return
    if (!isVideoType(file.tipo)) {
      res.status(400).json({ error: 'Foto fica sempre em Fotos.' })
      return
    }
    const { data, error } = await db
      .from('portal_delivery_files')
      .update({ categoria })
      .eq('id', file.id)
      .select('*')
      .single()
    if (error) throw error
    const [view] = (await filesForView([data as FileRow], false)).arquivos
    res.json({ arquivo: view })
  } catch (cause) {
    fail(res, cause, 'Não deu para mudar a seção do vídeo.')
  }
}

/** Capa do vídeo, passo 1: URL para o estúdio subir o JPEG direto no R2. */
async function startCoverUpload(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const file = await loadFile(db, res, delivery.id, req.params.fileId)
    if (!file) return
    if (!isVideoType(file.tipo)) {
      res.status(400).json({ error: 'Só vídeo tem capa.' })
      return
    }
    const path = coverPathFor(file)
    const { signedUrl, headers } = await presignUpload(path, 'image/jpeg')
    res.json({ path, signedUrl, headers })
  } catch (cause) {
    fail(res, cause, 'Não deu para preparar a capa.')
  }
}

/** Capa do vídeo, passo 2: confere que o JPEG chegou ao R2 e liga a capa ao vídeo. */
async function finishCoverUpload(req: Request, res: Response) {
  if (!(await authorize(req, res))) return
  try {
    const db = getSupabase()
    const delivery = await loadDelivery(db, res, req.params.id)
    if (!delivery) return
    const file = await loadFile(db, res, delivery.id, req.params.fileId)
    if (!file) return
    const path = coverPathFor(file)
    if (!(await statUpload(path))) {
      res.status(409).json({ error: 'A capa não chegou ao armazenamento.' })
      return
    }
    const { data, error } = await db
      .from('portal_delivery_files')
      .update({ capa_path: path })
      .eq('id', file.id)
      .select('*')
      .single()
    if (error) throw error
    const [view] = (await filesForView([data as FileRow], false)).arquivos
    res.json({ arquivo: view })
  } catch (cause) {
    fail(res, cause, 'Não deu para salvar a capa.')
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
  router.patch('/entregas/:id/arquivos/:fileId', run(updateFile))
  router.get('/entregas/:id/arquivos/:fileId/url', run(getFileUrl))
  router.post('/entregas/:id/arquivos/:fileId/capa/envio', run(startCoverUpload))
  router.post('/entregas/:id/arquivos/:fileId/capa', run(finishCoverUpload))
  router.get('/clientes/:slug/entregas', run(listForClient))
  router.post('/clientes/:slug/entregas', run(createDelivery))

  return router
}

// ---------------------------------------------------------------------------
// Público (/api/entregas): o link que o cliente recebe, e a limpeza diária
// ---------------------------------------------------------------------------

type OpenDelivery = { delivery: DeliveryWithClient; cliente: { nome: string; cores: { principal: string; secundaria: string } } }

/** Abre a entrega pelo token do link; responde 404/410 e devolve null se o link não vale. */
async function openPublic(db: SupabaseClient, res: Response, token: unknown): Promise<OpenDelivery | null> {
  if (!rejectBadToken(res, token)) return null
  const { data, error } = await db.from('portal_deliveries').select(`*, ${CLIENT_BRIEF}`).eq('token', token).maybeSingle()
  if (error) throw error
  const delivery = data as DeliveryWithClient | null
  if (!delivery || !delivery.cliente) {
    res.status(404).json({ error: 'Esse link não existe ou foi trocado por um novo. Peça o link atualizado para a Ana.' })
    return null
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
    return null
  }
  return { delivery, cliente }
}

/** Token com formato inválido nem chega no banco. */
function rejectBadToken(res: Response, token: unknown): token is string {
  if (isDeliveryToken(token)) return true
  res.status(404).json({ error: 'Esse link não existe.' })
  return false
}

function publicHeaders(res: Response) {
  res.set('Cache-Control', 'no-store')
  res.set('X-Robots-Tag', 'noindex')
}

async function publicView(req: Request, res: Response) {
  publicHeaders(res)
  if (!rejectBadToken(res, req.params.token)) return
  try {
    const db = getSupabase()
    const open = await openPublic(db, res, req.params.token)
    if (!open) return
    const { delivery, cliente } = open
    const files = await listFiles(db, delivery.id)
    const { arquivos, urlsValidasAte } = await filesForView(files, true)
    res.json({
      entrega: {
        titulo: delivery.titulo,
        descricao: delivery.descricao,
        dataEvento: delivery.data_evento,
        expiraEm: delivery.expira_em,
        criadaEm: delivery.created_at,
      },
      cliente,
      arquivos,
      urlsValidasAte,
    })
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir a entrega agora. Tente de novo em instantes.')
  }
}

/** URL de um arquivo do link, gerada só quando o cliente clica em assistir ou baixar. */
async function publicFileUrl(req: Request, res: Response) {
  publicHeaders(res)
  const mode = parseUrlMode(req.query.modo)
  if (!mode) {
    res.status(400).json({ error: 'Use modo=assistir ou modo=baixar.' })
    return
  }
  if (!rejectBadToken(res, req.params.token)) return
  try {
    const db = getSupabase()
    const open = await openPublic(db, res, req.params.token)
    if (!open) return
    const file = await loadFile(db, res, open.delivery.id, req.params.fileId)
    if (!file) return
    res.json(await signOne(file, mode))
  } catch (cause) {
    fail(res, cause, 'Não deu para abrir o arquivo agora. Tente de novo em instantes.')
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
      await removeFiles(storedObjects(files))
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
  router.get('/:token/arquivos/:fileId/url', (req, res) => {
    void publicFileUrl(req, res)
  })
  return router
}
