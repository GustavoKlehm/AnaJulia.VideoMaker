import { useState, type Dispatch, type SetStateAction } from 'react'
import { useCms } from '../../content/cmsContext'
import { savePricing, slugify } from '../../content/cmsSave'
import type { PricingCatalog } from '../../content/types'
import { getSupabase } from '../../lib/supabase'
import './estudio.css'

export function EstudioCatalogo() {
  const { pricing, refresh } = useCms()
  const [draft, setDraft] = useState<PricingCatalog>(() => structuredClone(pricing))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setBusy(true)
    setError('')
    setSaved(false)
    try {
      await savePricing(getSupabase(), draft)
      await refresh()
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não deu para salvar o catálogo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="estudio-page">
      <div>
        <p className="estudio-kicker">Catálogo</p>
        <h1>Planos e valores</h1>
        <p className="estudio-help">Salvar já publica no site.</p>
      </div>

      {draft.lines.map((line, lineIndex) => (
        <section className="estudio-card" key={line.id}>
          <h2>{line.title}</h2>
          <label className="estudio-field">
            <span>Título</span>
            <input
              value={line.title}
              onChange={(event) =>
                updateLine(setDraft, lineIndex, { title: event.target.value })
              }
            />
          </label>
          <label className="estudio-field">
            <span>Promessa</span>
            <input
              value={line.promise}
              onChange={(event) =>
                updateLine(setDraft, lineIndex, { promise: event.target.value })
              }
            />
          </label>
          <label className="estudio-field">
            <span>Texto da linha</span>
            <textarea
              value={line.lead}
              onChange={(event) =>
                updateLine(setDraft, lineIndex, { lead: event.target.value })
              }
            />
          </label>
          <label className="estudio-field">
            <span>Pergunta do guia</span>
            <input
              value={line.prompt}
              onChange={(event) =>
                updateLine(setDraft, lineIndex, { prompt: event.target.value })
              }
            />
          </label>
          <div className="estudio-inline">
            <label className="estudio-field">
              <span>Preço na vitrine</span>
              <select
                value={line.display}
                onChange={(event) =>
                  updateLine(setDraft, lineIndex, {
                    display: event.target.value === 'from' ? 'from' : 'exact',
                  })
                }
              >
                <option value="exact">Valor exato</option>
                <option value="from">A partir de</option>
              </select>
            </label>
            <label className="estudio-field">
              <span>Unidade</span>
              <select
                value={line.unit}
                onChange={(event) =>
                  updateLine(setDraft, lineIndex, {
                    unit: event.target.value === 'month' ? 'month' : 'project',
                  })
                }
              >
                <option value="project">Por projeto</option>
                <option value="month">Por mês</option>
              </select>
            </label>
          </div>

          {line.tiers.map((tier, tierIndex) => (
            <article className="estudio-card" key={tier.id}>
              <h3>{tier.name}</h3>
              <label className="estudio-field">
                <span>Nome</span>
                <input
                  value={tier.name}
                  onChange={(event) =>
                    updateTier(setDraft, lineIndex, tierIndex, { name: event.target.value })
                  }
                />
              </label>
              <label className="estudio-field">
                <span>Para quem é</span>
                <input
                  value={tier.need}
                  onChange={(event) =>
                    updateTier(setDraft, lineIndex, tierIndex, { need: event.target.value })
                  }
                />
              </label>
              <label className="estudio-field">
                <span>Captação</span>
                <input
                  value={tier.capture}
                  onChange={(event) =>
                    updateTier(setDraft, lineIndex, tierIndex, { capture: event.target.value })
                  }
                />
              </label>
              <label className="estudio-field">
                <span>Entregas (uma por linha)</span>
                <textarea
                  value={tier.delivery.join('\n')}
                  onChange={(event) =>
                    updateTier(setDraft, lineIndex, tierIndex, {
                      delivery: event.target.value.split('\n').map((item) => item),
                    })
                  }
                />
              </label>
              <div className="estudio-inline">
                <label className="estudio-field">
                  <span>Preço (R$)</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={tier.price}
                    onChange={(event) =>
                      updateTier(setDraft, lineIndex, tierIndex, {
                        price: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="estudio-field">
                  <span>Horas internas</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={tier.hours}
                    onChange={(event) =>
                      updateTier(setDraft, lineIndex, tierIndex, {
                        hours: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label className="estudio-check">
                <input
                  type="checkbox"
                  checked={tier.featured}
                  onChange={(event) =>
                    setDraft((current) => {
                      const next = structuredClone(current)
                      next.lines[lineIndex].tiers = next.lines[lineIndex].tiers.map((item, index) => ({
                        ...item,
                        featured: index === tierIndex ? event.target.checked : false,
                      }))
                      return next
                    })
                  }
                />
                Mais escolhido
              </label>
              <button
                className="estudio-button-ghost"
                type="button"
                onClick={() =>
                  setDraft((current) => {
                    const next = structuredClone(current)
                    next.lines[lineIndex].tiers = next.lines[lineIndex].tiers.filter(
                      (_, index) => index !== tierIndex,
                    )
                    return next
                  })
                }
              >
                Remover plano
              </button>
            </article>
          ))}

          <button
            className="estudio-button-ghost"
            type="button"
            onClick={() =>
              setDraft((current) => {
                const next = structuredClone(current)
                const name = 'Novo plano'
                next.lines[lineIndex].tiers.push({
                  id: uniqueId(next, slugify(name) || 'plano'),
                  name,
                  need: '',
                  capture: '',
                  delivery: [''],
                  hours: 1,
                  price: 350,
                  featured: false,
                })
                return next
              })
            }
          >
            Adicionar plano
          </button>
        </section>
      ))}

      <section className="estudio-card">
        <h2>Personalizado</h2>
        <label className="estudio-field">
          <span>Título</span>
          <input
            value={draft.custom.title}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                custom: { ...current.custom, title: event.target.value },
              }))
            }
          />
        </label>
        <label className="estudio-field">
          <span>Texto</span>
          <textarea
            value={draft.custom.lead}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                custom: { ...current.custom, lead: event.target.value },
              }))
            }
          />
        </label>
        <label className="estudio-field">
          <span>Piso (R$)</span>
          <input
            type="number"
            min={0}
            value={draft.custom.floor}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                custom: { ...current.custom, floor: Number(event.target.value) },
              }))
            }
          />
        </label>
      </section>

      <section className="estudio-card">
        <h2>Ocasiões — escolhas do guia</h2>
        <label className="estudio-field">
          <span>Pergunta de entrega</span>
          <input
            value={draft.ocasioesChoices.receivePrompt}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ocasioesChoices: {
                  ...current.ocasioesChoices,
                  receivePrompt: event.target.value,
                },
              }))
            }
          />
        </label>
        <label className="estudio-field">
          <span>Pergunta de tempo</span>
          <input
            value={draft.ocasioesChoices.timePrompt}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                ocasioesChoices: {
                  ...current.ocasioesChoices,
                  timePrompt: event.target.value,
                },
              }))
            }
          />
        </label>
        <div className="estudio-inline">
          <label className="estudio-field">
            <span>Só captação — nome</span>
            <input
              value={draft.ocasioesChoices.bruto.label}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ocasioesChoices: {
                    ...current.ocasioesChoices,
                    bruto: { ...current.ocasioesChoices.bruto, label: event.target.value },
                  },
                }))
              }
            />
          </label>
          <label className="estudio-field">
            <span>Só captação — texto</span>
            <input
              value={draft.ocasioesChoices.bruto.lead}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ocasioesChoices: {
                    ...current.ocasioesChoices,
                    bruto: { ...current.ocasioesChoices.bruto, lead: event.target.value },
                  },
                }))
              }
            />
          </label>
        </div>
        <div className="estudio-inline">
          <label className="estudio-field">
            <span>Com edição — nome</span>
            <input
              value={draft.ocasioesChoices.editado.label}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ocasioesChoices: {
                    ...current.ocasioesChoices,
                    editado: { ...current.ocasioesChoices.editado, label: event.target.value },
                  },
                }))
              }
            />
          </label>
          <label className="estudio-field">
            <span>Com edição — texto</span>
            <input
              value={draft.ocasioesChoices.editado.lead}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ocasioesChoices: {
                    ...current.ocasioesChoices,
                    editado: { ...current.ocasioesChoices.editado, lead: event.target.value },
                  },
                }))
              }
            />
          </label>
        </div>
        <div className="estudio-inline">
          <label className="estudio-field">
            <span>Meia — nome</span>
            <input
              value={draft.ocasioesChoices.meia.label}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ocasioesChoices: {
                    ...current.ocasioesChoices,
                    meia: { ...current.ocasioesChoices.meia, label: event.target.value },
                  },
                }))
              }
            />
          </label>
          <label className="estudio-field">
            <span>Diária — nome</span>
            <input
              value={draft.ocasioesChoices.diaria.label}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  ocasioesChoices: {
                    ...current.ocasioesChoices,
                    diaria: { ...current.ocasioesChoices.diaria, label: event.target.value },
                  },
                }))
              }
            />
          </label>
        </div>
      </section>

      <ListEditor
        title="Adicionais"
        items={draft.addOns}
        fields={[
          { key: 'label', label: 'Nome' },
          { key: 'value', label: 'Valor' },
        ]}
        onChange={(items) => setDraft((current) => ({ ...current, addOns: items }))}
        create={() => ({ id: uniqueCollectionId(draft.addOns, 'adicional'), label: '', value: '' })}
      />

      <ListEditor
        title="Peças"
        items={draft.pieces}
        fields={[
          { key: 'name', label: 'Nome' },
          { key: 'purpose', label: 'Função' },
          { key: 'body', label: 'Texto', area: true },
        ]}
        onChange={(items) => setDraft((current) => ({ ...current, pieces: items }))}
        create={() => ({
          id: uniqueCollectionId(draft.pieces, 'peca'),
          name: '',
          purpose: '',
          body: '',
        })}
      />

      <ListEditor
        title="Regras"
        items={draft.rules}
        fields={[
          { key: 'title', label: 'Título' },
          { key: 'body', label: 'Texto', area: true },
        ]}
        onChange={(items) => setDraft((current) => ({ ...current, rules: items }))}
        create={() => ({
          id: uniqueCollectionId(draft.rules, 'regra'),
          title: '',
          body: '',
        })}
      />

      {error ? <p className="estudio-error">{error}</p> : null}
      {saved ? <p className="estudio-status">No ar.</p> : null}
      <div className="estudio-actions">
        <button className="estudio-button" type="button" onClick={() => void handleSave()} disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar catálogo'}
        </button>
      </div>
    </main>
  )
}

function updateLine(
  setDraft: Dispatch<SetStateAction<PricingCatalog>>,
  lineIndex: number,
  patch: Partial<PricingCatalog['lines'][number]>,
) {
  setDraft((current) => {
    const next = structuredClone(current)
    next.lines[lineIndex] = { ...next.lines[lineIndex], ...patch }
    return next
  })
}

function updateTier(
  setDraft: Dispatch<SetStateAction<PricingCatalog>>,
  lineIndex: number,
  tierIndex: number,
  patch: Partial<PricingCatalog['lines'][number]['tiers'][number]>,
) {
  setDraft((current) => {
    const next = structuredClone(current)
    next.lines[lineIndex].tiers[tierIndex] = {
      ...next.lines[lineIndex].tiers[tierIndex],
      ...patch,
    }
    return next
  })
}

function uniqueId(catalog: PricingCatalog, base: string): string {
  const used = new Set(catalog.lines.flatMap((line) => line.tiers.map((tier) => tier.id)))
  if (!used.has(base)) {
    return base
  }
  let index = 2
  while (used.has(`${base}-${index}`)) {
    index += 1
  }
  return `${base}-${index}`
}

function uniqueCollectionId(items: { id: string }[], base: string): string {
  const used = new Set(items.map((item) => item.id))
  if (!used.has(base)) {
    return base
  }
  let index = 2
  while (used.has(`${base}-${index}`)) {
    index += 1
  }
  return `${base}-${index}`
}

type ListItem = { id: string } & Record<string, string>

function ListEditor<T extends ListItem>({
  title,
  items,
  fields,
  onChange,
  create,
}: {
  title: string
  items: T[]
  fields: { key: keyof T & string; label: string; area?: boolean }[]
  onChange: (items: T[]) => void
  create: () => T
}) {
  return (
    <section className="estudio-card">
      <h2>{title}</h2>
      {items.map((item, index) => (
        <article className="estudio-card" key={item.id}>
          {fields.map((field) => (
            <label className="estudio-field" key={field.key}>
              <span>{field.label}</span>
              {field.area ? (
                <textarea
                  value={item[field.key] ?? ''}
                  onChange={(event) => {
                    const next = structuredClone(items)
                    next[index] = { ...next[index], [field.key]: event.target.value }
                    onChange(next)
                  }}
                />
              ) : (
                <input
                  value={item[field.key] ?? ''}
                  onChange={(event) => {
                    const next = structuredClone(items)
                    next[index] = { ...next[index], [field.key]: event.target.value }
                    onChange(next)
                  }}
                />
              )}
            </label>
          ))}
          <button
            className="estudio-button-ghost"
            type="button"
            onClick={() => onChange(items.filter((_, current) => current !== index))}
          >
            Remover
          </button>
        </article>
      ))}
      <button className="estudio-button-ghost" type="button" onClick={() => onChange([...items, create()])}>
        Adicionar
      </button>
    </section>
  )
}
