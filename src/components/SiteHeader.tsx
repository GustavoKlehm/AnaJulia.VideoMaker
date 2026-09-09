import { brand, nav } from '../content/site'
import './SiteHeader.css'

type SiteHeaderProps = {
  onCinema: boolean
}

export function SiteHeader({ onCinema }: SiteHeaderProps) {
  return (
    <header className={`site-header${onCinema ? ' site-header--cinema' : ''}`}>
      <a className="site-header__brand" href="#inicio">
        <img
          src={onCinema ? brand.iconNegative : brand.icon}
          width={820}
          height={820}
          alt="Ana Julia"
        />
      </a>
      <nav className="site-header__nav" aria-label="Principal">
        {nav.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
    </header>
  )
}
