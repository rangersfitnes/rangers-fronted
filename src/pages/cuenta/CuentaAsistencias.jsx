import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingOverlay from '../../components/LoadingOverlay.jsx'
import { obtenerMisAsistencias } from '../../services/asistenciasService.js'
import {
  claseFilaAsistencia,
  deduplicarRegistrosAsistencia,
  etiquetaTipoAcceso,
  keyRegistroAsistencia,
} from '../../utils/asistenciasUtils.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
} from './cuentaUtils.js'
import './Cuenta.css'
import './CuentaAsistencias.css'

function esDelMesActual(fechaStr) {
  if (!fechaStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(fechaStr))) return false
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const [anio, mes] = hoy.split('-')
  const [anioVisita, mesVisita] = String(fechaStr).split('-')
  return anio === anioVisita && mes === mesVisita
}

function CuentaAsistencias() {
  const [asistencias, setAsistencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await obtenerMisAsistencias({ signal: controller.signal })
        setAsistencias(deduplicarRegistrosAsistencia(data))
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar las asistencias')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [])

  const resumen = useMemo(() => {
    const delMes = asistencias.filter((item) => esDelMesActual(item.fecha))
    const ultima = asistencias[0] ?? null

    return {
      total: asistencias.length,
      delMes: delMes.length,
      ultima,
    }
  }, [asistencias])

  return (
    <main className="cuenta-page cuenta-page--wide">
      <div className="cuenta-page__inner cuenta-page__inner--wide">
        <h1 className="cuenta-page__title">Asistencias</h1>
        <p className="cuenta-page__subtitle">
          Historial de ingresos al box: membresía y clases del día.
        </p>

        {loading && <LoadingOverlay visible label="Cargando asistencias" />}

        {!loading && !error && asistencias.length > 0 && (
          <div className="cuenta-asistencias__resumen">
            <article className="cuenta-asistencias__stat">
              <span className="cuenta-asistencias__stat-valor">
                {resumen.total}
              </span>
              <span className="cuenta-asistencias__stat-label">
                Total registradas
              </span>
            </article>
            <article className="cuenta-asistencias__stat">
              <span className="cuenta-asistencias__stat-valor">
                {resumen.delMes}
              </span>
              <span className="cuenta-asistencias__stat-label">Este mes</span>
            </article>
            <article className="cuenta-asistencias__stat cuenta-asistencias__stat--wide">
              <span className="cuenta-asistencias__stat-label">
                Última visita
              </span>
              <span className="cuenta-asistencias__stat-ultima">
                {resumen.ultima
                  ? formatearFechaHoraCuenta(resumen.ultima.creadoEn)
                  : '—'}
              </span>
            </article>
          </div>
        )}

        {!loading && error && (
          <p className="cuenta-asistencias__error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && asistencias.length === 0 && (
          <p className="cuenta-page__empty">
            Aún no tienes asistencias registradas. Cuando ingreses al box con tu
            documento en control de acceso, aparecerán aquí.
          </p>
        )}

        {!loading && !error && asistencias.length > 0 && (
          <section
            className="cuenta-asistencias__section"
            aria-labelledby="historial-asistencias-title"
          >
            <h2
              id="historial-asistencias-title"
              className="cuenta-asistencias__section-title"
            >
              Historial
            </h2>

            <ul className="cuenta-asistencias__leyenda" aria-label="Tipos de registro">
              <li className="cuenta-asistencias__leyenda-item cuenta-asistencias__leyenda-item--membresia">
                Membresía
              </li>
              <li className="cuenta-asistencias__leyenda-item cuenta-asistencias__leyenda-item--clase-dia">
                Clase del día
              </li>
              <li className="cuenta-asistencias__leyenda-item cuenta-asistencias__leyenda-item--clase-cortesia">
                Clase de cortesía
              </li>
            </ul>

            <div className="cuenta-asistencias-table-wrapper">
              <table className="cuenta-asistencias-table">
                <thead>
                  <tr>
                    <th>Fecha ingreso</th>
                    <th>Hora registro</th>
                    <th>Sede</th>
                    <th>Plan</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {asistencias.map((item) => (
                    <tr
                      key={keyRegistroAsistencia(item)}
                      className={claseFilaAsistencia(item)}
                    >
                      <td
                        className="cuenta-asistencias-table__fecha"
                        data-label="Fecha ingreso"
                      >
                        {formatearFechaCuenta(
                          item.fecha
                            ? new Date(`${item.fecha}T12:00:00`).getTime()
                            : null,
                        )}
                      </td>
                      <td data-label="Hora registro">
                        {formatearFechaHoraCuenta(item.creadoEn)}
                      </td>
                      <td data-label="Sede">{item.sedeNombre || '—'}</td>
                      <td
                        className="cuenta-asistencias-table__plan"
                        data-label="Plan"
                      >
                        {item.planNombre || '—'}
                      </td>
                      <td data-label="Tipo">
                        <span
                          className={`cuenta-asistencias-table__tipo cuenta-asistencias-table__tipo--${item.tipoAcceso || 'membresia'}`}
                        >
                          {etiquetaTipoAcceso(item.tipoAcceso)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="cuenta-page__subtitle cuenta-page__back">
          <Link to="/" style={{ color: '#f97316' }}>
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  )
}

export default CuentaAsistencias
