import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import './CrearPlanModal.css'

const duraciones = ['2 semanas', '1 mes', '6 meses', '1 año']
const CANTIDAD_PERSONAS_MIN = 1
const CANTIDAD_PERSONAS_MAX = 5

const estadoInicial = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion: '1 mes',
  pos: '',
  cantidadPersonas: '1',
  oferta: false,
  soloPuntoFisico: false,
  motivo: '',
  personalizarFechaInicio: false,
  fechaInicioPersonalizada: '',
}

function normalizarFechaInput(valor) {
  if (!valor) return ''
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return valor
  }
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function PlanFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  title = 'Crear plan',
  submitLabel = 'Guardar',
  initialValues = null,
  disableNombre = false,
}) {
  const [form, setForm] = useState(estadoInicial)

  useEffect(() => {
    if (open) {
      setForm(
        initialValues
          ? {
              nombre: initialValues.nombre ?? '',
              descripcion: initialValues.descripcion ?? '',
              precio:
                initialValues.precio !== undefined &&
                initialValues.precio !== null
                  ? String(initialValues.precio)
                  : '',
              duracion: duraciones.includes(initialValues.duracion)
                ? initialValues.duracion
                : '1 mes',
              pos:
                initialValues.pos !== undefined && initialValues.pos !== null
                  ? String(initialValues.pos)
                  : '',
              cantidadPersonas:
                initialValues.cantidadPersonas !== undefined &&
                initialValues.cantidadPersonas !== null
                  ? String(initialValues.cantidadPersonas)
                  : '1',
              oferta: Boolean(initialValues.oferta),
              soloPuntoFisico: Boolean(initialValues.soloPuntoFisico),
              motivo: initialValues.motivo ?? '',
              personalizarFechaInicio: Boolean(
                initialValues.personalizarFechaInicio,
              ),
              fechaInicioPersonalizada: normalizarFechaInput(
                initialValues.fechaInicioPersonalizada,
              ),
            }
          : estadoInicial,
      )
    }
  }, [open, initialValues])

  const handleChange = (field) => (event) => {
    const value =
      field === 'oferta' ||
      field === 'soloPuntoFisico' ||
      field === 'personalizarFechaInicio'
        ? event.target.checked
        : event.target.value
    setForm((prev) => {
      if (field === 'soloPuntoFisico' && !value) {
        return { ...prev, soloPuntoFisico: false, motivo: '' }
      }
      if (field === 'personalizarFechaInicio' && !value) {
        return {
          ...prev,
          personalizarFechaInicio: false,
          fechaInicioPersonalizada: '',
        }
      }
      return { ...prev, [field]: value }
    })
  }

  const handlePrecioChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '')
    setForm((prev) => ({ ...prev, precio: soloDigitos }))
  }

  const handlePosChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '')
    setForm((prev) => ({ ...prev, pos: soloDigitos }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const motivo = form.motivo.trim()
    onSubmit?.({
      ...form,
      precio: form.precio === '' ? 0 : Number(form.precio),
      pos: form.pos === '' ? 0 : Number(form.pos),
      cantidadPersonas:
        form.cantidadPersonas === '' ? 1 : Number(form.cantidadPersonas),
      motivo: form.soloPuntoFisico ? motivo : '',
      personalizarFechaInicio: form.personalizarFechaInicio,
      fechaInicioPersonalizada: form.personalizarFechaInicio
        ? form.fechaInicioPersonalizada
        : '',
    })
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={title}
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
            form="plan-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting}
          >
            {submitLabel}
          </button>
        </>
      }
    >
      <form
        id="plan-form"
        className="crear-plan__form"
        onSubmit={handleSubmit}
      >
        {error && (
          <p className="crear-plan__error" role="alert">
            {error}
          </p>
        )}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Nombre del plan</span>
          <input
            type="text"
            className="crear-plan__input"
            placeholder="Ej. Plan mensual"
            value={form.nombre}
            onChange={handleChange('nombre')}
            disabled={submitting || disableNombre}
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Descripción</span>
          <textarea
            className="crear-plan__input crear-plan__textarea"
            placeholder="Describe qué incluye el plan"
            value={form.descripcion}
            onChange={handleChange('descripcion')}
            rows={3}
            disabled={submitting}
            required
          />
        </label>

        <div className="crear-plan__row">
          <label className="crear-plan__field">
            <span className="crear-plan__label">Precio (COP)</span>
            <div className="crear-plan__precio">
              <span className="crear-plan__precio-prefix">$</span>
              <input
                type="text"
                className="crear-plan__input crear-plan__precio-input"
                placeholder="50000"
                value={form.precio}
                onChange={handlePrecioChange}
                inputMode="numeric"
                disabled={submitting}
                required
              />
            </div>
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Duración</span>
            <select
              className="crear-plan__input crear-plan__select"
              value={form.duracion}
              onChange={handleChange('duracion')}
              disabled={submitting}
              required
            >
              {duraciones.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="crear-plan__row">
          <label className="crear-plan__field">
            <span className="crear-plan__label">Posición</span>
            <input
              type="text"
              className="crear-plan__input"
              placeholder="Ej. 1"
              value={form.pos}
              onChange={handlePosChange}
              inputMode="numeric"
              disabled={submitting}
              required
            />
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Personas con beneficio</span>
            <select
              className="crear-plan__input crear-plan__select"
              value={form.cantidadPersonas}
              onChange={handleChange('cantidadPersonas')}
              disabled={submitting}
              required
            >
              {Array.from(
                { length: CANTIDAD_PERSONAS_MAX - CANTIDAD_PERSONAS_MIN + 1 },
                (_, i) => CANTIDAD_PERSONAS_MIN + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'persona' : 'personas'}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="crear-plan__switch">
          <input
            type="checkbox"
            className="crear-plan__switch-input"
            checked={form.oferta}
            onChange={handleChange('oferta')}
            disabled={submitting}
          />
          <span className="crear-plan__switch-track">
            <span className="crear-plan__switch-thumb" />
          </span>
          <span className="crear-plan__switch-label">
            {form.oferta ? 'En oferta' : 'No está en oferta'}
          </span>
        </label>

        <label className="crear-plan__switch">
          <input
            type="checkbox"
            className="crear-plan__switch-input"
            checked={form.soloPuntoFisico}
            onChange={handleChange('soloPuntoFisico')}
            disabled={submitting}
          />
          <span className="crear-plan__switch-track">
            <span className="crear-plan__switch-thumb" />
          </span>
          <span className="crear-plan__switch-label">
            Solo punto físico
          </span>
        </label>

        <label className="crear-plan__switch">
          <input
            type="checkbox"
            className="crear-plan__switch-input"
            checked={form.personalizarFechaInicio}
            onChange={handleChange('personalizarFechaInicio')}
            disabled={submitting}
          />
          <span className="crear-plan__switch-track">
            <span className="crear-plan__switch-thumb" />
          </span>
          <span className="crear-plan__switch-label">
            Personalizar fecha de inicio
          </span>
        </label>

        {form.personalizarFechaInicio && (
          <label className="crear-plan__field">
            <span className="crear-plan__label">Fecha de inicio del plan</span>
            <input
              type="date"
              className="crear-plan__input crear-plan__date"
              value={form.fechaInicioPersonalizada}
              onChange={handleChange('fechaInicioPersonalizada')}
              disabled={submitting}
              required
            />
            <span className="crear-plan__hint">
              La vigencia de quienes se inscriban contará desde esta fecha más
              la duración del plan.
            </span>
          </label>
        )}

        {form.soloPuntoFisico && (
          <label className="crear-plan__field">
            <span className="crear-plan__label">
              Motivo y condiciones
            </span>
            <textarea
              className="crear-plan__input crear-plan__textarea"
              placeholder="Ej. Este plan se activa presentando documento y validación presencial en recepción."
              value={form.motivo}
              onChange={handleChange('motivo')}
              rows={3}
              disabled={submitting}
              required
            />
          </label>
        )}
      </form>
    </Modal>
  )
}

export default PlanFormModal
