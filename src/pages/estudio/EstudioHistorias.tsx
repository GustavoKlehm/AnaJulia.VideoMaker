import { useEffect, useState } from 'react'
import { useCms } from '../../content/cmsContext'
import { saveStories } from '../../content/cmsSave'
import { getStoryMediaIds, listMedia } from '../../content/mediaLibrary'
import type { MediaAssetRow, SiteContent } from '../../content/types'
import { getSupabase } from '../../lib/supabase'
import { RouteLink } from '../../components/RouteLink'
import './estudio.css'

export function EstudioHistorias() {
  const { site, refresh } = useCms()
  const [draft, setDraft] = useState<SiteContent['stories']>(() => structuredClone(site.stories))
  const [mediaIds, setMediaIds] = useState<Record<string, number | null>>({})
  const [assets, setAssets] = useState<MediaAssetRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const client = getSupabase()
        const [ids, media] = await Promise.all([getStoryMediaIds(client), listMedia(client)])
        setMediaIds(ids)
        setAssets(media)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não deu para carregar as mídias.')
      }
    })()
  }, [])

  async function handleSave() {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await saveStories(getSupabase(), draft, mediaIds)
      await refresh()
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para salvar as histórias.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Home</p>
        <h1>Histórias</h1>
        <p className="estudio-help">
          Envie arquivos em <RouteLink to="/estudio/materiais">Materiais</RouteLink> e ligue os
          capítulos na Home.
        </p>
      </div>

      {draft.map((story, index) => (
        <section className="estudio-card" key={story.id}>
          <h2>{story.title}</h2>
          <label className="estudio-field">
            <span>Título</span>
            <input
              value={story.title}
              onChange={(event) => {
                const next = structuredClone(draft)
                next[index].title = event.target.value
                setDraft(next)
              }}
            />
          </label>
          <label className="estudio-field">
            <span>Lead</span>
            <textarea
              value={story.lead}
              onChange={(event) => {
                const next = structuredClone(draft)
                next[index].lead = event.target.value
                setDraft(next)
              }}
            />
          </label>
          <label className="estudio-field">
            <span>Material</span>
            <select
              value={mediaIds[story.id] ?? ''}
              onChange={(event) =>
                setMediaIds((current) => ({
                  ...current,
                  [story.id]: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">Sem mídia</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.title || asset.path || asset.public_url}
                </option>
              ))}
            </select>
          </label>
        </section>
      ))}

      {error ? <p className="estudio-error">{error}</p> : null}
      {saved ? <p className="estudio-status">No ar.</p> : null}
      <div className="estudio-actions">
        <button className="estudio-button" type="button" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar histórias'}
        </button>
      </div>
    </main>
  )
}
