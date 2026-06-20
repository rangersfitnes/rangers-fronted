import { useCallback, useEffect, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import EsquemaPagoFormModal from '../components/EsquemaPagoFormModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  actualizarEsquemaPago,
  crearEsquemaPago,
  eliminarEsquemaPago,
  obtenerEsquemasPago,
} from '../services/esquemasPagoService.js'
import { formatearPrecioCuenta } from './cuenta/cuentaUtils.js'
import './AdministracionGeneral.css'

function validarDatosEsquema(datos) {
  if (!datos.nombre) {
    return 'El nombre del esquema es obligatorio'
  }

  const camposMonto = [
    ['valorPorHora', 'valor hora ordinaria'],
    ['horasTurno', 'horas del turno'],
    ['valorTurno', 'valor por turno'],
  ]

  for (const [campo, etiqueta] of camposMonto) {
    const valor = datos[campo]
    if (!Number.isFinite(valor) || valor < 0) {
      return `Ingresa un ${etiqueta} válido`
    }
    if (campo === 'horasTurno' && valor <= 0) {
      return 'Las horas del turno deben ser mayores a cero'
    }
  }

  const camposPorcentaje = [
    ['porcentajeHoraExtra', 'hora extra'],
    ['porcentajeRecargoDominical', 'recargo dominical'],
    ['porcentajeRecargoNocturno', 'recargo nocturno'],
  ]

  for (const [campo, etiqueta] of camposPorcentaje) {
    const valor = datos[campo]
    if (!Number.isFinite(valor) || valor < 0) {
      return `Ingresa un porcentaje de ${etiqueta} válido`
    }
  }

  return ''
}

function GestionHumanaEsquemasPago({ onVolver }) {
  const toast = useToast()
  const [esquemas, setEsquemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [esquemaEditando, setEsquemaEditando] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  const cargarEsquemas = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await obtenerEsquemasPago()
      setEsquemas(lista)
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los esquemas')
      setEsquemas([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargarEsquemas()
  }, [cargarEsquemas])

  const handleCloseModal = () => {
    if (submitting) return
    setError('')
    setEsquemaEditando(null)
    setModalOpen(false)
  }

  const handleOpenCrear = () => {
    setError('')
    setEsquemaEditando(null)
    setModalOpen(true)
  }

  const handleOpenEditar = (esquema) => {
    setError('')
    setEsquemaEditando(esquema)
    setModalOpen(true)
  }

  const handleGuardar = async (datos) => {
    const errorValidacion = validarDatosEsquema(datos)
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setError('')
    setSubmitting(true)

    try {
      if (esquemaEditando?.id) {
        await actualizarEsquemaPago({ id: esquemaEditando.id, ...datos })
        toast.success(`Esquema "${datos.nombre}" actualizado correctamente`)
      } else {
        await crearEsquemaPago(datos)
        toast.success(`Esquema "${datos.nombre}" creado correctamente`)
      }
      setModalOpen(false)
      setEsquemaEditando(null)
      await cargarEsquemas()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el esquema')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmarEliminar = async () => {
    if (!eliminarTarget?.id) return

    setEliminando(true)
    try {
      await eliminarEsquemaPago({ id: eliminarTarget.id })
      toast.success(`Esquema "${eliminarTarget.nombre}" eliminado`)
      setEliminarTarget(null)
      await cargarEsquemas()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el esquema')
    } finally {
      setEliminando(false)
    }
  }

  const accionesDeshabilitadas = loading || submitting || eliminando

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
            <h1 className="ag-page__title">Esquemas de pagos</h1>
            <p className="ag-page__subtitle">
              Plantillas y reglas de pago del equipo
            </p>
          </div>
        </div>
        <div className="ag-page__view-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={cargarEsquemas}
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
            + Agregar esquema
          </button>
        </div>
      </header>

      {!loading && esquemas.length === 0 && (
        <div className="ag-panel">
          <p className="ag-panel__empty">
            Aún no hay esquemas de pago. Crea el primero con «+ Agregar esquema».
          </p>
        </div>
      )}

      {esquemas.length > 0 && (
        <div className="ag-finanzas__tabla-wrap">
          <table className="ag-finanzas__tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Hora ordinaria</th>
                <th>Turno</th>
                <th>Hora extra</th>
                <th>Rec. dominical</th>
                <th>Rec. nocturno</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {esquemas.map((esquema) => (
                <tr key={esquema.id}>
                  <td>{esquema.nombre}</td>
                  <td>{formatearPrecioCuenta(esquema.valorPorHora)}</td>
                  <td>
                    {esquema.horasTurno} h · {formatearPrecioCuenta(esquema.valorTurno)}
                  </td>
                  <td>
                    {esquema.porcentajeHoraExtra}% ·{' '}
                    {formatearPrecioCuenta(esquema.valorHoraExtra)}
                  </td>
                  <td>
                    {esquema.porcentajeRecargoDominical}% · +
                    {formatearPrecioCuenta(esquema.incrementoRecargoDominical)}
                  </td>
                  <td>
                    {esquema.porcentajeRecargoNocturno}% · +
                    {formatearPrecioCuenta(esquema.incrementoRecargoNocturno)}
                  </td>
                  <td className="ag-finanzas__tabla-acciones">
                    <div className="ag-esquema-pago__acciones">
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost ag-esquema-pago__accion"
                        onClick={() => handleOpenEditar(esquema)}
                        disabled={accionesDeshabilitadas}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="ag-esquema-pago__accion ag-esquema-pago__accion--eliminar"
                        onClick={() => setEliminarTarget(esquema)}
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

      <EsquemaPagoFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleGuardar}
        submitting={submitting}
        error={error}
        esquema={esquemaEditando}
      />

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => {
          if (eliminando) return
          setEliminarTarget(null)
        }}
        onConfirm={handleConfirmarEliminar}
        title="Eliminar esquema"
        message={
          eliminarTarget
            ? `¿Eliminar el esquema "${eliminarTarget.nombre}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminando}
      />

      <LoadingOverlay
        visible={loading || submitting || eliminando}
        label={
          submitting
            ? 'Guardando esquema'
            : eliminando
              ? 'Eliminando esquema'
              : 'Cargando esquemas'
        }
      />
    </section>
  )
}

export default GestionHumanaEsquemasPago
