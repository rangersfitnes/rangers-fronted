import { useEffect, useState } from 'react'
import {
  obtenerContenidoWebPublico,
  urlEmbedYoutube,
} from '../services/contenidoWebService.js'
import './InicioVideoYoutube.css'

function InicioVideoYoutube() {
  const [videoId, setVideoId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      try {
        const contenido = await obtenerContenidoWebPublico({
          signal: controller.signal,
        })
        setVideoId(contenido?.inicio?.videoYoutubeId ?? '')
      } catch (err) {
        if (err?.name === 'AbortError') return
        setVideoId('')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [])

  if (loading || !videoId) return null

  return (
    <section
      className="inicio-video"
      aria-labelledby="inicio-video-title"
    >
      <h2 id="inicio-video-title" className="inicio-video__title">
        Conoce Rangers Box
      </h2>
      <div className="inicio-video__frame">
        <iframe
          src={urlEmbedYoutube(videoId)}
          title="Video de Rangers Box en YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>
  )
}

export default InicioVideoYoutube
