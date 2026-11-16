import { ArrowSquareOut, DeviceMobile, FilmSlate, Image as ImageIcon, Images, VideoCamera } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { PlanFormat, PlanSection } from '../../shared/portalPlan'
import type { ItemStatus, PlanSummary } from '../../shared/portalStatus'

export function ProgressText({ resumo }: { resumo: PlanSummary }) {
  if (resumo.total === 0) return <span className="portal-muted portal-small">Sem posts</span>
  if (resumo.aprovados === resumo.total) {
    return <span className="portal-progress portal-progress--done">Tudo aprovado · {resumo.total} posts</span>
  }
  const parts = [`${resumo.aprovados} de ${resumo.total} aprovados`]
  if (resumo.ajustes) parts.push(`${resumo.ajustes} com ajuste`)
  if (resumo.pendentes) parts.push(`${resumo.pendentes} para ver`)
  return <span className="portal-progress">{parts.join(' · ')}</span>
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  aprovado: 'Aprovado',
  ajuste: 'Ajuste pedido',
  pendente: 'Para avaliar',
}

const STATUS_CLASS: Record<ItemStatus, string> = {
  aprovado: 'portal-chip--ok',
  ajuste: 'portal-chip--fix',
  pendente: 'portal-chip--wait',
}

export function StatusChip({ status, updated }: { status: ItemStatus; updated?: boolean }) {
  return (
    <span className={`portal-chip ${STATUS_CLASS[status]}`}>
      {updated && status === 'pendente' ? 'Atualizado · para avaliar' : STATUS_LABEL[status]}
    </span>
  )
}

const FORMAT: Record<PlanFormat, { label: string; icon: ReactNode }> = {
  reels: { label: 'Reels', icon: <FilmSlate aria-hidden="true" /> },
  foto: { label: 'Foto', icon: <ImageIcon aria-hidden="true" /> },
  carrossel: { label: 'Carrossel', icon: <Images aria-hidden="true" /> },
  stories: { label: 'Stories', icon: <DeviceMobile aria-hidden="true" /> },
  video: { label: 'Vídeo', icon: <VideoCamera aria-hidden="true" /> },
}

export function FormatChip({ formato }: { formato: PlanFormat }) {
  const f = FORMAT[formato] ?? FORMAT.video
  return (
    <span className="portal-chip portal-chip--format">
      {f.icon}
      {f.label}
    </span>
  )
}

/** Destaca as deixas de cena escritas entre colchetes: "[caixa vazia] Alguns presentes…". */
function withCues(line: string) {
  return line.split(/(\[[^\]]+\])/).map((part, i) =>
    part.startsWith('[') && part.endsWith(']') ? (
      <span key={i} className="portal-cue">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

export function Section({ section }: { section: PlanSection }) {
  switch (section.tipo) {
    case 'texto':
      return (
        <div className="portal-section">
          <h4>{section.titulo}</h4>
          <p className="portal-pre">{section.texto}</p>
        </div>
      )
    case 'roteiro':
      return (
        <div className="portal-section">
          <h4>{section.titulo}</h4>
          <div className="portal-script">
            {section.linhas.map((linha, i) => (
              <p key={i}>{withCues(linha)}</p>
            ))}
          </div>
        </div>
      )
    case 'cortes':
      return (
        <div className="portal-section">
          <h4>{section.titulo}</h4>
          <ol className="portal-cuts">
            {section.cortes.map((corte, i) => (
              <li key={i}>
                <span className="portal-cuts__time">{corte.tempo}</span>
                <div className="portal-cuts__body">
                  {corte.cena ? (
                    <p>
                      <b>Cena</b>
                      {corte.cena}
                    </p>
                  ) : null}
                  {corte.tela ? (
                    <p className="portal-cuts__screen">
                      <b>Na tela</b>
                      {corte.tela}
                    </p>
                  ) : null}
                  {corte.fala ? (
                    <p className="portal-cuts__speech">
                      <b>Fala / áudio</b>
                      {corte.fala}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )
    case 'referencia':
      return (
        <div className="portal-section">
          <h4>{section.titulo}</h4>
          {section.texto ? <p className="portal-pre">{section.texto}</p> : null}
          <a className="portal-ref" href={section.url} target="_blank" rel="noreferrer noopener">
            Ver referência <ArrowSquareOut aria-hidden="true" />
            <span className="portal-visually-hidden"> (abre em outra aba)</span>
          </a>
        </div>
      )
    default:
      return null
  }
}
