import { useEffect, useRef, useState } from 'react'
import { FishSimple, InstagramLogo, WhatsappLogo } from '@phosphor-icons/react'
import { SiteHeader } from '../components/SiteHeader'
import { Reveal } from '../components/Reveal'
import { RouteLink } from '../components/RouteLink'
import { useCms } from '../content/cmsContext'
import { whatsappLink } from '../content/site'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { hashTargetId } from '../lib/homeHash'
import './HomePage.css'

function Lines({ text }: { text: string }) {
  return text.split('\n').map((line, index) => (
    <span key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {line}
    </span>
  ))
}

export function HomePage() {
  const { site } = useCms()
  const reduced = usePrefersReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const userPaused = useRef(false)
  const [onCinema, setOnCinema] = useState(true)
  const [inHero, setInHero] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const hasVideo = Boolean(site.heroVideo) && !failed

  useEffect(() => {
    setVideoReady(false)
    setFailed(false)
    setPlaying(false)
  }, [site.heroVideo])

  useEffect(() => {
    const node = heroRef.current
    if (!node) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting)
        setOnCinema(visible)
        setInHero(visible)
        const video = videoRef.current
        if (video && !visible) {
          video.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.45 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoReady || reduced || userPaused.current || !inHero) {
      return
    }

    void video
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }, [videoReady, reduced, inHero])

  useEffect(() => {
    function scrollToHash() {
      const id = hashTargetId(window.location.hash)
      if (!id) {
        return
      }
      const target = document.getElementById(id)
      if (!target) {
        return
      }
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
    }

    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [reduced])

  function playHero() {
    const video = videoRef.current
    if (!video) {
      return
    }
    userPaused.current = false
    void video.play().then(() => setPlaying(true))
  }

  function pauseHero() {
    const video = videoRef.current
    if (!video) {
      return
    }
    userPaused.current = true
    video.pause()
    setPlaying(false)
  }

  return (
    <>
      <a className="skip-link" href="#marca">
        Ir ao conteúdo
      </a>
      <SiteHeader onCinema={onCinema} />

      <main>
        <section
          id="inicio"
          ref={heroRef}
          className="hero"
          data-theme="cinema"
          aria-label="Abertura"
        >
          {hasVideo ? (
            <video
              ref={videoRef}
              className={`hero__video${videoReady ? ' is-ready' : ''}${playing ? ' is-playing' : ''}`}
              src={site.heroVideo}
              muted
              loop
              playsInline
              preload="metadata"
              autoPlay={!reduced}
              onLoadedData={() => setVideoReady(true)}
              onPlaying={() => setPlaying(true)}
              onError={() => setFailed(true)}
            />
          ) : null}

          <div className="hero__copy">
            <p className="hero__roles">{site.rolesLine}</p>
            <h1 className="hero__slogan">
              {site.sloganLines[0]}
              <br />
              {site.sloganLines[1]}
            </h1>
          </div>

          {videoReady && !reduced ? (
            <button
              type="button"
              className="hero__media"
              onClick={playing ? pauseHero : playHero}
            >
              {playing ? 'Pausar' : 'Reproduzir'}
            </button>
          ) : null}

          <a className="hero__scroll" href={site.showStories ? '#historias' : '#sobre'}>
            {site.showStories ? 'Histórias' : 'Sobre'}
          </a>
        </section>

        <section id="marca" className="brand" aria-label="Marca">
          <img
            className="brand__logo"
            src={site.brand.wordmark}
            width={1024}
            height={1024}
            alt="Ana Julia — Storymaker e Videomaker"
          />
        </section>

        {site.showStories ? (
          <section id="historias" className="stories" aria-label="Histórias">
            {site.stories.map((story) => (
              <article
                key={story.id}
                id={story.id}
                className="chapter"
                data-theme="cinema"
              >
                {story.media ? (
                  /\.(mov|mp4|webm)(\?|$)/i.test(story.media) ? (
                    <video
                      className="chapter__media"
                      src={story.media}
                      muted
                      loop
                      playsInline
                      autoPlay={!reduced}
                    />
                  ) : (
                    <img className="chapter__media" src={story.media} alt="" />
                  )
                ) : null}
                <Reveal className="chapter__copy">
                  <h2>{story.title}</h2>
                  <p>{story.lead}</p>
                </Reveal>
              </article>
            ))}
          </section>
        ) : null}

        <section id="sobre" className="about">
          <div className="about__inner">
            <Reveal>
              <h2>{site.about.heading}</h2>
            </Reveal>
            <Reveal>
              <p>{site.about.p1}</p>
              <p>{site.about.p2}</p>
            </Reveal>
            <Reveal className="about__echo">
              <p>{site.slogan}.</p>
            </Reveal>
            <Reveal>
              <RouteLink className="about__link" to="/planos">
                {site.about.ctaLabel}
              </RouteLink>
            </Reveal>
          </div>
        </section>

        <section id="contato" className="contact">
          <div className="contact__inner">
            <Reveal>
              <h2>{site.contactCopy.heading}</h2>
            </Reveal>
            <Reveal className="contact__grid">
              <div className="contact__col">
                <p>
                  <Lines text={site.contactCopy.lead} />
                </p>
                <div className="contact__links">
                  <a
                    className="contact__button"
                    href={whatsappLink(site.messages.home, site.whatsappPhone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Conversar no WhatsApp"
                  >
                    <WhatsappLogo size={22} weight="regular" aria-hidden="true" />
                    WhatsApp
                  </a>
                  <a
                    className="contact__button"
                    href={site.instagramDmUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Enviar Direct no Instagram"
                  >
                    <InstagramLogo size={22} weight="regular" aria-hidden="true" />
                    Direct
                  </a>
                </div>
              </div>
              <div className="contact__col">
                <p>
                  <Lines text={site.contactCopy.instagramLead} />
                </p>
                <div className="contact__links">
                  <a
                    className="contact__button"
                    href={site.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir Instagram de Ana Julia"
                  >
                    <InstagramLogo size={22} weight="regular" aria-hidden="true" />
                    Instagram
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
          <RouteLink className="contact__safe" to="/estudio" aria-label="Área segura">
            <FishSimple size={24} weight="regular" aria-hidden="true" />
          </RouteLink>
        </section>
      </main>
    </>
  )
}
