import { useEffect, useState } from 'react'
import LoadingOverlay from './LoadingOverlay.jsx'
import {
  SEDE_HORARIOS,
  obtenerHorariosPublicos,
} from '../services/horariosService.js'
import './HorariosToggle.css'

function IconoAgenda() {
  return (
    <svg
      className="horarios-toggle__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14.01" />
      <line x1="12" y1="14" x2="12" y2="14.01" />
      <line x1="16" y1="14" x2="16" y2="14.01" />
      <line x1="8" y1="18" x2="8" y2="18.01" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  )
}

function lineasAnotacion(texto) {
  return String(texto || '')
    .split(/\n+/)
    .map((linea) => linea.trim())
    .filter(Boolean)
}

function HorariosToggle() {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState([])
  const [anotacion, setAnotacion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const data = await obtenerHorariosPublicos(SEDE_HORARIOS, {
          signal: controller.signal,
        })
        setItems(data.items || [])
        setAnotacion(data.anotacion || '')
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar los horarios')
        setItems([])
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [])

  return (
    <div className="horarios-toggle">
      <div
        className={`horarios-toggle__card${
          abierto ? ' horarios-toggle__card--open' : ''
        }`}
      >
        <button
          type="button"
          className="horarios-toggle__btn"
          onClick={() => setAbierto((prev) => !prev)}
          aria-expanded={abierto}
          aria-controls="horarios-panel"
        >
          <span className="horarios-toggle__btn-left">
            <IconoAgenda />
            <span className="horarios-toggle__label">Horarios</span>
          </span>
          <svg
            className={`horarios-toggle__chevron${
              abierto ? ' horarios-toggle__chevron--up' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div
          id="horarios-panel"
          className={`horarios-toggle__panel${
            abierto ? ' horarios-toggle__panel--open' : ''
          }`}
          aria-hidden={!abierto}
        >
          <div className="horarios-toggle__panel-inner">
          <ul className="horarios-toggle__list">
            {!cargando && error && (
              <li className="horarios-toggle__estado horarios-toggle__estado--error">
                {error}
              </li>
            )}
            {!cargando && !error && items.length === 0 && (
              <li className="horarios-toggle__estado">
                Horarios no disponibles por el momento.
              </li>
            )}
            {!cargando &&
              !error &&
              items.map((item) => (
                <li key={item.diaKey || item.dia} className="horarios-toggle__item">
                  <span className="horarios-toggle__dia">{item.dia}</span>
                  <span className="horarios-toggle__hora">{item.horas}</span>
                </li>
              ))}
          </ul>

          {!cargando && !error && anotacion && (
            <aside className="horarios-toggle__anotacion" aria-label="Anotación">
              <div className="horarios-toggle__anotacion-head">
                <span className="horarios-toggle__anotacion-dot" aria-hidden="true" />
                <span className="horarios-toggle__anotacion-eyebrow">
                  Anotación
                </span>
              </div>
              <div className="horarios-toggle__anotacion-body">
                {lineasAnotacion(anotacion).map((linea, index) => (
                  <p
                    key={`${index}-${linea.slice(0, 24)}`}
                    className="horarios-toggle__anotacion-texto"
                  >
                    {linea}
                  </p>
                ))}
              </div>
            </aside>
          )}
          </div>
        </div>
      </div>

      <LoadingOverlay visible={cargando} label="Cargando horarios" />
    </div>
  )
}

export default HorariosToggle
