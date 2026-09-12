import { InstagramLogo, WhatsappLogo } from '@phosphor-icons/react'
import { SiteHeader } from '../components/SiteHeader'
import { PlanTier } from '../components/PlanTier'
import { Reveal } from '../components/Reveal'
import type { PricingLine } from '../content/pricing'
import { addOns, custom, formatBRL, lines, pieces, rules } from '../content/pricing'
import { contact, whatsappLink } from '../content/site'
import './PlanosPage.css'

function startingAt(line: PricingLine): string {
  const lowest = Math.min(...line.tiers.map((tier) => tier.price))
  const suffix = line.unit === 'month' ? '/mês' : ''
  return `A partir de ${formatBRL(lowest)}${suffix}`
}

export function PlanosPage() {
  return (
    <>
      <a className="skip-link" href="#planos-conteudo">
        Ir ao conteúdo
      </a>
      <SiteHeader onCinema={false} />

      <main className="planos" id="planos-conteudo">
        <section className="planos__intro">
          <Reveal>
            <p className="planos__eyebrow">Planos</p>
            <h1 className="planos__title">Quanto custa guardar um momento</h1>
            <p className="planos__lead">
              Cada plano diz exatamente quanto tempo eu fico com você, o que você
              recebe e em quanto tempo. Sem valor escondido e sem surpresa no meio
              do caminho.
            </p>
          </Reveal>
        </section>

        {lines.map((line) => (
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
                  <PlanTier key={tier.id} tier={tier} unit={line.unit} />
                ))}
              </div>
            </div>
          </section>
        ))}

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
                href={whatsappLink(
                  'Olá! Vim pelo site e queria um orçamento personalizado.',
                )}
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
                Adicionais
              </h2>
              <p className="line__lead">
                Valem para qualquer plano e sempre aparecem discriminados no
                orçamento, nunca embutidos no total.
              </p>
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
                O que é cada peça
              </h2>
              <p className="line__lead">
                O filme é para guardar, o teaser é para postar, os cortes são para
                não sumir do feed. Cada um dá um trabalho diferente — é por isso que
                os planos custam preços diferentes.
              </p>
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
                Como funciona
              </h2>
              <p className="line__lead">
                As mesmas condições para todo mundo, combinadas antes de começar.
              </p>
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
                Conte o momento que você quer guardar
              </h2>
              <div className="planos__links">
                <a
                  className="tier__cta"
                  href={whatsappLink(
                    'Olá! Vim pela página de planos e queria conversar sobre um projeto.',
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsappLogo size={20} weight="regular" aria-hidden="true" />
                  WhatsApp
                </a>
                <a
                  className="tier__cta"
                  href={contact.instagramDm}
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
