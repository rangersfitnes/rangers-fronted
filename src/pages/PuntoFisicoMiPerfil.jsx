import { useCallback, useEffect, useState } from 'react'
import DesprendiblesNominaModal from '../components/DesprendiblesNominaModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { NOTA_LIQUIDACION_HASTA_DIA_ANTERIOR } from '../constants/nominaLaboral.js'
import { SEDES } from '../services/horariosService.js'
import { obtenerMiPerfilLaboral } from '../services/miPerfilService.js'
import { MINUTOS_MINIMOS_HORA_EXTRA } from '../utils/calculoPagoTurnoUtils.js'
import {
  formatearDuracionMs,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './PuntoFisico.css'
import './PuntoFisicoMiPerfil.css'
import './AdministracionGeneral.css'

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
  if (Number.isInteger(valor)) {
    return `${valor} h`
  }
  return `${valor.toFixed(2).replace('.', ',')} h`
}

function formatearTiempoExtraTrabajado(turno) {
  const tiempoExtraMs = Number(turno.tiempoExtraMs) || 0
  const minutosExtra = Number(turno.minutosExtra) || 0

  if (tiempoExtraMs > 0) {
    return formatearDuracionMs(tiempoExtraMs)
  }

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
    if (estado === 'pendiente') {
      return `${monto} · pendiente de aprobar`
    }
    if (estado === 'rechazada') {
      return 'Rechazada'
    }
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

function CampoPerfil({ etiqueta, valor }) {
  return (
    <div className="pf-mi-perfil__campo">
      <span className="pf-mi-perfil__campo-label">{etiqueta}</span>
      <span className="pf-mi-perfil__campo-valor">{valor}</span>
    </div>
  )
}

function ResumenCard({ etiqueta, valor, destacado = false }) {
  return (
    <article
      className={`pf-mi-perfil__resumen-card${
        destacado ? ' pf-mi-perfil__resumen-card--destacado' : ''
      }`}
    >
      <span className="pf-mi-perfil__resumen-label">{etiqueta}</span>
      <strong className="pf-mi-perfil__resumen-valor">{valor}</strong>
    </article>
  )
}

function FilasTurnosTabla({ turnos }) {
  const tieneLiquidados = turnos.some((turno) => turno.liquidacionId)
  const tienePendientes = turnos.some((turno) => !turno.liquidacionId)
  const mostrarSeparador = tieneLiquidados && tienePendientes
  let separadorInsertado = false
  const columnas = 11

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
        <tr key="turnos-separador-liquidados" className="pf-mi-perfil__turnos-separador">
          <td colSpan={columnas}>
            Turnos ya liquidados en nómina
          </td>
        </tr>,
      )
    }

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
        <td>{formatearHoraCuenta(turno.inicioEn)}</td>
        <td>{formatearHoraCuenta(turno.finEn)}</td>
        <td>{formatearDuracionMs(turno.duracionMs)}</td>
        <td>{formatearHorasDecimal(turno.horasOrdinarias)}</td>
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

function PuntoFisicoMiPerfil() {
  const toast = useToast()
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noColaborador, setNoColaborador] = useState(false)
  const [desprendiblesOpen, setDesprendiblesOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    setNoColaborador(false)

    try {
      const perfil = await obtenerMiPerfilLaboral()
      setDatos(perfil)
    } catch (err) {
      if (err.message?.includes('perfil de colaborador')) {
        setNoColaborador(true)
        setDatos(null)
        return
      }
      const mensaje = err.message || 'No se pudo cargar tu perfil'
      setError(mensaje)
      toast.error(mensaje)
      setDatos(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const recargarSiVisible = () => {
      if (document.visibilityState === 'visible') {
        cargar()
      }
    }

    window.addEventListener('focus', recargarSiVisible)
    document.addEventListener('visibilitychange', recargarSiVisible)

    return () => {
      window.removeEventListener('focus', recargarSiVisible)
      document.removeEventListener('visibilitychange', recargarSiVisible)
    }
  }, [cargar])

  const colaborador = datos?.colaborador
  const esquema = datos?.esquema
  const esquemaClave = datos?.esquemaClave ?? colaborador?.esquemaPago ?? ''
  const turnos = datos?.turnos ?? []
  const resumen = datos?.resumen
  const desprendibles = datos?.desprendibles ?? []

  return (
    <section className="pf-page__view pf-mi-perfil">
      <header className="pf-page__view-header pf-page__view-header--with-action">
        <div>
          <h1 className="pf-page__title">Mi perfil</h1>
          <p className="pf-page__subtitle">
            Información laboral, turnos registrados y cálculo de pago según tu
            esquema
          </p>
        </div>
        <button
          type="button"
          className="pf-action-btn pf-action-btn--ghost"
          onClick={cargar}
          disabled={loading}
        >
          Actualizar
        </button>
      </header>

      {error ? <p className="pf-mi-perfil__error">{error}</p> : null}

      {noColaborador ? (
        <div className="pf-panel">
          <p className="pf-panel__empty">
            Esta sección está disponible solo para colaboradores registrados en
            Gestión humana.
          </p>
        </div>
      ) : null}

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
              </div>
            </section>

            <section className="pf-mi-perfil__panel">
              <h2 className="pf-mi-perfil__panel-title">Esquema laboral</h2>
              {esquema ? (
                <div className="pf-mi-perfil__campos">
                  <CampoPerfil etiqueta="Esquema asignado" valor={esquemaClave || esquema.nombre} />
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
                  <CampoPerfil
                    etiqueta="Hora extra"
                    valor={`${esquema.porcentajeHoraExtra}% · ${formatearPrecioCuenta(esquema.valorHoraExtra)}`}
                  />
                </div>
              ) : (
                <p className="pf-mi-perfil__hint">
                  No se encontró el esquema de pago asignado.
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
                etiqueta="Horas extra acumuladas"
                valor={formatearHorasDecimal(resumen.totalHorasExtra)}
              />
              <ResumenCard
                etiqueta="Total devengado"
                valor={formatearPrecioCuenta(resumen.totalPago)}
                destacado
              />
            </div>
          ) : null}

          <section className="pf-mi-perfil__nomina">
            <div className="pf-mi-perfil__nomina-head">
              <h2 className="pf-mi-perfil__panel-title">Nómina liquidada</h2>
              <button
                type="button"
                className="pf-action-btn"
                onClick={() => setDesprendiblesOpen(true)}
                disabled={desprendibles.length === 0}
              >
                Ver desprendibles de nómina
                {desprendibles.length > 0 ? ` (${desprendibles.length})` : ''}
              </button>
            </div>
            {desprendibles.length === 0 ? (
              <p className="pf-mi-perfil__hint">
                Cuando se liquide tu nómina, aquí podrás consultar y descargar
                tus desprendibles en PDF.
              </p>
            ) : (
              <p className="pf-mi-perfil__hint">
                Tienes {desprendibles.length} liquidación
                {desprendibles.length === 1 ? '' : 'es'} disponible
                {desprendibles.length === 1 ? '' : 's'} para descargar.
              </p>
            )}
          </section>

          <section className="pf-mi-perfil__turnos">
            <h2 className="pf-mi-perfil__panel-title">Turnos laborados</h2>
            <p className="pf-mi-perfil__nota pf-mi-perfil__nota--turnos">
              {NOTA_LIQUIDACION_HASTA_DIA_ANTERIOR}
            </p>

            {turnos.length === 0 ? (
              <div className="pf-panel">
                <p className="pf-panel__empty">
                  Aún no tienes turnos finalizados registrados.
                </p>
              </div>
            ) : (
              <div className="ag-finanzas__tabla-wrap">
                <table className="ag-finanzas__tabla pf-mi-perfil__tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nómina</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Tiempo laborado</th>
                      <th>H. ordinarias</th>
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

            {esquema ? (
              <p className="pf-mi-perfil__nota">
                El pago se calcula con tu esquema actual: hasta{' '}
                {formatearHorasDecimal(esquema.horasTurno)} se paga el valor del
                turno ({formatearPrecioCuenta(esquema.valorTurno)}). El tiempo
                adicional solo liquida horas extra a partir de{' '}
                {MINUTOS_MINIMOS_HORA_EXTRA} minutos continuos (por ejemplo,{' '}
                {MINUTOS_MINIMOS_HORA_EXTRA - 1} min extra no generan pago;{' '}
                {MINUTOS_MINIMOS_HORA_EXTRA} min o más cuentan como 1 hora extra). Cada hora extra se paga a{' '}
                {formatearPrecioCuenta(esquema.valorHoraExtra)}. El tiempo extra
                se muestra siempre en la tabla; la aprobación en Gestión humana
                solo es necesaria para incluirlo en la liquidación de nómina.
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      <LoadingOverlay visible={loading} label="Cargando perfil laboral" />

      <DesprendiblesNominaModal
        open={desprendiblesOpen}
        onClose={() => setDesprendiblesOpen(false)}
        desprendibles={desprendibles}
      />
    </section>
  )
}

export default PuntoFisicoMiPerfil
