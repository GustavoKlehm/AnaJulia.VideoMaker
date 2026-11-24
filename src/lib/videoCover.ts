/**
 * Capa de vídeo: tira um JPEG do primeiro frame "limpo" do vídeo, no próprio navegador.
 *
 * Muitos vídeos começam com tela preta (fade) ou um frame liso; por isso testa alguns pontos do começo
 * e fica com o primeiro que tem imagem de verdade (nem escuro/claro demais, com alguma variação).
 * Com um File (no envio) tudo acontece no aparelho, sem baixar nada. Com uma URL, o servidor do arquivo
 * precisa liberar CORS (R2 e Supabase liberam), senão o navegador não deixa ler o frame.
 */

/** Pontos (em segundos) testados em ordem, do começo do vídeo. */
const CANDIDATE_SECONDS = [0.05, 0.4, 1, 2, 3.5, 5]
const MAX_WIDTH = 720
const JPEG_QUALITY = 0.82
const TIMEOUT_MS = 30_000

/** Notas de um frame reduzido: brilho médio e variação (desvio padrão) em 0–255. */
export type FrameStats = { mean: number; spread: number }

/** Frame "limpo": não é quase preto, nem quase branco, nem uma cor lisa. */
export function isCleanFrame({ mean, spread }: FrameStats): boolean {
  return mean > 28 && mean < 235 && spread > 14
}

/** Calcula brilho e variação a partir dos pixels RGBA. */
export function frameStats(pixels: Uint8ClampedArray): FrameStats {
  let sum = 0
  let sumSquares = 0
  const count = pixels.length / 4
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]
    sum += luma
    sumSquares += luma * luma
  }
  const mean = count ? sum / count : 0
  const spread = count ? Math.sqrt(Math.max(0, sumSquares / count - mean * mean)) : 0
  return { mean, spread }
}

function waitFor(video: HTMLVideoElement, event: 'loadeddata' | 'seeked'): Promise<void> {
  return new Promise((resolve, reject) => {
    function done() {
      cleanup()
      resolve()
    }
    function failed() {
      cleanup()
      reject(new Error('vídeo não abriu'))
    }
    function cleanup() {
      video.removeEventListener(event, done)
      video.removeEventListener('error', failed)
    }
    video.addEventListener(event, done, { once: true })
    video.addEventListener('error', failed, { once: true })
  })
}

async function seek(video: HTMLVideoElement, seconds: number) {
  if (Math.abs(video.currentTime - seconds) < 0.01 && video.readyState >= 2) return
  const seeked = waitFor(video, 'seeked')
  video.currentTime = seconds
  await seeked
}

function measure(video: HTMLVideoElement, probe: CanvasRenderingContext2D): FrameStats {
  const { width, height } = probe.canvas
  probe.drawImage(video, 0, 0, width, height)
  return frameStats(probe.getImageData(0, 0, width, height).data)
}

function toJpeg(video: HTMLVideoElement): Promise<Blob | null> {
  const width = Math.min(MAX_WIDTH, video.videoWidth)
  const height = Math.round((video.videoHeight / video.videoWidth) * width)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(video, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
}

async function capture(video: HTMLVideoElement): Promise<Blob | null> {
  await waitFor(video, 'loadeddata')
  if (!video.videoWidth || !video.videoHeight) return null

  const probeCanvas = document.createElement('canvas')
  probeCanvas.width = 32
  probeCanvas.height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * 32))
  const probe = probeCanvas.getContext('2d', { willReadFrequently: true })
  if (!probe) return null

  const duration = Number.isFinite(video.duration) ? video.duration : 0
  const times = CANDIDATE_SECONDS.filter((t) => !duration || t < duration - 0.05)
  if (times.length === 0) times.push(0)

  // Se nenhum ponto for "limpo", fica o que tem mais variação (o menos parecido com tela lisa).
  let best = { time: times[0], spread: -1 }
  for (const time of times) {
    await seek(video, time)
    const stats = measure(video, probe)
    if (isCleanFrame(stats)) return toJpeg(video)
    if (stats.spread > best.spread) best = { time, spread: stats.spread }
  }
  await seek(video, best.time)
  return toJpeg(video)
}

/**
 * JPEG da capa, ou null se o navegador não conseguir abrir o vídeo (ex.: formato que ele não toca)
 * ou demorar demais. Nunca lança erro: a capa é opcional.
 */
export async function captureVideoCover(source: File | string): Promise<Blob | null> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source)
  if (typeof source === 'string') video.crossOrigin = 'anonymous'
  video.src = objectUrl ?? (source as string)

  let timer = 0
  try {
    return await Promise.race([
      capture(video),
      new Promise<null>((resolve) => {
        timer = window.setTimeout(() => resolve(null), TIMEOUT_MS)
      }),
    ])
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
    // Solta o vídeo: para de baixar (URL) e libera a memória (File).
    video.removeAttribute('src')
    video.load()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}
