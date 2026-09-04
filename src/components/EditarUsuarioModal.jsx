import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
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
  direccion: '',
}

function celularSinPrefijo(celular) {
  if (!celular) return ''
  return celular.replace(/^\+57/, '').replace(/\D/g, '').slice(0, 10)
}

function EditarUsuarioModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  usuario,
}) {
  const [form, setForm] = useState(estadoInicial)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setLocalError('')
      return
    }

    if (usuario) {
      setForm({
        nombre: usuario.nombre || '',
        tipoDocumento: usuario.tipoDocumento || 'CC',
        documento: usuario.documento || '',
        celular: celularSinPrefijo(usuario.celular),
        direccion: usuario.direccion || '',
      })
    }
  }, [open, usuario])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
    setLocalError('')
  }

  const handleCelularChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '').slice(0, 10)
    setForm((prev) => ({ ...prev, celular: soloDigitos }))
    setLocalError('')
  }

  const handleDocumentoChange = (event) => {
    const valor = event.target.value.replace(/\s/g, '')
    setForm((prev) => ({ ...prev, documento: valor }))
    setLocalError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError('')

    if (!form.nombre.trim()) {
      setLocalError('El nombre es obligatorio')
      return
    }

    if (!form.documento.trim()) {
      setLocalError('El documento es obligatorio')
      return
    }

    if (form.celular.length !== 10) {
      setLocalError('El número de celular debe tener 10 dígitos')
      return
    }

    onSubmit?.({
      nombre: form.nombre.trim(),
      tipoDocumento: form.tipoDocumento,
      documento: form.documento.trim(),
      celular: `+57${form.celular}`,
      direccion: form.direccion.trim(),
    })
  }

  const mensajeError = error || localError

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Editar usuario"
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
            form="editar-usuario-form"
            className="crear-usuario__btn crear-usuario__btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <form
        id="editar-usuario-form"
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
          <span className="crear-usuario__label">Dirección</span>
          <input
            type="text"
            className="crear-usuario__input"
            placeholder="Ej. Calle 10 # 5-20, Manizales"
            value={form.direccion}
            onChange={handleChange('direccion')}
            autoComplete="street-address"
            disabled={submitting}
          />
        </label>
      </form>
    </Modal>
  )
}

export default EditarUsuarioModal
