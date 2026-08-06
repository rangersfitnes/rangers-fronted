import { useCallback, useEffect, useRef, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import CrearUsuarioModal from '../components/CrearUsuarioModal.jsx'
import EditarUsuarioModal from '../components/EditarUsuarioModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import UsuariosTable from '../components/UsuariosTable.jsx'
import ChevronRightIcon from '../components/icons/ChevronRightIcon.jsx'
import { useToast } from '../components/Toast.jsx'
import { useDiaColombia } from '../hooks/useDiaColombia.js'
import {
  actualizarUsuario,
  eliminarUsuario,
  obtenerEstadisticasUsuarios,
  obtenerReporteCompletoUsuarios,
  obtenerUsuarios,
  registrarUsuario,
} from '../services/usuariosService.js'
import { obtenerPlanes } from '../services/planesService.js'
import {
  exportarReporteUsuariosExcel,
  exportarReporteUsuariosPdf,
} from '../utils/exportReporteUsuarios.js'
import UsuarioDetalleGestion from './UsuarioDetalleGestion.jsx'
import './PuntoFisico.css'

const PAGE_SIZE = 25

const CONTADORES_USUARIOS = [
  { id: null, etiqueta: 'Registrados', clave: 'total', tono: 'total' },
  {
    id: 'activo',
    etiqueta: 'Activos',
    clave: 'activos',
    tono: 'estado-activo',
  },
  {
    id: 'vencido',
    etiqueta: 'Vencidos',
    clave: 'vencidos',
    tono: 'estado-vencido',
  },
  {
    id: 'sin_plan',
    etiqueta: 'Sin plan',
    clave: 'sinPlan',
    tono: 'estado-sin-plan',
  },
]

const ETIQUETA_FILTRO_USUARIO = {
  activo: 'usuarios activos',
  vencido: 'usuarios vencidos',
  sin_plan: 'usuarios sin plan',
}

const OPCIONES_CATEGORIA = [
  { id: '', label: 'Todos (sin categoría)' },
  { id: 'nuevo', label: 'Usuarios nuevos' },
  { id: 'renovado', label: 'Renovaron membresía' },
]

const OPCIONES_VENTANA_NUEVOS = [
  { id: 7, label: 'Últimos 7 días' },
  { id: 15, label: 'Últimos 15 días' },
  { id: 30, label: 'Últimos 30 días' },
  { id: 60, label: 'Últimos 60 días' },
  { id: 90, label: 'Últimos 90 días' },
]

const OPCIONES_ORDEN = [
  { id: 'recientes', label: 'Más recientes (por registro)' },
  { id: 'antiguedad_desc', label: 'Más nuevos primero (antigüedad)' },
  { id: 'antiguedad_asc', label: 'Más antiguos primero' },
]

const TIPOS_BUSQUEDA_USUARIO = [
  {
    id: 'documento',
    label: 'Documento',
    placeholder: 'Ej. 1234567890',
    inputMode: 'numeric',
  },
  {
    id: 'nombre',
    label: 'Nombre',
    placeholder: 'Ej. Juan Pérez',
    inputMode: 'text',
  },
  {
    id: 'celular',
    label: 'Celular',
    placeholder: 'Ej. 3001234567',
    inputMode: 'tel',
  },
]

const ETIQUETA_TIPO_BUSQUEDA = {
  documento: 'documento',
  nombre: 'nombre',
  celular: 'celular',
}

function parametrosBusquedaUsuarios(busqueda) {
  if (!busqueda?.tipo || !busqueda?.termino) return {}
  return { [busqueda.tipo]: busqueda.termino }
}

function VistaUsuariosAdmin() {
  const toast = useToast()
  const [crearOpen, setCrearOpen] = useState(false)
  const [editarUsuario, setEditarUsuario] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [usuarioGestion, setUsuarioGestion] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [exportandoReporte, setExportandoReporte] = useState(false)
  const [error, setError] = useState('')

  const [usuarios, setUsuarios] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tipoBusqueda, setTipoBusqueda] = useState('documento')
  const [busquedaTexto, setBusquedaTexto] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState(null)
  const [filtroEstadoPlan, setFiltroEstadoPlan] = useState(null)
  const [filtroPlanId, setFiltroPlanId] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [ventanaNuevosDias, setVentanaNuevosDias] = useState(30)
  const [ordenListado, setOrdenListado] = useState('recientes')
  const [planes, setPlanes] = useState([])
  const [totalFiltrado, setTotalFiltrado] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    activos: 0,
    vencidos: 0,
    sinPlan: 0,
  })

  const filtrosListado = useCallback(
    () => ({
      estadoPlan: filtroEstadoPlan,
      planId: filtroPlanId || null,
      categoria: filtroCategoria || null,
      ventanaNuevosDias,
      orden: ordenListado,
    }),
    [
      filtroCategoria,
      filtroEstadoPlan,
      filtroPlanId,
      ordenListado,
      ventanaNuevosDias,
    ],
  )

  const cargarEstadisticas = useCallback(
    async ({ signal } = {}) => {
      try {
        const res = await obtenerEstadisticasUsuarios({ signal })
        setEstadisticas(res)
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar las estadísticas')
      }
    },
    [toast],
  )

  const cargarPlanesFiltro = useCallback(
    async ({ signal } = {}) => {
      try {
        const data = await obtenerPlanes({ signal })
        setPlanes(Array.isArray(data) ? data : [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        // Silencioso: el filtro de plan queda vacío si falla
      }
    },
    [],
  )

  const cargarUsuarios = useCallback(
    async (pagina, { signal, busqueda, filtros } = {}) => {
      setLoading(true)
      try {
        const filtrosActivos = filtros || {}
        const res = await obtenerUsuarios({
          page: pagina,
          limit: PAGE_SIZE,
          ...parametrosBusquedaUsuarios(busqueda),
          estadoPlan: busqueda ? undefined : filtrosActivos.estadoPlan,
          planId: busqueda ? undefined : filtrosActivos.planId,
          categoria: busqueda ? undefined : filtrosActivos.categoria,
          ventanaNuevosDias: busqueda
            ? undefined
            : filtrosActivos.ventanaNuevosDias,
          orden: busqueda ? undefined : filtrosActivos.orden,
          signal,
        })
        setUsuarios(res.usuarios)
        setHasMore(res.hasMore)
        setPage(res.page)
        setTotalFiltrado(
          busqueda ||
            filtrosActivos.estadoPlan ||
            filtrosActivos.planId ||
            filtrosActivos.categoria ||
            (filtrosActivos.orden && filtrosActivos.orden !== 'recientes')
            ? res.total
            : null,
        )
        if (res.busqueda && res.tipoBusqueda) {
          setBusquedaActiva({
            tipo: res.tipoBusqueda,
            termino: res.busqueda,
          })
        } else {
          setBusquedaActiva(null)
        }
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar los usuarios')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [toast],
  )

  const recargarListado = useCallback(
    (pagina = page) => {
      cargarUsuarios(pagina, {
        busqueda: busquedaActiva,
        filtros: busquedaActiva ? {} : filtrosListado(),
      })
      cargarEstadisticas()
    },
    [
      busquedaActiva,
      cargarEstadisticas,
      cargarUsuarios,
      filtrosListado,
      page,
    ],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargarUsuarios(1, {
      signal: controller.signal,
      filtros: filtrosListado(),
    })
    cargarEstadisticas({ signal: controller.signal })
    cargarPlanesFiltro({ signal: controller.signal })
    return () => controller.abort()
    // Solo carga inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const diaColombia = useDiaColombia()
  const diaListadoRef = useRef(diaColombia)

  // Al pasar el día en Colombia, recarga listado y estadísticas (días / vencidos).
  useEffect(() => {
    if (diaListadoRef.current === diaColombia) return
    diaListadoRef.current = diaColombia
    recargarListado(page)
  }, [diaColombia, page, recargarListado])

  const opcionBusquedaActual = TIPOS_BUSQUEDA_USUARIO.find(
    (opcion) => opcion.id === tipoBusqueda,
  )

  const handleBusquedaInput = (event) => {
    let valor = event.target.value
    if (tipoBusqueda === 'documento') {
      valor = valor.replace(/\s/g, '')
    } else if (tipoBusqueda === 'celular') {
      valor = valor.replace(/[^\d+]/g, '')
    }
    setBusquedaTexto(valor)
  }

  const handleCambioTipoBusqueda = (event) => {
    setTipoBusqueda(event.target.value)
    setBusquedaTexto('')
  }

  const ejecutarBusqueda = () => {
    const termino = busquedaTexto.trim()
    if (!termino) {
      setBusquedaActiva(null)
      cargarUsuarios(1, { filtros: filtrosListado() })
      return
    }

    if (tipoBusqueda === 'nombre' && termino.length < 2) {
      toast.error('Escribe al menos 2 caracteres del nombre')
      return
    }

    if (
      tipoBusqueda === 'celular' &&
      termino.replace(/\D/g, '').length < 3
    ) {
      toast.error('Escribe al menos 3 dígitos del celular')
      return
    }

    const busqueda = { tipo: tipoBusqueda, termino }
    cargarUsuarios(1, { busqueda })
  }

  const limpiarBusqueda = () => {
    setBusquedaTexto('')
    setBusquedaActiva(null)
    cargarUsuarios(1, { filtros: filtrosListado() })
  }

  const aplicarFiltrosDetalle = () => {
    setBusquedaTexto('')
    setBusquedaActiva(null)
    cargarUsuarios(1, { filtros: filtrosListado() })
  }

  const limpiarFiltrosDetalle = () => {
    setFiltroEstadoPlan(null)
    setFiltroPlanId('')
    setFiltroCategoria('')
    setVentanaNuevosDias(30)
    setOrdenListado('recientes')
    setBusquedaTexto('')
    setBusquedaActiva(null)
    cargarUsuarios(1, {
      filtros: {
        estadoPlan: null,
        planId: null,
        categoria: null,
        ventanaNuevosDias: 30,
        orden: 'recientes',
      },
    })
  }

  const seleccionarFiltro = (estadoPlan) => {
    const siguiente = filtroEstadoPlan === estadoPlan ? null : estadoPlan
    setBusquedaTexto('')
    setBusquedaActiva(null)
    setFiltroEstadoPlan(siguiente)
    cargarUsuarios(1, {
      filtros: {
        ...filtrosListado(),
        estadoPlan: siguiente,
      },
    })
  }

  const handleBusquedaKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      ejecutarBusqueda()
    }
  }

  const handleExportarReporte = async (formato) => {
    setExportandoReporte(true)
    try {
      const reporte = await obtenerReporteCompletoUsuarios()
      if (formato === 'xlsx') {
        await exportarReporteUsuariosExcel(reporte)
      } else {
        exportarReporteUsuariosPdf(reporte)
      }
      const etiquetaFormato = formato === 'xlsx' ? 'Excel' : 'PDF'
      toast.success(
        formato === 'xlsx'
          ? `Plantilla de clientes exportada con ${reporte.usuarios.length} usuario${
              reporte.usuarios.length === 1 ? '' : 's'
            }`
          : `${etiquetaFormato} exportado con ${reporte.usuarios.length} usuario${
              reporte.usuarios.length === 1 ? '' : 's'
            }`,
      )
    } catch (err) {
      const etiquetaFormato = formato === 'xlsx' ? 'Excel' : 'PDF'
      toast.error(err.message || `No se pudo exportar el ${etiquetaFormato}`)
    } finally {
      setExportandoReporte(false)
    }
  }

  const handleRowClick = (usuario) => {
    setUsuarioGestion(usuario)
  }

  const handleCloseCrear = () => {
    if (submitting) return
    setError('')
    setCrearOpen(false)
  }

  const handleCloseEditar = () => {
    if (submitting) return
    setError('')
    setEditarUsuario(null)
  }

  const handleCrearUsuario = async (datos) => {
    setError('')
    setSubmitting(true)

    try {
      const res = await registrarUsuario(datos)
      toast.success(
        `Usuario "${res.usuario?.nombre || datos.nombre}" creado correctamente`,
      )
      setCrearOpen(false)
      recargarListado(1)
    } catch (err) {
      setError(err.message || 'No se pudo crear el usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditarUsuario = async (datos) => {
    if (!editarUsuario) return
    setError('')
    setSubmitting(true)

    try {
      await actualizarUsuario(editarUsuario.uid, datos)
      toast.success(`Usuario "${datos.nombre}" actualizado`)
      setEditarUsuario(null)
      if (usuarioGestion?.uid === editarUsuario.uid) {
        setUsuarioGestion((prev) => (prev ? { ...prev, ...datos } : prev))
      }
      recargarListado(page)
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget) return
    setActionLoading(true)

    try {
      await eliminarUsuario(eliminarTarget.uid)
      toast.success(`Usuario "${eliminarTarget.nombre}" eliminado`)
      if (usuarioGestion?.uid === eliminarTarget.uid) {
        setUsuarioGestion(null)
      }
      setEliminarTarget(null)
      recargarListado(page)
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el usuario')
    } finally {
      setActionLoading(false)
    }
  }

  const irAnterior = () => {
    if (page <= 1 || loading || busquedaActiva) return
    cargarUsuarios(page - 1, { filtros: filtrosListado() })
  }

  const irSiguiente = () => {
    if (!hasMore || loading || busquedaActiva) return
    cargarUsuarios(page + 1, { filtros: filtrosListado() })
  }

  const enModoBusqueda = Boolean(busquedaActiva)
  const hayFiltrosDetalle = Boolean(
    filtroEstadoPlan ||
      filtroPlanId ||
      filtroCategoria ||
      ordenListado !== 'recientes',
  )

  const textoResumenFiltros = () => {
    const partes = []
    if (filtroEstadoPlan) {
      partes.push(ETIQUETA_FILTRO_USUARIO[filtroEstadoPlan])
    }
    if (filtroPlanId) {
      const plan = planes.find((p) => p.id === filtroPlanId)
      partes.push(`plan «${plan?.nombre || filtroPlanId}»`)
    }
    if (filtroCategoria === 'nuevo') {
      partes.push(`nuevos (últimos ${ventanaNuevosDias} días)`)
    }
    if (filtroCategoria === 'renovado') {
      partes.push('que renovaron membresía')
    }
    if (ordenListado === 'antiguedad_asc') {
      partes.push('ordenados del más antiguo al más nuevo')
    }
    if (ordenListado === 'antiguedad_desc') {
      partes.push('ordenados del más nuevo al más antiguo')
    }
    return partes.join(' · ')
  }

  if (usuarioGestion) {
    return (
      <>
        <UsuarioDetalleGestion
          usuario={usuarioGestion}
          onVolver={() => setUsuarioGestion(null)}
          onEditar={setEditarUsuario}
          onEliminar={setEliminarTarget}
        />

        <EditarUsuarioModal
          open={Boolean(editarUsuario)}
          onClose={handleCloseEditar}
          onSubmit={handleEditarUsuario}
          submitting={submitting}
          error={error}
          usuario={editarUsuario}
        />

        <ConfirmModal
          open={Boolean(eliminarTarget)}
          onClose={() => setEliminarTarget(null)}
          onConfirm={handleConfirmEliminar}
          title="Eliminar usuario"
          message={
            eliminarTarget
              ? `¿Seguro que quieres eliminar al usuario "${eliminarTarget.nombre}"? Esta acción también borrará su cuenta de autenticación y no se puede deshacer.`
              : ''
          }
          confirmLabel="Eliminar"
          variant="danger"
          loading={actionLoading}
        />

        <LoadingOverlay
          visible={submitting || actionLoading}
          label={
            submitting
              ? 'Guardando cambios'
              : 'Procesando…'
          }
        />
      </>
    )
  }

  return (
    <section className="pf-page__view">
      <header className="pf-page__view-header pf-page__view-header--with-action">
        <div>
          <h1 className="pf-page__title">Usuarios</h1>
          <p className="pf-page__subtitle">
            Lista de miembros — haz clic en uno para gestionar su plan y entrenamientos
          </p>
        </div>
        <div className="pf-page__view-actions">
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={() => handleExportarReporte('pdf')}
            disabled={loading || exportandoReporte}
          >
            {exportandoReporte ? 'Generando reporte…' : 'Exportar PDF'}
          </button>
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={() => handleExportarReporte('xlsx')}
            disabled={loading || exportandoReporte}
          >
            {exportandoReporte ? 'Generando reporte…' : 'Exportar Excel clientes'}
          </button>
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={() => recargarListado(page)}
            disabled={loading || exportandoReporte}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="pf-action-btn"
            onClick={() => setCrearOpen(true)}
          >
            + Crear usuario
          </button>
        </div>
      </header>

      <div className="pf-usuarios-resumen" aria-label="Resumen de usuarios">
        {CONTADORES_USUARIOS.map((contador) => {
          const seleccionado = filtroEstadoPlan === contador.id
          return (
            <button
              key={contador.etiqueta}
              type="button"
              className={`pf-usuarios-resumen__card pf-usuarios-resumen__card--${contador.tono}${
                seleccionado ? ' pf-usuarios-resumen__card--seleccionado' : ''
              }`}
              onClick={() => seleccionarFiltro(contador.id)}
              disabled={loading}
              aria-pressed={seleccionado}
            >
              <span className="pf-usuarios-resumen__valor">
                {estadisticas[contador.clave] ?? 0}
              </span>
              <span className="pf-usuarios-resumen__etiqueta">
                {contador.etiqueta}
              </span>
            </button>
          )
        })}
      </div>

      <div className="pf-usuarios-busqueda">
        <label className="pf-usuarios-busqueda__field pf-usuarios-busqueda__field--tipo">
          <span className="pf-usuarios-busqueda__label">Buscar por</span>
          <select
            className="pf-usuarios-busqueda__select"
            value={tipoBusqueda}
            onChange={handleCambioTipoBusqueda}
            disabled={loading}
          >
            {TIPOS_BUSQUEDA_USUARIO.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>
                {opcion.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pf-usuarios-busqueda__field">
          <span className="pf-usuarios-busqueda__label">
            {opcionBusquedaActual?.label || 'Buscar'}
          </span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={busquedaTexto}
            onChange={handleBusquedaInput}
            onKeyDown={handleBusquedaKeyDown}
            placeholder={opcionBusquedaActual?.placeholder || 'Buscar…'}
            inputMode={opcionBusquedaActual?.inputMode || 'text'}
            disabled={loading}
          />
        </label>
        <div className="pf-usuarios-busqueda__actions">
          <button
            type="button"
            className="pf-action-btn"
            onClick={ejecutarBusqueda}
            disabled={loading}
          >
            Buscar
          </button>
          {enModoBusqueda ? (
            <button
              type="button"
              className="pf-action-btn pf-action-btn--ghost"
              onClick={limpiarBusqueda}
              disabled={loading}
            >
              Ver todos
            </button>
          ) : null}
        </div>
      </div>

      <div className="pf-usuarios-filtros" aria-label="Filtros detallados">
        <div className="pf-usuarios-filtros__grid">
          <label className="pf-usuarios-busqueda__field">
            <span className="pf-usuarios-busqueda__label">Plan</span>
            <select
              className="pf-usuarios-busqueda__select"
              value={filtroPlanId}
              onChange={(e) => setFiltroPlanId(e.target.value)}
              disabled={loading || enModoBusqueda}
            >
              <option value="">Todos los planes</option>
              {planes.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre || plan.id}
                  {plan.estado && plan.estado !== 'activo'
                    ? ` (${plan.estado})`
                    : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="pf-usuarios-busqueda__field">
            <span className="pf-usuarios-busqueda__label">Categoría</span>
            <select
              className="pf-usuarios-busqueda__select"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              disabled={loading || enModoBusqueda}
            >
              {OPCIONES_CATEGORIA.map((opcion) => (
                <option key={opcion.id || 'todas'} value={opcion.id}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pf-usuarios-busqueda__field">
            <span className="pf-usuarios-busqueda__label">
              Ventana de nuevos
            </span>
            <select
              className="pf-usuarios-busqueda__select"
              value={ventanaNuevosDias}
              onChange={(e) => setVentanaNuevosDias(Number(e.target.value))}
              disabled={
                loading || enModoBusqueda || filtroCategoria !== 'nuevo'
              }
            >
              {OPCIONES_VENTANA_NUEVOS.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>

          <label className="pf-usuarios-busqueda__field">
            <span className="pf-usuarios-busqueda__label">Ordenar por</span>
            <select
              className="pf-usuarios-busqueda__select"
              value={ordenListado}
              onChange={(e) => setOrdenListado(e.target.value)}
              disabled={loading || enModoBusqueda}
            >
              {OPCIONES_ORDEN.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pf-usuarios-filtros__actions">
          <button
            type="button"
            className="pf-action-btn"
            onClick={aplicarFiltrosDetalle}
            disabled={loading || enModoBusqueda}
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={limpiarFiltrosDetalle}
            disabled={loading || (!hayFiltrosDetalle && !enModoBusqueda)}
          >
            Limpiar filtros
          </button>
        </div>

        <p className="pf-usuarios-filtros__ayuda">
          «Usuarios nuevos» = registrados en la ventana elegida. «Renovaron
          membresía» = 2 o más activaciones de plan confirmadas. Puedes
          combinarlo con el estado (Activos / Vencidos / Sin plan).
        </p>
      </div>

      {enModoBusqueda && !loading ? (
        <p className="pf-usuarios-busqueda__hint">
          Resultados para el {ETIQUETA_TIPO_BUSQUEDA[busquedaActiva.tipo]} «
          {busquedaActiva.termino}»
          {usuarios.length === 0 ? ' — sin coincidencias' : ''}
        </p>
      ) : null}

      {!enModoBusqueda && hayFiltrosDetalle && !loading ? (
        <p className="pf-usuarios-busqueda__hint">
          Mostrando {textoResumenFiltros()}
          {totalFiltrado != null ? ` · ${totalFiltrado} resultado${totalFiltrado === 1 ? '' : 's'}` : ''}
          {usuarios.length === 0 ? ' — sin coincidencias' : ''}
        </p>
      ) : null}

      {!loading && usuarios.length === 0 && (
        <div className="pf-panel">
          <p className="pf-panel__empty">
            {enModoBusqueda
              ? `No se encontró ningún usuario con ese ${ETIQUETA_TIPO_BUSQUEDA[busquedaActiva?.tipo] || 'criterio'}.`
              : hayFiltrosDetalle
                ? 'No hay usuarios con esos filtros.'
                : 'Aún no hay usuarios registrados. Crea el primero con el botón «+ Crear usuario».'}
          </p>
        </div>
      )}

      {usuarios.length > 0 && (
        <UsuariosTable usuarios={usuarios} onRowClick={handleRowClick} />
      )}

      {!enModoBusqueda && (usuarios.length > 0 || page > 1) && (
        <div className="pf-pagination">
          <button
            type="button"
            className="pf-pagination__btn"
            onClick={irAnterior}
            disabled={page <= 1 || loading}
          >
            ← Anterior
          </button>
          <span className="pf-pagination__info">Página {page}</span>
          <button
            type="button"
            className="pf-pagination__btn"
            onClick={irSiguiente}
            disabled={!hasMore || loading}
          >
            <span className="pf-pagination__btn-label">
              Siguiente
              <ChevronRightIcon className="pf-pagination__chevron" />
            </span>
          </button>
        </div>
      )}

      <CrearUsuarioModal
        open={crearOpen}
        onClose={handleCloseCrear}
        onSubmit={handleCrearUsuario}
        submitting={submitting}
        error={error}
      />

      <EditarUsuarioModal
        open={Boolean(editarUsuario)}
        onClose={handleCloseEditar}
        onSubmit={handleEditarUsuario}
        submitting={submitting}
        error={error}
        usuario={editarUsuario}
      />

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => setEliminarTarget(null)}
        onConfirm={handleConfirmEliminar}
        title="Eliminar usuario"
        message={
          eliminarTarget
            ? `¿Seguro que quieres eliminar al usuario "${eliminarTarget.nombre}"? Esta acción también borrará su cuenta de autenticación y no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={actionLoading}
      />

      <LoadingOverlay
        visible={loading || submitting || actionLoading || exportandoReporte}
        label={
          exportandoReporte
            ? 'Generando reporte'
            : submitting
              ? editarUsuario
                ? 'Guardando cambios'
                : 'Creando usuario'
              : actionLoading
                ? 'Procesando…'
                : 'Cargando usuarios'
        }
      />
    </section>
  )
}

export default VistaUsuariosAdmin
