import { useState, type Dispatch, type SetStateAction } from 'react'
import { useCms } from '../../content/cmsContext'
import { savePricing, slugify } from '../../content/cmsSave'
import type { Category, ComboMode, Service, Tier } from '../../content/pricing'
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
            <span>Exemplo ou público (abaixo da promessa)</span>
            <input
              value={line.hint}
              onChange={(event) =>
                updateLine(setDraft, lineIndex, { hint: event.target.value })
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

          {line.categories.map((category, categoryIndex) => (
            <CategoryEditor
              key={category.id}
              category={category}
              setDraft={setDraft}
              path={[lineIndex, categoryIndex]}
            />
          ))}

          <button
            className="estudio-button-ghost"
            type="button"
            onClick={() =>
              edit(setDraft, (next) => {
                next.lines[lineIndex].categories.push({
                  id: uniqueId(allCategoryIds(next), 'categoria'),
                  title: 'Nova categoria',
                  promise: '',
                  hint: '',
                  comboMode: 'none',
                  comboDiscount: 0,
                  comboNote: '',
                  services: [],
                })
              })
            }
          >
            Adicionar categoria
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

type Setter = Dispatch<SetStateAction<PricingCatalog>>

function edit(setDraft: Setter, change: (next: PricingCatalog) => void) {
  setDraft((current) => {
    const next = structuredClone(current)
    change(next)
    return next
  })
}

function allCategoryIds(catalog: PricingCatalog): string[] {
  return catalog.lines.flatMap((line) => line.categories.map((category) => category.id))
}

function allServiceIds(catalog: PricingCatalog): string[] {
  return catalog.lines.flatMap((line) =>
    line.categories.flatMap((category) => category.services.map((service) => service.id)),
  )
}

function allTierIds(catalog: PricingCatalog): string[] {
  return catalog.lines.flatMap((line) =>
    line.categories.flatMap((category) =>
      category.services.flatMap((service) => service.tiers.map((tier) => tier.id)),
    ),
  )
}

function uniqueId(usedIds: string[], base: string): string {
  const used = new Set(usedIds)
  if (!used.has(base)) {
    return base
  }
  let index = 2
  while (used.has(`${base}-${index}`)) {
    index += 1
  }
  return `${base}-${index}`
}

const COMBO_OPTIONS: { value: ComboMode; label: string }[] = [
  { value: 'none', label: 'Sem "Os dois"' },
  { value: 'paired', label: 'Mesmo nível nos dois (ex.: 5h + 5h)' },
  { value: 'free', label: 'Cliente escolhe um de cada' },
]

function CategoryEditor({
  category,
  setDraft,
  path,
}: {
  category: Category
  setDraft: Setter
  path: [number, number]
}) {
  const [lineIndex, categoryIndex] = path

  function update(patch: Partial<Category>) {
    edit(setDraft, (next) => {
      const list = next.lines[lineIndex].categories
      list[categoryIndex] = { ...list[categoryIndex], ...patch }
    })
  }

  return (
    <section className="estudio-card">
      <h3>{category.title}</h3>
      <label className="estudio-field">
        <span>Título da categoria</span>
        <input value={category.title} onChange={(event) => update({ title: event.target.value })} />
      </label>
      <label className="estudio-field">
        <span>Promessa</span>
        <input value={category.promise} onChange={(event) => update({ promise: event.target.value })} />
      </label>
      <label className="estudio-field">
        <span>Exemplos (abaixo da promessa)</span>
        <input value={category.hint} onChange={(event) => update({ hint: event.target.value })} />
      </label>
      <div className="estudio-inline">
        <label className="estudio-field">
          <span>Aba "Os dois"</span>
          <select
            value={category.comboMode}
            onChange={(event) => update({ comboMode: event.target.value as ComboMode })}
          >
            {COMBO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="estudio-field">
          <span>Desconto dos dois (%)</span>
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            value={Math.round(category.comboDiscount * 100)}
            onChange={(event) => update({ comboDiscount: Number(event.target.value) / 100 })}
          />
        </label>
      </div>
      {category.comboMode !== 'none' && category.services.length !== 2 ? (
        <p className="estudio-help">
          A aba "Os dois" só aparece quando a categoria tem exatamente dois serviços.
        </p>
      ) : null}
      <label className="estudio-field">
        <span>Texto da aba "Os dois"</span>
        <textarea
          value={category.comboNote}
          onChange={(event) => update({ comboNote: event.target.value })}
        />
      </label>

      {category.services.map((service, serviceIndex) => (
        <ServiceEditor
          key={service.id}
          service={service}
          setDraft={setDraft}
          path={[lineIndex, categoryIndex, serviceIndex]}
        />
      ))}

      <button
        className="estudio-button-ghost"
        type="button"
        onClick={() =>
          edit(setDraft, (next) => {
            next.lines[lineIndex].categories[categoryIndex].services.push({
              id: uniqueId(allServiceIds(next), `${category.id}-servico`),
              title: 'Novo serviço',
              lead: '',
              tiers: [],
            })
          })
        }
      >
        Adicionar serviço
      </button>
      <button
        className="estudio-button-ghost"
        type="button"
        onClick={() =>
          edit(setDraft, (next) => {
            next.lines[lineIndex].categories.splice(categoryIndex, 1)
          })
        }
      >
        Remover categoria
      </button>
    </section>
  )
}

function ServiceEditor({
  service,
  setDraft,
  path,
}: {
  service: Service
  setDraft: Setter
  path: [number, number, number]
}) {
  const [lineIndex, categoryIndex, serviceIndex] = path

  function change(apply: (target: Service) => void) {
    edit(setDraft, (next) => {
      apply(next.lines[lineIndex].categories[categoryIndex].services[serviceIndex])
    })
  }

  return (
    <article className="estudio-card">
      <h4>{service.title}</h4>
      <label className="estudio-field">
        <span>Nome do serviço (aba)</span>
        <input
          value={service.title}
          onChange={(event) => {
            const value = event.target.value
            change((target) => {
              target.title = value
            })
          }}
        />
      </label>
      <label className="estudio-field">
        <span>Texto do serviço</span>
        <textarea
          value={service.lead}
          onChange={(event) => {
            const value = event.target.value
            change((target) => {
              target.lead = value
            })
          }}
        />
      </label>

      {service.tiers.map((tier, tierIndex) => (
        <TierEditor
          key={tier.id}
          tier={tier}
          onChange={(patch) =>
            change((target) => {
              target.tiers[tierIndex] = { ...target.tiers[tierIndex], ...patch }
            })
          }
          onFeatured={(checked) =>
            change((target) => {
              target.tiers = target.tiers.map((item, index) => ({
                ...item,
                featured: index === tierIndex ? checked : false,
              }))
            })
          }
          onRemove={() =>
            change((target) => {
              target.tiers.splice(tierIndex, 1)
            })
          }
        />
      ))}

      <button
        className="estudio-button-ghost"
        type="button"
        onClick={() =>
          edit(setDraft, (next) => {
            const name = 'Novo plano'
            next.lines[lineIndex].categories[categoryIndex].services[serviceIndex].tiers.push({
              id: uniqueId(allTierIds(next), `${service.id}-${slugify(name)}`),
              name,
              need: '',
              capture: '',
              delivery: [''],
              hours: 1,
              price: 350,
              featured: false,
            })
          })
        }
      >
        Adicionar plano
      </button>
      <button
        className="estudio-button-ghost"
        type="button"
        onClick={() =>
          edit(setDraft, (next) => {
            next.lines[lineIndex].categories[categoryIndex].services.splice(serviceIndex, 1)
          })
        }
      >
        Remover serviço
      </button>
    </article>
  )
}

function TierEditor({
  tier,
  onChange,
  onFeatured,
  onRemove,
}: {
  tier: Tier
  onChange: (patch: Partial<Tier>) => void
  onFeatured: (checked: boolean) => void
  onRemove: () => void
}) {
  return (
    <article className="estudio-card">
      <h5>{tier.name}</h5>
      <label className="estudio-field">
        <span>Nome</span>
        <input value={tier.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label className="estudio-field">
        <span>Para quem é</span>
        <input value={tier.need} onChange={(event) => onChange({ need: event.target.value })} />
      </label>
      <label className="estudio-field">
        <span>Cobertura ou captação</span>
        <input
          value={tier.capture}
          onChange={(event) => onChange({ capture: event.target.value })}
        />
      </label>
      <label className="estudio-field">
        <span>Entregas (uma por linha)</span>
        <textarea
          value={tier.delivery.join('\n')}
          onChange={(event) => onChange({ delivery: event.target.value.split('\n') })}
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
            onChange={(event) => onChange({ price: Number(event.target.value) })}
          />
        </label>
        <label className="estudio-field">
          <span>Horas internas</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={tier.hours}
            onChange={(event) => onChange({ hours: Number(event.target.value) })}
          />
        </label>
      </div>
      <label className="estudio-check">
        <input
          type="checkbox"
          checked={tier.featured}
          onChange={(event) => onFeatured(event.target.checked)}
        />
        Mais escolhido
      </label>
      <button className="estudio-button-ghost" type="button" onClick={onRemove}>
        Remover plano
      </button>
    </article>
  )
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
