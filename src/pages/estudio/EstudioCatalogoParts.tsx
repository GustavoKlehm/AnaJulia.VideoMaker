import { useEffect, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  CaretDown,
  Plus,
  Star,
  Trash,
} from '@phosphor-icons/react'
import type { PricingCatalog } from '../../content/types'
import { formatBRL } from '../../content/pricing'
import { moveItem, tierWarnings, type Selection } from '../../lib/catalogoEditor'

export type Edit = (change: (next: PricingCatalog) => void) => void

/* Campos ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="estudio-field cat-field">
      <span>{label}</span>
      {children}
      {hint ? <small className="cat-field__hint">{hint}</small> : null}
    </label>
  )
}

/** Campo numérico que aceita apagar e redigitar sem virar 0 no meio do caminho. */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  prefix,
  label,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  prefix?: string
  label?: string
}) {
  const [text, setText] = useState(String(value))
  const [synced, setSynced] = useState(value)

  // O valor mudou por fora (descartar, outra aba): acompanha sem perder o que está sendo digitado.
  if (synced !== value) {
    setSynced(value)
    if (Number(text) !== value) {
      setText(String(value))
    }
  }

  return (
    <span className={`cat-number${prefix ? ' cat-number--prefixed' : ''}`}>
      {prefix ? <i aria-hidden="true">{prefix}</i> : null}
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={text}
        aria-label={label}
        onChange={(event) => {
          setText(event.target.value)
          if (event.target.value !== '') {
            onChange(Number(event.target.value))
          }
        }}
        onBlur={() => {
          if (text === '') {
            setText(String(value))
          }
        }}
      />
    </span>
  )
}

/* Ações --------------------------------------------------------------------- */

/** Botão de remover em dois toques: o primeiro pede confirmação por alguns segundos. */
export function ConfirmButton({
  label,
  confirmLabel = 'Confirmar remoção',
  onConfirm,
  compact = false,
}: {
  label: string
  confirmLabel?: string
  onConfirm: () => void
  compact?: boolean
}) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) {
      return
    }
    const timer = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      className={`cat-action cat-action--danger${armed ? ' is-armed' : ''}`}
      aria-label={compact && !armed ? label : undefined}
      title={compact && !armed ? label : undefined}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
    >
      <Trash size={16} aria-hidden="true" />
      {armed ? confirmLabel : compact ? null : label}
    </button>
  )
}

export function MoveButtons({
  index,
  count,
  onMove,
}: {
  index: number
  count: number
  onMove: (delta: -1 | 1) => void
}) {
  return (
    <span className="cat-move">
      <button
        type="button"
        className="cat-action"
        disabled={index <= 0}
        aria-label="Mover para cima"
        title="Mover para cima"
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={16} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="cat-action"
        disabled={index >= count - 1}
        aria-label="Mover para baixo"
        title="Mover para baixo"
        onClick={() => onMove(1)}
      >
        <ArrowDown size={16} aria-hidden="true" />
      </button>
    </span>
  )
}

export function SiteLink({ href }: { href: string }) {
  return (
    <a className="cat-action" href={href} target="_blank" rel="noopener noreferrer">
      <ArrowSquareOut size={16} aria-hidden="true" />
      Ver no site
    </a>
  )
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="cat-add" onClick={onClick}>
      <Plus size={16} aria-hidden="true" />
      {label}
    </button>
  )
}

/* Preços rápidos -------------------------------------------------------------- */

/** Todos os planos numa tabela só: o ajuste mais comum (preço) sem abrir nada. */
export function QuickPrices({
  draft,
  edit,
  onOpen,
}: {
  draft: PricingCatalog
  edit: Edit
  onOpen: (selection: Selection) => void
}) {
  return (
    <div className="cat-quick">
      <p className="estudio-help">
        Ajuste preço, horas e destaque de todos os planos aqui. Para textos e entregas, abra o
        plano.
      </p>
      {draft.lines.map((line, lineIndex) => (
        <section className="cat-quick__line" key={line.id}>
          <h2 className="cat-quick__title">{line.title}</h2>
          {line.categories.flatMap((category, categoryIndex) =>
            category.services.map((service, serviceIndex) => (
              <div className="cat-quick__group" key={service.id}>
                <h3 className="cat-quick__group-title">
                  {category.title}
                  {category.services.length > 1 || line.categories.length > 1 ? (
                    <span> · {service.title}</span>
                  ) : null}
                </h3>
                {service.tiers.length === 0 ? (
                  <p className="estudio-help">Nenhum plano neste serviço.</p>
                ) : (
                  <div className="cat-quick__table" role="table" aria-label={`${category.title} · ${service.title}`}>
                    <div className="cat-quick__row cat-quick__row--head" role="row">
                      <span role="columnheader">Plano</span>
                      <span role="columnheader">Preço</span>
                      <span role="columnheader">Horas</span>
                      <span role="columnheader">Destaque</span>
                      <span role="columnheader" className="cat-sr">Abrir</span>
                    </div>
                    {service.tiers.map((tier, tierIndex) => {
                      const path = (next: PricingCatalog) =>
                        next.lines[lineIndex].categories[categoryIndex].services[serviceIndex]
                      const warnings = tierWarnings(tier)
                      return (
                        <div className="cat-quick__row" role="row" key={tier.id}>
                          <span role="cell" className="cat-quick__name">
                            <input
                              value={tier.name}
                              aria-label="Nome do plano"
                              onChange={(event) => {
                                const value = event.target.value
                                edit((next) => {
                                  path(next).tiers[tierIndex].name = value
                                })
                              }}
                            />
                            {warnings.length > 0 ? (
                              <small className="cat-warn">{warnings.join(' ')}</small>
                            ) : null}
                          </span>
                          <span role="cell">
                            <NumberInput
                              label={`Preço de ${tier.name}`}
                              prefix="R$"
                              step={10}
                              value={tier.price}
                              onChange={(price) =>
                                edit((next) => {
                                  path(next).tiers[tierIndex].price = price
                                })
                              }
                            />
                          </span>
                          <span role="cell">
                            <NumberInput
                              label={`Horas internas de ${tier.name}`}
                              step={0.5}
                              value={tier.hours}
                              onChange={(hours) =>
                                edit((next) => {
                                  path(next).tiers[tierIndex].hours = hours
                                })
                              }
                            />
                          </span>
                          <span role="cell">
                            <button
                              type="button"
                              className={`cat-star${tier.featured ? ' is-on' : ''}`}
                              aria-pressed={tier.featured}
                              aria-label={`Mais escolhido: ${tier.name}`}
                              title="Mais escolhido"
                              onClick={() =>
                                edit((next) => {
                                  const tiers = path(next).tiers
                                  const on = !tiers[tierIndex].featured
                                  tiers.forEach((item, index) => {
                                    item.featured = index === tierIndex ? on : false
                                  })
                                })
                              }
                            >
                              <Star size={18} weight={tier.featured ? 'fill' : 'regular'} aria-hidden="true" />
                            </button>
                          </span>
                          <span role="cell">
                            <button
                              type="button"
                              className="cat-action"
                              onClick={() =>
                                onOpen({
                                  kind: 'tier',
                                  line: line.id,
                                  cat: category.id,
                                  serv: service.id,
                                  tier: tier.id,
                                })
                              }
                            >
                              Abrir
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )),
          )}
        </section>
      ))}
    </div>
  )
}

/* Listas simples (adicionais, peças, regras) -------------------------------- */

type ListItem = { id: string } & Record<string, string>

export function ListEditor<T extends ListItem>({
  items,
  fields,
  titleKey,
  noun,
  help,
  compact = false,
  onChange,
  create,
}: {
  items: T[]
  fields: { key: keyof T & string; label: string; area?: boolean }[]
  titleKey: keyof T & string
  noun: string
  help?: string
  /** Uma linha por item (adicionais). Sem isso, cada item abre e fecha. */
  compact?: boolean
  onChange: (items: T[]) => void
  create: () => T
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  function patch(index: number, key: string, value: string) {
    const next = structuredClone(items)
    next[index] = { ...next[index], [key]: value }
    onChange(next)
  }

  function add() {
    const item = create()
    onChange([...items, item])
    setOpenId(item.id)
  }

  return (
    <div className="cat-list">
      {help ? <p className="estudio-help">{help}</p> : null}
      {items.length === 0 ? <p className="estudio-help">Nada por aqui ainda.</p> : null}

      {compact ? (
        <div className="cat-list__compact">
          {items.map((item, index) => (
            <div className="cat-list__row" key={item.id}>
              {fields.map((field) => (
                <input
                  key={field.key}
                  value={item[field.key] ?? ''}
                  placeholder={field.label}
                  aria-label={field.label}
                  onChange={(event) => patch(index, field.key, event.target.value)}
                />
              ))}
              <span className="cat-list__actions">
                <MoveButtons
                  index={index}
                  count={items.length}
                  onMove={(delta) => onChange(moveItem(items, index, delta))}
                />
                <ConfirmButton
                  compact
                  label={`Remover ${noun}`}
                  confirmLabel="Remover?"
                  onConfirm={() => onChange(items.filter((_, current) => current !== index))}
                />
              </span>
            </div>
          ))}
        </div>
      ) : (
        items.map((item, index) => (
          <details
            className="cat-list__item"
            key={item.id}
            open={openId === item.id}
            onToggle={(event) => {
              const open = (event.currentTarget as HTMLDetailsElement).open
              setOpenId((current) => (open ? item.id : current === item.id ? null : current))
            }}
          >
            <summary>
              <CaretDown className="cat-list__caret" size={14} aria-hidden="true" />
              <span className="cat-list__title">{item[titleKey] || `Sem título`}</span>
            </summary>
            <div className="cat-list__body">
              {fields.map((field) => (
                <Field key={field.key} label={field.label}>
                  {field.area ? (
                    <textarea
                      value={item[field.key] ?? ''}
                      onChange={(event) => patch(index, field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      value={item[field.key] ?? ''}
                      onChange={(event) => patch(index, field.key, event.target.value)}
                    />
                  )}
                </Field>
              ))}
              <div className="cat-toolbar">
                <MoveButtons
                  index={index}
                  count={items.length}
                  onMove={(delta) => onChange(moveItem(items, index, delta))}
                />
                <ConfirmButton
                  label={`Remover ${noun}`}
                  onConfirm={() => onChange(items.filter((_, current) => current !== index))}
                />
              </div>
            </div>
          </details>
        ))
      )}

      <AddButton label={`Adicionar ${noun}`} onClick={add} />
    </div>
  )
}

/* Personalizado ---------------------------------------------------------------- */

export function CustomEditor({ draft, edit }: { draft: PricingCatalog; edit: Edit }) {
  return (
    <div className="cat-form">
      <p className="estudio-help">
        Bloco "Personalizado" da página de planos, para quem não cabe em nenhum plano.
      </p>
      <Field label="Título">
        <input
          value={draft.custom.title}
          onChange={(event) => {
            const value = event.target.value
            edit((next) => {
              next.custom.title = value
            })
          }}
        />
      </Field>
      <Field label="Texto">
        <textarea
          value={draft.custom.lead}
          onChange={(event) => {
            const value = event.target.value
            edit((next) => {
              next.custom.lead = value
            })
          }}
        />
      </Field>
      <Field label="Orçamento mínimo" hint={`Aparece como "Orçamento mínimo de ${formatBRL(draft.custom.floor)}".`}>
        <NumberInput
          prefix="R$"
          step={10}
          value={draft.custom.floor}
          onChange={(floor) =>
            edit((next) => {
              next.custom.floor = floor
            })
          }
        />
      </Field>
    </div>
  )
}
