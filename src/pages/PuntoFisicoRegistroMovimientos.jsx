import { useCallback, useMemo, useRef, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import {
  BotonEliminarMovimiento,
  useEliminarMovimiento,
} from '../components/MovimientoEliminar.jsx'
import './PuntoFisico.css'
import { obtenerMovimientosRango } from '../services/cierreDiarioService.js'
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

const CANAL_CLASS = {
  'pago-clase': 'pf-registro__canal--clase',
  'membresia-web': 'pf-registro__canal--web',
  'membresia-punto-fisico': 'pf-registro__canal--pf',
  membresia: 'pf-registro__canal--membresia',
  cortesia: 'pf-registro__canal--cortesia',
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

function etiquetaMetodoMovimiento(metodo) {
  if (metodo === 'cortesia') return 'Cortesía'
  return etiquetaMetodoPago(metodo)
}

function VistaRegistroMovimientos() {
  const [desde, setDesde] = useState(inicioMesColombiaInput)
  const [hasta, setHasta] = useState(fechaHoyColombiaInput)
  const [registro, setRegistro] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recargarRef = useRef(null)

  const cargar = useCallback(
    async (signal) => {
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
        const data = await obtenerMovimientosRango({
          desde,
          hasta,
          signal,
        })
        setRegistro(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar el registro')
        setRegistro(null)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [desde, hasta],
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
    if (!registro?.desde || !registro?.hasta) return '—'
    const desdeMs = new Date(`${registro.desde}T12:00:00-05:00`).getTime()
    const hastaMs = new Date(`${registro.hasta}T12:00:00-05:00`).getTime()
    return `${formatearFechaCuenta(desdeMs)} – ${formatearFechaCuenta(hastaMs)}`
  }, [registro?.desde, registro?.hasta])

  const resumen = registro?.resumen
  const movimientos = registro?.movimientos ?? []

  return (
    <section className="pf-page__view">
      <header className="pf-page__view-header pf-page__view-header--with-action">
        <div>
          <h1 className="pf-page__title">Registro de movimientos</h1>
          <p className="pf-page__subtitle">
            Efectivo, transferencia, página web y pago de clase · {rangoLabel}
          </p>
        </div>
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
          className="pf-action-btn"
          onClick={handleConsultar}
          disabled={loading}
        >
          Consultar movimientos
        </button>
      </div>

      {error ? (
        <p className="pf-entrenamientos__error" role="alert">
          {error}
        </p>
      ) : null}

      {resumen && (
        <>
          <div className="pf-cierre__resumen">
            <div className="pf-cierre__resumen-card pf-cierre__resumen-card--efectivo">
              <span className="pf-cierre__resumen-label">Total efectivo</span>
              <span className="pf-cierre__resumen-valor">
                {formatearPrecioCuenta(resumen.totalEfectivo)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.movimientosEfectivo ?? 0} movimiento(s)
              </span>
            </div>
            <div className="pf-cierre__resumen-card pf-cierre__resumen-card--banco">
              <span className="pf-cierre__resumen-label">Total transferencia</span>
              <span className="pf-cierre__resumen-valor">
                {formatearPrecioCuenta(resumen.totalTransferencia)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.movimientosTransferencia ?? 0} movimiento(s)
              </span>
            </div>
            <div className="pf-cierre__resumen-card">
              <span className="pf-cierre__resumen-label">Total del periodo</span>
              <span className="pf-cierre__resumen-valor pf-cierre__resumen-valor--total">
                {formatearPrecioCuenta(resumen.totalIngresos)}
              </span>
              <span className="pf-cierre__resumen-hint">
                {resumen.cantidadMovimientos} movimiento(s) · {registro?.dias}{' '}
                día(s)
              </span>
            </div>
          </div>

          <div className="pf-cierre__conteos pf-registro__conteos">
            <span>
              <strong>{resumen.membresiasWeb ?? 0}</strong> membresía(s) web
            </span>
            <span>
              <strong>{resumen.membresiasPuntoFisico ?? 0}</strong> membresía(s)
              punto físico
            </span>
            <span>
              <strong>{resumen.pagosClase ?? resumen.clasesPagadas ?? 0}</strong>{' '}
              pago(s) clase del día
            </span>
            <span>
              <strong>{resumen.cortesias ?? 0}</strong> cortesía(s)
            </span>
          </div>
        </>
      )}

      <div className="pf-cierre__lista-wrap">
        <h2 className="pf-cierre__lista-title">Detalle de movimientos</h2>

        {!loading && registro && movimientos.length === 0 && (
          <p className="pf-panel__empty">
            No hay movimientos en el intervalo seleccionado.
          </p>
        )}

        {movimientos.length > 0 && (
          <ul className="pf-cierre__lista">
            {movimientos.map((mov) => (
              <li key={mov.id} className="pf-cierre__item">
                <div className="pf-cierre__item-main">
                  <div className="pf-registro__badges">
                    <span
                      className={`pf-cierre__badge ${CATEGORIA_CLASS[mov.categoria] || ''}`}
                    >
                      {mov.categoriaLabel}
                    </span>
                    <span
                      className={`pf-registro__canal ${CANAL_CLASS[mov.canal] || ''}`}
                    >
                      {mov.canalLabel}
                    </span>
                  </div>
                  <p className="pf-cierre__item-desc">{mov.descripcion}</p>
                  {mov.nombre ? (
                    <p className="pf-cierre__item-meta">{mov.nombre}</p>
                  ) : null}
                  {mov.fecha ? (
                    <p className="pf-cierre__item-meta">Día: {mov.fecha}</p>
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

      <LoadingOverlay visible={loading} label="Cargando movimientos" />
      {modalEliminar}
    </section>
  )
}

export default VistaRegistroMovimientos
