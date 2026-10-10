import { useCallback, useEffect, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import InventarioFormModal from '../components/InventarioFormModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  actualizarItemInventario,
  crearItemInventario,
  eliminarItemInventario,
  obtenerInventario,
} from '../services/inventarioService.js'
import './AdministracionGeneral.css'

function formatearPesos(valor) {
  return `$${(Number(valor) || 0).toLocaleString('es-CO')}`
}

function AdministracionGeneralInventario() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [resumen, setResumen] = useState({
    cantidadEquipos: 0,
    valorTotalInventario: 0,
    tiposEquipos: 0,
  })
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const cargar = useCallback(
    async ({ signal } = {}) => {
      setLoading(true)
      try {
        const data = await obtenerInventario({ signal })
        setItems(data.items)
        setResumen(data.resumen)
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudo cargar el inventario')
        setItems([])
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargar({ signal: controller.signal })
    return () => controller.abort()
  }, [cargar])

  const abrirCrear = () => {
    setEditando(null)
    setFormError('')
    setModalOpen(true)
  }

  const abrirEditar = (item) => {
    setEditando(item)
    setFormError('')
    setModalOpen(true)
  }

  const cerrarModal = () => {
    if (submitting) return
    setModalOpen(false)
    setEditando(null)
    setFormError('')
  }

  const handleGuardar = async (payload) => {
    setFormError('')
    setSubmitting(true)
    try {
      if (editando?.id) {
        await actualizarItemInventario(editando.id, payload)
        toast.success('Elemento actualizado')
      } else {
        await crearItemInventario(payload)
        toast.success('Elemento agregado al inventario')
      }
      setModalOpen(false)
      setEditando(null)
      await cargar()
    } catch (err) {
      setFormError(err.message || 'No se pudo guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget?.id) return
    setEliminando(true)
    try {
      await eliminarItemInventario(eliminarTarget.id)
      toast.success('Elemento eliminado')
      setEliminarTarget(null)
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  return (
    <section className="ag-page__view">
      <LoadingOverlay visible={loading || submitting || eliminando} />

      <header className="ag-page__view-header">
        <div>
          <h1 className="ag-page__title">Inventario</h1>
          <p className="ag-page__subtitle">
            Equipos del box. El valor es por unidad; el total se calcula como
            valor × cantidad.
          </p>
        </div>
      </header>

      <div className="ag-comidas-ia__stats ag-inventario__stats">
        <article>
          <strong>{resumen.cantidadEquipos.toLocaleString('es-CO')}</strong>
          <span>Cantidad total de equipos</span>
        </article>
        <article>
          <strong>{formatearPesos(resumen.valorTotalInventario)}</strong>
          <span>Valor de todos los equipos</span>
        </article>
        <article>
          <strong>{resumen.tiposEquipos.toLocaleString('es-CO')}</strong>
          <span>Tipos de elementos</span>
        </article>
      </div>

      <div className="ag-inventario__actions">
        <button type="button" className="ag-action-btn" onClick={abrirCrear}>
          Agregar elemento
        </button>
        <button
          type="button"
          className="ag-action-btn ag-action-btn--ghost"
          onClick={() => cargar()}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>

      {!loading && items.length === 0 ? (
        <p className="ag-page__empty">
          Aún no hay elementos. Agrega el primero con el botón de arriba.
        </p>
      ) : (
        <div className="pf-usuario-historial__wrap">
          <table className="pf-usuario-historial__table">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Valor unitario</th>
                <th>Cantidad</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Elemento">{item.elemento}</td>
                  <td data-label="Valor unitario">
                    {formatearPesos(item.valorUnitario)}
                  </td>
                  <td data-label="Cantidad">
                    {Number(item.cantidad).toLocaleString('es-CO')}
                  </td>
                  <td data-label="Total">
                    <strong>{formatearPesos(item.valorTotal)}</strong>
                  </td>
                  <td data-label="Acciones">
                    <div className="ag-inventario__row-actions">
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost"
                        onClick={() => abrirEditar(item)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost pf-action-btn--danger"
                        onClick={() => setEliminarTarget(item)}
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

      <InventarioFormModal
        open={modalOpen}
        onClose={cerrarModal}
        onSubmit={handleGuardar}
        submitting={submitting}
        error={formError}
        initialValues={editando}
      />

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={eliminando ? undefined : () => setEliminarTarget(null)}
        onConfirm={handleConfirmEliminar}
        title="Eliminar del inventario"
        message={
          eliminarTarget
            ? `¿Eliminar "${eliminarTarget.elemento}" del inventario?`
            : ''
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        loading={eliminando}
      />
    </section>
  )
}

export default AdministracionGeneralInventario
