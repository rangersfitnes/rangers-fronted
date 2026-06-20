import { useCallback, useEffect, useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { obtenerCierreDiario } from '../services/cierreDiarioService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
  etiquetaMetodoPago,
} from './cuenta/cuentaUtils.js'

const CATEGORIA_CLASS = {
  membresia: 'pf-cierre__badge--membresia',
  cortesia: 'pf-cierre__badge--cortesia',
  clase: 'pf-cierre__badge--clase',
}

function etiquetaMetodoMovimiento(metodo) {
  if (metodo === 'cortesia') return 'Cortesía'
  return etiquetaMetodoPago(metodo)
}

function VistaCierreDiario() {
  const [cierre, setCierre] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const data = await obtenerCierreDiario({ signal })
      setCierre(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudo cargar el cierre diario')
      setCierre(null)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    cargar(controller.signal)
    return () => controller.abort()
  }, [cargar])

  const resumen = cierre?.resumen
  const movimientos = cierre?.movimientos ?? []
  const fechaLabel = cierre?.fecha
    ? formatearFechaCuenta(new Date(`${cierre.fecha}T12:00:00-05:00`).getTime())
    : '—'

  return (
    <section className="pf-page__view">
      <header className="pf-page__view-header pf-page__view-header--with-action">
        <div>
          <h1 className="pf-page__title">Cierre diario</h1>
          <p className="pf-page__subtitle">
            Movimientos del punto físico · {fechaLabel}
          </p>
        </div>
        <div className="pf-page__view-actions">
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={() => cargar()}
            disabled={loading}
          >
            Actualizar
          </button>
        </div>
      </header>

      {error ? (
        <p className="pf-entrenamientos__error" role="alert">
          {error}
        </p>
      ) : null}

      {resumen && (
        <div className="pf-cierre__resumen">
          <div className="pf-cierre__resumen-card pf-cierre__resumen-card--efectivo">
            <span className="pf-cierre__resumen-label">Efectivo en caja</span>
            <span className="pf-cierre__resumen-valor">
              {formatearPrecioCuenta(resumen.totalEfectivo)}
            </span>
            <span className="pf-cierre__resumen-hint">
              Debe ingresar en efectivo hoy
            </span>
          </div>
          <div className="pf-cierre__resumen-card pf-cierre__resumen-card--banco">
            <span className="pf-cierre__resumen-label">Cuenta bancaria</span>
            <span className="pf-cierre__resumen-valor">
              {formatearPrecioCuenta(resumen.totalTransferencia)}
            </span>
            <span className="pf-cierre__resumen-hint">
              Debe reflejarse por transferencias
            </span>
          </div>
          <div className="pf-cierre__resumen-card">
            <span className="pf-cierre__resumen-label">Total del día</span>
            <span className="pf-cierre__resumen-valor pf-cierre__resumen-valor--total">
              {formatearPrecioCuenta(resumen.totalIngresos)}
            </span>
            <span className="pf-cierre__resumen-hint">
              {resumen.cantidadMovimientos} movimiento(s)
            </span>
          </div>
        </div>
      )}

      {resumen && (
        <div className="pf-cierre__conteos">
          <span>
            <strong>{resumen.membresias}</strong> membresía(s)
          </span>
          <span>
            <strong>{resumen.clasesPagadas}</strong> clase(s) pagada(s)
          </span>
          <span>
            <strong>{resumen.cortesias}</strong> cortesía(s)
          </span>
        </div>
      )}

      <div className="pf-cierre__lista-wrap">
        <h2 className="pf-cierre__lista-title">Movimientos del día</h2>

        {!loading && movimientos.length === 0 && (
          <p className="pf-panel__empty">
            Aún no hay movimientos registrados hoy en este punto físico.
          </p>
        )}

        {movimientos.length > 0 && (
          <ul className="pf-cierre__lista">
            {movimientos.map((mov) => (
              <li key={mov.id} className="pf-cierre__item">
                <div className="pf-cierre__item-main">
                  <span
                    className={`pf-cierre__badge ${CATEGORIA_CLASS[mov.categoria] || ''}`}
                  >
                    {mov.categoriaLabel}
                  </span>
                  <p className="pf-cierre__item-desc">{mov.descripcion}</p>
                  {mov.nombre ? (
                    <p className="pf-cierre__item-meta">{mov.nombre}</p>
                  ) : null}
                  {mov.beneficiariosCount > 0 ? (
                    <p className="pf-cierre__item-meta">
                      +{mov.beneficiariosCount} beneficiario(s)
                    </p>
                  ) : null}
                </div>
                <div className="pf-cierre__item-aside">
                  <span className="pf-cierre__item-hora">
                    {formatearFechaHoraCuenta(mov.creadoEn)}
                  </span>
                  {mov.metodoPago ? (
                    <span className="pf-cierre__item-metodo">
                      {etiquetaMetodoMovimiento(mov.metodoPago)}
                    </span>
                  ) : null}
                  <span className="pf-cierre__item-monto">
                    {mov.monto != null && mov.monto > 0
                      ? formatearPrecioCuenta(mov.monto)
                      : '—'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LoadingOverlay visible={loading} label="Cargando cierre diario" />
    </section>
  )
}

export default VistaCierreDiario
