import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { DIAS_SEMANA } from '../constants/diasSemana.js'
import './CrearUsuarioModal.css'

const estadoInicial = {
  dia: 'lunes',
  titulo: '',
  actividad: '',
}

function AnadirCronogramaModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  diasReservados = [],
  entrenamientoEditar = null,
}) {
  const [form, setForm] = useState(estadoInicial)
  const [localError, setLocalError] = useState('')
  const esEdicion = Boolean(entrenamientoEditar)

  const diasDisponibles = DIAS_SEMANA.filter(
    (d) =>
      !diasReservados.includes(d.value) ||
      d.value === entrenamientoEditar?.dia,
  )
  const sinDiasDisponibles = !esEdicion && diasDisponibles.length === 0

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setLocalError('')
      return
    }

    if (entrenamientoEditar) {
      setForm({
        dia: entrenamientoEditar.dia,
        titulo: entrenamientoEditar.titulo ?? '',
        actividad: entrenamientoEditar.actividad ?? '',
      })
      return
    }

    setForm({
      ...estadoInicial,
      dia: diasDisponibles[0]?.value ?? '',
    })
  }, [open, entrenamientoEditar, diasReservados.join(',')])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setLocalError('')

    const titulo = form.titulo.trim()
    const actividad = form.actividad.trim()

    if (!titulo) {
      setLocalError('Escribe un título para el entrenamiento')
      return
    }

    if (!actividad) {
      setLocalError('Indica qué harás ese día')
      return
    }

    if (!form.dia || sinDiasDisponibles) {
      setLocalError('Ya tienes todos los días de la semana reservados')
      return
    }

    const payload = {
      dia: form.dia,
      titulo,
      actividad,
    }

    if (esEdicion && entrenamientoEditar.dia !== form.dia) {
      payload.diaAnterior = entrenamientoEditar.dia
    }

    onSubmit?.(payload)
  }

  const mensajeError = localError || error

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={esEdicion ? 'Editar cronograma' : 'Añadir cronograma'}
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
            form="anadir-cronograma-form"
            className="crear-usuario__btn crear-usuario__btn--primary"
            disabled={submitting || sinDiasDisponibles}
          >
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form
        id="anadir-cronograma-form"
        className="crear-usuario__form"
        onSubmit={handleSubmit}
      >
        {mensajeError && (
          <p className="crear-usuario__error" role="alert">
            {mensajeError}
          </p>
        )}

        {sinDiasDisponibles ? (
          <p className="crear-usuario__error" role="status">
            Ya reservaste todos los días de la semana. No puedes añadir más
            cronogramas.
          </p>
        ) : (
          <>
            <label className="crear-usuario__field">
              <span className="crear-usuario__label">Día de la semana</span>
              <select
                className="crear-usuario__input crear-usuario__select"
                value={form.dia}
                onChange={handleChange('dia')}
                disabled={submitting}
                required
              >
                {diasDisponibles.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="crear-usuario__field">
              <span className="crear-usuario__label">Título</span>
              <input
                type="text"
                className="crear-usuario__input"
                value={form.titulo}
                onChange={handleChange('titulo')}
                disabled={submitting}
                required
                maxLength={120}
              />
            </label>

            <label className="crear-usuario__field">
              <span className="crear-usuario__label">Entrenamiento del día</span>
              <textarea
                className="crear-usuario__input crear-usuario__textarea"
                value={form.actividad}
                onChange={handleChange('actividad')}
                disabled={submitting}
                required
                rows={4}
                maxLength={2000}
              />
            </label>
          </>
        )}
      </form>
    </Modal>
  )
}

export default AnadirCronogramaModal
