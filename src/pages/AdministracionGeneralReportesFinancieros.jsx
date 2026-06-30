import { useCallback, useMemo, useRef, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import {
  BotonEliminarMovimiento,
  useEliminarMovimiento,
} from '../components/MovimientoEliminar.jsx'
import { useToast } from '../components/Toast.jsx'
import { obtenerReporteFinanciero } from '../services/reportesFinancierosService.js'
import {
  exportarReporteExcel,
  exportarReportePdf,
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

function VistaReportesFinancieros({ onVolver }) {
  const toast = useToast()
  const [desde, setDesde] = useState(inicioMesColombiaInput)
  const [hasta, setHasta] = useState(fechaHoyColombiaInput)
  const [reporte, setReporte] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verTodoHistorial, setVerTodoHistorial] = useState(false)
  const recargarRef = useRef(null)

  const cargar = useCallback(
    async (signal) => {
      if (!verTodoHistorial) {
        if (!desde || !hasta) {
          setError('Selecciona fecha inicial y final')
          return
        }

        if (desde > hasta) {
          setError('La fecha inicial no puede ser posterior a la final')
          return
        }
      }

      setLoading(true)
      setError('')
      try {
        const data = await obtenerReporteFinanciero({
          desde,
          hasta,
          todoHistorial: verTodoHistorial,
          signal,
        })
        setReporte(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar el reporte')
        setReporte(null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [desde, hasta, verTodoHistorial],
  )

  recargarRef.current = () => {
    const controller = new AbortController()
    cargar(controller.signal)
  }

  const { solicitarEliminar, modalEliminar, eliminando } = useEliminarMovimiento({
    onEliminado: () => recargarRef.current?.(),
  })

  const handleConsultar = () => {
    const controller = new AbortController()
    cargar(controller.signal)
  }

  const rangoLabel = useMemo(() => {
    if (reporte?.historialCompleto) return 'Historial completo'
    if (!reporte?.desde || !reporte?.hasta) return '—'
    const desdeMs = new Date(`${reporte.desde}T12:00:00-05:00`).getTime()
    const hastaMs = new Date(`${reporte.hasta}T12:00:00-05:00`).getTime()
    return `${formatearFechaCuenta(desdeMs)} – ${formatearFechaCuenta(hastaMs)}`
  }, [reporte?.desde, reporte?.hasta, reporte?.historialCompleto])

  const handleExportarPdf = () => {
    if (!reporte) return
    try {
      exportarReportePdf(reporte)
      toast.success('Reporte PDF descargado')
    } catch (err) {
      toast.error(err.message || 'No se pudo exportar el PDF')
    }
  }

  const handleExportarExcel = () => {
    if (!reporte) return
    try {
      exportarReporteExcel(reporte)
      toast.success('Reporte Excel descargado')
    } catch (err) {
      toast.error(err.message || 'No se pudo exportar el Excel')
    }
  }

  const resumen = reporte?.resumen
  const movimientos = reporte?.movimientos ?? []

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action ag-finanzas__sub-header">
        <div className="ag-finanzas__sub-header-main">
          {onVolver ? (
            <button
              type="button"
              className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
              onClick={onVolver}
              disabled={loading}
            >
              ← Volver a Finanzas
            </button>
          ) : null}
          <div>
            <h1 className="ag-page__title">Histórico de ingresos</h1>
            <p className="ag-page__subtitle">
              Histórico de ingresos · {rangoLabel}
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
          <label className="pf-registro__field pf-registro__field--checkbox">
            <span className="pf-registro__field-label">Periodo</span>
            <span className="ag-asistencias__historial-toggle">
              <input
                type="checkbox"
                checked={verTodoHistorial}
                onChange={(e) => setVerTodoHistorial(e.target.checked)}
                disabled={loading}
              />
              Todo el historial
            </span>
          </label>
          <CampoFechaCalendario
            label="Desde"
            value={desde}
            onChange={setDesde}
            disabled={loading || verTodoHistorial}
          />
          <CampoFechaCalendario
            label="Hasta"
            value={hasta}
            onChange={setHasta}
            disabled={loading || verTodoHistorial}
          />
        </div>
        <button
          type="button"
          className="ag-action-btn"
          onClick={handleConsultar}
          disabled={loading}
        >
          Generar reporte
        </button>
      </div>

      {error ? (
        <p className="pf-entrenamientos__error" role="alert">
          {error}
        </p>
      ) : null}

      {resumen && (
        <>
          <div className="pf-cierre__resumen ag-reporte__resumen">
            <div className="pf-cierre__resumen-card ag-reporte__card--total">
              <span className="pf-cierre__resumen-label">Total ingresos</span>
              <span className="pf-cierre__resumen-valor pf-cierre__resumen-valor--total">
                {formatearPrecioCuenta(resumen.totalGeneral)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.movimientosConIngreso} movimiento(s) · {reporte?.dias}{' '}
                día(s)
              </span>
            </div>
            <div className="pf-cierre__resumen-card pf-cierre__resumen-card--efectivo">
              <span className="pf-cierre__resumen-label">Ingresos en efectivo</span>
              <span className="pf-cierre__resumen-valor">
                {formatearPrecioCuenta(resumen.totalEfectivo)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.movimientosEfectivo ?? 0} movimiento(s)
              </span>
            </div>
            <div className="pf-cierre__resumen-card ag-reporte__card--wompi">
              <span className="pf-cierre__resumen-label">Ingresos por Wompi</span>
              <span className="pf-cierre__resumen-valor">
                {formatearPrecioCuenta(resumen.totalWompi)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.movimientosWompi ?? 0} movimiento(s)
              </span>
            </div>
            <div className="pf-cierre__resumen-card pf-cierre__resumen-card--banco">
              <span className="pf-cierre__resumen-label">
                Ingresos por transferencia
              </span>
              <span className="pf-cierre__resumen-valor">
                {formatearPrecioCuenta(resumen.totalTransferencia)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.movimientosTransferencia ?? 0} movimiento(s)
              </span>
            </div>
          </div>
        </>
      )}

      <div className="pf-cierre__lista-wrap">
        <h2 className="pf-cierre__lista-title">Detalle de ingresos</h2>
        {reporte ? (
          <p className="ag-finanzas__salidas-meta">
            {resumen?.movimientosConIngreso ?? 0} ingreso(s)
            {reporte.historialCompleto
              ? ' en el historial completo'
              : ' en el periodo seleccionado'}
          </p>
        ) : null}

        {!loading && reporte && movimientos.length === 0 && (
          <p className="pf-panel__empty">
            {verTodoHistorial
              ? 'No hay ingresos registrados en el sistema.'
              : 'No hay ingresos registrados en el intervalo seleccionado.'}
          </p>
        )}

        {movimientos.length > 0 && (
          <ul className="pf-cierre__lista">
            {movimientos.map((mov) => (
              <li key={mov.id} className="pf-cierre__item">
                <div className="pf-cierre__item-main">
                  <div className="pf-registro__badges">
                    <span
                      className={`ag-reporte__canal ${CANAL_CLASS[mov.canalIngreso] || ''}`}
                    >
                      {CANAL_LABEL[mov.canalIngreso] || mov.canalIngreso}
                    </span>
                    <span
                      className={`pf-cierre__badge ${CATEGORIA_CLASS[mov.categoria] || ''}`}
                    >
                      {mov.categoriaLabel || mov.categoria}
                    </span>
                  </div>
                  <p className="pf-cierre__item-desc">{mov.descripcion}</p>
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
                  <span className="pf-cierre__item-monto">
                    {formatearPrecioCuenta(mov.monto)}
                  </span>
                  <BotonEliminarMovimiento
                    mov={mov}
                    onEliminar={solicitarEliminar}
                    disabled={loading || eliminando}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LoadingOverlay visible={loading} label="Generando reporte" />
      {modalEliminar}
    </section>
  )
}

export default VistaReportesFinancieros
