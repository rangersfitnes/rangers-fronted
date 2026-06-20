import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingOverlay from '../../components/LoadingOverlay.jsx'
import { obtenerMisPagos } from '../../services/userService.js'
import {
  etiquetaMetodoPago,
  etiquetaOrigenPago,
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuentaUtils.js'
import './Cuenta.css'
import './CuentaActividad.css'

function CuentaActividad() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await obtenerMisPagos({ signal: controller.signal })
        setPagos(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar la actividad')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [])

  return (
    <main className="cuenta-page cuenta-page--wide">
      <div className="cuenta-page__inner cuenta-page__inner--wide">
        <h1 className="cuenta-page__title">Actividad</h1>
        <p className="cuenta-page__subtitle">
          Historial de tus pagos y planes adquiridos.
        </p>

        <section className="cuenta-actividad__section" aria-labelledby="pagos-planes-title">
          <h2 id="pagos-planes-title" className="cuenta-actividad__section-title">
            Pagos de planes
          </h2>

          {!loading && error && (
            <p className="cuenta-actividad__error" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && pagos.length === 0 && (
            <p className="cuenta-page__empty">
              Aún no tienes pagos de planes registrados.
            </p>
          )}

          {!loading && !error && pagos.length > 0 && (
            <div className="cuenta-actividad-table-wrapper">
              <table className="cuenta-actividad-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Plan</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Origen</th>
                    <th>Vigencia</th>
                    <th>Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td className="cuenta-actividad-table__fecha">
                        {formatearFechaHoraCuenta(pago.creadoEn)}
                      </td>
                      <td className="cuenta-actividad-table__plan">
                        <span className="cuenta-actividad-table__plan-nombre">
                          {pago.plan?.nombre || '—'}
                        </span>
                        {pago.plan?.duracion && (
                          <span className="cuenta-actividad-table__plan-meta">
                            {pago.plan.duracion}
                          </span>
                        )}
                      </td>
                      <td>
                        {formatearPrecioCuenta(
                          pago.montoPagado ?? pago.montoEsperado,
                        )}
                      </td>
                      <td>{etiquetaMetodoPago(pago.metodoPago)}</td>
                      <td>{etiquetaOrigenPago(pago.origen)}</td>
                      <td className="cuenta-actividad-table__vigencia">
                        {formatearFechaCuenta(pago.plan?.fechaInicio)}
                        {' — '}
                        {formatearFechaCuenta(pago.plan?.vigencia)}
                      </td>
                      <td className="cuenta-actividad-table__ref">
                        {pago.transaccion?.referencia || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="cuenta-page__subtitle cuenta-page__back">
          <Link to="/" style={{ color: '#f97316' }}>
            Volver al inicio
          </Link>
        </p>
      </div>

      <LoadingOverlay visible={loading} label="Cargando historial" />
    </main>
  )
}

export default CuentaActividad
