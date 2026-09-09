import { useEffect, useRef, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { Reveal } from '../components/Reveal'
import { hero, slogan, sloganLines, stories } from '../content/site'
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

          <a className="hero__scroll" href="#historias">
            Histórias
          </a>
        </section>

        <section id="marca" className="brand" aria-label="Marca">
          <Reveal>
            <img
              className="brand__logo"
              src="/brand/logo-anajulia.png"
              width={1024}
              height={1024}
              alt="Ana Julia — Storymaker e Videomaker"
            />
          </Reveal>
        </section>

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

        <section id="sobre" className="about">
          <Reveal>
            <h2>Sobre</h2>
          </Reveal>
          <Reveal>
            <p>
              Ana Júlia filma o que o tempo costuma levar: gestos mínimos,
              silêncios, a forma como duas pessoas se reconhecem. Storymaker e
              videomaker — um olhar cinematográfico, próximo e sem pressa.
            </p>
          </Reveal>
          <Reveal className="about__echo">
            <p>{slogan}.</p>
          </Reveal>
        </section>

        <section id="contato" className="contact">
          <Reveal>
            <h2>Contato</h2>
          </Reveal>
          <Reveal>
            <p>Conte o momento que você quer guardar.</p>
          </Reveal>
        </section>
      </main>
    </>
  )
}
