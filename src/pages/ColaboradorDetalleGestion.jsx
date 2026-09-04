import { useCallback, useEffect, useMemo, useState } from 'react'
import DesprendiblesNominaModal from '../components/DesprendiblesNominaModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import { NOTA_LIQUIDACION_HASTA_DIA_ANTERIOR } from '../constants/nominaLaboral.js'
import { SEDES } from '../services/horariosService.js'
import { obtenerPerfilLaboralColaborador } from '../services/colaboradoresService.js'
import { MINUTOS_MINIMOS_HORA_EXTRA } from '../utils/calculoPagoTurnoUtils.js'
import {
  DIAS_SEMANA_ESQUEMA,
  etiquetaDiaEsquema,
} from '../utils/esquemaPagoUtils.js'
import {
  formatearDuracionMs,
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearFechaTabla,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './AdministracionGeneral.css'
import './PuntoFisicoMiPerfil.css'

function etiquetaSede(sedeId) {
  return SEDES.find((sede) => sede.id === sedeId)?.nombre ?? sedeId ?? '—'
}

function formatearFechaNacimiento(valor) {
  if (!valor) return '—'
  const fecha = new Date(`${valor}T12:00:00`)
  if (Number.isNaN(fecha.getTime())) return valor
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatearHorasDecimal(horas) {
  const valor = Number(horas) || 0
  if (Number.isInteger(valor)) return `${valor} h`
  return `${valor.toFixed(2).replace('.', ',')} h`
}

function fechaClaveColombia(ms) {
  if (!ms) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

function formatearHoraCorta(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function formatearHorarioTurno(inicioEn, finEn) {
  const inicio = formatearHoraCorta(inicioEn)
  const fin = formatearHoraCorta(finEn)
  if (inicio === '—' && fin === '—') return '—'
  if (inicio === '—') return `Hasta ${fin}`
  if (fin === '—') return `Desde ${inicio}`
  return `Desde ${inicio} hasta ${fin}`
}

function formatearTiempoExtraTrabajado(turno) {
  const tiempoExtraMs = Number(turno.tiempoExtraMs) || 0
  const minutosExtra = Number(turno.minutosExtra) || 0
  if (tiempoExtraMs > 0) return formatearDuracionMs(tiempoExtraMs)
  if (minutosExtra > 0) {
    const horas = Math.floor(minutosExtra / 60)
    const minutos = minutosExtra % 60
    if (horas > 0) {
      return minutos > 0 ? `${horas} h ${minutos} min` : `${horas} h`
    }
    return `${minutos} min`
  }
  return '—'
}

function formatearPagoExtra(turno) {
  const horasExtra = Number(turno.horasExtra) || 0
  const minutosExtra = Number(turno.minutosExtra) || 0
  const valorHoraExtra = Number(turno.valorHoraExtra) || 0
  const estado = turno.horasExtraEstado
  let pago = Number(turno.pagoExtra) || 0
  if (pago <= 0 && horasExtra > 0 && valorHoraExtra > 0) {
    pago = Math.round(horasExtra * valorHoraExtra)
  }
  if (pago > 0) {
    const monto = formatearPrecioCuenta(pago)
    if (estado === 'pendiente') return `${monto} · pendiente de aprobar`
    if (estado === 'rechazada') return 'Rechazada'
    return monto
  }
  if (minutosExtra > 0) {
    return `Sin liquidar (< ${MINUTOS_MINIMOS_HORA_EXTRA} min)`
  }
  return '—'
}

function etiquetaEstadoExtra(estado) {
  if (estado === 'pendiente') return 'Pendiente de aprobar'
  if (estado === 'aprobada') return 'Aprobada'
  if (estado === 'rechazada') return 'Rechazada'
  if (estado === 'liquidada') return 'Liquidada'
  return null
}

function detallePendienteLiquidar(resumen) {
  const turnos = Number(resumen?.totalTurnosPendientes) || 0
  if (turnos === 0) return 'Todo liquidado'
  const partes = [`${turnos} turno${turnos === 1 ? '' : 's'}`]
  const sinAprobar = Number(resumen?.turnosConExtraSinAprobar) || 0
  if (sinAprobar > 0) {
    partes.push(`${sinAprobar} con horas extra por aprobar`)
  }
  return partes.join(' · ')
}

function textoJornadasEspeciales(esquema) {
  const jornadas = esquema?.jornadasPorDia || {}
  const partes = DIAS_SEMANA_ESQUEMA.filter((dia) => jornadas[dia.id]).map(
    (dia) => {
      const config = jornadas[dia.id]
      return `${etiquetaDiaEsquema(dia.id)}: ${formatearHorasDecimal(config.horasTurno)} · ${formatearPrecioCuenta(config.valorTurno)}`
    },
  )
  return partes.length ? partes.join(' · ') : null
}

function agruparHorasPorDia(turnos) {
  const mapa = new Map()
  for (const turno of turnos) {
    const clave = fechaClaveColombia(turno.inicioEn)
    if (!clave) continue
    const actual = mapa.get(clave) || {
      fecha: clave,
      turnos: 0,
      horasTrabajadas: 0,
      horasExtra: 0,
      horasNocturnas: 0,
      horasDominicales: 0,
      pagoTotal: 0,
      liquidados: 0,
      pendientes: 0,
    }
    actual.turnos += 1
    actual.horasTrabajadas += Number(turno.horasTrabajadas) || 0
    actual.horasExtra += Number(turno.horasExtra) || 0
    actual.horasNocturnas += Number(turno.horasNocturnas) || 0
    actual.horasDominicales += Number(turno.horasDominicales) || 0
    actual.pagoTotal += Number(turno.pagoTotal) || 0
    if (turno.liquidacionId) actual.liquidados += 1
    else actual.pendientes += 1
    mapa.set(clave, actual)
  }
  return [...mapa.values()].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

function CampoPerfil({ etiqueta, valor }) {
  return (
    <div className="pf-mi-perfil__campo">
      <span className="pf-mi-perfil__campo-label">{etiqueta}</span>
      <span className="pf-mi-perfil__campo-valor">{valor}</span>
    </div>
  )
}

function ResumenCard({ etiqueta, valor, variante = '', detalle = '' }) {
  return (
    <article
      className={`pf-mi-perfil__resumen-card${
        variante ? ` pf-mi-perfil__resumen-card--${variante}` : ''
      }`}
    >
      <span className="pf-mi-perfil__resumen-label">{etiqueta}</span>
      <strong className="pf-mi-perfil__resumen-valor">{valor}</strong>
      {detalle ? (
        <span className="pf-mi-perfil__resumen-detalle">{detalle}</span>
      ) : null}
    </article>
  )
}

function FilasTurnosTabla({ turnos }) {
  const tieneLiquidados = turnos.some((turno) => turno.liquidacionId)
  const tienePendientes = turnos.some((turno) => !turno.liquidacionId)
  const mostrarSeparador = tieneLiquidados && tienePendientes
  let separadorInsertado = false
  const columnas = 12

  return turnos.flatMap((turno, index) => {
    const esLiquidado = Boolean(turno.liquidacionId)
    const filas = []

    if (mostrarSeparador && index === 0 && !esLiquidado) {
      filas.push(
        <tr
          key="turnos-separador-pendientes"
          className="pf-mi-perfil__turnos-separador pf-mi-perfil__turnos-separador--pendiente"
        >
          <td colSpan={columnas}>Turnos pendientes de liquidación</td>
        </tr>,
      )
    }

    if (mostrarSeparador && !separadorInsertado && esLiquidado) {
      separadorInsertado = true
      filas.push(
        <tr
          key="turnos-separador-liquidados"
          className="pf-mi-perfil__turnos-separador"
        >
          <td colSpan={columnas}>Turnos ya liquidados en nómina</td>
        </tr>,
      )
    }

    const horasNocturnas = Number(turno.horasNocturnas) || 0
    const horasDominicales = Number(turno.horasDominicales) || 0
    const pagoNocturno = Number(turno.pagoRecargoNocturno) || 0
    const pagoDominical = Number(turno.pagoRecargoDominical) || 0

    filas.push(
      <tr
        key={turno.id}
        className={esLiquidado ? 'pf-mi-perfil__fila--liquidado' : undefined}
      >
        <td>{formatearFechaTabla(turno.inicioEn)}</td>
        <td>
          {esLiquidado ? (
            <span className="pf-mi-perfil__badge pf-mi-perfil__badge--liquidado">
              Liquidado
            </span>
          ) : (
            <span className="pf-mi-perfil__badge pf-mi-perfil__badge--pendiente">
              Pendiente
            </span>
          )}
        </td>
        <td className="pf-mi-perfil__horario-celda">
          {formatearHorarioTurno(turno.inicioEn, turno.finEn)}
        </td>
        <td>{formatearDuracionMs(turno.duracionMs)}</td>
        <td>{formatearHorasDecimal(turno.horasOrdinarias)}</td>
        <td>
          {horasNocturnas > 0 ? (
            <span className="pf-mi-perfil__extra-celda">
              {formatearHorasDecimal(horasNocturnas)}
              {pagoNocturno > 0 ? (
                <small className="pf-mi-perfil__extra-estado">
                  +{formatearPrecioCuenta(pagoNocturno)}
                </small>
              ) : null}
            </span>
          ) : (
            '—'
          )}
        </td>
        <td>
          {horasDominicales > 0 ? (
            <span className="pf-mi-perfil__extra-celda">
              {formatearHorasDecimal(horasDominicales)}
              {turno.esFestivo && !turno.esDiaDominical
                ? ' festivo'
                : turno.esFestivo
                  ? ' dom./fest.'
                  : ''}
              {pagoDominical > 0 ? (
                <small className="pf-mi-perfil__extra-estado">
                  +{formatearPrecioCuenta(pagoDominical)}
                </small>
              ) : null}
            </span>
          ) : (
            '—'
          )}
        </td>
        <td>{formatearTiempoExtraTrabajado(turno)}</td>
        <td>
          {Number(turno.horasExtra) > 0 ? (
            <span className="pf-mi-perfil__extra-celda">
              {formatearHorasDecimal(turno.horasExtra)}
              {etiquetaEstadoExtra(turno.horasExtraEstado) ? (
                <small className="pf-mi-perfil__extra-estado">
                  {etiquetaEstadoExtra(turno.horasExtraEstado)}
                </small>
              ) : null}
            </span>
          ) : (
            '—'
          )}
        </td>
        <td>{formatearPrecioCuenta(turno.pagoOrdinario)}</td>
        <td>{formatearPagoExtra(turno)}</td>
        <td className="pf-mi-perfil__total-celda">
          {formatearPrecioCuenta(turno.pagoTotal)}
        </td>
      </tr>,
    )

    return filas
  })
}

function formatearRangoLiquidacion(item) {
  const inicio = item.fechaInicio
  const fin = item.fechaFin
  if (!inicio || !fin) return '—'
  const inicioTxt = formatearFechaCuenta(
    new Date(`${inicio}T12:00:00-05:00`).getTime(),
  )
  const finTxt = formatearFechaCuenta(new Date(`${fin}T12:00:00-05:00`).getTime())
  return inicio === fin ? inicioTxt : `${inicioTxt} – ${finTxt}`
}

function ColaboradorDetalleGestion({ colaborador: colaboradorInicial, onVolver }) {
  const toast = useToast()
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [desprendiblesOpen, setDesprendiblesOpen] = useState(false)

  const uid = colaboradorInicial?.uid

  const cargar = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setError('')
    try {
      const perfil = await obtenerPerfilLaboralColaborador(uid)
      setDatos(perfil)
    } catch (err) {
      const mensaje =
        err.message || 'No se pudo cargar la información del colaborador'
      setError(mensaje)
      toast.error(mensaje)
      setDatos(null)
    } finally {
      setLoading(false)
    }
  }, [toast, uid])

  useEffect(() => {
    cargar()
  }, [cargar])

  const colaborador = datos?.colaborador ?? colaboradorInicial
  const esquema = datos?.esquema
  const esquemaClave = datos?.esquemaClave ?? colaborador?.esquemaPago ?? ''
  const turnos = datos?.turnos ?? []
  const resumen = datos?.resumen
  const desprendibles = datos?.desprendibles ?? []
  const historial =
    datos?.historialLiquidaciones?.length > 0
      ? datos.historialLiquidaciones
      : desprendibles.map((item) => ({
          id: item.liquidacionId || item.id,
          fechaInicio: item.fechaInicio,
          fechaFin: item.fechaFin,
          totalPago: item.resumen?.pagoTotal,
          totalTurnos: item.turnos?.length || item.resumen?.diasLaborados || 0,
          liquidadoEn: item.liquidadoEn,
          liquidadoPorNombre: item.liquidadoPorNombre,
          presupuestoExterno: item.presupuestoExterno,
        }))
  const jornadasEspeciales = textoJornadasEspeciales(esquema)
  const horasPorDia = useMemo(() => agruparHorasPorDia(turnos), [turnos])

  return (
    <section className="ag-page__view pf-mi-perfil">
      <header className="ag-page__view-header ag-page__view-header--with-action ag-finanzas__sub-header">
        <div className="ag-finanzas__sub-header-main">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
            onClick={onVolver}
            disabled={loading}
          >
            ← Volver a Colaboradores
          </button>
          <div>
            <h1 className="ag-page__title">
              {colaborador?.nombre || 'Colaborador'}
            </h1>
            <p className="ag-page__subtitle">
              Turnos, horas trabajadas y nóminas liquidadas
            </p>
          </div>
        </div>
        <div className="ag-page__view-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={cargar}
            disabled={loading}
          >
            Actualizar
          </button>
        </div>
      </header>

      {error ? <p className="pf-mi-perfil__error">{error}</p> : null}

      {colaborador ? (
        <>
          <div className="pf-mi-perfil__grid">
            <section className="pf-mi-perfil__panel">
              <h2 className="pf-mi-perfil__panel-title">Datos personales</h2>
              <div className="pf-mi-perfil__campos">
                <CampoPerfil etiqueta="Nombre" valor={colaborador.nombre} />
                <CampoPerfil
                  etiqueta="Identificación"
                  valor={colaborador.documento}
                />
                <CampoPerfil etiqueta="Correo" valor={colaborador.correo} />
                <CampoPerfil
                  etiqueta="Fecha de nacimiento"
                  valor={formatearFechaNacimiento(colaborador.fechaNacimiento)}
                />
                <CampoPerfil
                  etiqueta="Sede"
                  valor={etiquetaSede(colaborador.sede)}
                />
                <CampoPerfil
                  etiqueta="Cronometraje"
                  valor={colaborador.cronometrajeActivo ? 'Activo' : 'Inactivo'}
                />
                <CampoPerfil
                  etiqueta="Método de pago"
                  valor={
                    colaborador.metodoPago
                      ? etiquetaMetodoPagoColaborador(colaborador.metodoPago)
                      : '—'
                  }
                />
                <CampoPerfil
                  etiqueta="Número de cuenta"
                  valor={colaborador.numeroCuenta || '—'}
                />
              </div>
            </section>

            <section className="pf-mi-perfil__panel">
              <h2 className="pf-mi-perfil__panel-title">Esquema laboral</h2>
              {esquema ? (
                <div className="pf-mi-perfil__campos">
                  <CampoPerfil
                    etiqueta="Esquema asignado"
                    valor={esquemaClave || esquema.nombre}
                  />
                  <CampoPerfil etiqueta="Esquema" valor={esquema.nombre} />
                  <CampoPerfil
                    etiqueta="Valor hora ordinaria"
                    valor={formatearPrecioCuenta(esquema.valorPorHora)}
                  />
                  <CampoPerfil
                    etiqueta="Horas por jornada"
                    valor={formatearHorasDecimal(esquema.horasTurno)}
                  />
                  <CampoPerfil
                    etiqueta="Valor por turno"
                    valor={formatearPrecioCuenta(esquema.valorTurno)}
                  />
                  {jornadasEspeciales ? (
                    <CampoPerfil
                      etiqueta="Jornadas especiales"
                      valor={jornadasEspeciales}
                    />
                  ) : null}
                  <CampoPerfil
                    etiqueta="Hora extra"
                    valor={`${esquema.porcentajeHoraExtra}% · ${formatearPrecioCuenta(esquema.valorHoraExtra)}`}
                  />
                </div>
              ) : (
                <p className="pf-mi-perfil__hint">
                  {loading
                    ? 'Cargando esquema…'
                    : 'No se encontró el esquema de pago asignado.'}
                </p>
              )}
            </section>
          </div>

          {resumen ? (
            <div className="pf-mi-perfil__resumen">
              <ResumenCard
                etiqueta="Turnos registrados"
                valor={String(resumen.totalTurnos)}
              />
              <ResumenCard
                etiqueta="Tiempo total laborado"
                valor={formatearDuracionMs(resumen.totalDuracionMs)}
              />
              <ResumenCard
                etiqueta="Horas extra"
                valor={formatearHorasDecimal(resumen.totalHorasExtra)}
                detalle={
                  resumen.totalPagoExtra > 0
                    ? formatearPrecioCuenta(resumen.totalPagoExtra)
                    : ''
                }
              />
              <ResumenCard
                etiqueta="Total devengado"
                valor={formatearPrecioCuenta(resumen.totalPago)}
                variante="destacado"
              />
              <ResumenCard
                etiqueta="Ya liquidado"
                valor={formatearPrecioCuenta(resumen.totalPagoLiquidado)}
                detalle={`${resumen.totalTurnosLiquidados} turno${resumen.totalTurnosLiquidados === 1 ? '' : 's'}`}
              />
              <ResumenCard
                etiqueta="Pendiente por liquidar"
                valor={formatearPrecioCuenta(resumen.totalPagoPendiente)}
                variante="pendiente"
                detalle={detallePendienteLiquidar(resumen)}
              />
            </div>
          ) : null}

          <section className="pf-mi-perfil__turnos">
            <h2 className="pf-mi-perfil__panel-title">Horas por día</h2>
            {horasPorDia.length === 0 ? (
              <p className="pf-mi-perfil__hint">
                Aún no hay días laborados registrados.
              </p>
            ) : (
              <div className="ag-finanzas__tabla-wrap">
                <table className="ag-finanzas__tabla">
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Turnos</th>
                      <th>Horas trabajadas</th>
                      <th>H. extra</th>
                      <th>H. nocturnas</th>
                      <th>H. dominicales</th>
                      <th>Estado</th>
                      <th>Total día</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horasPorDia.map((dia) => (
                      <tr key={dia.fecha}>
                        <td>
                          {formatearFechaCuenta(
                            new Date(`${dia.fecha}T12:00:00-05:00`).getTime(),
                          )}
                        </td>
                        <td>{dia.turnos}</td>
                        <td>{formatearHorasDecimal(dia.horasTrabajadas)}</td>
                        <td>
                          {dia.horasExtra > 0
                            ? formatearHorasDecimal(dia.horasExtra)
                            : '—'}
                        </td>
                        <td>
                          {dia.horasNocturnas > 0
                            ? formatearHorasDecimal(dia.horasNocturnas)
                            : '—'}
                        </td>
                        <td>
                          {dia.horasDominicales > 0
                            ? formatearHorasDecimal(dia.horasDominicales)
                            : '—'}
                        </td>
                        <td>
                          {dia.pendientes > 0 && dia.liquidados > 0
                            ? `${dia.liquidados} liq. · ${dia.pendientes} pend.`
                            : dia.pendientes > 0
                              ? 'Pendiente'
                              : 'Liquidado'}
                        </td>
                        <td>{formatearPrecioCuenta(dia.pagoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pf-mi-perfil__nomina">
            <div className="pf-mi-perfil__nomina-head">
              <h2 className="pf-mi-perfil__panel-title">Nóminas liquidadas</h2>
              <button
                type="button"
                className="ag-action-btn"
                onClick={() => setDesprendiblesOpen(true)}
                disabled={desprendibles.length === 0}
              >
                Ver desprendibles
                {desprendibles.length > 0 ? ` (${desprendibles.length})` : ''}
              </button>
            </div>

            {historial.length === 0 ? (
              <p className="pf-mi-perfil__hint">
                Este colaborador aún no tiene nóminas liquidadas.
              </p>
            ) : (
              <div className="ag-finanzas__tabla-wrap">
                <table className="ag-finanzas__tabla">
                  <thead>
                    <tr>
                      <th>Periodo</th>
                      <th>Turnos</th>
                      <th>Total</th>
                      <th>Liquidado el</th>
                      <th>Liquidado por</th>
                      <th>Presupuesto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((item) => (
                      <tr key={item.id || `${item.fechaInicio}-${item.liquidadoEn}`}>
                        <td>{formatearRangoLiquidacion(item)}</td>
                        <td>{item.totalTurnos ?? '—'}</td>
                        <td>{formatearPrecioCuenta(item.totalPago)}</td>
                        <td>{formatearFechaHoraCuenta(item.liquidadoEn)}</td>
                        <td>{item.liquidadoPorNombre || '—'}</td>
                        <td>
                          {item.presupuestoExterno
                            ? 'Externo'
                            : 'Caja'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pf-mi-perfil__turnos">
            <h2 className="pf-mi-perfil__panel-title">Turnos completados</h2>
            <p className="pf-mi-perfil__nota pf-mi-perfil__nota--turnos">
              {NOTA_LIQUIDACION_HASTA_DIA_ANTERIOR}
            </p>

            {turnos.length === 0 ? (
              <div className="ag-panel">
                <p className="ag-panel__empty">
                  Aún no hay turnos finalizados registrados.
                </p>
              </div>
            ) : (
              <div className="ag-finanzas__tabla-wrap">
                <table className="ag-finanzas__tabla pf-mi-perfil__tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nómina</th>
                      <th>Horario</th>
                      <th>Tiempo laborado</th>
                      <th>H. ordinarias</th>
                      <th>H. nocturnas</th>
                      <th>H. dominicales</th>
                      <th>Tiempo extra</th>
                      <th>H. extra liquidadas</th>
                      <th>Pago ordinario</th>
                      <th>Pago extra</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FilasTurnosTabla turnos={turnos} />
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      <LoadingOverlay visible={loading} label="Cargando información laboral" />

      <DesprendiblesNominaModal
        open={desprendiblesOpen}
        onClose={() => setDesprendiblesOpen(false)}
        desprendibles={desprendibles}
      />
    </section>
  )
}

export default ColaboradorDetalleGestion
