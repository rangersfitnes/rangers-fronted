import { useCallback, useEffect, useState } from 'react'
import { colors } from '../variables/colors.jsx'
import AdminTabsHeader from '../components/AdminTabsHeader.jsx'
import PlanFormModal from '../components/PlanFormModal.jsx'
import CuponFormModal from '../components/CuponFormModal.jsx'
import CuponesListModal from '../components/CuponesListModal.jsx'
import ModificarVigenciaModal from '../components/ModificarVigenciaModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import PlanesTable from '../components/PlanesTable.jsx'
import ConfiguracionHorarios from '../components/ConfiguracionHorarios.jsx'
import ConfiguracionClasesGrupales from '../components/ConfiguracionClasesGrupales.jsx'
import EventosTable from '../components/EventosTable.jsx'
import EventoFormModal from '../components/EventoFormModal.jsx'
import EnviarMensajeWhatsAppModal from '../components/EnviarMensajeWhatsAppModal.jsx'
import WhatsAppConexionModal from '../components/WhatsAppConexionModal.jsx'
import PlantillaFormModal from '../components/PlantillaFormModal.jsx'
import EnviarMensajeMasivoModal from '../components/EnviarMensajeMasivoModal.jsx'
import RowActionsMenu from '../components/RowActionsMenu.jsx'
import trashIcon from '../assets/images/icons/trash.svg'
import { useToast } from '../components/Toast.jsx'
import {
  actualizarPlan,
  crearPlan,
  eliminarPlan,
  obtenerPlanes,
} from '../services/planesService.js'
import { crearCupon, obtenerCupones } from '../services/cuponesService.js'
import {
  actualizarEvento,
  crearEvento,
  eliminarEvento,
  obtenerEventos,
} from '../services/eventosService.js'
import {
  enviarMensajeWhatsApp,
  obtenerEstadoWhatsApp,
  WHATSAPP_SESSION_CLOSED_CODE,
} from '../services/whatsappService.js'
import { crearPlantilla, guardarPlantillaAutomatica } from '../services/plantillasService.js'
import VistaFinanzas from './AdministracionGeneralFinanzas.jsx'
import VistaGestionHumana from './AdministracionGeneralGestionHumana.jsx'
import VistaAsistencias from './AdministracionGeneralAsistencias.jsx'
import VistaContenidoWeb from './AdministracionGeneralContenidoWeb.jsx'
import './AdministracionGeneral.css'

const tabs = [
  { id: 'planes', label: 'Planes' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'clases-grupales', label: 'Clases grupales' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'asistencias', label: 'Asistencias' },
  { id: 'contenido-web', label: 'Contenido web' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'gestion-humana', label: 'Gestión humana' },
]

function VistaPlanes() {
  const toast = useToast()
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)

  const [crearOpen, setCrearOpen] = useState(false)
  const [crearTiqueteraOpen, setCrearTiqueteraOpen] = useState(false)
  const [cuponOpen, setCuponOpen] = useState(false)
  const [vigenciaOpen, setVigenciaOpen] = useState(false)
  const [guardandoVigencia, setGuardandoVigencia] = useState(false)
  const [cuponesListOpen, setCuponesListOpen] = useState(false)
  const [cupones, setCupones] = useState([])
  const [cuponError, setCuponError] = useState('')
  const [guardandoCupon, setGuardandoCupon] = useState(false)
  const [editarPlan, setEditarPlan] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [menuPlan, setMenuPlan] = useState(null)
  const [menuPos, setMenuPos] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const cargarPlanes = useCallback(
    async ({ force = false, signal } = {}) => {
      setLoading(true)
      try {
        const data = await obtenerPlanes({ force, signal })
        setPlanes(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar los planes')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargarPlanes({ signal: controller.signal })
    return () => controller.abort()
  }, [cargarPlanes])

  const cargarCupones = useCallback(
    async ({ signal } = {}) => {
      try {
        const data = await obtenerCupones({ signal })
        setCupones(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar los cupones')
      }
    },
    [toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargarCupones({ signal: controller.signal })
    return () => controller.abort()
  }, [cargarCupones])

  const handleCrearCupon = async (datos) => {
    setCuponError('')
    setGuardandoCupon(true)
    try {
      const cupon = await crearCupon(datos)
      toast.success(`Cupón "${cupon.nombre}" creado correctamente`)
      setCuponOpen(false)
      cargarCupones({ force: true })
    } catch (err) {
      setCuponError(err.message || 'No se pudo crear el cupón')
    } finally {
      setGuardandoCupon(false)
    }
  }

  const handleRowClick = (plan, position) => {
    setMenuPlan(plan)
    setMenuPos(position)
  }

  const closeMenu = () => {
    setMenuPlan(null)
    setMenuPos(null)
  }

  const handleCloseCrear = () => {
    if (submitting) return
    setFormError('')
    setCrearOpen(false)
  }

  const handleCloseCrearTiquetera = () => {
    if (submitting) return
    setFormError('')
    setCrearTiqueteraOpen(false)
  }

  const handleCloseEditar = () => {
    if (submitting) return
    setFormError('')
    setEditarPlan(null)
  }

  const handleCrear = async (datos) => {
    setFormError('')
    setSubmitting(true)
    try {
      const res = await crearPlan(datos)
      toast.success(
        `${datos.tipo === 'tiquetera' ? 'Tiquetera' : 'Plan'} "${res.plan.nombre}" creada correctamente`,
      )
      setCrearOpen(false)
      setCrearTiqueteraOpen(false)
      cargarPlanes({ force: true })
    } catch (err) {
      setFormError(err.message || 'No se pudo crear el plan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditar = async (datos) => {
    if (!editarPlan) return
    setFormError('')
    setSubmitting(true)
    try {
      await actualizarPlan(editarPlan.id, datos)
      toast.success(`Plan "${datos.nombre}" actualizado correctamente`)
      setEditarPlan(null)
      cargarPlanes({ force: true })
    } catch (err) {
      setFormError(err.message || 'No se pudo actualizar el plan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleEstado = async (plan) => {
    const nuevoEstado = plan.estado === 'activo' ? 'inactivo' : 'activo'
    setActionLoading(true)
    try {
      await actualizarPlan(plan.id, { estado: nuevoEstado })
      toast.success(
        nuevoEstado === 'activo'
          ? `Plan "${plan.nombre}" activado`
          : `Plan "${plan.nombre}" desactivado`,
      )
      cargarPlanes({ force: true })
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado del plan')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget) return
    setActionLoading(true)
    try {
      await eliminarPlan(eliminarTarget.id)
      toast.success(`Plan "${eliminarTarget.nombre}" eliminado`)
      setEliminarTarget(null)
      cargarPlanes({ force: true })
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el plan')
    } finally {
      setActionLoading(false)
    }
  }

  const menuItems = menuPlan
    ? [
        {
          id: 'editar',
          label: 'Editar plan',
          icon: '✎',
          onClick: () => setEditarPlan(menuPlan),
        },
        {
          id: 'estado',
          label:
            menuPlan.estado === 'activo' ? 'Desactivar plan' : 'Activar plan',
          icon: menuPlan.estado === 'activo' ? '⏸' : '▶',
          onClick: () => handleToggleEstado(menuPlan),
        },
        {
          id: 'eliminar',
          label: 'Eliminar plan',
          icon: <img src={trashIcon} alt="" />,
          variant: 'danger',
          onClick: () => setEliminarTarget(menuPlan),
        },
      ]
    : []

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Planes</h1>
          <p className="ag-page__subtitle">
            Administra los planes de membresía de Rangers Box
          </p>
        </div>
        <div className="ag-page__view-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => setVigenciaOpen(true)}
          >
            Modificar vigencia
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => cargarPlanes({ force: true })}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => {
              setCuponError('')
              setCuponesListOpen(true)
              cargarCupones()
            }}
          >
            Ver cupones
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => {
              setCuponError('')
              setCuponOpen(true)
            }}
          >
            Generar cupón
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => setCrearTiqueteraOpen(true)}
          >
            + Crear tiquetera
          </button>
          <button
            type="button"
            className="ag-action-btn"
            onClick={() => setCrearOpen(true)}
          >
            + Crear plan
          </button>
        </div>
      </header>

      {!loading && planes.length === 0 && (
        <div className="ag-panel">
          <p className="ag-panel__empty">
            Aún no hay planes registrados. Crea el primero con el botón
            «+ Crear plan».
          </p>
        </div>
      )}

      {planes.length > 0 && (
        <PlanesTable planes={planes} onRowClick={handleRowClick} />
      )}

      <RowActionsMenu
        open={Boolean(menuPlan)}
        position={menuPos}
        onClose={closeMenu}
        items={menuItems}
      />

      <PlanFormModal
        open={crearOpen}
        onClose={handleCloseCrear}
        onSubmit={handleCrear}
        submitting={submitting}
        error={formError}
        title="Crear plan"
        submitLabel="Crear plan"
        variant="normal"
      />

      <PlanFormModal
        open={crearTiqueteraOpen}
        onClose={handleCloseCrearTiquetera}
        onSubmit={handleCrear}
        submitting={submitting}
        error={formError}
        title="Crear tiquetera"
        submitLabel="Crear tiquetera"
        variant="tiquetera"
      />

      <PlanFormModal
        open={Boolean(editarPlan)}
        onClose={handleCloseEditar}
        onSubmit={handleEditar}
        submitting={submitting}
        error={formError}
        title={editarPlan?.tipo === 'tiquetera' ? 'Editar tiquetera' : 'Editar plan'}
        submitLabel="Guardar cambios"
        initialValues={editarPlan}
        disableNombre
        variant={editarPlan?.tipo === 'tiquetera' ? 'tiquetera' : 'normal'}
      />

      <CuponFormModal
        open={cuponOpen}
        onClose={() => {
          if (guardandoCupon) return
          setCuponError('')
          setCuponOpen(false)
        }}
        onSubmit={handleCrearCupon}
        submitting={guardandoCupon}
        error={cuponError}
        planes={planes}
      />

      <CuponesListModal
        open={cuponesListOpen}
        onClose={() => setCuponesListOpen(false)}
        cupones={cupones}
        planes={planes}
      />

      <ModificarVigenciaModal
        open={vigenciaOpen}
        onClose={() => {
          if (guardandoVigencia) return
          setVigenciaOpen(false)
        }}
        submitting={guardandoVigencia}
        setSubmitting={setGuardandoVigencia}
        onSuccess={(resultado) => {
          toast.success(
            `Vigencia actualizada para ${resultado.nombre || resultado.documento}`,
          )
        }}
      />

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => setEliminarTarget(null)}
        onConfirm={handleConfirmEliminar}
        title="Eliminar plan"
        message={
          eliminarTarget
            ? `¿Seguro que quieres eliminar el plan "${eliminarTarget.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={actionLoading}
      />

      <LoadingOverlay
        visible={
          loading || submitting || actionLoading || guardandoCupon || guardandoVigencia
        }
        label={
          guardandoVigencia
            ? 'Guardando vigencia'
            : guardandoCupon
            ? 'Generando cupón'
            : submitting
            ? editarPlan
              ? 'Guardando cambios'
              : 'Creando plan'
            : actionLoading
              ? 'Procesando…'
              : 'Cargando planes'
        }
      />
    </section>
  )
}

function VistaEventos() {
  const toast = useToast()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [crearOpen, setCrearOpen] = useState(false)
  const [editarEvento, setEditarEvento] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [mensajeWhatsAppOpen, setMensajeWhatsAppOpen] = useState(false)
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false)
  const [whatsappFormError, setWhatsappFormError] = useState('')
  const [whatsappConexionOpen, setWhatsappConexionOpen] = useState(false)
  const [whatsappConectado, setWhatsappConectado] = useState(false)
  const [plantillasOpen, setPlantillasOpen] = useState(false)
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false)
  const [plantillaError, setPlantillaError] = useState('')
  const [envioMasivoOpen, setEnvioMasivoOpen] = useState(false)

  const cargarEventos = useCallback(
    async ({ signal } = {}) => {
      setLoading(true)
      try {
        const data = await obtenerEventos({ signal })
        setEventos(data)
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudieron cargar los eventos')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargarEventos({ signal: controller.signal })
    return () => controller.abort()
  }, [cargarEventos])

  useEffect(() => {
    const controller = new AbortController()

    const consultarWhatsApp = async () => {
      try {
        const estado = await obtenerEstadoWhatsApp({ signal: controller.signal })
        setWhatsappConectado(estado.conectado)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setWhatsappConectado(false)
      }
    }

    consultarWhatsApp()
    const intervalo = window.setInterval(consultarWhatsApp, 5000)

    return () => {
      controller.abort()
      window.clearInterval(intervalo)
    }
  }, [])

  const handleWhatsAppConectado = useCallback(() => {
    setWhatsappConectado(true)
    setWhatsappConexionOpen(false)
    toast.success('WhatsApp conectado en el servidor')
  }, [toast])

  const handleGuardarEvento = async (datos) => {
    setFormError('')
    setSubmitting(true)
    try {
      if (editarEvento) {
        const evento = await actualizarEvento(editarEvento.id, datos)
        toast.success(`Evento "${evento.nombre}" actualizado`)
        setEditarEvento(null)
      } else {
        const evento = await crearEvento(datos)
        toast.success(`Evento "${evento.nombre}" creado correctamente`)
        setCrearOpen(false)
      }
      cargarEventos()
    } catch (err) {
      setFormError(
        err.message ||
          (editarEvento
            ? 'No se pudo actualizar el evento'
            : 'No se pudo crear el evento'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget) return
    setActionLoading(true)
    try {
      await eliminarEvento(eliminarTarget.id)
      toast.success(`Evento "${eliminarTarget.nombre}" eliminado`)
      setEliminarTarget(null)
      cargarEventos()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el evento')
    } finally {
      setActionLoading(false)
    }
  }

  const handleGuardarPlantilla = async ({ nombre, contenido }) => {
    setPlantillaError('')
    setGuardandoPlantilla(true)

    try {
      const plantilla = await crearPlantilla({ nombre, contenido })
      toast.success(`Plantilla "${plantilla.nombre}" guardada`)
      setPlantillasOpen(false)
    } catch (err) {
      setPlantillaError(err.message || 'No se pudo guardar la plantilla')
    } finally {
      setGuardandoPlantilla(false)
    }
  }

  const handleGuardarPlantillaAutomatica = async ({
    id,
    contenido,
    esActualizacion = false,
  }) => {
    setPlantillaError('')
    setGuardandoPlantilla(true)

    try {
      const plantilla = await guardarPlantillaAutomatica({ id, contenido })
      toast.success(
        esActualizacion
          ? `Plantilla "${plantilla.nombre}" actualizada`
          : `Plantilla "${plantilla.nombre}" guardada`,
      )
      setPlantillasOpen(false)
    } catch (err) {
      setPlantillaError(
        err.message || 'No se pudo guardar la plantilla automática',
      )
    } finally {
      setGuardandoPlantilla(false)
    }
  }

  const handleEnviarMensajeWhatsApp = async ({ telefono, mensaje }) => {
    setWhatsappFormError('')
    setEnviandoWhatsApp(true)

    try {
      await enviarMensajeWhatsApp({ telefono, mensaje })
      toast.success('Mensaje enviado por WhatsApp')
      setMensajeWhatsAppOpen(false)
    } catch (err) {
      if (err.code === WHATSAPP_SESSION_CLOSED_CODE) {
        setMensajeWhatsAppOpen(false)
        setWhatsappConexionOpen(true)
        return
      }

      setWhatsappFormError(err.message || 'No se pudo enviar el mensaje')
    } finally {
      setEnviandoWhatsApp(false)
    }
  }

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Eventos</h1>
          <p className="ag-page__subtitle">
            Banners y actividades programadas (ordenados por posición)
          </p>
        </div>
        <div className="ag-page__view-actions">
          {!whatsappConectado ? (
            <button
              type="button"
              className="ag-action-btn ag-action-btn--ghost"
              onClick={() => setWhatsappConexionOpen(true)}
            >
              Conectar WhatsApp
            </button>
          ) : null}
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => {
              if (!whatsappConectado) {
                setWhatsappConexionOpen(true)
                return
              }
              setWhatsappFormError('')
              setMensajeWhatsAppOpen(true)
            }}
          >
            Enviar mensaje a un usuario
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => {
              if (!whatsappConectado) {
                setWhatsappConexionOpen(true)
                return
              }
              setEnvioMasivoOpen(true)
            }}
          >
            Envío masivo
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => {
              setPlantillaError('')
              setPlantillasOpen(true)
            }}
          >
            Plantillas
          </button>
          <button
            type="button"
            className="ag-action-btn"
            onClick={() => {
              setFormError('')
              setCrearOpen(true)
            }}
          >
            Crear evento
          </button>
        </div>
      </header>

      {!whatsappConectado ? (
        <p className="ag-whatsapp-aviso">
          WhatsApp no está conectado en el servidor.{' '}
          <button
            type="button"
            className="ag-whatsapp-aviso__link"
            onClick={() => setWhatsappConexionOpen(true)}
          >
            Escanea el QR para vincular
          </button>
        </p>
      ) : null}

      <div className="ag-panel">
        <EventosTable
          eventos={eventos}
          onEditar={(evento) => {
            setFormError('')
            setEditarEvento(evento)
          }}
          onEliminar={(evento) => setEliminarTarget(evento)}
        />
      </div>

      <EventoFormModal
        open={crearOpen || Boolean(editarEvento)}
        evento={editarEvento}
        onClose={() => {
          if (submitting) return
          setFormError('')
          setCrearOpen(false)
          setEditarEvento(null)
        }}
        onSubmit={handleGuardarEvento}
        submitting={submitting}
        error={formError}
      />

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => setEliminarTarget(null)}
        onConfirm={handleConfirmEliminar}
        title="Eliminar evento"
        message={
          eliminarTarget
            ? `¿Eliminar el evento "${eliminarTarget.nombre}"? Se borrará el banner en Storage.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={actionLoading}
      />

      <EnviarMensajeWhatsAppModal
        open={mensajeWhatsAppOpen}
        onClose={() => {
          if (enviandoWhatsApp) return
          setWhatsappFormError('')
          setMensajeWhatsAppOpen(false)
        }}
        onSubmit={handleEnviarMensajeWhatsApp}
        submitting={enviandoWhatsApp}
        error={whatsappFormError}
      />

      <WhatsAppConexionModal
        open={whatsappConexionOpen}
        onClose={() => setWhatsappConexionOpen(false)}
        onConectado={handleWhatsAppConectado}
      />

      <PlantillaFormModal
        open={plantillasOpen}
        onClose={() => {
          if (guardandoPlantilla) return
          setPlantillaError('')
          setPlantillasOpen(false)
        }}
        onSubmit={handleGuardarPlantilla}
        onSubmitAutomatica={handleGuardarPlantillaAutomatica}
        submitting={guardandoPlantilla}
        error={plantillaError}
      />

      <EnviarMensajeMasivoModal
        open={envioMasivoOpen}
        onClose={() => setEnvioMasivoOpen(false)}
        onWhatsAppDesconectado={() => {
          setEnvioMasivoOpen(false)
          setWhatsappConexionOpen(true)
        }}
      />

      <LoadingOverlay
        visible={
          loading ||
          submitting ||
          actionLoading ||
          enviandoWhatsApp ||
          guardandoPlantilla
        }
        label={
          guardandoPlantilla
            ? 'Guardando plantilla'
            : enviandoWhatsApp
            ? 'Enviando mensaje'
            : submitting
            ? editarEvento
              ? 'Guardando cambios'
              : 'Guardando evento'
            : actionLoading
              ? 'Eliminando'
              : 'Cargando eventos'
        }
      />
    </section>
  )
}

function AdministracionGeneral() {
  const [activeTab, setActiveTab] = useState('planes')

  return (
    <div
      className="ag-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <AdminTabsHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ariaLabel="Secciones de administración general"
      />

      <main className="ag-page__main">
        {activeTab === 'planes' && <VistaPlanes />}
        {activeTab === 'horarios' && <ConfiguracionHorarios />}
        {activeTab === 'clases-grupales' && <ConfiguracionClasesGrupales />}
        {activeTab === 'eventos' && <VistaEventos />}
        {activeTab === 'asistencias' && <VistaAsistencias />}
        {activeTab === 'contenido-web' && <VistaContenidoWeb />}
        {activeTab === 'finanzas' && <VistaFinanzas />}
        {activeTab === 'gestion-humana' && <VistaGestionHumana />}
      </main>
    </div>
  )
}

export default AdministracionGeneral
