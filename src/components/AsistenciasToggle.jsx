import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingOverlay from './LoadingOverlay.jsx'
import { obtenerMisAsistencias } from '../services/asistenciasService.js'
import {
  deduplicarRegistrosAsistencia,
  etiquetaTipoAcceso,
  keyRegistroAsistencia,
} from '../utils/asistenciasUtils.js'
import { formatearFechaCuenta } from '../pages/cuenta/cuentaUtils.js'
import './AsistenciasToggle.css'

function formatearHoraRegistro(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleTimeString('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function IconoAsistencias() {
  return (
    <svg
      className="asistencias-toggle__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  )
}

function fechaIngresoMs(item) {
  if (item?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(item.fecha))) {
    return new Date(`${item.fecha}T12:00:00`).getTime()
  }
  return item?.creadoEn ?? null
}

function AsistenciasToggle() {
  const [abierto, setAbierto] = useState(false)
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(false)
  const [cargado, setCargado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!abierto || cargado) return undefined

    const controller = new AbortController()

    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const data = await obtenerMisAsistencias({ signal: controller.signal })
        setItems(deduplicarRegistrosAsistencia(data))
        setCargado(true)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar las asistencias')
        setItems([])
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [abierto, cargado])

  return (
    <div className="asistencias-toggle">
      <div
        className={`asistencias-toggle__card${
          abierto ? ' asistencias-toggle__card--open' : ''
        }`}
      >
        <button
          type="button"
          className="asistencias-toggle__btn"
          onClick={() => setAbierto((prev) => !prev)}
          aria-expanded={abierto}
          aria-controls="asistencias-panel"
        >
          <span className="asistencias-toggle__btn-left">
            <IconoAsistencias />
            <span className="asistencias-toggle__label">Mis asistencias</span>
          </span>
          <svg
            className={`asistencias-toggle__chevron${
              abierto ? ' asistencias-toggle__chevron--up' : ''
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
          id="asistencias-panel"
          className={`asistencias-toggle__panel${
            abierto ? ' asistencias-toggle__panel--open' : ''
          }`}
          aria-hidden={!abierto}
        >
          <div className="asistencias-toggle__panel-inner">
            <ul className="asistencias-toggle__list">
              {!cargando && error && (
                <li className="asistencias-toggle__estado asistencias-toggle__estado--error">
                  {error}
                </li>
              )}
              {!cargando && !error && cargado && items.length === 0 && (
                <li className="asistencias-toggle__estado">
                  Aún no tienes asistencias registradas en el box.
                </li>
              )}
              {!cargando &&
                !error &&
                items.map((item) => (
                  <li
                    key={keyRegistroAsistencia(item)}
                    className={`asistencias-toggle__item asistencias-toggle__item--${item.tipoAcceso || 'membresia'}`}
                  >
                    <div className="asistencias-toggle__item-main">
                      <span className="asistencias-toggle__fecha">
                        {formatearFechaCuenta(fechaIngresoMs(item))}
                      </span>
                      <span className="asistencias-toggle__tipo">
                        {etiquetaTipoAcceso(item.tipoAcceso)}
                      </span>
                    </div>
                    <div className="asistencias-toggle__item-meta">
                      <span>{formatearHoraRegistro(item.creadoEn)}</span>
                      <span>{item.sedeNombre || '—'}</span>
                    </div>
                  </li>
                ))}
            </ul>

            {!cargando && !error && cargado && items.length > 0 && (
              <Link
                to="/cuenta/asistencias"
                className="asistencias-toggle__ver-todas"
              >
                Ver historial completo
              </Link>
            )}
          </div>
        </div>
      </div>

      <LoadingOverlay visible={cargando} label="Cargando asistencias" />
    </div>
  )
}

export default AsistenciasToggle
