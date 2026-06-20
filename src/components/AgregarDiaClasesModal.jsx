import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import './CrearUsuarioModal.css'

function AgregarDiaClasesModal({
  open,
  onClose,
  onSubmit,
  diasDisponibles = [],
}) {
  const [dia, setDia] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setDia('')
      setCantidad('1')
      setError('')
    }
  }, [open])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!dia) {
      setError('Selecciona un día de la semana')
      return
    }
    const num = Number(cantidad)
    if (!Number.isFinite(num) || num < 1 || num > 24) {
      setError('Indica entre 1 y 24 clases')
      return
    }
    onSubmit({ dia, cantidad: num })
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Agregar día al cronograma"
      footer={
        <button type="submit" form="agregar-dia-clases-form" className="crear-usuario__submit">
          Agregar
        </button>
      }
    >
      <form id="agregar-dia-clases-form" className="crear-usuario" onSubmit={handleSubmit}>
        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Día de la semana</span>
          <select
            className="crear-usuario__input"
            value={dia}
            onChange={(e) => {
              setDia(e.target.value)
              setError('')
            }}
          >
            <option value="">Seleccionar…</option>
            {diasDisponibles.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">Cantidad de clases</span>
          <input
            type="number"
            className="crear-usuario__input"
            min={1}
            max={24}
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value)
              setError('')
            }}
          />
        </label>

        {error ? (
          <p className="crear-usuario__error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}

export default AgregarDiaClasesModal
