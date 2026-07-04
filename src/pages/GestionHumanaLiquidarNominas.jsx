import { useCallback, useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LiquidarColaboradorModal from '../components/LiquidarColaboradorModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import { SEDES } from '../services/horariosService.js'
import {
  ejecutarLiquidacionColaborador,
  obtenerEstadoLiquidacionColaboradores,
  obtenerLiquidacionesNomina,
  revertirLiquidacionColaborador,
} from '../services/liquidacionNominaService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './AdministracionGeneral.css'

function etiquetaSede(sedeId) {
  const id = String(sedeId || '').trim()
  return SEDES.find((item) => item.id === id)?.nombre || id || '—'
}

function formatearPeriodo(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return '—'
  const inicio = formatearFechaCuenta(
    new Date(`${fechaInicio}T12:00:00`).getTime(),
  )
  const fin = formatearFechaCuenta(new Date(`${fechaFin}T12:00:00`).getTime())
  return `${inicio} – ${fin}`
}

function etiquetaEstado(estado) {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente por liquidar'
    case 'bloqueado_horas_extra':
      return 'Horas extra pendientes'
    case 'liquidado':
      return 'Liquidado'
    default:
      return 'Sin turnos'
  }
}

function GestionHumanaLiquidarNominas({ onVolver }) {
  const toast = useToast()
  const [estado, setEstado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [liquidando, setLiquidando] = useState(false)
  const [revertiendo, setRevertiendo] = useState(false)
  const [colaboradorLiquidar, setColaboradorLiquidar] = useState(null)
  const [colaboradorRevertir, setColaboradorRevertir] = useState(null)

  const cargarHistorial = useCallback(async () => {
    try {
      const lista = await obtenerLiquidacionesNomina()
      setHistorial(lista)
    } catch {
      setHistorial([])
    }
  }, [])

  const cargarEstado = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerEstadoLiquidacionColaboradores()
      setEstado(data)
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el estado de liquidación')
      setEstado(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  const colaboradores = estado?.colaboradores ?? []

  const resumen = useMemo(
    () => ({
      pendientes: estado?.totalPendientes ?? 0,
      turnos: estado?.totalTurnosPendientes ?? 0,
      totalPago: estado?.totalPagoPendiente ?? 0,
      liquidados: colaboradores.filter((c) => c.estado === 'liquidado').length,
    }),
    [estado, colaboradores],
  )

  const handleLiquidar = async (colaborador) => {
    if (!colaborador?.uid) return

    setLiquidando(true)
    try {
      await ejecutarLiquidacionColaborador({
        colaboradorUid: colaborador.uid,
      })
      toast.success(`Nómina de ${colaborador.nombre} liquidada`)
      setColaboradorLiquidar(null)
      await Promise.all([cargarEstado(), cargarHistorial()])
    } catch (err) {
      toast.error(err.message || 'No se pudo liquidar la nómina')
    } finally {
      setLiquidando(false)
    }
  }

  const handleRevertir = async () => {
    if (!colaboradorRevertir?.uid) return

    setRevertiendo(true)
    try {
      const resultado = await revertirLiquidacionColaborador({
        colaboradorUid: colaboradorRevertir.uid,
        liquidacionId: colaboradorRevertir.ultimaLiquidacion?.id,
      })

      const movimientoMsg = resultado.movimientoFinancieroEliminado
        ? 'Se eliminó también el movimiento de salida.'
        : 'El movimiento financiero ya no existía (fue eliminado antes).'

      toast.success(
        `Liquidación de ${colaboradorRevertir.nombre} revertida. ${movimientoMsg}`,
      )
      setColaboradorRevertir(null)
      await Promise.all([cargarEstado(), cargarHistorial()])
    } catch (err) {
      toast.error(err.message || 'No se pudo revertir la liquidación')
    } finally {
      setRevertiendo(false)
    }
  }

  const accionesDeshabilitadas = loading || liquidando || revertiendo
  const ultima = colaboradorRevertir?.ultimaLiquidacion

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action ag-finanzas__sub-header">
        <div className="ag-finanzas__sub-header-main">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
            onClick={onVolver}
            disabled={accionesDeshabilitadas}
          >
            ← Volver a Gestión humana
          </button>
          <div>
            <h1 className="ag-page__title">Liquidar nóminas</h1>
            <p className="ag-page__subtitle">
              Se calculan automáticamente todos los turnos pendientes por
              liquidar (hasta el día anterior). Puedes revertir la última
              liquidación de cada colaborador.
            </p>
          </div>
        </div>
        <div className="ag-page__view-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={cargarEstado}
            disabled={accionesDeshabilitadas}
          >
            Actualizar
          </button>
        </div>
      </header>

      {estado ? (
        <div className="ag-horas-extra__resumen-grid">
          <article className="ag-horas-extra__resumen-card">
            <span>Colaboradores pendientes</span>
            <strong>{resumen.pendientes}</strong>
          </article>
          <article className="ag-horas-extra__resumen-card">
            <span>Turnos pendientes</span>
            <strong>{resumen.turnos}</strong>
          </article>
          <article className="ag-horas-extra__resumen-card ag-horas-extra__resumen-card--destacado">
            <span>Total pendiente</span>
            <strong>{formatearPrecioCuenta(resumen.totalPago)}</strong>
          </article>
          <article className="ag-horas-extra__resumen-card">
            <span>Al día (liquidados)</span>
            <strong>{resumen.liquidados}</strong>
          </article>
        </div>
      ) : null}

      {colaboradores.length > 0 ? (
        <div className="ag-liquidacion__cards">
          {colaboradores.map((item) => {
            const pendiente = item.estado === 'pendiente'
            const bloqueado = item.estado === 'bloqueado_horas_extra'
            const liquidado = item.estado === 'liquidado'
            const puedeRevertir = Boolean(item.puedeRevertir)

            return (
              <article
                key={item.uid}
                className={[
                  'ag-liquidacion__card',
                  pendiente ? 'ag-liquidacion__card--pendiente' : '',
                  bloqueado ? 'ag-liquidacion__card--bloqueado' : '',
                  liquidado ? 'ag-liquidacion__card--liquidado' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="ag-liquidacion__card-main"
                  onClick={() =>
                    setColaboradorLiquidar({
                      uid: item.uid,
                      nombre: item.nombre,
                      documento: item.documento,
                      sede: item.sede,
                      metodoPago: item.metodoPago,
                      estado: item.estado,
                      puedeLiquidar: item.puedeLiquidar,
                    })
                  }
                  disabled={accionesDeshabilitadas}
                >
                  <span className="ag-liquidacion__card-top">
                    <span className="ag-liquidacion__card-nombre">
                      {item.nombre}
                    </span>
                    {pendiente ? (
                      <span
                        className="ag-liquidacion__card-badge"
                        aria-label="Turnos pendientes"
                      >
                        {item.turnosPendientes}
                      </span>
                    ) : null}
                  </span>

                  <span className="ag-liquidacion__card-meta">
                    <span>Sede: {etiquetaSede(item.sede)}</span>
                    <span>CC: {item.documento || '—'}</span>
                  </span>

                  <span
                    className={[
                      'ag-liquidacion__card-estado',
                      pendiente ? 'ag-liquidacion__card-estado--pendiente' : '',
                      bloqueado ? 'ag-liquidacion__card-estado--bloqueado' : '',
                      liquidado ? 'ag-liquidacion__card-estado--ok' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {etiquetaEstado(item.estado)}
                    {pendiente && item.totalPago > 0
                      ? ` · ${formatearPrecioCuenta(item.totalPago)}`
                      : ''}
                    {bloqueado && item.horasExtraPendientes > 0
                      ? ` (${item.horasExtraPendientes})`
                      : ''}
                  </span>

                  <span className="ag-liquidacion__card-accion">
                    {pendiente
                      ? 'Ver detalle y liquidar'
                      : liquidado
                        ? 'Sin turnos pendientes'
                        : bloqueado
                          ? 'Resolver horas extra'
                          : 'Sin turnos'}
                  </span>
                </button>

                {puedeRevertir ? (
                  <button
                    type="button"
                    className="ag-liquidacion__card-revertir"
                    onClick={(event) => {
                      event.stopPropagation()
                      setColaboradorRevertir(item)
                    }}
                    disabled={accionesDeshabilitadas}
                  >
                    Revertir liquidación
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : !loading ? (
        <div className="ag-panel">
          <p className="ag-panel__empty">No hay colaboradores registrados.</p>
        </div>
      ) : null}

      {historial.length > 0 && (
        <section className="ag-liquidacion__historial">
          <h2 className="ag-horas-extra__panel-title">Historial de liquidaciones</h2>
          <div className="ag-finanzas__tabla-wrap">
            <table className="ag-finanzas__tabla">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Turnos liquidados</th>
                  <th>Método de pago</th>
                  <th>Turnos</th>
                  <th>Total</th>
                  <th>Liquidado</th>
                  <th>Por</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((item) => (
                  <tr key={item.id}>
                    <td>{item.colaboradorNombre}</td>
                    <td>{formatearPeriodo(item.fechaInicio, item.fechaFin)}</td>
                    <td>
                      {item.metodoPago
                        ? etiquetaMetodoPagoColaborador(item.metodoPago)
                        : '—'}
                    </td>
                    <td>{item.totalTurnos}</td>
                    <td>{formatearPrecioCuenta(item.totalPago)}</td>
                    <td>{formatearFechaHoraCuenta(item.liquidadoEn)}</td>
                    <td>{item.liquidadoPorNombre || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <LiquidarColaboradorModal
        open={Boolean(colaboradorLiquidar)}
        onClose={() => {
          if (liquidando) return
          setColaboradorLiquidar(null)
        }}
        colaborador={colaboradorLiquidar}
        onLiquidar={handleLiquidar}
        liquidando={liquidando}
        onTurnosCambiados={cargarEstado}
      />

      <ConfirmModal
        open={Boolean(colaboradorRevertir)}
        onClose={() => {
          if (revertiendo) return
          setColaboradorRevertir(null)
        }}
        onConfirm={handleRevertir}
        title="Revertir liquidación"
        message={
          colaboradorRevertir
            ? `¿Revertir la última liquidación de ${colaboradorRevertir.nombre}? Se liberarán ${ultima?.totalTurnos ?? 0} turno(s) por ${formatearPrecioCuenta(ultima?.totalPago ?? 0)}. Si el movimiento de salida aún existe en finanzas, también se eliminará.`
            : ''
        }
        confirmLabel="Revertir"
        variant="danger"
        loading={revertiendo}
      />

      <LoadingOverlay
        visible={loading || liquidando || revertiendo}
        label={
          liquidando
            ? 'Registrando liquidación'
            : revertiendo
              ? 'Revirtiendo liquidación'
              : 'Cargando colaboradores'
        }
      />
    </section>
  )
}

export default GestionHumanaLiquidarNominas
