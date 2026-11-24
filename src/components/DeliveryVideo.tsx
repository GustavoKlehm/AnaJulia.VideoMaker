import { useState } from 'react'
import { Play } from '@phosphor-icons/react'
import './DeliveryVideo.css'

type DeliveryVideoProps = {
  nome: string
  /** URL da foto "-still" casada com o vídeo. Sem ela, aparece um quadro neutro. */
  capa?: string
  /** Busca a URL do vídeo. Só é chamada no clique: abrir a página não baixa vídeo nenhum. */
  load: () => Promise<string>
  muted?: boolean
}

/**
 * Vídeo de entrega: mostra só a capa e cria o <video> quando a pessoa clica para assistir.
 * Depois de criado, o `src` não muda mais (o componente guarda a URL), então o vídeo é baixado uma vez só.
 */
export function DeliveryVideo({ nome, capa, load, muted = false }: DeliveryVideoProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [state, setState] = useState<'capa' | 'abrindo' | 'erro'>('capa')

  async function open() {
    setState('abrindo')
    try {
      setSrc(await load())
    } catch {
      setState('erro')
    }
  }

  if (src) {
    return (
      <div className="delivery-video">
        <video
          className="delivery-video__media"
          src={src}
          poster={capa}
          controls
          autoPlay
          playsInline
          muted={muted}
          preload="none"
          aria-label={nome}
        />
      </div>
    )
  }

  return (
    <div className="delivery-video">
      <button
        className="delivery-video__cover"
        type="button"
        disabled={state === 'abrindo'}
        onClick={() => void open()}
        aria-label={`Assistir ${nome}`}
      >
        {capa ? <img className="delivery-video__media" src={capa} alt="" loading="lazy" decoding="async" /> : null}
        <span className="delivery-video__play" aria-hidden="true">
          <Play weight="fill" />
        </span>
        {state === 'abrindo' ? <span className="delivery-video__hint">Abrindo…</span> : null}
        {state === 'erro' ? <span className="delivery-video__hint">Não abriu. Toque para tentar de novo.</span> : null}
      </button>
    </div>
  )
}
