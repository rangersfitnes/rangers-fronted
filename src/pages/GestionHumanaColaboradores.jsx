import { useCallback, useEffect, useState } from 'react'
import ColaboradorFormModal from '../components/ColaboradorFormModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { SEDE_HORARIOS, SEDES } from '../services/horariosService.js'
import {
  actualizarColaborador,
  crearColaborador,
  eliminarColaborador,
  obtenerColaboradores,
  reestablecerDatosLaboralesColaborador,
} from '../services/colaboradoresService.js'
import { obtenerEsquemasPago } from '../services/esquemasPagoService.js'
import { etiquetaMetodoPagoColaborador, requiereNumeroCuenta } from '../constants/metodosPagoColaborador.js'
import { verificarColaboradorPagoGuardado } from '../utils/verificarColaboradorPago.js'
import './AdministracionGeneral.css'

function formatearFechaNacimiento(valor) {
  if (!valor) return '—'
  const fecha = new Date(`${valor}T12:00:00`)
  if (Number.isNaN(fecha.getTime())) return valor
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function etiquetaSede(sedeId) {
  return SEDES.find((sede) => sede.id === sedeId)?.nombre ?? sedeId ?? '—'
}

function validarDatosColaborador(datos) {
  if (!datos.nombre) return 'El nombre es obligatorio'
  if (!datos.identificacion || datos.identificacion.length < 6) {
    return 'El número de identificación debe tener al menos 6 caracteres'
  }
  if (!datos.correo) return 'El correo es obligatorio'
  if (!datos.fechaNacimiento) return 'La fecha de nacimiento es obligatoria'
  if (!(datos.sede || SEDE_HORARIOS).trim()) return 'Debes seleccionar una sede'
  if (!datos.esquemaPago) return 'Debes seleccionar un esquema de pago'
  if (!datos.metodoPago) return 'Debes seleccionar un método de pago'
  if (datos.metodoPago.length < 2) {
    return 'Especifica el otro método de pago (mínimo 2 caracteres)'
  }
  if (
    requiereNumeroCuenta(datos.metodoPago) &&
    (!datos.numeroCuenta || datos.numeroCuenta.length < 5)
  ) {
    return 'El número de cuenta es obligatorio para este método de pago'
  }
  return ''
}

function GestionHumanaColaboradores({ onVolver }) {
  const toast = useToast()
  const [colaboradores, setColaboradores] = useState([])
  const [esquemas, setEsquemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [esquemasLoading, setEsquemasLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [colaboradorEditando, setColaboradorEditando] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [reestablecerTarget, setReestablecerTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [reestableciendo, setReestableciendo] = useState(false)
  const [error, setError] = useState('')

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    setEsquemasLoading(true)
    try {
      const [listaColaboradores, listaEsquemas] = await Promise.all([
        obtenerColaboradores(),
        obtenerEsquemasPago(),
      ])
      setColaboradores(listaColaboradores)
      setEsquemas(listaEsquemas)
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los colaboradores')
      setColaboradores([])
      setEsquemas([])
    } finally {
      setLoading(false)
      setEsquemasLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const handleCloseModal = () => {
    if (submitting) return
    setError('')
    setColaboradorEditando(null)
    setModalOpen(false)
  }

  const handleOpenCrear = () => {
    setError('')
    setColaboradorEditando(null)
    setModalOpen(true)
  }

  const handleOpenEditar = (colaborador) => {
    setError('')
    setColaboradorEditando(colaborador)
    setModalOpen(true)
  }

  const handleGuardar = async (datos) => {
    const errorValidacion = validarDatosColaborador(datos)
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setError('')
    setSubmitting(true)

    const payload = {
      nombre: datos.nombre,
      identificacion: datos.identificacion,
      correo: datos.correo,
      fechaNacimiento: datos.fechaNacimiento,
      esquemaPago: datos.esquemaPago,
      sede: datos.sede,
      cronometrajeActivo: datos.cronometrajeActivo,
      metodoPago: datos.metodoPago,
      numeroCuenta: datos.numeroCuenta,
    }

    try {
      if (colaboradorEditando?.uid) {
        const actualizado = await actualizarColaborador({
          uid: colaboradorEditando.uid,
          ...payload,
        })
        verificarColaboradorPagoGuardado(payload, actualizado)
        setColaboradores((prev) =>
          prev.map((c) => (c.uid === actualizado.uid ? actualizado : c)),
        )
        toast.success(`Colaborador "${datos.nombre}" actualizado correctamente`)
      } else {
        const creado = await crearColaborador(payload)
        verificarColaboradorPagoGuardado(payload, creado)
        toast.success(`Colaborador "${datos.nombre}" creado correctamente`)
        await cargarDatos()
      }
      setModalOpen(false)
      setColaboradorEditando(null)
    } catch (err) {
      const mensaje = err.message || 'No se pudo guardar el colaborador'
      setError(mensaje)
      toast.error(mensaje)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmarEliminar = async () => {
    if (!eliminarTarget?.uid) return

    setEliminando(true)
    try {
      await eliminarColaborador({ uid: eliminarTarget.uid })
      toast.success(`Colaborador "${eliminarTarget.nombre}" eliminado`)
      setEliminarTarget(null)
      await cargarDatos()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el colaborador')
    } finally {
      setEliminando(false)
    }
  }

  const handleConfirmarReestablecer = async () => {
    if (!reestablecerTarget?.uid) return

    setReestableciendo(true)
    try {
      const resultado = await reestablecerDatosLaboralesColaborador({
        uid: reestablecerTarget.uid,
      })
      toast.success(
        `Datos laborales de "${reestablecerTarget.nombre}" reestablecidos (${resultado.totalDocumentosEliminados} registros eliminados)`,
      )
      setReestablecerTarget(null)
    } catch (err) {
      toast.error(err.message || 'No se pudieron reestablecer los datos')
    } finally {
      setReestableciendo(false)
    }
  }

  const accionesDeshabilitadas =
    loading || submitting || eliminando || reestableciendo

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
            <h1 className="ag-page__title">Colaboradores</h1>
            <p className="ag-page__subtitle">
              Personal del box con acceso al panel de administración
            </p>
          </div>
        </div>
        <div className="ag-page__view-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={cargarDatos}
            disabled={accionesDeshabilitadas}
          >
            Actualizar
          </button>
          <button
            type="button"
            className="ag-action-btn"
            onClick={handleOpenCrear}
            disabled={accionesDeshabilitadas}
          >
            + Crear colaborador
          </button>
        </div>
      </header>

      {!loading && colaboradores.length === 0 && (
        <div className="ag-panel">
          <p className="ag-panel__empty">
            Aún no hay colaboradores registrados. Crea el primero con «+ Crear
            colaborador».
          </p>
        </div>
      )}

      {colaboradores.length > 0 && (
        <div className="ag-finanzas__tabla-wrap">
          <table className="ag-finanzas__tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Identificación</th>
                <th>Correo</th>
                <th>Sede</th>
                <th>Cronometraje</th>
                <th>Esquema de pago</th>
                <th>Método de pago</th>
                <th>Número de cuenta</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {colaboradores.map((colaborador) => (
                <tr key={colaborador.uid}>
                  <td>{colaborador.nombre}</td>
                  <td>{colaborador.documento}</td>
                  <td>{colaborador.correo}</td>
                  <td>{etiquetaSede(colaborador.sede)}</td>
                  <td>{colaborador.cronometrajeActivo ? 'Sí' : 'No'}</td>
                  <td>{colaborador.esquemaPago}</td>
                  <td>
                    {colaborador.metodoPago
                      ? etiquetaMetodoPagoColaborador(colaborador.metodoPago)
                      : '—'}
                  </td>
                  <td>{colaborador.numeroCuenta || '—'}</td>
                  <td className="ag-finanzas__tabla-acciones">
                    <div className="ag-esquema-pago__acciones">
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost ag-esquema-pago__accion"
                        onClick={() => handleOpenEditar(colaborador)}
                        disabled={accionesDeshabilitadas}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="ag-esquema-pago__accion ag-esquema-pago__accion--reestablecer"
                        onClick={() => setReestablecerTarget(colaborador)}
                        disabled={accionesDeshabilitadas}
                      >
                        Reestablecer
                      </button>
                      <button
                        type="button"
                        className="ag-esquema-pago__accion ag-esquema-pago__accion--eliminar"
                        onClick={() => setEliminarTarget(colaborador)}
                        disabled={accionesDeshabilitadas}
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

      <ColaboradorFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleGuardar}
        submitting={submitting}
        error={error}
        esquemas={esquemas}
        esquemasLoading={esquemasLoading}
        colaborador={colaboradorEditando}
      />

      <ConfirmModal
        open={Boolean(reestablecerTarget)}
        onClose={() => {
          if (reestableciendo) return
          setReestablecerTarget(null)
        }}
        onConfirm={handleConfirmarReestablecer}
        title="Reestablecer datos laborales"
        message={
          reestablecerTarget
            ? `¿Reestablecer los datos laborales de "${reestablecerTarget.nombre}"? Se eliminarán permanentemente todos sus turnos, horas extra, liquidaciones y desprendibles de nómina en Firestore. Se conservará su perfil, acceso y configuración (esquema, sede, método de pago).`
            : ''
        }
        confirmLabel="Reestablecer"
        variant="danger"
        loading={reestableciendo}
      />

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => {
          if (eliminando) return
          setEliminarTarget(null)
        }}
        onConfirm={handleConfirmarEliminar}
        title="Eliminar colaborador"
        message={
          eliminarTarget
            ? `¿Eliminar a "${eliminarTarget.nombre}"? Se borrará su cuenta de acceso y ya no podrá iniciar sesión.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminando}
      />

      <LoadingOverlay
        visible={loading || submitting || eliminando || reestableciendo}
        label={
          submitting
            ? 'Guardando colaborador'
            : reestableciendo
              ? 'Reestableciendo datos laborales'
              : eliminando
                ? 'Eliminando colaborador'
                : 'Cargando colaboradores'
        }
      />
    </section>
  )
}

export default GestionHumanaColaboradores
