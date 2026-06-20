import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { obtenerEventosPublicos } from '../services/eventosService.js'
import ChevronRightIcon from './icons/ChevronRightIcon.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import './EventosCarousel.css'

function formatearNombreEvento(id) {
  return String(id)
    .split('-')
    .filter(Boolean)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ')
}

function irAAccion(url, navigate) {
  if (!url) return

  try {
    const destino = new URL(url, window.location.origin)
    const esInterna = destino.origin === window.location.origin

    if (esInterna) {
      navigate(`${destino.pathname}${destino.search}${destino.hash}`)
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function EventosCarousel() {
  const navigate = useNavigate()
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setCargando(true)
      try {
        const lista = await obtenerEventosPublicos({ signal: controller.signal })
        setEventos(lista)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setEventos([])
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [])

  if (!cargando && !eventos.length) return null

  const multiples = eventos.length > 1

  return (
    <>
    {eventos.length > 0 && (
    <section
      className={`eventos-carousel${multiples ? ' eventos-carousel--multiples' : ''}`}
      aria-label="Eventos destacados"
    >
      <div
        className="eventos-carousel__scroller"
        tabIndex={multiples ? 0 : undefined}
        role={multiples ? 'region' : undefined}
        aria-label={multiples ? 'Lista de eventos' : undefined}
      >
        {eventos.map((evento) => (
          <article
            key={evento.id}
            className="eventos-carousel__card"
          >
            <button
              type="button"
              className="eventos-carousel__card-btn"
              onClick={() => irAAccion(evento.accionUrl, navigate)}
              aria-label={
                evento.accionUrl
                  ? `Ver evento ${formatearNombreEvento(evento.nombre)}`
                  : `Evento ${formatearNombreEvento(evento.nombre)}`
              }
            >
              <img
                src={evento.imagen}
                alt=""
                className="eventos-carousel__image"
                loading="lazy"
                decoding="async"
              />
              <div className="eventos-carousel__overlay" aria-hidden="true" />
              <div className="eventos-carousel__caption">
                <h2 className="eventos-carousel__title">
                  {formatearNombreEvento(evento.nombre)}
                </h2>
                {evento.descripcion ? (
                  <p className="eventos-carousel__desc">{evento.descripcion}</p>
                ) : null}
                {evento.accionUrl ? (
                  <span className="eventos-carousel__cta">
                    Ver más
                    <ChevronRightIcon className="eventos-carousel__cta-chevron" />
                  </span>
                ) : null}
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
    )}
    <LoadingOverlay visible={cargando} label="Cargando eventos" />
    </>
  )
}

export default EventosCarousel
