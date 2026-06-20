import { useCallback, useMemo, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { obtenerReporteFinanciero } from '../services/reportesFinancierosService.js'
import {
  combinarMovimientosReporte,
  exportarReporteIngresosEgresosExcel,
  exportarReporteIngresosEgresosPdf,
} from '../utils/exportReporteFinanciero.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './PuntoFisico.css'
import './AdministracionGeneral.css'

const CANAL_LABEL = {
  efectivo: 'Efectivo',
  wompi: 'Wompi',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

const CANAL_CLASS = {
  efectivo: 'ag-reporte__canal--efectivo',
  wompi: 'ag-reporte__canal--wompi',
  transferencia: 'ag-reporte__canal--transferencia',
}

const CATEGORIA_CLASS = {
  membresia: 'pf-cierre__badge--membresia',
  cortesia: 'pf-cierre__badge--cortesia',
  clase: 'pf-cierre__badge--clase',
  salida: 'ag-reporte__categoria--salida',
}

function fechaHoyColombiaInput() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function inicioMesColombiaInput() {
  const hoy = fechaHoyColombiaInput()
  return `${hoy.slice(0, 8)}01`
}

function FinanzasResumenIngresosEgresos({ onVolver }) {
  const toast = useToast()
  const [desde, setDesde] = useState(inicioMesColombiaInput)
  const [hasta, setHasta] = useState(fechaHoyColombiaInput)
  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!desde || !hasta) {
      setError('Selecciona fecha inicial y final')
      return
    }
    if (desde > hasta) {
      setError('La fecha inicial no puede ser posterior a la final')
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await obtenerReporteFinanciero({ desde, hasta })
      setReporte(data)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el resumen')
      setReporte(null)
    } finally {
      setLoading(false)
    }
  }, [desde, hasta])

  const movimientos = useMemo(
    () => (reporte ? combinarMovimientosReporte(reporte) : []),
    [reporte],
  )

  const totalIngresos = reporte?.resumen?.totalGeneral ?? 0
  const totalEgresos = reporte?.resumen?.totalEgresos ?? 0
  const balance = reporte?.resumen?.balanceNeto ?? totalIngresos - totalEgresos

  const rangoLabel =
    reporte?.desde && reporte?.hasta
      ? `${formatearFechaCuenta(new Date(`${reporte.desde}T12:00:00-05:00`).getTime())} – ${formatearFechaCuenta(new Date(`${reporte.hasta}T12:00:00-05:00`).getTime())}`
      : 'Selecciona un periodo'

  const handleExportarPdf = () => {
    if (!reporte) return
    try {
      exportarReporteIngresosEgresosPdf(reporte)
      toast.success('Reporte PDF descargado')
    } catch (err) {
      toast.error(err.message || 'No se pudo exportar el PDF')
    }
  }

  const handleExportarExcel = () => {
    if (!reporte) return
    try {
      exportarReporteIngresosEgresosExcel(reporte)
      toast.success('Reporte Excel descargado')
    } catch (err) {
      toast.error(err.message || 'No se pudo exportar el Excel')
    }
  }

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action ag-finanzas__sub-header">
        <div className="ag-finanzas__sub-header-main">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
            onClick={onVolver}
            disabled={loading}
          >
            ← Volver a Finanzas
          </button>
          <div>
            <h1 className="ag-page__title">Ingresos y egresos</h1>
            <p className="ag-page__subtitle">
              Detalle del periodo · {rangoLabel}
            </p>
          </div>
        </div>
        {reporte ? (
          <div className="ag-reporte__export-actions">
            <button
              type="button"
              className="ag-action-btn ag-action-btn--ghost"
              onClick={handleExportarPdf}
              disabled={loading}
            >
              Exportar PDF
            </button>
            <button
              type="button"
              className="ag-action-btn"
              onClick={handleExportarExcel}
              disabled={loading}
            >
              Exportar Excel
            </button>
          </div>
        ) : null}
      </header>

      <div className="pf-registro__filtros">
        <div className="pf-registro__filtros-campos">
          <CampoFechaCalendario
            label="Desde"
            value={desde}
            onChange={setDesde}
            disabled={loading}
          />
          <CampoFechaCalendario
            label="Hasta"
            value={hasta}
            onChange={setHasta}
            disabled={loading}
          />
        </div>
        <button
          type="button"
          className="ag-action-btn"
          onClick={cargar}
          disabled={loading}
        >
          Consultar
        </button>
      </div>

      {error ? (
        <p className="pf-entrenamientos__error" role="alert">
          {error}
        </p>
      ) : null}

      {reporte && (
        <div className="ag-finanzas__resumen-grid">
          <div className="pf-cierre__resumen-card ag-finanzas__resumen-card--ingreso">
            <span className="pf-cierre__resumen-label">Total ingresos</span>
            <span className="pf-cierre__resumen-valor">
              {formatearPrecioCuenta(totalIngresos)}
            </span>
            <span className="pf-cierre__resumen-hint">
              {reporte.resumen?.movimientosConIngreso ?? 0} movimiento(s)
            </span>
          </div>

          <div className="pf-cierre__resumen-card ag-finanzas__resumen-card--egreso">
            <span className="pf-cierre__resumen-label">Total egresos</span>
            <span className="pf-cierre__resumen-valor">
              {formatearPrecioCuenta(totalEgresos)}
            </span>
            <span className="pf-cierre__resumen-hint">
              {reporte.resumen?.movimientosEgreso ?? 0} salida(s)
            </span>
          </div>

          <div className="pf-cierre__resumen-card ag-finanzas__resumen-card--balance">
            <span className="pf-cierre__resumen-label">Balance neto</span>
            <span className="pf-cierre__resumen-valor pf-cierre__resumen-valor--total">
              {formatearPrecioCuenta(balance)}
            </span>
            <span className="pf-cierre__resumen-hint">Ingresos − egresos</span>
          </div>
        </div>
      )}

      {reporte && (
        <div className="pf-cierre__lista-wrap">
          <h2 className="pf-cierre__lista-title">Detalle de movimientos</h2>

          {movimientos.length === 0 && !loading && (
            <p className="pf-panel__empty">
              No hay movimientos registrados en el intervalo seleccionado.
            </p>
          )}

          {movimientos.length > 0 && (
            <ul className="pf-cierre__lista">
              {movimientos.map((mov) => {
                const esEgreso = mov.naturalezaMov === 'egreso'
                const canalKey = esEgreso ? mov.metodoPago : mov.canalIngreso
                const canalLabel =
                  CANAL_LABEL[canalKey] || canalKey || '—'

                return (
                  <li key={mov.id} className="pf-cierre__item">
                    <div className="pf-cierre__item-main">
                      <div className="pf-registro__badges">
                        <span
                          className={`ag-reporte__naturaleza ${
                            esEgreso
                              ? 'ag-reporte__naturaleza--egreso'
                              : 'ag-reporte__naturaleza--ingreso'
                          }`}
                        >
                          {esEgreso ? 'Egreso' : 'Ingreso'}
                        </span>
                        <span
                          className={`ag-reporte__canal ${CANAL_CLASS[canalKey] || ''}`}
                        >
                          {canalLabel}
                        </span>
                        <span
                          className={`pf-cierre__badge ${CATEGORIA_CLASS[mov.categoria] || ''}`}
                        >
                          {mov.categoriaLabel || mov.categoria}
                        </span>
                      </div>
                      <p className="pf-cierre__item-desc">
                        {mov.descripcion || mov.concepto}
                      </p>
                      {mov.nombre ? (
                        <p className="pf-cierre__item-meta">{mov.nombre}</p>
                      ) : null}
                      {mov.fecha ? (
                        <p className="pf-cierre__item-meta">Día: {mov.fecha}</p>
                      ) : null}
                    </div>
                    <div className="pf-cierre__item-aside">
                      <span className="pf-cierre__item-hora">
                        {formatearFechaHoraCuenta(mov.creadoEn)}
                      </span>
                      <span
                        className={`pf-cierre__item-monto${
                          esEgreso ? ' pf-cierre__item-monto--egreso' : ''
                        }`}
                      >
                        {esEgreso ? '−' : ''}
                        {formatearPrecioCuenta(mov.monto)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {!loading && !reporte && (
        <div className="ag-panel">
          <p className="ag-panel__empty">
            Elige un rango de fechas y pulsa «Consultar» para ver el detalle.
          </p>
        </div>
      )}

      <LoadingOverlay visible={loading} label="Cargando movimientos" />
    </section>
  )
}

export default FinanzasResumenIngresosEgresos
