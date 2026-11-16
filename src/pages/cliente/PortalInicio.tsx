import { useEffect, useState, type CSSProperties } from 'react'
import { ArrowRight, SignOut } from '@phosphor-icons/react'
import { RouteLink } from '../../components/RouteLink'
import { periodLabel } from '../../lib/portalCalendar'
import { loadOverview, type PlanWithSummary, type PortalClient } from '../../lib/portalData'
import { portalTheme } from '../../lib/portalTheme'
import { ProgressText } from './PortalParts'

type PortalInicioProps = {
  isAdmin: boolean
  onSignOut: () => void
}

type Overview = { client: PortalClient; plans: PlanWithSummary[] }[]

export function PortalInicio({ isAdmin, onSignOut }: PortalInicioProps) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadOverview()
      .then(setOverview)
      .catch(() => setError('Não deu para carregar seus planos agora. Tente de novo em instantes.'))
  }, [])

  const single = overview?.length === 1 ? overview[0].client : null
  const style = single ? (portalTheme(single.cor_principal, single.cor_secundaria) as CSSProperties) : undefined

  return (
    <div className="portal" style={style}>
      <header className="portal-top">
        <span className="portal-top__name">{single ? single.nome : 'Área do cliente'}</span>
        <button className="portal-link-button" type="button" onClick={onSignOut}>
          <SignOut aria-hidden="true" /> Sair
        </button>
      </header>

      <main className="portal-main" id="conteudo">
        {isAdmin ? (
          <p className="portal-banner" role="note">
            Você está como Ana: vê todos os clientes, inclusive prévias, só para conferir.
          </p>
        ) : null}

        <div className="portal-hero">
          <p className="portal-eyebrow">{single ? single.nome : 'Planejamentos'}</p>
          <h1>Seus planos de conteúdo</h1>
        </div>

        {error ? <p className="portal-error" role="alert">{error}</p> : null}
        {!overview && !error ? <p className="portal-muted" aria-busy="true">Carregando…</p> : null}

        {overview && overview.length === 0 ? (
          <p className="portal-muted">Ainda não tem nenhum plano por aqui. Assim que a Ana enviar, ele aparece nesta página.</p>
        ) : null}

        {overview?.map(({ client, plans }) => (
          <section key={client.id} className="portal-client" aria-labelledby={`c-${client.id}`}>
            {!single ? (
              <h2 id={`c-${client.id}`} className="portal-client__name">
                <span
                  className="portal-swatch"
                  style={{ background: client.cor_principal }}
                  aria-hidden="true"
                />
                {client.nome}
              </h2>
            ) : (
              <h2 id={`c-${client.id}`} className="portal-visually-hidden">
                {client.nome}
              </h2>
            )}
            {plans.length === 0 ? <p className="portal-muted">Nenhum plano enviado ainda.</p> : null}
            <ul className="portal-plan-list">
              {plans.map((plan) => (
                <li key={plan.id}>
                  <RouteLink className="portal-plan-card" to={`/cliente/${client.slug}/${plan.periodo}`}>
                    <span className="portal-plan-card__text">
                      <span className="portal-plan-card__period">{periodLabel(plan.inicio, plan.fim)}</span>
                      <span className="portal-plan-card__title">{plan.titulo}</span>
                      <ProgressText resumo={plan.resumo} />
                      {plan.status === 'previa' ? <span className="portal-chip portal-chip--wait">Prévia</span> : null}
                    </span>
                    <ArrowRight className="portal-plan-card__arrow" aria-hidden="true" />
                  </RouteLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>

      <footer className="portal-footer">Planejamento feito por Ana Julia Videomaker</footer>
    </div>
  )
}
