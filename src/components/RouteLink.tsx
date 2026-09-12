import type { MouseEvent, ReactNode } from 'react'
import { navigate } from '../lib/router'

type RouteLinkProps = {
  to: string
  className?: string
  children: ReactNode
  'aria-label'?: string
}

export function RouteLink({ to, className, children, 'aria-label': ariaLabel }: RouteLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return
    }
    event.preventDefault()
    navigate(to)
    window.scrollTo({ top: 0 })
  }

  return (
    <a className={className} href={to} aria-label={ariaLabel} onClick={handleClick}>
      {children}
    </a>
  )
}
