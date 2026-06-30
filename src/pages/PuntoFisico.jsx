import { useCallback, useEffect, useRef, useState } from 'react'
import { colors } from '../variables/colors.jsx'
import AdminTabsHeader from '../components/AdminTabsHeader.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import CrearUsuarioModal from '../components/CrearUsuarioModal.jsx'
import EditarUsuarioModal from '../components/EditarUsuarioModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import UsuariosTable from '../components/UsuariosTable.jsx'
import ChevronRightIcon from '../components/icons/ChevronRightIcon.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  actualizarUsuario,
  eliminarUsuario,
  obtenerEstadisticasUsuarios,
  obtenerUsuarios,
  registrarUsuario,
} from '../services/usuariosService.js'
import { abrirKioscoAcceso } from '../utils/abrirKioscoAcceso.js'
import UsuarioDetalleGestion from './UsuarioDetalleGestion.jsx'
import VistaPagoClases from './PuntoFisicoPagoClases.jsx'
import VistaCierreDiario from './PuntoFisicoCierreDiario.jsx'
import VistaControlAcceso from './PuntoFisicoControlAcceso.jsx'
import VistaMiPerfil from './PuntoFisicoMiPerfil.jsx'
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

const tabs = [
  { id: 'control-acceso', label: 'Control de acceso' },
  { id: 'pago-clases', label: 'Pago del día' },
  { id: 'cierre-diario', label: 'Cierre diario' },
  { id: 'mi-perfil', label: 'Mi perfil' },
  { id: 'usuarios', label: 'Usuarios' },
]

function VistaUsuarios() {
  const toast = useToast()
  const [crearOpen, setCrearOpen] = useState(false)
  const [editarUsuario, setEditarUsuario] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [usuarioGestion, setUsuarioGestion] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const [usuarios, setUsuarios] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tipoBusqueda, setTipoBusqueda] = useState('documento')
  const [busquedaTexto, setBusquedaTexto] = useState('')
  const [busquedaActiva, setBusquedaActiva] = useState(null)
  const [filtroEstadoPlan, setFiltroEstadoPlan] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    total: 0,
    activos: 0,
    vencidos: 0,
    sinPlan: 0,
  })

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

  const cargarUsuarios = useCallback(
    async (pagina, { signal, busqueda, estadoPlan = null } = {}) => {
      setLoading(true)
      try {
        const res = await obtenerUsuarios({
          page: pagina,
          limit: PAGE_SIZE,
          ...parametrosBusquedaUsuarios(busqueda),
          estadoPlan: busqueda ? undefined : estadoPlan,
          signal,
        })
        setUsuarios(res.usuarios)
        setHasMore(res.hasMore)
        setPage(res.page)
        if (res.busqueda && res.tipoBusqueda) {
          setBusquedaActiva({
            tipo: res.tipoBusqueda,
            termino: res.busqueda,
          })
        } else {
          setBusquedaActiva(null)
        }
        if (!res.busqueda) {
          setFiltroEstadoPlan(res.estadoPlan || null)
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
        estadoPlan: busquedaActiva ? null : filtroEstadoPlan,
      })
      cargarEstadisticas()
    },
    [
      busquedaActiva,
      cargarEstadisticas,
      cargarUsuarios,
      filtroEstadoPlan,
      page,
    ],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargarUsuarios(1, { signal: controller.signal })
    cargarEstadisticas({ signal: controller.signal })
    return () => controller.abort()
  }, [cargarEstadisticas, cargarUsuarios])

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
      cargarUsuarios(1, { estadoPlan: filtroEstadoPlan })
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
    setFiltroEstadoPlan(null)
    cargarUsuarios(1, { busqueda })
  }

  const limpiarBusqueda = () => {
    setBusquedaTexto('')
    setBusquedaActiva(null)
    cargarUsuarios(1, { estadoPlan: filtroEstadoPlan })
  }

  const seleccionarFiltro = (estadoPlan) => {
    const siguiente = filtroEstadoPlan === estadoPlan ? null : estadoPlan
    setBusquedaTexto('')
    setBusquedaActiva(null)
    setFiltroEstadoPlan(siguiente)
    cargarUsuarios(1, { estadoPlan: siguiente })
  }

  const handleBusquedaKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      ejecutarBusqueda()
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
    cargarUsuarios(page - 1, { estadoPlan: filtroEstadoPlan })
  }

  const irSiguiente = () => {
    if (!hasMore || loading || busquedaActiva) return
    cargarUsuarios(page + 1, { estadoPlan: filtroEstadoPlan })
  }

  const enModoBusqueda = Boolean(busquedaActiva)

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
            onClick={() => recargarListado(page)}
            disabled={loading}
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

      {enModoBusqueda && !loading ? (
        <p className="pf-usuarios-busqueda__hint">
          Resultados para el {ETIQUETA_TIPO_BUSQUEDA[busquedaActiva.tipo]} «
          {busquedaActiva.termino}»
          {usuarios.length === 0 ? ' — sin coincidencias' : ''}
        </p>
      ) : null}

      {!enModoBusqueda && filtroEstadoPlan && !loading ? (
        <p className="pf-usuarios-busqueda__hint">
          Mostrando {ETIQUETA_FILTRO_USUARIO[filtroEstadoPlan]}
          {usuarios.length === 0 ? ' — sin coincidencias' : ''}
        </p>
      ) : null}

      {!loading && usuarios.length === 0 && (
        <div className="pf-panel">
          <p className="pf-panel__empty">
            {enModoBusqueda
              ? `No se encontró ningún usuario con ese ${ETIQUETA_TIPO_BUSQUEDA[busquedaActiva?.tipo] || 'criterio'}.`
              : filtroEstadoPlan
                ? `No hay ${ETIQUETA_FILTRO_USUARIO[filtroEstadoPlan]}.`
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
        visible={loading || submitting || actionLoading}
        label={
          submitting
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

function PuntoFisico() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('control-acceso')
  const [fullscreen, setFullscreen] = useState(false)
  const pageRef = useRef(null)

  useEffect(() => {
    const sincronizarFullscreen = () => {
      const activo = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement,
      )
      setFullscreen(activo)
    }

    document.addEventListener('fullscreenchange', sincronizarFullscreen)
    document.addEventListener('webkitfullscreenchange', sincronizarFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', sincronizarFullscreen)
      document.removeEventListener('webkitfullscreenchange', sincronizarFullscreen)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'control-acceso') {
      const el =
        document.fullscreenElement || document.webkitFullscreenElement
      if (el) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
        else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        }
      }
      setFullscreen(false)
    }
  }, [activeTab])

  const toggleFullscreen = useCallback(async () => {
    const el = pageRef.current
    if (!el) return

    const activo = Boolean(
      document.fullscreenElement || document.webkitFullscreenElement,
    )

    try {
      if (!activo) {
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
        else setFullscreen(true)
      } else if (document.exitFullscreen) await document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      else setFullscreen(false)
    } catch {
      setFullscreen((prev) => !prev)
    }
  }, [])

  const abrirPantallaExterna = useCallback(async () => {
    const resultado = await abrirKioscoAcceso()
    if (!resultado.ok) {
      toast.error(
        resultado.reason === 'blocked'
          ? 'Permite ventanas emergentes para abrir la pantalla externa.'
          : 'No se pudo abrir la pantalla de acceso externa.',
      )
    }
  }, [toast])

  const enControlAcceso = activeTab === 'control-acceso'
  const ocultarTabs = enControlAcceso && fullscreen

  return (
    <div
      ref={pageRef}
      className={`pf-page${fullscreen ? ' pf-page--fullscreen' : ''}`}
      style={{ backgroundColor: colors.page_background }}
    >
      {!ocultarTabs ? (
        <AdminTabsHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel="Secciones del punto físico"
        />
      ) : null}

      <main
        className={`pf-page__main${
          enControlAcceso ? ' pf-page__main--control-acceso' : ''
        }`}
      >
        {enControlAcceso ? (
          <>
            {!fullscreen ? (
              <div className="pf-control-acceso__admin-bar">
                <button
                  type="button"
                  className="pf-control-acceso__hdmi-btn"
                  onClick={abrirPantallaExterna}
                >
                  <svg
                    className="pf-control-acceso__hdmi-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="2" y="4" width="20" height="14" rx="2" />
                    <path d="M8 22h8M12 18v4" />
                  </svg>
                  Pantalla externa (HDMI)
                </button>
              </div>
            ) : null}
            <VistaControlAcceso
              fullscreen={fullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </>
        ) : null}
        {activeTab === 'pago-clases' && <VistaPagoClases />}
        {activeTab === 'cierre-diario' && <VistaCierreDiario />}
        {activeTab === 'mi-perfil' && <VistaMiPerfil />}
        {activeTab === 'usuarios' && <VistaUsuarios />}
      </main>
    </div>
  )
}

export default PuntoFisico
