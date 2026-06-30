import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import './CrearPlanModal.css'
import './CuponesModals.css'

function CuponFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  planes = [],
}) {
  const [form, setForm] = useState({
    nombre: '',
    codigo: '',
    porcentajeDescuento: '',
    planIds: [],
  })

  useEffect(() => {
    if (!open) return
    setForm({
      nombre: '',
      codigo: '',
      porcentajeDescuento: '',
      planIds: [],
    })
  }, [open])

  const planesActivos = useMemo(
    () => planes.filter((plan) => (plan.estado || 'activo') === 'activo'),
    [planes],
  )

  const togglePlan = (planId) => {
    setForm((prev) => {
      const existe = prev.planIds.includes(planId)
      return {
        ...prev,
        planIds: existe
          ? prev.planIds.filter((id) => id !== planId)
          : [...prev.planIds, planId],
      }
    })
  }

  const seleccionarTodos = () => {
    setForm((prev) => ({
      ...prev,
      planIds: planesActivos.map((plan) => plan.id),
    }))
  }

  const limpiarSeleccion = () => {
    setForm((prev) => ({ ...prev, planIds: [] }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim(),
      porcentajeDescuento: Number(form.porcentajeDescuento),
      planIds: form.planIds,
    })
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Generar cupón de descuento"
      footer={
        <>
          <button
            type="button"
            className="crear-plan__btn crear-plan__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="cupon-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Guardando…' : 'Generar cupón'}
          </button>
        </>
      }
    >
      <form id="cupon-form" className="crear-plan__form" onSubmit={handleSubmit}>
        {error && (
          <p className="crear-plan__error" role="alert">
            {error}
          </p>
        )}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Nombre del cupón</span>
          <input
            type="text"
            className="crear-plan__input"
            placeholder="Ej. Promo verano"
            value={form.nombre}
            onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
            disabled={submitting}
            required
          />
        </label>

        <div className="crear-plan__row">
          <label className="crear-plan__field">
            <span className="crear-plan__label">Código</span>
            <input
              type="text"
              className="crear-plan__input cupones-modal__codigo"
              placeholder="Ej. VERANO20"
              value={form.codigo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  codigo: e.target.value.toUpperCase().replace(/\s+/g, ''),
                }))
              }
              disabled={submitting}
              required
            />
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Porcentaje de descuento</span>
            <div className="cupones-modal__porcentaje">
              <input
                type="number"
                min={1}
                max={100}
                className="crear-plan__input"
                placeholder="15"
                value={form.porcentajeDescuento}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    porcentajeDescuento: e.target.value,
                  }))
                }
                disabled={submitting}
                required
              />
              <span>%</span>
            </div>
          </label>
        </div>

        <div className="cupones-modal__planes">
          <div className="cupones-modal__planes-header">
            <span className="crear-plan__label">Planes donde aplica</span>
            <div className="cupones-modal__planes-actions">
              <button
                type="button"
                className="cupones-modal__link-btn"
                onClick={seleccionarTodos}
                disabled={submitting || planesActivos.length === 0}
              >
                Todos
              </button>
              <button
                type="button"
                className="cupones-modal__link-btn"
                onClick={limpiarSeleccion}
                disabled={submitting || form.planIds.length === 0}
              >
                Ninguno
              </button>
            </div>
          </div>

          {planesActivos.length === 0 ? (
            <p className="cupones-modal__empty">No hay planes activos disponibles.</p>
          ) : (
            <ul className="cupones-modal__planes-list">
              {planesActivos.map((plan) => {
                const checked = form.planIds.includes(plan.id)
                return (
                  <li key={plan.id}>
                    <label
                      className={`cupones-modal__plan-option${
                        checked ? ' cupones-modal__plan-option--checked' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlan(plan.id)}
                        disabled={submitting}
                      />
                      <span>
                        <strong>{plan.nombre}</strong>
                        <small>{plan.id}</small>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </form>
    </Modal>
  )
}

export default CuponFormModal
