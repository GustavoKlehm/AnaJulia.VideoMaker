import { Choice } from './Choice'
import { PickedPlan } from './PickedPlan'
import type { PricingLine } from '../content/pricing'
import type { LineId, PlanosState } from '../lib/planosState'

type GuidedCatalogProps = {
  line: PricingLine
  state: PlanosState
  onChange: (next: PlanosState) => void
  planMessage: string
  phone: string
}

export function GuidedCatalog({ line, state, onChange, planMessage, phone }: GuidedCatalogProps) {
  const selected = line.tiers.find((tier) => tier.id === state.plano)

  return (
    <div className="guide" aria-live="polite">
      <h2 className="guide__title" id="guia-titulo">
        {line.title}
      </h2>
      <p className="guide__promise">{line.promise}</p>
      <p className="guide__prompt">{line.prompt}</p>
      <div className="choices">
        {line.tiers.map((tier) => (
          <Choice
            key={tier.id}
            selected={state.plano === tier.id}
            featured={tier.featured}
            onSelect={() => onChange({ ...state, tipo: line.id as LineId, plano: tier.id })}
          >
            <span className="choice__name">{tier.name}</span>
            <span className="choice__need">{tier.need}</span>
          </Choice>
        ))}
      </div>
      {selected ? (
        <PickedPlan tier={selected} unit={line.unit} planMessage={planMessage} phone={phone} />
      ) : null}
    </div>
  )
}
