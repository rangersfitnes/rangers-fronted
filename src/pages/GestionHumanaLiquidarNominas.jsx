import { useCallback, useEffect, useMemo, useState } from 'react'
import LiquidarColaboradorModal from '../components/LiquidarColaboradorModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import {
  ejecutarLiquidacionColaborador,
  obtenerEstadoLiquidacionColaboradores,
  obtenerLiquidacionesNomina,
} from '../services/liquidacionNominaService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './AdministracionGeneral.css'

function obtenerPrimerDiaMes() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`
}

function obtenerAyerLocal() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function formatearPeriodo(fechaInicio, fechaFin) {
  const inicio = formatearFechaCuenta(
    new Date(`${fechaInicio}T12:00:00`).getTime(),
  )
  const fin = formatearFechaCuenta(new Date(`${fechaFin}T12:00:00`).getTime())
  return `${inicio} – ${fin}`
}

function GestionHumanaLiquidarNominas({ onVolver }) {
  const toast = useToast()
  const [fechaInicio, setFechaInicio] = useState(obtenerPrimerDiaMes)
  const [fechaFin, setFechaFin] = useState(obtenerAyerLocal)
  const [fechaMaxima, setFechaMaxima] = useState(obtenerAyerLocal)
  const [estado, setEstado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [liquidando, setLiquidando] = useState(false)
  const [colaboradorLiquidar, setColaboradorLiquidar] = useState(null)

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
      const data = await obtenerEstadoLiquidacionColaboradores({
        fechaInicio,
        fechaFin,
      })
      setEstado(data)
      if (data.fechaMaxima) setFechaMaxima(data.fechaMaxima)
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el estado de liquidación')
      setEstado(null)
    } finally {
      setLoading(false)
    }
  }, [fechaInicio, fechaFin, toast])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  const colaboradores = estado?.colaboradores ?? []
  const bloqueados = estado?.bloqueados ?? []

  const advertencias = useMemo(() => {
    const sinAprobar = bloqueados.filter(
      (b) => b.motivo === 'horas_extra_sin_aprobar',
    )
    const diaActual = bloqueados.filter((b) => b.motivo === 'dia_actual')
    const yaLiquidados = bloqueados.filter((b) => b.motivo === 'ya_liquidado')
    return { sinAprobar, diaActual, yaLiquidados }
  }, [bloqueados])

  const resumenPeriodo = useMemo(() => {
    const pendientes = colaboradores.filter((c) => c.estado === 'pendiente')
    const bloqueadosHoras = colaboradores.filter(
      (c) => c.estado === 'bloqueado_horas_extra',
    )
    return {
      pendientes: pendientes.length,
      bloqueadosHoras: bloqueadosHoras.length,
      totalPago: pendientes.reduce((acc, c) => acc + (c.totalPago || 0), 0),
      turnos: pendientes.reduce((acc, c) => acc + (c.totalTurnos || 0), 0),
      liquidados: colaboradores.filter((c) => c.estado === 'liquidado').length,
    }
  }, [colaboradores])

  const handleLiquidar = async (colaborador) => {
    if (!colaborador?.uid) return

    setLiquidando(true)
    try {
      await ejecutarLiquidacionColaborador({
        colaboradorUid: colaborador.uid,
        fechaInicio,
        fechaFin,
      })
      toast.success(
        `Nómina de ${colaborador.nombre} liquidada (${formatearPeriodo(fechaInicio, fechaFin)})`,
      )
      setColaboradorLiquidar(null)
      await Promise.all([cargarEstado(), cargarHistorial()])
    } catch (err) {
      toast.error(err.message || 'No se pudo liquidar la nómina')
    } finally {
      setLiquidando(false)
    }
  }

  const accionesDeshabilitadas = loading || liquidando

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
              Liquida a cada colaborador de forma independiente. Solo turnos
              finalizados hasta el día anterior.
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

      <div className="ag-liquidacion__filtros">
        <label className="ag-liquidacion__campo">
          <span>Desde</span>
          <input
            type="date"
            value={fechaInicio}
            max={fechaFin}
            onChange={(e) => setFechaInicio(e.target.value)}
            disabled={accionesDeshabilitadas}
          />
        </label>
        <label className="ag-liquidacion__campo">
          <span>Hasta (máx. ayer)</span>
          <input
            type="date"
            value={fechaFin}
            min={fechaInicio}
            max={fechaMaxima}
            onChange={(e) => setFechaFin(e.target.value)}
            disabled={accionesDeshabilitadas}
          />
        </label>
      </div>

      <div className="ag-panel ag-horas-extra__panel-info">
        <p className="ag-panel__empty">
          Cada colaborador se liquida por separado. Los turnos ya pagados en
          liquidaciones anteriores no se incluyen de nuevo: el sistema registra
          cada liquidación con su periodo (desde – hasta) y marca los turnos
          liquidados para evitar doble pago.
        </p>
      </div>

      {advertencias.yaLiquidados.length > 0 && (
        <p className="ag-horas-extra__alerta ag-horas-extra__alerta--info" role="status">
          {advertencias.yaLiquidados.length} turno
          {advertencias.yaLiquidados.length === 1 ? '' : 's'} en el periodo ya
          fueron pagados en liquidaciones anteriores y no se incluirán de nuevo.
        </p>
      )}

      {advertencias.sinAprobar.length > 0 && (
        <p className="ag-horas-extra__alerta" role="status">
          Hay colaboradores con horas extra pendientes de aprobar o rechazar. La
          liquidación está bloqueada hasta resolver todas las solicitudes del
          periodo ({advertencias.sinAprobar.length} turno
          {advertencias.sinAprobar.length === 1 ? '' : 's'} afectado
          {advertencias.sinAprobar.length === 1 ? '' : 's'}).
        </p>
      )}

      {estado ? (
        <div className="ag-horas-extra__resumen-grid">
          <article className="ag-horas-extra__resumen-card">
            <span>Pendientes de liquidar</span>
            <strong>{resumenPeriodo.pendientes}</strong>
          </article>
          <article className="ag-horas-extra__resumen-card">
            <span>Turnos pendientes</span>
            <strong>{resumenPeriodo.turnos}</strong>
          </article>
          <article className="ag-horas-extra__resumen-card ag-horas-extra__resumen-card--destacado">
            <span>Total pendiente</span>
            <strong>{formatearPrecioCuenta(resumenPeriodo.totalPago)}</strong>
          </article>
          <article className="ag-horas-extra__resumen-card">
            <span>Liquidados en periodo</span>
            <strong>{resumenPeriodo.liquidados}</strong>
          </article>
        </div>
      ) : null}

      {colaboradores.length > 0 && (
        <div className="ag-finanzas__tabla-wrap">
          <table className="ag-finanzas__tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Método de pago</th>
                <th>Turnos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Liquidaciones previas</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((item) => (
                <tr key={item.uid}>
                  <td>
                    <span className="ag-horas-extra__tabla-nombre">
                      {item.nombre}
                    </span>
                    {item.documento ? (
                      <span className="ag-horas-extra__tabla-doc">
                        {item.documento}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {item.metodoPago
                      ? etiquetaMetodoPagoColaborador(item.metodoPago)
                      : '—'}
                  </td>
                  <td>{item.totalTurnos}</td>
                  <td className="ag-horas-extra__monto-destacado">
                    {item.totalPago > 0
                      ? formatearPrecioCuenta(item.totalPago)
                      : '—'}
                  </td>
                  <td>
                    {item.estado === 'liquidado' ? (
                      <span className="ag-liquidacion__estado ag-liquidacion__estado--ok">
                        Liquidado del{' '}
                        {formatearPeriodo(fechaInicio, fechaFin)}
                      </span>
                    ) : item.estado === 'pendiente' ? (
                      <span className="ag-liquidacion__estado ag-liquidacion__estado--pendiente">
                        Pendiente
                        {item.turnosYaLiquidados > 0
                          ? ` (${item.turnosYaLiquidados} turno${item.turnosYaLiquidados === 1 ? '' : 's'} ya pagado${item.turnosYaLiquidados === 1 ? '' : 's'} excluido${item.turnosYaLiquidados === 1 ? '' : 's'})`
                          : ''}
                      </span>
                    ) : item.estado === 'bloqueado_horas_extra' ? (
                      <span className="ag-liquidacion__estado ag-liquidacion__estado--bloqueado">
                        Horas extra pendientes
                        {item.horasExtraPendientes > 0
                          ? ` (${item.horasExtraPendientes})`
                          : ''}
                      </span>
                    ) : item.estado === 'turnos_ya_pagados' ? (
                      <span className="ag-liquidacion__estado ag-liquidacion__estado--info">
                        Turnos ya pagados
                        {item.turnosYaLiquidados > 0
                          ? ` (${item.turnosYaLiquidados})`
                          : ''}
                      </span>
                    ) : (
                      <span className="ag-liquidacion__estado">Sin turnos</span>
                    )}
                  </td>
                  <td>
                    {item.historialLiquidaciones?.length > 0 ? (
                      <ul className="ag-liquidacion__historial-col">
                        {item.historialLiquidaciones.slice(0, 3).map((liq) => (
                          <li key={liq.id}>
                            {formatearPeriodo(liq.fechaInicio, liq.fechaFin)}
                            {' · '}
                            {formatearPrecioCuenta(liq.totalPago)}
                          </li>
                        ))}
                        {item.historialLiquidaciones.length > 3 ? (
                          <li className="ag-liquidacion__historial-col-mas">
                            +{item.historialLiquidaciones.length - 3} más
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="ag-finanzas__tabla-acciones">
                    {item.estado === 'pendiente' ? (
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost"
                        onClick={() =>
                          setColaboradorLiquidar({
                            uid: item.uid,
                            nombre: item.nombre,
                            metodoPago: item.metodoPago,
                          })
                        }
                        disabled={accionesDeshabilitadas}
                      >
                        Liquidar
                      </button>
                    ) : item.estado === 'bloqueado_horas_extra' ? (
                      <span
                        className="ag-liquidacion__accion-bloqueada"
                        title="Aprueba o rechaza las horas extra pendientes antes de liquidar"
                      >
                        Bloqueado
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {historial.length > 0 && (
        <section className="ag-liquidacion__historial">
          <h2 className="ag-horas-extra__panel-title">Historial de liquidaciones</h2>
          <div className="ag-finanzas__tabla-wrap">
            <table className="ag-finanzas__tabla">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Periodo</th>
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
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onLiquidar={handleLiquidar}
        liquidando={liquidando}
      />

      <LoadingOverlay
        visible={loading || liquidando}
        label={liquidando ? 'Registrando liquidación' : 'Cargando colaboradores'}
      />
    </section>
  )
}

export default GestionHumanaLiquidarNominas
