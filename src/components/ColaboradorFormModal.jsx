import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { SEDE_HORARIOS, SEDES } from '../services/horariosService.js'
import {
  METODO_PAGO_OTRO,
  METODOS_PAGO_COLABORADOR,
  metodoPagoParaFormulario,
  resolverMetodoPagoParaGuardar,
  requiereNumeroCuenta,
} from '../constants/metodosPagoColaborador.js'
import './CrearPlanModal.css'

const estadoInicial = {
  nombre: '',
  identificacion: '',
  correo: '',
  fechaNacimiento: '',
  esquemaPago: '',
  sede: SEDE_HORARIOS,
  cronometrajeActivo: true,
  metodoPago: '',
  metodoPagoOtro: '',
  numeroCuenta: '',
}

function colaboradorToForm(colaborador) {
  if (!colaborador) return estadoInicial
  const pago = metodoPagoParaFormulario(colaborador.metodoPago)
  return {
    nombre: colaborador.nombre ?? '',
    identificacion: colaborador.documento ?? '',
    correo: colaborador.correo ?? '',
    fechaNacimiento: colaborador.fechaNacimiento ?? '',
    esquemaPago: colaborador.esquemaPago ?? '',
    sede: colaborador.sede || SEDE_HORARIOS,
    cronometrajeActivo: Boolean(colaborador.cronometrajeActivo),
    metodoPago: pago.metodoPago,
    metodoPagoOtro: pago.metodoPagoOtro,
    numeroCuenta: colaborador.numeroCuenta ?? '',
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
  const formRef = useRef(form)
  const editando = Boolean(colaborador?.uid)

  useEffect(() => {
    formRef.current = form
  }, [form])

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

  const handleMetodoPagoChange = (event) => {
    const valor = event.target.value
    setForm((prev) => ({
      ...prev,
      metodoPago: valor,
      metodoPagoOtro: valor === METODO_PAGO_OTRO ? prev.metodoPagoOtro : '',
    }))
  }

  const handleSubmit = (event) => {
    event?.preventDefault?.()

    const formActual = formRef.current
    const metodoPago = resolverMetodoPagoParaGuardar(
      formActual.metodoPago,
      formActual.metodoPagoOtro,
    )

    onSubmit?.({
      nombre: formActual.nombre.trim(),
      identificacion: formActual.identificacion.trim(),
      correo: formActual.correo.trim(),
      fechaNacimiento: formActual.fechaNacimiento,
      esquemaPago: formActual.esquemaPago,
      sede: formActual.sede || SEDE_HORARIOS,
      cronometrajeActivo: formActual.cronometrajeActivo,
      metodoPago,
      numeroCuenta: formActual.numeroCuenta.trim(),
    })
  }

  const sinEsquemas = !esquemasLoading && esquemas.length === 0
  const metodoPagoGuardado = resolverMetodoPagoParaGuardar(
    form.metodoPago,
    form.metodoPagoOtro,
  )
  const cuentaRequerida = requiereNumeroCuenta(metodoPagoGuardado)

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
        type="button"
        className="modal__btn modal__btn--primary"
        disabled={submitting || sinEsquemas}
        onClick={handleSubmit}
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
      <form
        id="colaborador-form"
        className="crear-plan__form"
        noValidate
        onSubmit={handleSubmit}
      >
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
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Sede *</span>
          <select
            className="crear-plan__input crear-plan__select"
            value={form.sede}
            onChange={handleChange('sede')}
            disabled={submitting}
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

        <label className="crear-plan__field">
          <span className="crear-plan__label">Método de pago *</span>
          <select
            className="crear-plan__input crear-plan__select"
            value={form.metodoPago}
            onChange={handleMetodoPagoChange}
            disabled={submitting}
          >
            <option value="">Selecciona un método</option>
            {METODOS_PAGO_COLABORADOR.map((metodo) => (
              <option key={metodo.id} value={metodo.id}>
                {metodo.label}
              </option>
            ))}
          </select>
        </label>

        {form.metodoPago === METODO_PAGO_OTRO ? (
          <label className="crear-plan__field">
            <span className="crear-plan__label">Especifica el método de pago *</span>
            <input
              type="text"
              className="crear-plan__input"
              value={form.metodoPagoOtro}
              onChange={handleChange('metodoPagoOtro')}
              placeholder="Ej. Bre-B, Davivienda, RappiPay"
              disabled={submitting}
              maxLength={60}
            />
          </label>
        ) : null}

        <label className="crear-plan__field">
          <span className="crear-plan__label">
            Número de cuenta{cuentaRequerida ? ' *' : ''}
          </span>
          <input
            type="text"
            className="crear-plan__input"
            value={form.numeroCuenta}
            onChange={handleChange('numeroCuenta')}
            placeholder={
              form.metodoPago === 'efectivo'
                ? 'Opcional para efectivo'
                : 'Ej. 3001234567'
            }
            disabled={submitting}
          />
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
