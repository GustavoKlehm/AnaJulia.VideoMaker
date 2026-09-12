import { useEffect, useState } from 'react'
import { useCms } from '../../content/cmsContext'
import {
  getHeroMediaId,
  listMedia,
  setHeroMedia,
  uploadMedia,
} from '../../content/mediaLibrary'
import type { MediaAssetRow } from '../../content/types'
import { getSupabase } from '../../lib/supabase'
import './estudio.css'

export function EstudioMateriais() {
  const { refresh } = useCms()
  const [assets, setAssets] = useState<MediaAssetRow[]>([])
  const [heroId, setHeroId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function load() {
    const client = getSupabase()
    const [media, currentHero] = await Promise.all([listMedia(client), getHeroMediaId(client)])
    setAssets(media)
    setHeroId(currentHero)
  }

  useEffect(() => {
    void load().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Não deu para abrir a biblioteca.')
    })
  }, [])

  async function handleUpload(file: File | undefined, folder: 'library' | 'hero') {
    if (!file) {
      return
    }
    setBusy(true)
    setError('')
    setStatus('Enviando…')
    try {
      const client = getSupabase()
      const row = await uploadMedia(client, file, folder)
      if (folder === 'hero') {
        await setHeroMedia(client, row.id)
      }
      await load()
      await refresh()
      setStatus(folder === 'hero' ? 'Hero no ar.' : 'Arquivo na biblioteca.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'O envio falhou.')
      setStatus('')
    } finally {
      setBusy(false)
    }
  }

  async function handleUseAsHero(id: number) {
    setBusy(true)
    setError('')
    try {
      await setHeroMedia(getSupabase(), id)
      await load()
      await refresh()
      setStatus('Hero no ar.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para trocar o hero.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Biblioteca</p>
        <h1>Materiais</h1>
        <p className="estudio-help">Vídeo e imagem ficam no Storage. Salvar já publica.</p>
      </div>

      <section className="estudio-card">
        <h2>Enviar</h2>
        <label className="estudio-field">
          <span>Para a biblioteca</span>
          <input
            type="file"
            accept="image/*,video/*"
            disabled={busy}
            onChange={(event) => {
              void handleUpload(event.target.files?.[0], 'library')
              event.target.value = ''
            }}
          />
        </label>
        <label className="estudio-field">
          <span>Substituir o hero</span>
          <input
            type="file"
            accept="video/*"
            disabled={busy}
            onChange={(event) => {
              void handleUpload(event.target.files?.[0], 'hero')
              event.target.value = ''
            }}
          />
        </label>
      </section>

      <section className="estudio-card">
        <h2>Arquivos</h2>
        <div className="estudio-media-list">
          {assets.map((asset) => (
            <article className="estudio-media" key={asset.id}>
              {asset.kind === 'video' ? (
                <video src={asset.public_url} muted playsInline controls preload="metadata" />
              ) : (
                <img src={asset.public_url} alt={asset.alt || asset.title || ''} />
              )}
              <p>{asset.title || asset.path}</p>
              {heroId === asset.id ? (
                <p className="estudio-status">Hero atual</p>
              ) : (
                <button
                  className="estudio-button-ghost"
                  type="button"
                  disabled={busy || asset.kind !== 'video'}
                  onClick={() => void handleUseAsHero(asset.id)}
                >
                  Usar no hero
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      {error ? <p className="estudio-error">{error}</p> : null}
      {status ? <p className="estudio-status">{status}</p> : null}
    </main>
  )
}
