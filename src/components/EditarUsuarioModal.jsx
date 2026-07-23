import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  esCorreoValido,
  normalizarCorreo,
  normalizarDireccion,
} from '../utils/validacionUsuario.js'
import './CrearUsuarioModal.css'

const estadoInicial = {
  nombre: '',
  celular: '',
  correo: '',
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
        celular: celularSinPrefijo(usuario.celular),
        correo: usuario.correo || '',
        direccion: usuario.direccion || '',
      })
    }
  }, [open, usuario])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleCelularChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '').slice(0, 10)
    setForm((prev) => ({ ...prev, celular: soloDigitos }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError('')

    if (form.celular.length !== 10) {
      setLocalError('El número de celular debe tener 10 dígitos')
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
      celular: `+57${form.celular}`,
      correo,
      direccion,
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
      </form>
    </Modal>
  )
}

export default EditarUsuarioModal
