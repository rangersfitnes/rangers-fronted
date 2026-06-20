import { useEffect, useState } from 'react'
import LoadingOverlay from './LoadingOverlay.jsx'
import { obtenerClasesSemana } from '../services/clasesHoyService.js'
import EntrenamientoLibreAviso from './EntrenamientoLibreAviso.jsx'
import './ClasesSemana.css'

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

function ListaClasesDia({ clases }) {
  if (clases.length === 0) {
    return (
      <p className="clases-semana__dia-vacio">Sin clases programadas este día.</p>
    )
  }

  return (
    <ul className="clases-semana__lista">
      {clases.map((clase) => (
        <li key={clase.id} className="clases-semana__item">
          <div className="clases-semana__item-head">
            <h4 className="clases-semana__item-nombre">
              {clase.nombre || 'Clase grupal'}
            </h4>
            {clase.horaInicio ? (
              <span className="clases-semana__item-hora">
                {formatearHora12(clase.horaInicio)}
              </span>
            ) : null}
          </div>
          {clase.descripcion ? (
            <p className="clases-semana__item-desc">{clase.descripcion}</p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function ClasesSemana() {
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setCargando(true)
      setError('')
      try {
        const res = await obtenerClasesSemana(undefined, {
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

  const semana = datos?.semana ?? []
  const tieneAlgunaClase = semana.some((d) => d.clases?.length > 0)
  const mostrarContenido = !cargando

  return (
    <section
      className="clases-semana"
      aria-labelledby="clases-semana-title"
    >
      {mostrarContenido && (
        <div className="clases-semana__contenedor">
          <header className="clases-semana__header">
            <span className="clases-semana__eyebrow">Clases grupales</span>
            <h1 id="clases-semana-title" className="clases-semana__title">
              Cronograma semanal
            </h1>
            {datos?.diaHoyLabel ? (
              <p className="clases-semana__subtitulo">
                Hoy es {datos.diaHoyLabel}
                {datos.fecha ? (
                  <span className="clases-semana__fecha"> · {datos.fecha}</span>
                ) : null}
              </p>
            ) : null}
          </header>

          {error ? (
            <p className="clases-semana__estado clases-semana__estado--error" role="alert">
              {error}
            </p>
          ) : null}

          {!error && !tieneAlgunaClase && (
            <p className="clases-semana__estado">
              Aún no hay clases grupales publicadas para esta semana. Vuelve
              pronto para ver el cronograma actualizado.
            </p>
          )}

          {!error && semana.length > 0 && (
            <div className="clases-semana__grid">
              {semana.map((dia) => (
                <article
                  key={dia.dia}
                  className={`clases-semana__dia-card${
                    dia.esHoy ? ' clases-semana__dia-card--hoy' : ''
                  }`}
                >
                  <header className="clases-semana__dia-card-head">
                    <h2 className="clases-semana__dia-card-titulo">
                      {dia.diaLabel}
                    </h2>
                    {dia.esHoy ? (
                      <span className="clases-semana__dia-card-badge">Hoy</span>
                    ) : null}
                  </header>
                  <ListaClasesDia clases={dia.clases || []} />
                </article>
              ))}
            </div>
          )}

          {!cargando && <EntrenamientoLibreAviso />}
        </div>
      )}

      <LoadingOverlay visible={cargando} label="Cargando clases grupales" />
    </section>
  )
}

export default ClasesSemana
