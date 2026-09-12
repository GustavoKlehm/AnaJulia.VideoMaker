import { planWhatsappMessage } from '../content/cmsMap'
import type { PricingLine, Tier } from '../content/pricing'
import { formatBRL } from '../content/pricing'
import { whatsappLink } from '../content/site'

type PickedPlanProps = {
  tier: Tier
  unit: PricingLine['unit']
  planMessage: string
  phone: string
}

export function PickedPlan({ tier, unit, planMessage, phone }: PickedPlanProps) {
  return (
    <article className={`picked${tier.featured ? ' picked--featured' : ''}`}>
      {tier.featured ? <p className="picked__flag">Mais escolhido</p> : null}
      <h3 className="picked__name">{tier.name}</h3>
      <p className="picked__price">
        {formatBRL(tier.price)}
        {unit === 'month' ? <span className="picked__unit">/mês</span> : null}
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
        href={whatsappLink(planWhatsappMessage(planMessage, tier.name), phone)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Quero este
      </a>
    </article>
  )
}
