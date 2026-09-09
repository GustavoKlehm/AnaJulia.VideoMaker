import type { ReactNode } from 'react'
import { useInView } from '../hooks/useInView'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

type RevealProps = {
  children: ReactNode
  className?: string
}

export function Reveal({ children, className = '' }: RevealProps) {
  const reduced = usePrefersReducedMotion()
  const motion = !reduced
  const { ref, inView } = useInView<HTMLDivElement>(motion)
  const classes = [className, motion && 'reveal', motion && inView && 'is-in']
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={ref} className={classes}>
      {children}
    </div>
  )
}
