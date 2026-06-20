import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { SEDE_HORARIOS, SEDES } from '../services/horariosService.js'
import './CrearPlanModal.css'

const estadoInicial = {
  nombre: '',
  identificacion: '',
  correo: '',
  fechaNacimiento: '',
  esquemaPago: '',
  sede: SEDE_HORARIOS,
  cronometrajeActivo: true,
}

function colaboradorToForm(colaborador) {
  if (!colaborador) return estadoInicial
  return {
    nombre: colaborador.nombre ?? '',
    identificacion: colaborador.documento ?? '',
    correo: colaborador.correo ?? '',
    fechaNacimiento: colaborador.fechaNacimiento ?? '',
    esquemaPago: colaborador.esquemaPago ?? '',
    sede: colaborador.sede || SEDE_HORARIOS,
    cronometrajeActivo: Boolean(colaborador.cronometrajeActivo),
  }
}

function ColaboradorFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  esquemas = [],
  esquemasLoading = false,
  colaborador = null,
}) {
  const [form, setForm] = useState(estadoInicial)
  const editando = Boolean(colaborador?.uid)

  useEffect(() => {
    if (open) setForm(colaboradorToForm(colaborador))
  }, [open, colaborador])

  const handleChange = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
  }

  const handleIdentificacionChange = (event) => {
    const valor = event.target.value.replace(/\s/g, '')
    setForm((prev) => ({ ...prev, identificacion: valor }))
  }

  const handleCronometrajeChange = (event) => {
    setForm((prev) => ({
      ...prev,
      cronometrajeActivo: event.target.checked,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      nombre: form.nombre.trim(),
      identificacion: form.identificacion.trim(),
      correo: form.correo.trim(),
      fechaNacimiento: form.fechaNacimiento,
      esquemaPago: form.esquemaPago,
      sede: form.sede || SEDE_HORARIOS,
      cronometrajeActivo: form.cronometrajeActivo,
    })
  }

  const sinEsquemas = !esquemasLoading && esquemas.length === 0

  const footer = (
    <>
      <button
        type="button"
        className="modal__btn modal__btn--ghost"
        onClick={onClose}
        disabled={submitting}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="colaborador-form"
        className="modal__btn modal__btn--primary"
        disabled={submitting || sinEsquemas}
      >
        {submitting
          ? 'Guardando…'
          : editando
            ? 'Guardar cambios'
            : 'Crear colaborador'}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={editando ? 'Editar colaborador' : 'Crear colaborador'}
      footer={footer}
    >
      <form id="colaborador-form" className="crear-plan__form" onSubmit={handleSubmit}>
        {error ? <p className="crear-plan__error">{error}</p> : null}

        {sinEsquemas ? (
          <p className="crear-plan__hint">
            Primero debes crear al menos un esquema de pago en «Esquemas de pagos».
          </p>
        ) : null}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Nombre completo *</span>
          <input
            type="text"
            className="crear-plan__input"
            value={form.nombre}
            onChange={handleChange('nombre')}
            placeholder="Ej. Juan Pérez Gómez"
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Número de identificación *</span>
          <input
            type="text"
            className="crear-plan__input"
            value={form.identificacion}
            onChange={handleIdentificacionChange}
            placeholder="Ej. 1234567890"
            inputMode="numeric"
            disabled={submitting}
            minLength={6}
            required
          />
          <span className="ag-esquema-pago__hint">
            {editando
              ? 'Si cambias la identificación, también se actualizará la contraseña de acceso al panel.'
              : 'Este número será la contraseña con la que el colaborador iniciará sesión en el panel de administración (correo + identificación).'}
          </span>
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Correo electrónico *</span>
          <input
            type="email"
            className="crear-plan__input"
            value={form.correo}
            onChange={handleChange('correo')}
            placeholder="Ej. colaborador@correo.com"
            autoComplete="email"
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Fecha de nacimiento *</span>
          <input
            type="date"
            className="crear-plan__input crear-plan__date"
            value={form.fechaNacimiento}
            onChange={handleChange('fechaNacimiento')}
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Sede *</span>
          <select
            className="crear-plan__input crear-plan__select"
            value={form.sede}
            onChange={handleChange('sede')}
            disabled={submitting}
            required
          >
            {SEDES.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Esquema de pago *</span>
          <select
            className="crear-plan__input crear-plan__select"
            value={form.esquemaPago}
            onChange={handleChange('esquemaPago')}
            disabled={submitting || esquemasLoading || sinEsquemas}
            required
          >
            <option value="">
              {esquemasLoading ? 'Cargando esquemas…' : 'Selecciona un esquema'}
            </option>
            {esquemas.map((esquema) => (
              <option key={esquema.id} value={esquema.id}>
                {esquema.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="crear-plan__switch">
          <input
            type="checkbox"
            className="crear-plan__switch-input"
            checked={form.cronometrajeActivo}
            onChange={handleCronometrajeChange}
            disabled={submitting}
          />
          <span className="crear-plan__switch-track" aria-hidden="true">
            <span className="crear-plan__switch-thumb" />
          </span>
          <span className="crear-plan__switch-label">
            Tomar cronometraje de tiempo laborado
          </span>
        </label>
      </form>
    </Modal>
  )
}

export default ColaboradorFormModal
