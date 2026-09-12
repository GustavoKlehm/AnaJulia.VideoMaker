import { useState } from 'react'
import { useCms } from '../../content/cmsContext'
import { saveSiteSettings } from '../../content/cmsSave'
import { getHeroMediaId } from '../../content/mediaLibrary'
import type { SiteContent } from '../../content/types'
import { getSupabase } from '../../lib/supabase'
import { RouteLink } from '../../components/RouteLink'
import './estudio.css'

export function EstudioPaginaHome() {
  const { site, refresh } = useCms()
  const [draft, setDraft] = useState<SiteContent>(() => structuredClone(site))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      const client = getSupabase()
      const heroMediaId = await getHeroMediaId(client)
      await saveSiteSettings(client, draft, heroMediaId)
      await refresh()
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para salvar a home.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Páginas</p>
        <h1>Home</h1>
        <p className="estudio-help">
          O vídeo do hero se troca em <RouteLink to="/estudio/materiais">Materiais</RouteLink>.
        </p>
      </div>

      <section className="estudio-card">
        <h2>Abertura</h2>
        <label className="estudio-field">
          <span>Linha de ofício</span>
          <input
            value={draft.rolesLine}
            onChange={(event) => setDraft({ ...draft, rolesLine: event.target.value })}
          />
        </label>
        <label className="estudio-field">
          <span>Slogan — linha 1</span>
          <input
            value={draft.sloganLines[0]}
            onChange={(event) =>
              setDraft({
                ...draft,
                sloganLines: [event.target.value, draft.sloganLines[1]],
                slogan: `${event.target.value} ${draft.sloganLines[1]}`.trim(),
              })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Slogan — linha 2</span>
          <input
            value={draft.sloganLines[1]}
            onChange={(event) =>
              setDraft({
                ...draft,
                sloganLines: [draft.sloganLines[0], event.target.value],
                slogan: `${draft.sloganLines[0]} ${event.target.value}`.trim(),
              })
            }
          />
        </label>
      </section>

      <section className="estudio-card">
        <h2>Sobre</h2>
        <label className="estudio-field">
          <span>Título</span>
          <input
            value={draft.about.heading}
            onChange={(event) =>
              setDraft({ ...draft, about: { ...draft.about, heading: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Primeiro parágrafo</span>
          <textarea
            value={draft.about.p1}
            onChange={(event) =>
              setDraft({ ...draft, about: { ...draft.about, p1: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Segundo parágrafo</span>
          <textarea
            value={draft.about.p2}
            onChange={(event) =>
              setDraft({ ...draft, about: { ...draft.about, p2: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Botão para planos</span>
          <input
            value={draft.about.ctaLabel}
            onChange={(event) =>
              setDraft({ ...draft, about: { ...draft.about, ctaLabel: event.target.value } })
            }
          />
        </label>
      </section>

      <section className="estudio-card">
        <h2>Contato</h2>
        <label className="estudio-field">
          <span>Título</span>
          <input
            value={draft.contactCopy.heading}
            onChange={(event) =>
              setDraft({
                ...draft,
                contactCopy: { ...draft.contactCopy, heading: event.target.value },
              })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Convite (use Enter para quebrar linha)</span>
          <textarea
            value={draft.contactCopy.lead}
            onChange={(event) =>
              setDraft({
                ...draft,
                contactCopy: { ...draft.contactCopy, lead: event.target.value },
              })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Convite do Instagram</span>
          <textarea
            value={draft.contactCopy.instagramLead}
            onChange={(event) =>
              setDraft({
                ...draft,
                contactCopy: { ...draft.contactCopy, instagramLead: event.target.value },
              })
            }
          />
        </label>
        <label className="estudio-field">
          <span>WhatsApp (só números, com DDI)</span>
          <input
            value={draft.whatsappPhone}
            onChange={(event) => setDraft({ ...draft, whatsappPhone: event.target.value })}
          />
        </label>
        <label className="estudio-field">
          <span>Mensagem do WhatsApp na home</span>
          <textarea
            value={draft.messages.home}
            onChange={(event) =>
              setDraft({ ...draft, messages: { ...draft.messages, home: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Mensagem ao escolher um plano — use {'{name}'}</span>
          <textarea
            value={draft.messages.plan}
            onChange={(event) =>
              setDraft({ ...draft, messages: { ...draft.messages, plan: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Mensagem do personalizado</span>
          <textarea
            value={draft.messages.custom}
            onChange={(event) =>
              setDraft({ ...draft, messages: { ...draft.messages, custom: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Mensagem do CTA de planos</span>
          <textarea
            value={draft.messages.planosCta}
            onChange={(event) =>
              setDraft({
                ...draft,
                messages: { ...draft.messages, planosCta: event.target.value },
              })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Instagram</span>
          <input
            value={draft.instagramUrl}
            onChange={(event) => setDraft({ ...draft, instagramUrl: event.target.value })}
          />
        </label>
        <label className="estudio-field">
          <span>Direct</span>
          <input
            value={draft.instagramDmUrl}
            onChange={(event) => setDraft({ ...draft, instagramDmUrl: event.target.value })}
          />
        </label>
      </section>

      <section className="estudio-card">
        <h2>Planos — textos da página</h2>
        <label className="estudio-field">
          <span>Olho</span>
          <input
            value={draft.planos.eyebrow}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, eyebrow: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Título</span>
          <input
            value={draft.planos.heading}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, heading: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Lead</span>
          <textarea
            value={draft.planos.lead}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, lead: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Adicionais</span>
          <textarea
            value={draft.planos.addonsLead}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, addonsLead: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Título das peças</span>
          <input
            value={draft.planos.piecesHeading}
            onChange={(event) =>
              setDraft({
                ...draft,
                planos: { ...draft.planos, piecesHeading: event.target.value },
              })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Lead das peças</span>
          <textarea
            value={draft.planos.piecesLead}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, piecesLead: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Título das regras</span>
          <input
            value={draft.planos.rulesTitle}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, rulesTitle: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Lead das regras</span>
          <textarea
            value={draft.planos.rulesLead}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, rulesLead: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>CTA final</span>
          <input
            value={draft.planos.ctaHeading}
            onChange={(event) =>
              setDraft({ ...draft, planos: { ...draft.planos, ctaHeading: event.target.value } })
            }
          />
        </label>
      </section>

      <section className="estudio-card">
        <h2>SEO</h2>
        <label className="estudio-field">
          <span>Título da aba</span>
          <input
            value={draft.seo.title}
            onChange={(event) =>
              setDraft({ ...draft, seo: { ...draft.seo, title: event.target.value } })
            }
          />
        </label>
        <label className="estudio-field">
          <span>Descrição</span>
          <textarea
            value={draft.seo.description}
            onChange={(event) =>
              setDraft({ ...draft, seo: { ...draft.seo, description: event.target.value } })
            }
          />
        </label>
        <label className="estudio-check">
          <input
            type="checkbox"
            checked={draft.showStories}
            onChange={(event) => setDraft({ ...draft, showStories: event.target.checked })}
          />
          Mostrar capítulos de Histórias na home
        </label>
      </section>

      {error ? <p className="estudio-error">{error}</p> : null}
      {saved ? <p className="estudio-status">No ar.</p> : null}
      <div className="estudio-actions">
        <button className="estudio-button" type="button" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar home'}
        </button>
      </div>
    </main>
  )
}
