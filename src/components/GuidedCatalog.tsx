import { Choice } from './Choice'
import { PickedCombo, PickedPlan } from './PickedPlan'
import type { Category, PricingLine, Service, Tier } from '../content/pricing'
import {
  comboPair,
  discountLabel,
  formatBRL,
  hasCombo,
  pairedCombos,
} from '../content/pricing'
import type { LineId, PlanosState } from '../lib/planosState'
import { COMBO } from '../lib/planosState'

type GuidedCatalogProps = {
  line: PricingLine
  state: PlanosState
  onChange: (next: PlanosState) => void
  planMessage: string
  phone: string
}

export function GuidedCatalog({ line, state, onChange, planMessage, phone }: GuidedCatalogProps) {
  const single = line.categories.length === 1
  const category = single
    ? line.categories[0]
    : line.categories.find((item) => item.id === state.cat)

  function selectCategory(id: string) {
    onChange({ ...state, tipo: line.id as LineId, cat: id, serv: null, plano: null, plano2: null })
  }

  return (
    <div className="guide" aria-live="polite">
      <h2 className="guide__title" id="guia-titulo">
        {line.title}
      </h2>
      <p className="guide__promise">{line.promise}</p>

      {single ? null : (
        <>
          <p className="guide__prompt">{line.prompt}</p>
          <div className="choices">
            {line.categories.map((item) => (
              <Choice
                key={item.id}
                selected={category?.id === item.id}
                onSelect={() => selectCategory(item.id)}
              >
                <span className="choice__name">{item.title}</span>
                <span className="choice__need">{item.promise}</span>
                {item.hint ? <span className="choice__hint">{item.hint}</span> : null}
              </Choice>
            ))}
          </div>
        </>
      )}

      {category ? (
        <CategoryPanel
          key={category.id}
          line={line}
          category={category}
          single={single}
          state={state}
          onChange={onChange}
          planMessage={planMessage}
          phone={phone}
        />
      ) : null}
    </div>
  )
}

type CategoryPanelProps = GuidedCatalogProps & {
  category: Category
  single: boolean
}

function CategoryPanel({
  line,
  category,
  single,
  state,
  onChange,
  planMessage,
  phone,
}: CategoryPanelProps) {
  const combo = hasCombo(category)
  const service = category.services.find((item) => item.id === state.serv)
  const comboOpen = combo && state.serv === COMBO
  const active = comboOpen ? COMBO : (service?.id ?? category.services[0]?.id ?? null)
  const activeService = comboOpen ? undefined : (service ?? category.services[0])
  const context = single ? line.title : category.title

  function go(patch: Partial<PlanosState>) {
    onChange({
      ...state,
      tipo: line.id as LineId,
      cat: category.id,
      serv: active,
      plano: null,
      plano2: null,
      ...patch,
    })
  }

  const showTabs = category.services.length > 1 || combo

  return (
    <section className="guide__category" aria-labelledby="guia-categoria">
      <h3 className="guide__subtitle" id="guia-categoria">
        {single ? line.prompt : category.title}
      </h3>
      {!single && category.hint ? <p className="guide__hint">{category.hint}</p> : null}

      {showTabs ? (
        <div className="tabs" role="tablist" aria-label="Tipo de serviço">
          {category.services.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active === item.id}
              className={`tab${active === item.id ? ' tab--on' : ''}`}
              onClick={() => go({ serv: item.id })}
            >
              {item.title}
            </button>
          ))}
          {combo ? (
            <button
              type="button"
              role="tab"
              aria-selected={comboOpen}
              className={`tab${comboOpen ? ' tab--on' : ''}`}
              onClick={() => go({ serv: COMBO })}
            >
              Os dois
              <span className="tab__badge">−{discountLabel(category.comboDiscount)}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div role={showTabs ? 'tabpanel' : undefined}>
        {activeService ? (
          <ServicePanel
            service={activeService}
            context={context}
            unit={line.unit}
            selectedId={state.plano}
            onSelect={(id) => go({ serv: activeService.id, plano: id })}
            planMessage={planMessage}
            phone={phone}
          />
        ) : null}
        {comboOpen && category.comboMode === 'paired' ? (
          <PairedCombo
            category={category}
            context={context}
            unit={line.unit}
            selectedId={state.plano}
            onSelect={(id) => go({ serv: COMBO, plano: id })}
            planMessage={planMessage}
            phone={phone}
          />
        ) : null}
        {comboOpen && category.comboMode === 'free' ? (
          <FreeCombo
            category={category}
            context={context}
            unit={line.unit}
            firstId={state.plano}
            secondId={state.plano2}
            onSelect={(plano, plano2) => go({ serv: COMBO, plano, plano2 })}
            planMessage={planMessage}
            phone={phone}
          />
        ) : null}
      </div>
    </section>
  )
}

type Shared = {
  context: string
  unit: PricingLine['unit']
  planMessage: string
  phone: string
}

function unitSuffix(unit: PricingLine['unit']): string {
  return unit === 'month' ? '/mês' : ''
}

function TierChoice({
  tier,
  selected,
  unit,
  onSelect,
}: {
  tier: Tier
  selected: boolean
  unit: PricingLine['unit']
  onSelect: () => void
}) {
  return (
    <Choice selected={selected} featured={tier.featured} onSelect={onSelect}>
      <span className="choice__name">{tier.name}</span>
      <span className="choice__price">
        {formatBRL(tier.price)}
        {unitSuffix(unit)}
      </span>
      <span className="choice__need">{tier.need}</span>
    </Choice>
  )
}

function ServicePanel({
  service,
  context,
  unit,
  selectedId,
  onSelect,
  planMessage,
  phone,
}: Shared & {
  service: Service
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const selected = service.tiers.find((tier) => tier.id === selectedId)
  return (
    <>
      <p className="guide__lead">{service.lead}</p>
      <div className="choices">
        {service.tiers.map((tier) => (
          <TierChoice
            key={tier.id}
            tier={tier}
            unit={unit}
            selected={selected?.id === tier.id}
            onSelect={() => onSelect(tier.id)}
          />
        ))}
      </div>
      {selected ? (
        <PickedPlan
          tier={selected}
          label={`${service.title} · ${context}`}
          unit={unit}
          planMessage={planMessage}
          phone={phone}
        />
      ) : null}
    </>
  )
}

function PairedCombo({
  category,
  context,
  unit,
  selectedId,
  onSelect,
  planMessage,
  phone,
}: Shared & {
  category: Category
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const pairs = pairedCombos(category)
  const selected = pairs.find((pair) => pair.first.id === selectedId)
  const [firstService, secondService] = category.services

  return (
    <>
      <p className="guide__lead">{category.comboNote}</p>
      <div className="choices">
        {pairs.map((pair) => (
          <Choice
            key={pair.first.id}
            selected={selected?.first.id === pair.first.id}
            featured={pair.first.featured}
            onSelect={() => onSelect(pair.first.id)}
          >
            <span className="choice__name">{pair.first.name}</span>
            <span className="choice__price">
              <s className="choice__full">{formatBRL(pair.full)}</s> {formatBRL(pair.price)}
              {unitSuffix(unit)}
            </span>
            <span className="choice__need">{pair.first.capture}</span>
          </Choice>
        ))}
      </div>
      {selected ? (
        <PickedCombo
          name={`${selected.first.name} · ${firstService.title} + ${secondService.title}`}
          label={context}
          pair={selected}
          services={[firstService.title, secondService.title]}
          note={`${discountLabel(category.comboDiscount)} de desconto sobre os dois planos separados.`}
          unit={unit}
          planMessage={planMessage}
          phone={phone}
        />
      ) : null}
    </>
  )
}

function FreeCombo({
  category,
  context,
  unit,
  firstId,
  secondId,
  onSelect,
  planMessage,
  phone,
}: Shared & {
  category: Category
  firstId: string | null
  secondId: string | null
  onSelect: (first: string | null, second: string | null) => void
}) {
  const [firstService, secondService] = category.services
  const first = firstService.tiers.find((tier) => tier.id === firstId)
  const second = secondService.tiers.find((tier) => tier.id === secondId)
  const pair = first && second ? comboPair(category, first, second) : null

  return (
    <>
      <p className="guide__lead">{category.comboNote}</p>
      {[
        { service: firstService, picked: first, pick: (id: string) => onSelect(id, second?.id ?? null) },
        { service: secondService, picked: second, pick: (id: string) => onSelect(first?.id ?? null, id) },
      ].map(({ service, picked, pick }) => (
        <div className="combo-group" key={service.id}>
          <h4 className="combo-group__title">{service.title}</h4>
          <div className="choices">
            {service.tiers.map((tier) => (
              <TierChoice
                key={tier.id}
                tier={tier}
                unit={unit}
                selected={picked?.id === tier.id}
                onSelect={() => pick(tier.id)}
              />
            ))}
          </div>
        </div>
      ))}
      {pair ? (
        <PickedCombo
          name={`${pair.first.name} + ${pair.second.name}`}
          label={context}
          pair={pair}
          services={[firstService.title, secondService.title]}
          note={`${discountLabel(category.comboDiscount)} de desconto sobre os dois planos separados.`}
          unit={unit}
          planMessage={planMessage}
          phone={phone}
        />
      ) : (
        <p className="guide__hint">Escolha um plano de cada para ver o valor do pacote.</p>
      )}
    </>
  )
}
