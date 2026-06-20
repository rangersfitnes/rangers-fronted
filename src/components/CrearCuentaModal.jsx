import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import AutorizacionDatosModal from './AutorizacionDatosModal.jsx'
import {
  AUTORIZACION_DATOS_CASILLA_ENLACE,
  AUTORIZACION_DATOS_CASILLA_PREFIJO,
} from '../content/autorizacionDatosPersonales.js'
import './CrearUsuarioModal.css'

const tiposDocumento = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

const estadoInicial = {
  nombre: '',
  tipoDocumento: 'CC',
  documento: '',
  celular: '',
  password: '',
  confirmar: '',
}

function CrearCuentaModal({ open, onClose, onSubmit, submitting, error }) {
  const [form, setForm] = useState(estadoInicial)
  const [localError, setLocalError] = useState('')
  const [autorizaDatos, setAutorizaDatos] = useState(false)
  const [autorizacionOpen, setAutorizacionOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setLocalError('')
      setAutorizaDatos(false)
      setAutorizacionOpen(false)
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

    if (form.password !== form.confirmar) {
      setLocalError('Las contraseñas no coinciden')
      return
    }

    if (!autorizaDatos) {
      setLocalError(
        'Debes aceptar la autorización de datos personales para crear tu cuenta',
      )
      return
    }

    onSubmit?.({
      nombre: form.nombre.trim(),
      tipoDocumento: form.tipoDocumento,
      documento: form.documento.trim(),
      celular: `+57${form.celular}`,
      password: form.password,
      autorizacionDatos: true,
    })
  }

  const mensajeError = error || localError

  const formularioListo =
    form.nombre.trim().length > 0 &&
    form.documento.trim().length > 0 &&
    form.celular.length === 10 &&
    form.password.length >= 6 &&
    form.confirmar.length >= 6 &&
    form.password === form.confirmar &&
    autorizaDatos

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Crear cuenta"
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
            form="crear-cuenta-form"
            className="crear-usuario__btn crear-usuario__btn--primary"
            disabled={submitting || !formularioListo}
          >
            {submitting ? 'Creando…' : 'Crear cuenta'}
          </button>
        </>
      }
    >
      <form
        id="crear-cuenta-form"
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
            value={form.nombre}
            onChange={handleChange('nombre')}
            autoComplete="name"
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Documento de identidad</span>
          <div className="crear-usuario__document">
            <select
              className="crear-usuario__document-type crear-usuario__select"
              value={form.tipoDocumento}
              onChange={handleChange('tipoDocumento')}
              disabled={submitting}
              required
              aria-label="Tipo de documento"
            >
              {tiposDocumento.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="crear-usuario__input crear-usuario__document-input"
              value={form.documento}
              onChange={handleDocumentoChange}
              inputMode="numeric"
              autoComplete="username"
              disabled={submitting}
              required
            />
          </div>
        </label>

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Número de celular</span>
          <div className="crear-usuario__phone">
            <span className="crear-usuario__phone-prefix">+57</span>
            <input
              type="tel"
              className="crear-usuario__input crear-usuario__phone-input"
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

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Confirmar contraseña</span>
          <input
            type="password"
            className="crear-usuario__input"
            placeholder="Repite la contraseña"
            value={form.confirmar}
            onChange={handleChange('confirmar')}
            autoComplete="new-password"
            disabled={submitting}
            minLength={6}
            required
          />
        </label>

        <div className="crear-usuario__consent">
          <label className="crear-usuario__consent-check">
            <input
              type="checkbox"
              className="crear-usuario__consent-input"
              checked={autorizaDatos}
              onChange={(e) => setAutorizaDatos(e.target.checked)}
              disabled={submitting}
              required
            />
            <span className="crear-usuario__consent-box" aria-hidden="true">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8.5l3 3 7-7" />
              </svg>
            </span>
            <span className="crear-usuario__consent-label">
              {AUTORIZACION_DATOS_CASILLA_PREFIJO}{' '}
              <button
                type="button"
                className="crear-usuario__consent-link"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setAutorizacionOpen(true)
                }}
                disabled={submitting}
              >
                {AUTORIZACION_DATOS_CASILLA_ENLACE}
              </button>
            </span>
          </label>
        </div>
      </form>

      <AutorizacionDatosModal
        open={autorizacionOpen}
        onClose={() => setAutorizacionOpen(false)}
      />
    </Modal>
  )
}

export default CrearCuentaModal
