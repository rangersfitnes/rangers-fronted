import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoadingOverlay from './LoadingOverlay.jsx'
import { obtenerClasesHoy } from '../services/clasesHoyService.js'
import './ClasesHoy.css'

function formatearHora12(hora24) {
  if (!hora24 || !/^\d{2}:\d{2}$/.test(hora24)) return '—'
  const [hStr, mStr] = hora24.split(':')
  let h = Number(hStr)
  const m = mStr
  const periodo = h >= 12 ? 'p.m.' : 'a.m.'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${periodo}`
}

function ClasesHoy() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const res = await obtenerClasesHoy(undefined, {
          signal: controller.signal,
        })
        setDatos(res)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar las clases')
        setDatos(null)
      } finally {
        if (!controller.signal.aborted) setCargando(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [])

  const clases = datos?.clases ?? []
  const mostrarCard = !cargando

  return (
    <section
      id="clases-hoy"
      className="clases-hoy"
      aria-labelledby="clases-hoy-title"
    >
      {mostrarCard && (
        <div className="clases-hoy__card">
          <header className="clases-hoy__header">
            <div>
              <span className="clases-hoy__eyebrow">Clases grupales</span>
              <h2 id="clases-hoy-title" className="clases-hoy__title">
                Clases de hoy
              </h2>
              {datos?.diaLabel ? (
                <p className="clases-hoy__dia">
                  {datos.diaLabel}
                  {datos.fecha ? (
                    <span className="clases-hoy__fecha"> · {datos.fecha}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </header>

          {error ? (
            <p className="clases-hoy__estado clases-hoy__estado--error" role="alert">
              {error}
            </p>
          ) : null}

          {!error && clases.length === 0 && (
            <p className="clases-hoy__estado">
              No hay clases grupales programadas para hoy.
            </p>
          )}

          {!error && clases.length > 0 && (
            <ul className="clases-hoy__lista">
              {clases.map((clase) => (
                <li key={clase.id} className="clases-hoy__item">
                  <div className="clases-hoy__item-head">
                    <h3 className="clases-hoy__item-nombre">
                      {clase.nombre || 'Clase grupal'}
                    </h3>
                    {clase.horaInicio ? (
                      <span className="clases-hoy__item-hora">
                        {formatearHora12(clase.horaInicio)}
                      </span>
                    ) : null}
                  </div>
                  {clase.descripcion ? (
                    <p className="clases-hoy__item-desc">{clase.descripcion}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <footer className="clases-hoy__footer">
            <Link to="/clases" className="clases-hoy__link-semana">
              Ver cronograma semanal
            </Link>
          </footer>
        </div>
      )}

      <LoadingOverlay visible={cargando} label="Cargando clases de hoy" />
    </section>
  )
}

export default ClasesHoy
