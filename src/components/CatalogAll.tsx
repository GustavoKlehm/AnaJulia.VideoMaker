import { PlanTier } from './PlanTier'
import type { Category, PricingLine } from '../content/pricing'
import { comboPair, discountLabel, formatBRL, hasCombo, pairedCombos } from '../content/pricing'

type CatalogAllProps = {
  line: PricingLine
  planMessage: string
  phone: string
}

/** Todos os planos de uma linha, categoria por categoria, para quem quer comparar. */
export function CatalogAll({ line, planMessage, phone }: CatalogAllProps) {
  const single = line.categories.length === 1

  return (
    <>
      {line.categories.map((category) => {
        const context = single ? line.title : category.title
        return (
          <div className="all-category" key={category.id}>
            {single ? null : (
              <div className="all-category__head">
                <h3 className="all-category__title">{category.title}</h3>
                <p className="line__lead">{category.promise}</p>
                {category.hint ? <p className="line__hint">{category.hint}</p> : null}
              </div>
            )}
            {category.services.map((service) => (
              <div className="all-service" key={service.id}>
                <h4 className="all-service__title">{service.title}</h4>
                <p className="all-service__lead">{service.lead}</p>
                <div className="tiers">
                  {service.tiers.map((tier) => (
                    <PlanTier
                      key={tier.id}
                      tier={tier}
                      label={`${service.title} · ${context}`}
                      unit={line.unit}
                      planMessage={planMessage}
                      phone={phone}
                    />
                  ))}
                </div>
              </div>
            ))}
            {hasCombo(category) ? <ComboTable category={category} unit={line.unit} /> : null}
          </div>
        )
      })}
    </>
  )
}

function ComboTable({ category, unit }: { category: Category; unit: PricingLine['unit'] }) {
  const [first, second] = category.services
  const suffix = unit === 'month' ? '/mês' : ''
  const title = `${first.title} + ${second.title}`

  return (
    <div className="all-service">
      <h4 className="all-service__title">
        Os dois <span className="tab__badge">−{discountLabel(category.comboDiscount)}</span>
      </h4>
      <p className="all-service__lead">{category.comboNote}</p>
      <div className="combo-table__wrap">
        {category.comboMode === 'paired' ? (
          <table className="combo-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Plano</th>
                <th scope="col">Cobertura</th>
                <th scope="col">Separados</th>
                <th scope="col">Os dois</th>
              </tr>
            </thead>
            <tbody>
              {pairedCombos(category).map((pair) => (
                <tr key={pair.first.id}>
                  <th scope="row">{pair.first.name}</th>
                  <td>{pair.first.capture}</td>
                  <td>
                    <s>{formatBRL(pair.full)}</s>
                  </td>
                  <td className="combo-table__price">
                    {formatBRL(pair.price)}
                    {suffix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="combo-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">
                  {first.title} \ {second.title}
                </th>
                {second.tiers.map((tier) => (
                  <th scope="col" key={tier.id}>
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {first.tiers.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{row.name}</th>
                  {second.tiers.map((col) => (
                    <td className="combo-table__price" key={col.id}>
                      {formatBRL(comboPair(category, row, col).price)}
                      {suffix}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
