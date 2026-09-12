import { ArrowRight, InstagramLogo, WhatsappLogo } from '@phosphor-icons/react'
import { SiteHeader } from '../components/SiteHeader'
import { PlanTier } from '../components/PlanTier'
import { GuidedCatalog } from '../components/GuidedCatalog'
import { Reveal } from '../components/Reveal'
import { useCms } from '../content/cmsContext'
import type { PricingLine } from '../content/pricing'
import { formatBRL } from '../content/pricing'
import { whatsappLink } from '../content/site'
import type { LineId, PlanosState } from '../lib/planosState'
import { usePlanosState } from '../lib/planosState'
import './PlanosPage.css'

function startingAt(line: PricingLine): string {
  const lowest = Math.min(...line.tiers.map((tier) => tier.price))
  const suffix = line.unit === 'month' ? '/mês' : ''
  return `A partir de ${formatBRL(lowest)}${suffix}`
}

function emptyState(): PlanosState {
  return { view: 'guided', tipo: null, plano: null, entrega: null, tempo: null }
}

export function PlanosPage() {
  const { site, pricing } = useCms()
  const { lines, addOns, pieces, rules, custom } = pricing
  const [state, setState] = usePlanosState()
  const activeLine = lines.find((line) => line.id === state.tipo)

  function selectTipo(tipo: LineId) {
    setState({
      view: 'guided',
      tipo,
      plano: null,
      entrega: null,
      tempo: null,
    })
  }

  return (
    <>
      <a className="skip-link" href="#planos-conteudo">
        Ir ao conteúdo
      </a>
      <SiteHeader onCinema={false} />

      <main className="planos" id="planos-conteudo">
        <section className="planos__intro">
          <Reveal>
            <p className="planos__eyebrow">{site.planos.eyebrow}</p>
            <h1 className="planos__title" id="planos-pergunta">
              {site.planos.heading}
            </h1>
            <p className="planos__lead">{site.planos.lead}</p>
          </Reveal>
        </section>

        <section className="seek" aria-labelledby="planos-pergunta">
          <div className="seek__inner">
            <div className="seek__lines" role="tablist" aria-labelledby="planos-pergunta">
              {lines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  role="tab"
                  aria-selected={state.view === 'guided' && state.tipo === line.id}
                  className={`seek__line${state.view === 'guided' && state.tipo === line.id ? ' seek__line--on' : ''}`}
                  onClick={() => selectTipo(line.id as LineId)}
                >
                  <span className="seek__body">
                    <span className="seek__name">{line.title}</span>
                    <span className="seek__promise">{line.promise}</span>
                  </span>
                  <ArrowRight
                    className="seek__go"
                    size={16}
                    weight="regular"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              className="seek__toggle"
              onClick={() =>
                setState(
                  state.view === 'all'
                    ? emptyState()
                    : { ...emptyState(), view: 'all' },
                )
              }
            >
              {state.view === 'all' ? 'Escolher pelo que você procura' : 'Ver todos os planos'}
            </button>
          </div>
        </section>

        {state.view === 'guided' && activeLine ? (
          <section className="line" aria-labelledby="guia-titulo">
            <div className="line__inner line__inner--guide">
              <GuidedCatalog
                line={activeLine}
                state={state}
                onChange={setState}
                choices={pricing.ocasioesChoices}
                planMessage={site.messages.plan}
                phone={site.whatsappPhone}
              />
            </div>
          </section>
        ) : null}

        {state.view === 'all'
          ? lines.map((line) => (
              <section className="line" key={line.id} aria-labelledby={`linha-${line.id}`}>
                <div className="line__inner">
                  <Reveal className="line__head">
                    <h2 className="line__title" id={`linha-${line.id}`}>
                      {line.title}
                    </h2>
                    {line.display === 'from' ? (
                      <p className="line__from">{startingAt(line)}</p>
                    ) : null}
                    <p className="line__lead">{line.lead}</p>
                  </Reveal>
                  <div className="tiers">
                    {line.tiers.map((tier) => (
                      <PlanTier
                        key={tier.id}
                        tier={tier}
                        unit={line.unit}
                        planMessage={site.messages.plan}
                        phone={site.whatsappPhone}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ))
          : null}

        <section className="line" aria-labelledby="linha-personalizado">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-personalizado">
                {custom.title}
              </h2>
              <p className="line__lead">{custom.lead}</p>
              <p className="custom__floor">
                Orçamento mínimo de {formatBRL(custom.floor)}.
              </p>
              <a
                className="tier__cta custom__cta"
                href={whatsappLink(site.messages.custom, site.whatsappPhone)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Pedir orçamento
              </a>
            </Reveal>
          </div>
        </section>

        <section className="line" aria-labelledby="linha-adicionais">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-adicionais">
                {site.planos.addonsHeading}
              </h2>
              <p className="line__lead">{site.planos.addonsLead}</p>
            </Reveal>
            <dl className="addons">
              {addOns.map((addOn) => (
                <div className="addons__row" key={addOn.id}>
                  <dt>{addOn.label}</dt>
                  <dd>{addOn.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="line" aria-labelledby="linha-pecas">
          <div className="line__inner">
            <Reveal>
              <h2 className="line__title" id="linha-pecas">
                {site.planos.piecesHeading}
              </h2>
              <p className="line__lead">{site.planos.piecesLead}</p>
            </Reveal>
            <div className="pieces">
              {pieces.map((piece) => (
                <article className="piece" key={piece.id}>
                  <h3 className="piece__name">{piece.name}</h3>
                  <p className="piece__purpose">{piece.purpose}</p>
                  <p className="piece__body">{piece.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="line" aria-labelledby="linha-regras">
          <div className="line__inner">
            <Reveal>
              <h2 className="line__title" id="linha-regras">
                {site.planos.rulesTitle}
              </h2>
              <p className="line__lead">{site.planos.rulesLead}</p>
            </Reveal>
            <div className="rules">
              {rules.map((rule) => (
                <article className="rule" key={rule.id}>
                  <h3 className="rule__title">{rule.title}</h3>
                  <p className="rule__body">{rule.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="line planos__cta-final" aria-labelledby="linha-contato">
          <div className="line__inner line__inner--narrow">
            <Reveal>
              <h2 className="line__title" id="linha-contato">
                {site.planos.ctaHeading}
              </h2>
              <div className="planos__links">
                <a
                  className="tier__cta"
                  href={whatsappLink(site.messages.planosCta, site.whatsappPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsappLogo size={20} weight="regular" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  className="tier__cta"
                  href={site.instagramDmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <InstagramLogo size={20} weight="regular" aria-hidden="true" />
                  Direct
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
    </>
  )
}
