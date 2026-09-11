import { brand, nav } from '../content/site'
import { navHref, useRoute } from '../lib/router'
import { RouteLink } from './RouteLink'
import './SiteHeader.css'

type SiteHeaderProps = {
  onCinema: boolean
}

export function SiteHeader({ onCinema }: SiteHeaderProps) {
  const route = useRoute()

  return (
    <header className={`site-header${onCinema ? ' site-header--cinema' : ''}`}>
      <RouteLink className="site-header__brand" to="/">
        <img
          src={onCinema ? brand.iconNegative : brand.icon}
          width={820}
          height={820}
          alt="Ana Julia"
        />
      </RouteLink>
      <nav className="site-header__nav" aria-label="Principal">
        {nav.map((item) =>
          item.route ? (
            <RouteLink key={item.href} to={item.href}>
              {item.label}
            </RouteLink>
          ) : (
            <a key={item.href} href={navHref(item, route)}>
              {item.label}
            </a>
          ),
        )}
      </nav>
    </header>
  )
}
