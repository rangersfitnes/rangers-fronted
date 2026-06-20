import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import './HoraClaseModal.css'

function generarSlots() {
  const slots = []
  for (let h = 5; h <= 21; h += 1) {
    for (const m of [0, 30]) {
      if (h === 21 && m === 30) break
      slots.push(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      )
    }
  }
  return slots
}

const SLOTS = generarSlots()

function formatearHora12(hora24) {
  if (!hora24 || !/^\d{2}:\d{2}$/.test(hora24)) return hora24 || '—'
  const [hStr, mStr] = hora24.split(':')
  let h = Number(hStr)
  const m = mStr
  const periodo = h >= 12 ? 'p.m.' : 'a.m.'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${periodo}`
}

function HoraClaseModal({
  open,
  onClose,
  onConfirm,
  valorInicial = '',
  nombreClase = '',
}) {
  const [seleccion, setSeleccion] = useState('')
  const [horaCustom, setHoraCustom] = useState('')

  useEffect(() => {
    if (!open) return
    const inicial = String(valorInicial || '').trim()
    if (SLOTS.includes(inicial)) {
      setSeleccion(inicial)
      setHoraCustom('')
    } else if (inicial) {
      setSeleccion('')
      setHoraCustom(inicial)
    } else {
      setSeleccion('')
      setHoraCustom('')
    }
  }, [open, valorInicial])

  const horaFinal = useMemo(() => {
    if (seleccion) return seleccion
    const custom = horaCustom.trim()
    if (!custom) return ''
    const match = custom.match(/^(\d{1,2}):(\d{2})$/)
    if (!match) return custom
    const h = Math.min(23, Math.max(0, Number(match[1])))
    const m = Math.min(59, Math.max(0, Number(match[2])))
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }, [seleccion, horaCustom])

  const puedeConfirmar = Boolean(horaFinal)

  const handleConfirm = () => {
    if (!horaFinal) return
    onConfirm(horaFinal)
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hora de inicio"
      footer={
        <>
          <button
            type="button"
            className="hora-clase-modal__btn hora-clase-modal__btn--ghost"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="hora-clase-modal__btn"
            onClick={handleConfirm}
            disabled={!puedeConfirmar}
          >
            Confirmar
          </button>
        </>
      }
    >
      <div className="hora-clase-modal">
        {nombreClase ? (
          <p className="hora-clase-modal__clase">
            Clase: <strong>{nombreClase}</strong>
          </p>
        ) : null}
        <p className="hora-clase-modal__hint">
          Elige una hora en el calendario o escribe una hora personalizada (24 h).
        </p>

        <div className="hora-clase-modal__calendario" role="listbox" aria-label="Horas disponibles">
          {SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              role="option"
              aria-selected={seleccion === slot}
              className={`hora-clase-modal__slot${
                seleccion === slot ? ' hora-clase-modal__slot--active' : ''
              }`}
              onClick={() => {
                setSeleccion(slot)
                setHoraCustom('')
              }}
            >
              <span className="hora-clase-modal__slot-24">{slot}</span>
              <span className="hora-clase-modal__slot-12">{formatearHora12(slot)}</span>
            </button>
          ))}
        </div>

        <label className="hora-clase-modal__custom">
          <span>Otra hora</span>
          <input
            type="time"
            value={horaCustom}
            onChange={(e) => {
              setHoraCustom(e.target.value)
              setSeleccion('')
            }}
          />
        </label>

        {horaFinal ? (
          <p className="hora-clase-modal__preview">
            Seleccionado: <strong>{formatearHora12(horaFinal)}</strong> ({horaFinal})
          </p>
        ) : null}
      </div>
    </Modal>
  )
}

export default HoraClaseModal
