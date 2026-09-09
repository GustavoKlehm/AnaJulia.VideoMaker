import { useEffect, useRef, useState } from 'react'

export function useInView<T extends HTMLElement>(enabled: boolean) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(!enabled)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const node = ref.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled])

  return { ref, inView }
}
