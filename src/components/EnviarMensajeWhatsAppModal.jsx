import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import './CrearPlanModal.css'

const estadoInicial = {
  telefono: '',
  mensaje: '',
}

function EnviarMensajeWhatsAppModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
}) {
  const [form, setForm] = useState(estadoInicial)

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
    }
  }, [open])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      telefono: form.telefono.trim(),
      mensaje: form.mensaje.trim(),
    })
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Enviar mensaje a un usuario"
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
            form="whatsapp-mensaje-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting}
          >
            {submitting ? 'Enviando…' : 'Enviar'}
          </button>
        </>
      }
    >
      <form
        id="whatsapp-mensaje-form"
        className="crear-plan__form"
        onSubmit={handleSubmit}
      >
        {error ? (
          <p className="crear-plan__error" role="alert">
            {error}
          </p>
        ) : null}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Número de teléfono</span>
          <input
            type="tel"
            className="crear-plan__input"
            value={form.telefono}
            onChange={handleChange('telefono')}
            placeholder="Ej. 3001234567"
            required
            disabled={submitting}
          />
          <span className="crear-plan__hint">
            Ingresa el número con indicativo de país o celular colombiano de 10
            dígitos.
          </span>
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Mensaje</span>
          <textarea
            className="crear-plan__input crear-plan__textarea"
            value={form.mensaje}
            onChange={handleChange('mensaje')}
            placeholder="Escribe el mensaje a enviar por WhatsApp"
            rows={5}
            required
            disabled={submitting}
          />
        </label>
      </form>
    </Modal>
  )
}

export default EnviarMensajeWhatsAppModal
