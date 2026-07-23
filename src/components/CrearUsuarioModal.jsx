import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import CampoFechaCalendario from './CampoFechaCalendario.jsx'
import {
  esCorreoValido,
  normalizarCorreo,
  normalizarDireccion,
} from '../utils/validacionUsuario.js'
import './CrearUsuarioModal.css'

const tiposDocumento = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

const estadoInicial = {
  nombre: '',
  celular: '',
  tipoDocumento: 'CC',
  documento: '',
  fechaNacimiento: '',
  correo: '',
  direccion: '',
  password: '',
}

function CrearUsuarioModal({ open, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(estadoInicial)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setLocalError('')
    }
  }, [open])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleCelularChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '').slice(0, 10)
    setForm((prev) => ({ ...prev, celular: soloDigitos }))
  }

  const handleDocumentoChange = (event) => {
    const valor = event.target.value.replace(/\s/g, '')
    setForm((prev) => ({ ...prev, documento: valor }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError('')

    if (form.password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (!form.fechaNacimiento) {
      setLocalError('La fecha de nacimiento es obligatoria')
      return
    }

    const correo = normalizarCorreo(form.correo)
    if (!esCorreoValido(correo)) {
      setLocalError('Ingresa un correo electrónico válido')
      return
    }

    const direccion = normalizarDireccion(form.direccion)
    if (direccion.length < 5) {
      setLocalError('La dirección es obligatoria')
      return
    }

    onSubmit?.({
      nombre: form.nombre.trim(),
      tipoDocumento: form.tipoDocumento,
      documento: form.documento.trim(),
      celular: `+57${form.celular}`,
      fechaNacimiento: form.fechaNacimiento,
      correo,
      direccion,
      password: form.password,
    })
  }

  const mensajeError = error || localError

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Crear usuario"
      footer={
        <>
          <button
            type="button"
            className="crear-usuario__btn crear-usuario__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="crear-usuario-form"
            className="crear-usuario__btn crear-usuario__btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Creando…' : 'Crear usuario'}
          </button>
        </>
      }
    >
      <form
        id="crear-usuario-form"
        className="crear-usuario__form"
        onSubmit={handleSubmit}
      >
        {mensajeError && (
          <p className="crear-usuario__error" role="alert">
            {mensajeError}
          </p>
        )}

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Nombre completo</span>
          <input
            type="text"
            className="crear-usuario__input"
            placeholder="Ej. Juan Pérez Gómez"
            value={form.nombre}
            onChange={handleChange('nombre')}
            autoComplete="name"
            disabled={submitting}
            required
          />
        </label>

        <div className="crear-usuario__row">
          <label className="crear-usuario__field crear-usuario__field--tipo">
            <span className="crear-usuario__label">Tipo</span>
            <select
              className="crear-usuario__input crear-usuario__select"
              value={form.tipoDocumento}
              onChange={handleChange('tipoDocumento')}
              disabled={submitting}
              required
            >
              {tiposDocumento.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} — {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="crear-usuario__field crear-usuario__field--documento">
            <span className="crear-usuario__label">Documento de identidad</span>
            <input
              type="text"
              className="crear-usuario__input"
              placeholder="Número del documento"
              value={form.documento}
              onChange={handleDocumentoChange}
              inputMode="numeric"
              disabled={submitting}
              required
            />
          </label>
        </div>

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Número de celular</span>
          <div className="crear-usuario__phone">
            <span className="crear-usuario__phone-prefix">+57</span>
            <input
              type="tel"
              className="crear-usuario__input crear-usuario__phone-input"
              placeholder="Ej. 3001234567"
              value={form.celular}
              onChange={handleCelularChange}
              inputMode="numeric"
              pattern="[0-9]{10}"
              minLength={10}
              maxLength={10}
              autoComplete="tel"
              disabled={submitting}
              required
            />
          </div>
        </label>

        <CampoFechaCalendario
          label="Fecha de nacimiento"
          value={form.fechaNacimiento}
          onChange={(valor) => {
            setForm((prev) => ({ ...prev, fechaNacimiento: valor }))
            setLocalError('')
          }}
          disabled={submitting}
        />

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Correo electrónico</span>
          <input
            type="email"
            className="crear-usuario__input"
            placeholder="Ej. usuario@correo.com"
            value={form.correo}
            onChange={handleChange('correo')}
            autoComplete="email"
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Dirección</span>
          <input
            type="text"
            className="crear-usuario__input"
            placeholder="Ej. Calle 10 # 5-20, Manizales"
            value={form.direccion}
            onChange={handleChange('direccion')}
            autoComplete="street-address"
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Contraseña</span>
          <input
            type="password"
            className="crear-usuario__input"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={handleChange('password')}
            autoComplete="new-password"
            disabled={submitting}
            minLength={6}
            required
          />
        </label>
      </form>
    </Modal>
  )
}

export default CrearUsuarioModal
