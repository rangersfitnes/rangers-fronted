import { useCallback, useEffect, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  eliminarAsistenciaAdmin,
  obtenerAsistenciasAdmin,
} from '../services/asistenciasService.js'
import { SEDES } from '../services/horariosService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
} from './cuenta/cuentaUtils.js'
import {
  claseFilaAsistencia,
  deduplicarRegistrosAsistencia,
  etiquetaTipoAcceso,
  keyRegistroAsistencia,
  mensajeEliminarRegistro,
  mensajeExitoEliminar,
  tituloEliminarRegistro,
} from '../utils/asistenciasUtils.js'
import './AdministracionGeneral.css'
import './PuntoFisico.css'

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

function AdministracionGeneralAsistencias() {
  const toast = useToast()
  const [asistencias, setAsistencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [eliminando, setEliminando] = useState(false)
  const [eliminarTarget, setEliminarTarget] = useState(null)

  const [filtroSede, setFiltroSede] = useState('')
  const [filtroDesde, setFiltroDesde] = useState(inicioMesColombiaInput)
  const [filtroHasta, setFiltroHasta] = useState(fechaHoyColombiaInput)
  const [verTodoHistorial, setVerTodoHistorial] = useState(false)

  const cargarAsistencias = useCallback(
    async ({ signal } = {}) => {
      setLoading(true)
      try {
        const data = await obtenerAsistenciasAdmin({
          sede: filtroSede || undefined,
          fechaDesde: verTodoHistorial ? undefined : filtroDesde || undefined,
          fechaHasta: verTodoHistorial ? undefined : filtroHasta || undefined,
          limite: verTodoHistorial ? 1000 : 500,
          signal,
        })
        setAsistencias(deduplicarRegistrosAsistencia(data))
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar las asistencias')
        setAsistencias([])
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [filtroDesde, filtroHasta, filtroSede, verTodoHistorial, toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargarAsistencias({ signal: controller.signal })
    return () => controller.abort()
  }, [cargarAsistencias])

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget) return
    setEliminando(true)
    try {
      await eliminarAsistenciaAdmin({
        sedeId: eliminarTarget.sedeId,
        asistenciaId: eliminarTarget.id,
        origen: eliminarTarget.origen || 'asistencia',
      })
      toast.success(mensajeExitoEliminar(eliminarTarget))
      setEliminarTarget(null)
      await cargarAsistencias()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la asistencia')
    } finally {
      setEliminando(false)
    }
  }

  const loadingVisible = loading || eliminando

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Asistencias</h1>
          <p className="ag-page__subtitle">
            Ingresos por membresía y clases del día registrados en el box
          </p>
        </div>
        <button
          type="button"
          className="ag-action-btn ag-action-btn--ghost"
          onClick={() => cargarAsistencias()}
          disabled={loadingVisible}
        >
          Actualizar
        </button>
      </header>

      <section className="ag-finanzas__salidas-lista" aria-label="Asistencias registradas">
        <header className="ag-finanzas__salidas-header">
          <div>
            <h2 className="ag-finanzas__salidas-title">Registros de asistencia</h2>
            <p className="ag-finanzas__salidas-meta">
              {verTodoHistorial
                ? `${asistencias.length} registro(s) en el historial completo${asistencias.length >= 1000 ? ' (mostrando los 1000 más recientes)' : ''}`
                : `${asistencias.length} registro(s) en el periodo seleccionado`}
            </p>
          </div>
        </header>

        <ul className="ag-asistencias__leyenda" aria-label="Tipos de registro">
          <li className="ag-asistencias__leyenda-item ag-asistencias__leyenda-item--membresia">
            Membresía
          </li>
          <li className="ag-asistencias__leyenda-item ag-asistencias__leyenda-item--clase-dia">
            Clase del día
          </li>
          <li className="ag-asistencias__leyenda-item ag-asistencias__leyenda-item--clase-cortesia">
            Clase de cortesía
          </li>
        </ul>

        <div className="pf-registro__filtros ag-finanzas__salidas-filtros">
          <div className="pf-registro__filtros-campos">
            <label className="pf-registro__field">
              <span className="pf-registro__field-label">Sede</span>
              <select
                className="pf-registro__input"
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                disabled={loadingVisible}
              >
                <option value="">Todas las sedes</option>
                {SEDES.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf-registro__field pf-registro__field--checkbox">
              <span className="pf-registro__field-label">Periodo</span>
              <span className="ag-asistencias__historial-toggle">
                <input
                  type="checkbox"
                  checked={verTodoHistorial}
                  onChange={(e) => setVerTodoHistorial(e.target.checked)}
                  disabled={loadingVisible}
                />
                Todo el historial
              </span>
            </label>
            <CampoFechaCalendario
              label="Desde"
              value={filtroDesde}
              onChange={setFiltroDesde}
              disabled={loadingVisible || verTodoHistorial}
            />
            <CampoFechaCalendario
              label="Hasta"
              value={filtroHasta}
              onChange={setFiltroHasta}
              disabled={loadingVisible || verTodoHistorial}
            />
          </div>
          <button
            type="button"
            className="ag-action-btn"
            onClick={() => cargarAsistencias()}
            disabled={loadingVisible}
          >
            Consultar
          </button>
        </div>

        {!loading && asistencias.length === 0 && (
          <div className="ag-panel">
            <p className="ag-panel__empty">
              {verTodoHistorial
                ? 'No hay registros de asistencia ni clases del día en el sistema.'
                : 'No hay registros en el intervalo seleccionado.'}
            </p>
          </div>
        )}

        {asistencias.length > 0 && (
          <div className="ag-finanzas__tabla-wrap">
            <table className="ag-finanzas__tabla">
              <thead>
                <tr>
                  <th>Fecha ingreso</th>
                  <th>Hora registro</th>
                  <th>Sede</th>
                  <th>Documento</th>
                  <th>Usuario</th>
                  <th>Plan</th>
                  <th>Tipo</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {asistencias.map((item) => (
                  <tr
                    key={keyRegistroAsistencia(item)}
                    className={claseFilaAsistencia(item)}
                  >
                    <td>
                      {item.fecha
                        ? formatearFechaCuenta(
                            new Date(`${item.fecha}T12:00:00-05:00`).getTime(),
                          )
                        : '—'}
                    </td>
                    <td>{formatearFechaHoraCuenta(item.creadoEn)}</td>
                    <td>{item.sedeNombre || '—'}</td>
                    <td>{item.cedula || '—'}</td>
                    <td>{item.nombre || '—'}</td>
                    <td>{item.planNombre || '—'}</td>
                    <td>
                      <span
                        className={`ag-asistencias__tipo ag-asistencias__tipo--${item.tipoAcceso || 'membresia'}`}
                      >
                        {etiquetaTipoAcceso(item.tipoAcceso)}
                      </span>
                    </td>
                    <td className="ag-finanzas__tabla-acciones">
                      <button
                        type="button"
                        className="pf-movimiento__eliminar"
                        onClick={() => setEliminarTarget(item)}
                        disabled={loadingVisible}
                        aria-label={`Eliminar ${etiquetaTipoAcceso(item.tipoAcceso).toLowerCase()}`}
                        title={`Eliminar ${etiquetaTipoAcceso(item.tipoAcceso).toLowerCase()}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => {
          if (eliminando) return
          setEliminarTarget(null)
        }}
        onConfirm={handleConfirmEliminar}
        title={eliminarTarget ? tituloEliminarRegistro(eliminarTarget) : 'Eliminar registro'}
        message={
          eliminarTarget ? mensajeEliminarRegistro(eliminarTarget) : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminando}
      />

      <LoadingOverlay
        visible={loadingVisible}
        label={
          eliminando
            ? eliminarTarget?.origen === 'pago-clase'
              ? 'Eliminando clase del día'
              : 'Eliminando asistencia'
            : 'Cargando asistencias'
        }
      />
    </section>
  )
}

export default AdministracionGeneralAsistencias
