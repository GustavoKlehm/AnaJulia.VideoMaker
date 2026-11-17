import { planWhatsappMessage } from '../content/cmsMap'
import type { PricingLine, Tier } from '../content/pricing'
import { formatBRL } from '../content/pricing'
import { whatsappLink } from '../content/site'

type PlanTierProps = {
  tier: Tier
  /** Serviço e categoria, ex.: "Storymaker · Casamentos", para a mensagem do WhatsApp. */
  label: string
  unit: PricingLine['unit']
  planMessage: string
  phone: string
}

export function PlanTier({ tier, label, unit, planMessage, phone }: PlanTierProps) {
  const classes = `tier${tier.featured ? ' tier--featured' : ''}`

  return (
    <article className={classes}>
      <p className="tier__flag">{tier.featured ? 'Mais escolhido' : ''}</p>
      <h3 className="tier__name">{tier.name}</h3>
      <p className="tier__price">
        {formatBRL(tier.price)}
        {unit === 'month' ? <span className="tier__unit">/mês</span> : null}
      </p>
      <p className="tier__need">{tier.need}</p>
      <p className="tier__capture">{tier.capture}</p>
      <ul className="tier__delivery">
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
