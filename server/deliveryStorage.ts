import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DELIVERY_BUCKET } from '../src/shared/delivery.js'
import { getSupabase } from './supabase.js'

/**
 * Onde ficam os arquivos das entregas.
 * - `r2`: Cloudflare R2 (todo envio novo). Sem limite de 50 MB por arquivo e banda grátis.
 * - `supabase`: bucket privado "entregas" do Supabase (arquivos enviados antes da troca; só leitura e remoção).
 * As URLs do R2 são assinadas localmente (HMAC), sem ida à rede.
 */
export type StorageKind = 'supabase' | 'r2'

export type StoredFile = { path: string; storage: StorageKind }

/** Validade das URLs assinadas de visualização/download. */
export const SIGNED_URL_SECONDS = 6 * 60 * 60
/** Validade da URL de envio: dá tempo de subir um arquivo grande numa conexão lenta. */
const UPLOAD_URL_SECONDS = 6 * 60 * 60
/** O path de cada envio é único e o arquivo nunca muda: cache de um ano. */
export const UPLOAD_CACHE_CONTROL = 'max-age=31536000'

let r2: { client: S3Client; bucket: string } | null = null

function getR2() {
  if (r2) return r2
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('Missing R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY or R2_BUCKET')
  }
  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // O R2 não aceita os checksums que o SDK passou a mandar por padrão.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  })
  r2 = { client, bucket }
  return r2
}

function supabaseBucket() {
  return getSupabase().storage.from(DELIVERY_BUCKET)
}

/** "Stories 01.mov" → cabeçalho que força o download com o nome original (acentos inclusos). */
function attachment(nome: string): string {
  const ascii = nome.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`
}

/** URL assinada para assistir ou, com `download`, para baixar com o nome original. */
export async function signGet(file: StoredFile, download?: string): Promise<string> {
  if (file.storage === 'r2') {
    const { client, bucket } = getR2()
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: file.path,
        ...(download ? { ResponseContentDisposition: attachment(download) } : {}),
      }),
      { expiresIn: SIGNED_URL_SECONDS },
    )
  }
  const { data, error } = await supabaseBucket().createSignedUrl(
    file.path,
    SIGNED_URL_SECONDS,
    download ? { download } : undefined,
  )
  if (error) throw error
  return data.signedUrl
}

/** Várias URLs de uma vez (fotos e capas da lista). Arquivo que não deu para assinar fica de fora. */
export async function signGetMany<T extends StoredFile>(files: T[]): Promise<Map<T, string>> {
  const urls = new Map<T, string>()
  const legacy = files.filter((f) => f.storage !== 'r2')
  for (const f of files) {
    if (f.storage === 'r2') urls.set(f, await signGet(f))
  }
  if (legacy.length > 0) {
    const { data, error } = await supabaseBucket().createSignedUrls(
      legacy.map((f) => f.path),
      SIGNED_URL_SECONDS,
    )
    if (error) throw error
    const byPath = new Map(legacy.map((f) => [f.path, f]))
    for (const item of data ?? []) {
      const file = item.path ? byPath.get(item.path) : undefined
      if (file && item.signedUrl) urls.set(file, item.signedUrl)
    }
  }
  return urls
}

/**
 * URL para o navegador (ou o ExPx) subir o arquivo direto no R2 com um PUT.
 * Os `headers` entram na assinatura: o PUT precisa mandar exatamente esses.
 */
export async function presignUpload(path: string, contentType: string) {
  const { client, bucket } = getR2()
  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType, CacheControl: UPLOAD_CACHE_CONTROL }),
    { expiresIn: UPLOAD_URL_SECONDS, signableHeaders: new Set(['content-type', 'cache-control']) },
  )
  return { signedUrl, headers: { 'content-type': contentType, 'cache-control': UPLOAD_CACHE_CONTROL } }
}

/** Confere que o arquivo chegou. null = não está lá. */
export async function statUpload(path: string): Promise<{ size: number; contentType?: string } | null> {
  const { client, bucket } = getR2()
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: path }))
    return { size: Number(head.ContentLength ?? 0), contentType: head.ContentType }
  } catch (cause) {
    if (cause instanceof S3ServiceException && (cause.$metadata.httpStatusCode === 404 || cause.name === 'NotFound')) {
      return null
    }
    throw cause
  }
}

/** Apaga os arquivos, cada um no armazenamento em que está. */
export async function removeFiles(files: StoredFile[]) {
  const r2Paths = files.filter((f) => f.storage === 'r2').map((f) => f.path)
  const legacyPaths = files.filter((f) => f.storage !== 'r2').map((f) => f.path)

  for (let i = 0; i < legacyPaths.length; i += 100) {
    const { error } = await supabaseBucket().remove(legacyPaths.slice(i, i + 100))
    if (error) throw error
  }

  if (r2Paths.length === 0) return
  const { client, bucket } = getR2()
  for (let i = 0; i < r2Paths.length; i += 1000) {
    const result = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: r2Paths.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }),
    )
    if (result.Errors?.length) {
      throw new Error(`R2 não apagou ${result.Errors.length} arquivo(s): ${result.Errors[0]?.Message ?? ''}`)
    }
  }
}
