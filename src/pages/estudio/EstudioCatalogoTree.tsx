import type { ReactNode } from 'react'
import { ArrowLeft, CaretRight, Copy, Star, Warning } from '@phosphor-icons/react'
import type { Category, ComboMode, PricingLine, Service, Tier } from '../../content/pricing'
import { formatBRL } from '../../content/pricing'
import type { PricingCatalog } from '../../content/types'
import {
  allCategoryIds,
  allServiceIds,
  allTierIds,
  duplicateTier,
  moveItem,
  parentOf,
  priceRange,
  sameSelection,
  siteHref,
  tierWarnings,
  uniqueId,
  type Located,
  type Selection,
} from '../../lib/catalogoEditor'
import {
  AddButton,
  ConfirmButton,
  Field,
  MoveButtons,
  NumberInput,
  SiteLink,
  type Edit,
} from './EstudioCatalogoParts'

/* Árvore ------------------------------------------------------------------------ */

type TreeProps = {
  draft: PricingCatalog
  selection: Selection
  expanded: Set<string>
  onSelect: (selection: Selection) => void
  onToggle: (id: string) => void
}

export function CatalogTree({ draft, selection, expanded, onSelect, onToggle }: TreeProps) {
  const is = (candidate: Selection) => sameSelection(selection, candidate)

  return (
    <nav className="cat-tree" aria-label="Planos do catálogo">
      {draft.lines.map((line) => {
        const lineSel: Selection = { kind: 'line', line: line.id }
        return (
          <div className="cat-tree__line" key={line.id}>
            <button
              type="button"
              className={`cat-tree__line-name${is(lineSel) ? ' is-on' : ''}`}
              aria-current={is(lineSel) ? 'true' : undefined}
              onClick={() => onSelect(lineSel)}
            >
              {line.title}
            </button>
            <ul className="cat-tree__list">
              {line.categories.map((category) => {
                const catSel: Selection = { kind: 'category', line: line.id, cat: category.id }
                const catOpen = expanded.has(category.id)
                return (
                  <li key={category.id}>
                    <TreeRow
                      depth={0}
                      open={catOpen}
                      hasChildren={category.services.length > 0}
                      selected={is(catSel)}
                      label={category.title || 'Sem título'}
                      meta={`${category.services.length} ${category.services.length === 1 ? 'serviço' : 'serviços'}`}
                      onToggle={() => onToggle(category.id)}
                      onSelect={() => onSelect(catSel)}
                    />
                    {catOpen ? (
                      <ul className="cat-tree__list">
                        {category.services.map((service) => {
                          const servSel: Selection = { ...catSel, kind: 'service', serv: service.id }
                          const servOpen = expanded.has(service.id)
                          return (
                            <li key={service.id}>
                              <TreeRow
                                depth={1}
                                open={servOpen}
                                hasChildren={service.tiers.length > 0}
                                selected={is(servSel)}
                                label={service.title || 'Sem título'}
                                meta={priceRange(service.tiers)}
                                onToggle={() => onToggle(service.id)}
                                onSelect={() => onSelect(servSel)}
                              />
                              {servOpen ? (
                                <ul className="cat-tree__list">
                                  {service.tiers.map((tier) => {
                                    const tierSel: Selection = {
                                      ...servSel,
                                      kind: 'tier',
                                      tier: tier.id,
                                    }
                                    return (
                                      <li key={tier.id}>
                                        <TreeRow
                                          depth={2}
                                          selected={is(tierSel)}
                                          label={tier.name || 'Sem nome'}
                                          meta={formatBRL(tier.price)}
                                          featured={tier.featured}
                                          warning={tierWarnings(tier).length > 0}
                                          onSelect={() => onSelect(tierSel)}
                                        />
                                      </li>
                                    )
                                  })}
                                </ul>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

function TreeRow({
  depth,
  open,
  hasChildren = false,
  selected,
  label,
  meta,
  featured,
  warning,
  onToggle,
  onSelect,
}: {
  depth: number
  open?: boolean
  hasChildren?: boolean
  selected: boolean
  label: string
  meta: string
  featured?: boolean
  warning?: boolean
  onToggle?: () => void
  onSelect: () => void
}) {
  return (
    <div className={`cat-row cat-row--d${depth}${selected ? ' is-on' : ''}`}>
      {onToggle ? (
        <button
          type="button"
          className={`cat-row__toggle${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-label={open ? `Recolher ${label}` : `Expandir ${label}`}
          disabled={!hasChildren}
          onClick={onToggle}
        >
          <CaretRight size={12} weight="bold" aria-hidden="true" />
        </button>
      ) : (
        <span className="cat-row__toggle" aria-hidden="true" />
      )}
      <button
        type="button"
        className="cat-row__main"
        aria-current={selected ? 'true' : undefined}
        onClick={onSelect}
      >
        <span className="cat-row__label">
          {label}
          {featured ? <Star size={12} weight="fill" aria-label="Mais escolhido" /> : null}
          {warning ? <Warning size={12} weight="fill" className="cat-warn-icon" aria-label="Revisar" /> : null}
        </span>
        <span className="cat-row__meta">{meta}</span>
      </button>
    </div>
  )
}

/* Detalhe ----------------------------------------------------------------------- */

type DetailProps = {
  draft: PricingCatalog
  selection: Selection
  found: Located
  edit: Edit
  onSelect: (selection: Selection) => void
  onBack: () => void
}

export function CatalogDetail(props: DetailProps) {
  const { selection, found, onSelect, onBack } = props
  const crumbs = breadcrumbs(selection, found)

  return (
    <section className="cat-detail" aria-labelledby="cat-detail-title">
      <button type="button" className="cat-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar à lista
      </button>
      {crumbs.length > 0 ? (
        <ol className="cat-crumbs" aria-label="Você está em">
          {crumbs.map((crumb) => (
            <li key={crumb.label + crumb.selection.kind}>
              <button type="button" onClick={() => onSelect(crumb.selection)}>
                {crumb.label}
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      {selection.kind === 'line' ? <LineDetail {...props} line={found.line} /> : null}
      {selection.kind === 'category' && found.category ? (
        <CategoryDetail {...props} category={found.category} />
      ) : null}
      {selection.kind === 'service' && found.service && found.category ? (
        <ServiceDetail {...props} category={found.category} service={found.service} />
      ) : null}
      {selection.kind === 'tier' && found.tier && found.service ? (
        <TierDetail {...props} service={found.service} tier={found.tier} />
      ) : null}
    </section>
  )
}

function breadcrumbs(selection: Selection, found: Located): { label: string; selection: Selection }[] {
  const crumbs: { label: string; selection: Selection }[] = []
  let current = parentOf(selection)
  while (current) {
    const label =
      current.kind === 'line'
        ? found.line.title
        : current.kind === 'category'
          ? (found.category?.title ?? '')
          : current.kind === 'service'
            ? (found.service?.title ?? '')
            : ''
    crumbs.unshift({ label: label || 'Sem título', selection: current })
    current = parentOf(current)
  }
  return crumbs
}

function DetailHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="cat-detail__head">
      <p className="estudio-kicker">{kicker}</p>
      <h2 id="cat-detail-title">{title || 'Sem título'}</h2>
      {children ? <div className="cat-toolbar">{children}</div> : null}
    </header>
  )
}

/** Lista dos filhos dentro do detalhe: navegação para baixo, útil sobretudo no celular. */
function ChildList({
  title,
  items,
  addLabel,
  onAdd,
}: {
  title: string
  items: { id: string; label: string; meta: string; featured?: boolean; warning?: boolean; onOpen: () => void }[]
  addLabel: string
  onAdd: () => void
}) {
  return (
    <div className="cat-children">
      <h3 className="cat-children__title">{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={item.onOpen}>
                <span className="cat-row__label">
                  {item.label}
                  {item.featured ? <Star size={12} weight="fill" aria-label="Mais escolhido" /> : null}
                  {item.warning ? (
                    <Warning size={12} weight="fill" className="cat-warn-icon" aria-label="Revisar" />
                  ) : null}
                </span>
                <span className="cat-row__meta">{item.meta}</span>
                <CaretRight size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="estudio-help">Nenhum ainda.</p>
      )}
      <AddButton label={addLabel} onClick={onAdd} />
    </div>
  )
}

function LineDetail({ draft, found, edit, onSelect, selection, line }: DetailProps & { line: PricingLine }) {
  const { lineIndex } = found
  const set = (patch: Partial<PricingLine>) =>
    edit((next) => {
      next.lines[lineIndex] = { ...next.lines[lineIndex], ...patch }
    })

  return (
    <>
      <DetailHead kicker="Linha" title={line.title}>
        <SiteLink href={siteHref(selection)} />
      </DetailHead>
      <div className="cat-form">
        <Field label="Título">
          <input value={line.title} onChange={(event) => set({ title: event.target.value })} />
        </Field>
        <Field label="Promessa" hint="Frase curta no seletor Momentos · Marcas.">
          <input value={line.promise} onChange={(event) => set({ promise: event.target.value })} />
        </Field>
        <Field label="Exemplo ou público" hint="Aparece em itálico abaixo da promessa.">
          <input value={line.hint} onChange={(event) => set({ hint: event.target.value })} />
        </Field>
        <Field label="Texto da linha" hint='Usado em "Ver todos os planos".'>
          <textarea value={line.lead} onChange={(event) => set({ lead: event.target.value })} />
        </Field>
        <Field label="Pergunta do guia">
          <input value={line.prompt} onChange={(event) => set({ prompt: event.target.value })} />
        </Field>
        <div className="cat-form__pair">
          <Field label="Preço na vitrine">
            <select
              value={line.display}
              onChange={(event) => set({ display: event.target.value === 'from' ? 'from' : 'exact' })}
            >
              <option value="exact">Valor exato</option>
              <option value="from">A partir de</option>
            </select>
          </Field>
          <Field label="Unidade">
            <select
              value={line.unit}
              onChange={(event) => set({ unit: event.target.value === 'month' ? 'month' : 'project' })}
            >
              <option value="project">Por projeto</option>
              <option value="month">Por mês</option>
            </select>
          </Field>
        </div>
      </div>

      <ChildList
        title="Categorias"
        addLabel="Adicionar categoria"
        items={line.categories.map((category) => ({
          id: category.id,
          label: category.title || 'Sem título',
          meta: `${category.services.length} ${category.services.length === 1 ? 'serviço' : 'serviços'}`,
          onOpen: () => onSelect({ kind: 'category', line: line.id, cat: category.id }),
        }))}
        onAdd={() => {
          const id = uniqueId(allCategoryIds(draft), 'nova-categoria')
          edit((next) => {
            next.lines[lineIndex].categories.push({
              id,
              title: 'Nova categoria',
              promise: '',
              hint: '',
              comboMode: 'none',
              comboDiscount: 0,
              comboNote: '',
              services: [],
            })
          })
          onSelect({ kind: 'category', line: line.id, cat: id })
        }}
      />
    </>
  )
}

const COMBO_OPTIONS: { value: ComboMode; label: string }[] = [
  { value: 'none', label: 'Sem "Os dois"' },
  { value: 'paired', label: 'Mesmo nível nos dois (ex.: 5h + 5h)' },
  { value: 'free', label: 'Cliente escolhe um de cada' },
]

function CategoryDetail({
  draft,
  found,
  edit,
  onSelect,
  selection,
  category,
}: DetailProps & { category: Category }) {
  const lineIndex = found.lineIndex
  const categoryIndex = found.categoryIndex ?? 0
  const siblings = found.line.categories
  const set = (patch: Partial<Category>) =>
    edit((next) => {
      const list = next.lines[lineIndex].categories
      list[categoryIndex] = { ...list[categoryIndex], ...patch }
    })

  return (
    <>
      <DetailHead kicker="Categoria" title={category.title}>
        <MoveButtons
          index={categoryIndex}
          count={siblings.length}
          onMove={(delta) =>
            edit((next) => {
              next.lines[lineIndex].categories = moveItem(next.lines[lineIndex].categories, categoryIndex, delta)
            })
          }
        />
        <SiteLink href={siteHref(selection)} />
        <ConfirmButton
          label="Remover categoria"
          confirmLabel={`Remover com ${category.services.length} serviço(s)?`}
          onConfirm={() =>
            edit((next) => {
              next.lines[lineIndex].categories.splice(categoryIndex, 1)
            })
          }
        />
      </DetailHead>

      <div className="cat-form">
        <Field label="Título da categoria">
          <input value={category.title} onChange={(event) => set({ title: event.target.value })} />
        </Field>
        <Field label="Promessa">
          <input value={category.promise} onChange={(event) => set({ promise: event.target.value })} />
        </Field>
        <Field label="Exemplos" hint="Aparece abaixo da promessa.">
          <input value={category.hint} onChange={(event) => set({ hint: event.target.value })} />
        </Field>

        <fieldset className="cat-fieldset">
          <legend>Combo "Os dois"</legend>
          <div className="cat-form__pair">
            <Field label="Modo">
              <select
                value={category.comboMode}
                onChange={(event) => set({ comboMode: event.target.value as ComboMode })}
              >
                {COMBO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {category.comboMode !== 'none' ? (
              <Field label="Desconto (%)">
                <NumberInput
                  max={50}
                  value={Math.round(category.comboDiscount * 100)}
                  onChange={(value) => set({ comboDiscount: value / 100 })}
                />
              </Field>
            ) : null}
          </div>
          {category.comboMode !== 'none' && category.services.length !== 2 ? (
            <p className="cat-warn">
              <Warning size={14} weight="fill" aria-hidden="true" /> A aba "Os dois" só aparece quando
              a categoria tem exatamente dois serviços (hoje tem {category.services.length}).
            </p>
          ) : null}
          {category.comboMode !== 'none' ? (
            <Field label='Texto da aba "Os dois"'>
              <textarea value={category.comboNote} onChange={(event) => set({ comboNote: event.target.value })} />
            </Field>
          ) : null}
        </fieldset>
      </div>

      <ChildList
        title="Serviços"
        addLabel="Adicionar serviço"
        items={category.services.map((service) => ({
          id: service.id,
          label: service.title || 'Sem título',
          meta: priceRange(service.tiers),
          onOpen: () => onSelect({ kind: 'service', line: found.line.id, cat: category.id, serv: service.id }),
        }))}
        onAdd={() => {
          const id = uniqueId(allServiceIds(draft), `${category.id}-servico`)
          edit((next) => {
            next.lines[lineIndex].categories[categoryIndex].services.push({
              id,
              title: 'Novo serviço',
              lead: '',
              tiers: [],
            })
          })
          onSelect({ kind: 'service', line: found.line.id, cat: category.id, serv: id })
        }}
      />
    </>
  )
}

function ServiceDetail({
  draft,
  found,
  edit,
  onSelect,
  selection,
  category,
  service,
}: DetailProps & { category: Category; service: Service }) {
  const { lineIndex } = found
  const categoryIndex = found.categoryIndex ?? 0
  const serviceIndex = found.serviceIndex ?? 0
  const target = (next: PricingCatalog) => next.lines[lineIndex].categories[categoryIndex]

  return (
    <>
      <DetailHead kicker="Serviço" title={service.title}>
        <MoveButtons
          index={serviceIndex}
          count={category.services.length}
          onMove={(delta) =>
            edit((next) => {
              target(next).services = moveItem(target(next).services, serviceIndex, delta)
            })
          }
        />
        <SiteLink href={siteHref(selection)} />
        <ConfirmButton
          label="Remover serviço"
          confirmLabel={`Remover com ${service.tiers.length} plano(s)?`}
          onConfirm={() =>
            edit((next) => {
              target(next).services.splice(serviceIndex, 1)
            })
          }
        />
      </DetailHead>

      <div className="cat-form">
        <Field label="Nome do serviço" hint="É o nome da aba na página de planos.">
          <input
            value={service.title}
            onChange={(event) => {
              const value = event.target.value
              edit((next) => {
                target(next).services[serviceIndex].title = value
              })
            }}
          />
        </Field>
        <Field label="Texto do serviço">
          <textarea
            value={service.lead}
            onChange={(event) => {
              const value = event.target.value
              edit((next) => {
                target(next).services[serviceIndex].lead = value
              })
            }}
          />
        </Field>
      </div>

      <ChildList
        title="Planos"
        addLabel="Adicionar plano"
        items={service.tiers.map((tier) => ({
          id: tier.id,
          label: tier.name || 'Sem nome',
          meta: formatBRL(tier.price),
          featured: tier.featured,
          warning: tierWarnings(tier).length > 0,
          onOpen: () => onSelect({ ...selectionOf(found, category, service), kind: 'tier', tier: tier.id }),
        }))}
        onAdd={() => {
          const id = uniqueId(allTierIds(draft), `${service.id}-novo-plano`)
          edit((next) => {
            target(next).services[serviceIndex].tiers.push({
              id,
              name: 'Novo plano',
              need: '',
              capture: '',
              delivery: [''],
              hours: 1,
              price: 350,
              featured: false,
            })
          })
          onSelect({ ...selectionOf(found, category, service), kind: 'tier', tier: id })
        }}
      />
    </>
  )
}

function selectionOf(found: Located, category: Category, service: Service) {
  return { kind: 'service' as const, line: found.line.id, cat: category.id, serv: service.id }
}

function TierDetail({
  draft,
  found,
  edit,
  onSelect,
  selection,
  service,
  tier,
}: DetailProps & { service: Service; tier: Tier }) {
  const { lineIndex } = found
  const categoryIndex = found.categoryIndex ?? 0
  const serviceIndex = found.serviceIndex ?? 0
  const tierIndex = found.tierIndex ?? 0
  const tiers = (next: PricingCatalog) =>
    next.lines[lineIndex].categories[categoryIndex].services[serviceIndex].tiers
  const set = (patch: Partial<Tier>) =>
    edit((next) => {
      const list = tiers(next)
      list[tierIndex] = { ...list[tierIndex], ...patch }
    })
  const warnings = tierWarnings(tier)

  return (
    <>
      <DetailHead kicker="Plano" title={tier.name}>
        <MoveButtons
          index={tierIndex}
          count={service.tiers.length}
          onMove={(delta) =>
            edit((next) => {
              const list = next.lines[lineIndex].categories[categoryIndex].services[serviceIndex]
              list.tiers = moveItem(list.tiers, tierIndex, delta)
            })
          }
        />
        <button
          type="button"
          className="cat-action"
          onClick={() => {
            const copy = duplicateTier(draft, tier, service.id)
            edit((next) => {
              tiers(next).splice(tierIndex + 1, 0, copy)
            })
            if (selection.kind === 'tier') {
              onSelect({ ...selection, tier: copy.id })
            }
          }}
        >
          <Copy size={16} aria-hidden="true" />
          Duplicar
        </button>
        <SiteLink href={siteHref(selection)} />
        <ConfirmButton
          label="Remover plano"
          onConfirm={() =>
            edit((next) => {
              tiers(next).splice(tierIndex, 1)
            })
          }
        />
      </DetailHead>

      {warnings.length > 0 ? (
        <p className="cat-warn">
          <Warning size={14} weight="fill" aria-hidden="true" /> {warnings.join(' ')}
        </p>
      ) : null}

      <div className="cat-form">
        <div className="cat-form__pair cat-form__pair--price">
          <Field label="Preço">
            <NumberInput prefix="R$" step={10} value={tier.price} onChange={(price) => set({ price })} />
          </Field>
          <Field label="Horas internas" hint="Não aparece para o cliente.">
            <NumberInput step={0.5} value={tier.hours} onChange={(hours) => set({ hours })} />
          </Field>
        </div>
        <label className="cat-toggle">
          <input
            type="checkbox"
            checked={tier.featured}
            onChange={(event) => {
              const checked = event.target.checked
              edit((next) => {
                tiers(next).forEach((item, index) => {
                  item.featured = index === tierIndex ? checked : false
                })
              })
            }}
          />
          <span>
            <b>Mais escolhido</b>
            <small>Destaca este plano. Só um por serviço.</small>
          </span>
        </label>
        <Field label="Nome">
          <input value={tier.name} onChange={(event) => set({ name: event.target.value })} />
        </Field>
        <Field label="Para quem é">
          <input value={tier.need} onChange={(event) => set({ need: event.target.value })} />
        </Field>
        <Field label="Cobertura ou captação">
          <input value={tier.capture} onChange={(event) => set({ capture: event.target.value })} />
        </Field>
        <Field label="Entregas" hint="Uma por linha.">
          <textarea
            rows={Math.max(4, tier.delivery.length + 1)}
            value={tier.delivery.join('\n')}
            onChange={(event) => set({ delivery: event.target.value.split('\n') })}
          />
        </Field>
      </div>
    </>
  )
}
