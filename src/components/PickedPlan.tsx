import { planWhatsappMessage } from '../content/cmsMap'
import type { ComboPair, PricingLine, Tier } from '../content/pricing'
import { formatBRL } from '../content/pricing'
import { whatsappLink } from '../content/site'

type PickedPlanProps = {
  tier: Tier
  /** Serviço e categoria, ex.: "Storymaker · Casamentos". */
  label: string
  unit: PricingLine['unit']
  planMessage: string
  phone: string
}

function Unit({ unit }: { unit: PricingLine['unit'] }) {
  return unit === 'month' ? <span className="picked__unit">/mês</span> : null
}

export function PickedPlan({ tier, label, unit, planMessage, phone }: PickedPlanProps) {
  return (
    <article className={`picked${tier.featured ? ' picked--featured' : ''}`}>
      {tier.featured ? <p className="picked__flag">Mais escolhido</p> : null}
      <p className="picked__label">{label}</p>
      <h3 className="picked__name">{tier.name}</h3>
      <p className="picked__price">
        {formatBRL(tier.price)}
        <Unit unit={unit} />
      </p>
      <p className="picked__need">{tier.need}</p>
      <ul className="picked__list">
        <li>{tier.capture}</li>
        {tier.delivery.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <a
        className="tier__cta"
        href={whatsappLink(planWhatsappMessage(planMessage, `${tier.name} (${label})`), phone)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Quero este
      </a>
    </article>
  )
}

type PickedComboProps = {
  name: string
  label: string
  pair: ComboPair
  services: [string, string]
  note: string
  unit: PricingLine['unit']
  planMessage: string
  phone: string
}

export function PickedCombo({
  name,
  label,
  pair,
  services,
  note,
  unit,
  planMessage,
  phone,
}: PickedComboProps) {
  const parts: [string, Tier][] = [
    [services[0], pair.first],
    [services[1], pair.second],
  ]
  return (
    <article className="picked picked--featured">
      <p className="picked__label">{label}</p>
      <h3 className="picked__name">{name}</h3>
      <p className="picked__price">
        <s className="picked__full">{formatBRL(pair.full)}</s> {formatBRL(pair.price)}
        <Unit unit={unit} />
      </p>
      <p className="picked__need">{note}</p>
      {parts.map(([service, tier]) => (
        <div className="picked__part" key={tier.id}>
          <p className="picked__part-title">
            {service}: {tier.name}
          </p>
          <ul className="picked__list">
            <li>{tier.capture}</li>
            {tier.delivery.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <a
        className="tier__cta"
        href={whatsappLink(planWhatsappMessage(planMessage, `${name} (${label})`), phone)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Quero os dois
      </a>
    </article>
  )
}
