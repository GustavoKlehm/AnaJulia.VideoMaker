import { useEffect, useRef, useState } from 'react'
import { InstagramLogo, WhatsappLogo } from '@phosphor-icons/react'
import { SiteHeader } from '../components/SiteHeader'
import { Reveal } from '../components/Reveal'
import { RouteLink } from '../components/RouteLink'
import { brand, contact, hero, showStories, slogan, sloganLines, stories } from '../content/site'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import './HomePage.css'

export function HomePage() {
  const reduced = usePrefersReducedMotion()
  const heroRef = useRef<HTMLElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const userPaused = useRef(false)
  const [onCinema, setOnCinema] = useState(true)
  const [inHero, setInHero] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const hasVideo = Boolean(hero.video) && !failed

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
              src={hero.video}
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
            <p className="hero__roles">Storymaker · Videomaker</p>
            <h1 className="hero__slogan">
              {sloganLines[0]}
              <br />
              {sloganLines[1]}
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

          <a className="hero__scroll" href={showStories ? '#historias' : '#sobre'}>
            {showStories ? 'Histórias' : 'Sobre'}
          </a>
        </section>

        <section id="marca" className="brand" aria-label="Marca">
          <img
            className="brand__logo"
            src={brand.wordmark}
            width={1024}
            height={1024}
            alt="Ana Julia — Storymaker e Videomaker"
          />
        </section>

        {showStories ? (
          <section id="historias" className="stories" aria-label="Histórias">
            {stories.map((story) => (
              <article
                key={story.id}
                id={story.id}
                className="chapter"
                data-theme="cinema"
              >
                {story.media ? (
                  <img className="chapter__media" src={story.media} alt="" />
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
              <h2>Sobre</h2>
            </Reveal>
            <Reveal>
              <p>
                Acreditamos que cada história começa nas experiências, nos
                detalhes e nos momentos que merecem ser contados.
              </p>
              <p>Registramos marcas, eventos e momentos especiais.</p>
            </Reveal>
            <Reveal className="about__echo">
              <p>{slogan}.</p>
            </Reveal>
            <Reveal>
              <RouteLink className="about__link" to="/planos">
                Ver planos e valores
              </RouteLink>
            </Reveal>
          </div>
        </section>

        <section id="contato" className="contact">
          <div className="contact__inner">
            <Reveal>
              <h2>Contato</h2>
            </Reveal>
            <Reveal className="contact__grid">
              <div className="contact__col">
                <p>
                  Conte o momento
                  <br />
                  que você quer guardar
                </p>
                <div className="contact__links">
                  <a
                    className="contact__button"
                    href={contact.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Conversar no WhatsApp"
                  >
                    <WhatsappLogo size={22} weight="regular" aria-hidden="true" />
                    WhatsApp
                  </a>
                  <a
                    className="contact__button"
                    href={contact.instagramDm}
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
                  Conheça meu trabalho
                  <br />
                  no Instagram
                </p>
                <div className="contact__links">
                  <a
                    className="contact__button"
                    href={contact.instagram}
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
        </section>
      </main>
    </>
  )
}
