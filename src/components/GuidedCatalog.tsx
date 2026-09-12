import { Choice } from './Choice'
import { PickedPlan } from './PickedPlan'
import type { PricingLine } from '../content/pricing'
import type { OcasioesChoices } from '../content/types'
import type { Entrega, LineId, PlanosState, Tempo } from '../lib/planosState'
import { ocasioesTierId } from '../lib/planosState'

type GuidedCatalogProps = {
  line: PricingLine
  state: PlanosState
  onChange: (next: PlanosState) => void
  choices: OcasioesChoices
  planMessage: string
  phone: string
}

export function GuidedCatalog({ line, state, onChange, choices, planMessage, phone }: GuidedCatalogProps) {
  return (
    <div className="guide" aria-live="polite">
      <h2 className="guide__title" id="guia-titulo">
        {line.title}
      </h2>
      <p className="guide__promise">{line.promise}</p>
      {line.id === 'ocasioes' ? (
        <OcasioesGuide
          line={line}
          state={state}
          onChange={onChange}
          choices={choices}
          planMessage={planMessage}
          phone={phone}
        />
      ) : (
        <SimpleGuide
          line={line}
          state={state}
          onChange={onChange}
          choices={choices}
          planMessage={planMessage}
          phone={phone}
        />
      )}
    </div>
  )
}

function SimpleGuide({ line, state, onChange, planMessage, phone }: GuidedCatalogProps) {
  const selected = line.tiers.find((tier) => tier.id === state.plano)

  return (
    <>
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
    </>
  )
}

function OcasioesGuide({ line, state, onChange, choices, planMessage, phone }: GuidedCatalogProps) {
  const tierId = ocasioesTierId(state.entrega, state.tempo)
  const selected = line.tiers.find((tier) => tier.id === tierId)

  function setEntrega(entrega: Entrega) {
    onChange({ ...state, tipo: 'ocasioes', plano: null, entrega, tempo: state.tempo })
  }

  function setTempo(tempo: Tempo) {
    onChange({ ...state, tipo: 'ocasioes', plano: null, entrega: state.entrega, tempo })
  }

  return (
    <>
      <p className="guide__prompt">{choices.receivePrompt}</p>
      <div className="choices">
        <Choice selected={state.entrega === 'bruto'} onSelect={() => setEntrega('bruto')}>
          <span className="choice__name">{choices.bruto.label}</span>
          <span className="choice__need">{choices.bruto.lead}</span>
        </Choice>
        <Choice selected={state.entrega === 'editado'} onSelect={() => setEntrega('editado')}>
          <span className="choice__name">{choices.editado.label}</span>
          <span className="choice__need">{choices.editado.lead}</span>
        </Choice>
      </div>

      {state.entrega ? (
        <>
          <p className="guide__prompt">{choices.timePrompt}</p>
          <div className="choices">
            <Choice selected={state.tempo === 'meia'} onSelect={() => setTempo('meia')}>
              <span className="choice__name">{choices.meia.label}</span>
              <span className="choice__need">{choices.meia.lead}</span>
            </Choice>
            <Choice selected={state.tempo === 'diaria'} onSelect={() => setTempo('diaria')}>
              <span className="choice__name">{choices.diaria.label}</span>
              <span className="choice__need">{choices.diaria.lead}</span>
            </Choice>
          </div>
        </>
      ) : null}

      {selected ? (
        <PickedPlan tier={selected} unit={line.unit} planMessage={planMessage} phone={phone} />
      ) : null}
    </>
  )
}
