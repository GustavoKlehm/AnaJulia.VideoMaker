import type { ReactNode } from 'react'
import { ArrowRight } from '@phosphor-icons/react'

type ChoiceProps = {
  selected: boolean
  featured?: boolean
  onSelect: () => void
  children: ReactNode
}

export function Choice({ selected, featured = false, onSelect, children }: ChoiceProps) {
  const classes = [
    'choice',
    selected && 'choice--on',
    featured && 'choice--featured',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={classes} aria-pressed={selected} onClick={onSelect}>
      <span className="choice__flag">{featured ? 'Mais escolhido' : ''}</span>
      <span className="choice__body">{children}</span>
      <ArrowRight className="choice__go" size={16} weight="regular" aria-hidden="true" />
    </button>
  )
}
