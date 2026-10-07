import { useCallback, useEffect, useMemo, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  eliminarComidaAdmin,
  obtenerComidasAdmin,
} from '../services/caloriasService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
} from './cuenta/cuentaUtils.js'
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

function AdministracionGeneralComidasIA() {
  const toast = useToast()
  const [comidas, setComidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroDesde, setFiltroDesde] = useState(inicioMesColombiaInput)
  const [filtroHasta, setFiltroHasta] = useState(fechaHoyColombiaInput)
  const [verTodoHistorial, setVerTodoHistorial] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(
    async ({ signal } = {}) => {
      setLoading(true)
      try {
        const data = await obtenerComidasAdmin({
          fechaDesde: verTodoHistorial ? undefined : filtroDesde || undefined,
          fechaHasta: verTodoHistorial ? undefined : filtroHasta || undefined,
          limite: verTodoHistorial ? 500 : 250,
          q: busqueda.trim() || undefined,
          signal,
        })
        setComidas(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar las comidas')
        setComidas([])
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [busqueda, filtroDesde, filtroHasta, toast, verTodoHistorial],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargar({ signal: controller.signal })
    return () => controller.abort()
  }, [cargar])

  const resumen = useMemo(() => {
    const usuarios = new Set(comidas.map((c) => c.uid).filter(Boolean))
    const kcal = comidas.reduce(
      (acc, item) => acc + (Number(item.caloriasEstimadas) || 0),
      0,
    )
    return {
      registros: comidas.length,
      usuarios: usuarios.size,
      kcal,
    }
  }, [comidas])

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget?.id) return
    setEliminando(true)
    try {
      await eliminarComidaAdmin({
        comidaId: eliminarTarget.id,
        uid: eliminarTarget.uid,
      })
      toast.success('Registro de comida eliminado')
      if (detalle?.id === eliminarTarget.id) setDetalle(null)
      setEliminarTarget(null)
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el registro')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Comidas IA</h1>
          <p className="ag-page__subtitle">
            Registro de usuarios que analizan sus platos con IA y qué están
            comiendo
          </p>
        </div>
        <button
          type="button"
          className="ag-action-btn ag-action-btn--ghost"
          onClick={() => cargar()}
          disabled={loading}
        >
          Actualizar
        </button>
      </header>

      <div className="pf-registro__filtros ag-comidas-ia__filtros">
        <label className="ag-asistencias__historial-toggle">
          <input
            type="checkbox"
            checked={verTodoHistorial}
            onChange={(e) => setVerTodoHistorial(e.target.checked)}
          />
          Todo el historial
        </label>

        {!verTodoHistorial && (
          <>
            <CampoFechaCalendario
              label="Desde"
              value={filtroDesde}
              onChange={setFiltroDesde}
            />
            <CampoFechaCalendario
              label="Hasta"
              value={filtroHasta}
              onChange={setFiltroHasta}
            />
          </>
        )}

        <label className="ag-comidas-ia__busqueda">
          <span>Buscar</span>
          <input
            type="search"
            className="pf-registro__input"
            placeholder="Nombre, documento o plato"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </label>
      </div>

      <div className="ag-comidas-ia__stats">
        <article>
          <strong>{resumen.registros}</strong>
          <span>Análisis</span>
        </article>
        <article>
          <strong>{resumen.usuarios}</strong>
          <span>Usuarios</span>
        </article>
        <article>
          <strong>{resumen.kcal.toLocaleString('es-CO')}</strong>
          <span>kcal registradas</span>
        </article>
      </div>

      {!loading && comidas.length === 0 ? (
        <p className="ag-page__empty">
          Aún no hay comidas analizadas con IA en este rango.
        </p>
      ) : (
        <div className="pf-usuario-historial__wrap">
          <table className="pf-usuario-historial__table">
            <thead>
              <tr>
                <th>Fecha / hora</th>
                <th>Usuario</th>
                <th>Documento</th>
                <th>Plato</th>
                <th>kcal</th>
                <th>Macros</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comidas.map((item) => (
                <tr key={`${item.uid}-${item.id}`}>
                  <td data-label="Fecha / hora">
                    {item.fechaLocal && item.horaLocal
                      ? `${formatearFechaCuenta(
                          item.fechaLocal
                            ? new Date(`${item.fechaLocal}T12:00:00`).getTime()
                            : null,
                        )} · ${item.horaLocal}`
                      : formatearFechaHoraCuenta(item.consumidoEn)}
                  </td>
                  <td data-label="Usuario">{item.usuarioNombre || '—'}</td>
                  <td data-label="Documento">
                    {[item.usuarioTipoDocumento, item.usuarioDocumento]
                      .filter(Boolean)
                      .join(' ') || '—'}
                  </td>
                  <td data-label="Plato">
                    <span className="ag-comidas-ia__plato">
                      {item.plato || '—'}
                    </span>
                    {item.alimentosDetectados?.length > 0 && (
                      <span className="ag-comidas-ia__alimentos">
                        {item.alimentosDetectados.slice(0, 4).join(', ')}
                      </span>
                    )}
                  </td>
                  <td data-label="kcal">
                    <strong>{item.caloriasEstimadas ?? 0}</strong>
                  </td>
                  <td data-label="Macros">
                    {item.macros
                      ? `P ${item.macros.proteinasG || 0} · C ${item.macros.carbohidratosG || 0} · G ${item.macros.grasasG || 0}`
                      : '—'}
                  </td>
                  <td data-label="">
                    <div className="ag-comidas-ia__row-actions">
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost ag-comidas-ia__detalle-btn"
                        onClick={() => setDetalle(item)}
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost pf-action-btn--danger ag-comidas-ia__detalle-btn"
                        onClick={() => setEliminarTarget(item)}
                        disabled={eliminando}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <div
          className="ag-comidas-ia__drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle de comida"
        >
          <div
            className="ag-comidas-ia__drawer-backdrop"
            onClick={() => setDetalle(null)}
          />
          <aside className="ag-comidas-ia__drawer-panel">
            <header>
              <h2>{detalle.plato || 'Comida'}</h2>
              <div className="ag-comidas-ia__row-actions">
                <button
                  type="button"
                  className="ag-action-btn ag-action-btn--ghost pf-action-btn--danger"
                  onClick={() => setEliminarTarget(detalle)}
                  disabled={eliminando}
                >
                  Eliminar
                </button>
                <button
                  type="button"
                  className="ag-action-btn ag-action-btn--ghost"
                  onClick={() => setDetalle(null)}
                >
                  Cerrar
                </button>
              </div>
            </header>
            <p>
              <strong>{detalle.usuarioNombre}</strong>
              {' · '}
              {[detalle.usuarioTipoDocumento, detalle.usuarioDocumento]
                .filter(Boolean)
                .join(' ')}
            </p>
            <p>
              {detalle.fechaLocal} {detalle.horaLocal} ·{' '}
              <strong>{detalle.caloriasEstimadas} kcal</strong>
            </p>
            {detalle.porcionEstimada && (
              <p>Porción: {detalle.porcionEstimada}</p>
            )}
            {detalle.macros && (
              <p>
                Proteínas {detalle.macros.proteinasG}g · Carbohidratos{' '}
                {detalle.macros.carbohidratosG}g · Grasas{' '}
                {detalle.macros.grasasG}g
              </p>
            )}
            {detalle.alimentosDetectados?.length > 0 && (
              <p>Detectado: {detalle.alimentosDetectados.join(', ')}</p>
            )}
            {detalle.resumen?.comoFunciona && (
              <section>
                <h3>Cómo funciona</h3>
                <p>{detalle.resumen.comoFunciona}</p>
              </section>
            )}
            {detalle.resumen?.beneficios?.length > 0 && (
              <section>
                <h3>Beneficios</h3>
                <ul>
                  {detalle.resumen.beneficios.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </section>
            )}
            {detalle.resumen?.afectaciones?.length > 0 && (
              <section>
                <h3>Afectaciones</h3>
                <ul>
                  {detalle.resumen.afectaciones.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </section>
            )}
            {detalle.resumen?.personalizado && (
              <section>
                <h3>Resumen personalizado</h3>
                <p>{detalle.resumen.personalizado}</p>
              </section>
            )}
          </aside>
        </div>
      )}

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={eliminando ? undefined : () => setEliminarTarget(null)}
        onConfirm={handleConfirmEliminar}
        title="Eliminar registro"
        message={
          eliminarTarget
            ? `¿Eliminar el análisis de "${eliminarTarget.plato || 'comida'}" de ${eliminarTarget.usuarioNombre || 'este usuario'}?`
            : ''
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={eliminando}
      />

      <LoadingOverlay
        visible={loading || eliminando}
        label={eliminando ? 'Eliminando registro' : 'Cargando comidas IA'}
      />
    </section>
  )
}

export default AdministracionGeneralComidasIA
