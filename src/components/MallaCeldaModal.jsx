import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { esHoraValida, normalizarHoraInput } from '../utils/mallasUtils.js'
import './MallaCeldaModal.css'

const OPCIONES_ESTADO = [
  { value: 'vacio', label: 'Sin asignar' },
  { value: 'labora', label: 'Labora (horario)' },
  { value: 'libre', label: 'Día libre' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'permiso', label: 'Permiso' },
]

function inferirEstado(bloques = []) {
  if (!Array.isArray(bloques) || bloques.length === 0) return 'vacio'
  const primero = bloques[0]
  if (primero?.tipo && primero.tipo !== 'labora') return primero.tipo
  return 'labora'
}

function bloquesDesdeEstado(estado, inicio, fin) {
  if (estado === 'vacio') return []
  if (estado === 'labora') {
    return [
      {
        tipo: 'labora',
        inicio: normalizarHoraInput(inicio),
        fin: normalizarHoraInput(fin),
      },
    ]
  }
  return [{ tipo: estado }]
}

function MallaCeldaModal({
  open,
  celdaId = '',
  colaboradorNombre,
  diaLabel,
  bloquesIniciales = [],
  onClose,
  onGuardar,
}) {
  const [estado, setEstado] = useState('vacio')
  const [inicio, setInicio] = useState('06:00')
  const [fin, setFin] = useState('14:00')
  const [error, setError] = useState('')

  const inicioRef = useRef(null)
  const finRef = useRef(null)
  const celdaActivaRef = useRef('')

  useEffect(() => {
    if (!open) {
      celdaActivaRef.current = ''
      return
    }

    if (!celdaId || celdaActivaRef.current === celdaId) return

    celdaActivaRef.current = celdaId

    const detectado = inferirEstado(bloquesIniciales)
    setEstado(detectado)

    if (detectado === 'labora' && bloquesIniciales[0]) {
      setInicio(
        normalizarHoraInput(bloquesIniciales[0].inicio) || '06:00',
      )
      setFin(normalizarHoraInput(bloquesIniciales[0].fin) || '14:00')
    } else {
      setInicio('06:00')
      setFin('14:00')
    }

    setError('')
  }, [open, celdaId, bloquesIniciales])

  const actualizarHora = (campo, valor) => {
    const normalizada = normalizarHoraInput(valor) || valor
    if (campo === 'inicio') setInicio(normalizada)
    if (campo === 'fin') setFin(normalizada)
    setError('')
  }

  const handleGuardar = () => {
    const inicioRaw = inicioRef.current?.value || inicio
    const finRaw = finRef.current?.value || fin
    const inicioNorm = normalizarHoraInput(inicioRaw)
    const finNorm = normalizarHoraInput(finRaw)

    if (estado === 'labora') {
      if (!esHoraValida(inicioNorm) || !esHoraValida(finNorm)) {
        setError('Selecciona una hora de entrada y salida válidas')
        return
      }

      const [hi, mi] = inicioNorm.split(':').map(Number)
      const [hf, mf] = finNorm.split(':').map(Number)
      const minutos = hf * 60 + mf - (hi * 60 + mi)
      if (minutos <= 0) {
        setError('La hora de salida debe ser posterior a la de entrada')
        return
      }
    }

    onGuardar?.(bloquesDesdeEstado(estado, inicioNorm, finNorm))
    onClose?.()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${colaboradorNombre} · ${diaLabel}`}
      className="malla-celda-modal"
      footer={
        <>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--primary"
            onClick={handleGuardar}
          >
            Aplicar
          </button>
        </>
      }
    >
      <div className="malla-celda-modal__form">
        <label className="malla-celda-modal__field">
          <span>Estado del día</span>
          <select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value)
              setError('')
            }}
          >
            {OPCIONES_ESTADO.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </label>

        {estado === 'labora' && (
          <div className="malla-celda-modal__horas">
            <label className="malla-celda-modal__field">
              <span>Entrada</span>
              <input
                ref={inicioRef}
                type="time"
                step="60"
                value={inicio}
                onChange={(e) => actualizarHora('inicio', e.target.value)}
                onInput={(e) => actualizarHora('inicio', e.target.value)}
              />
            </label>
            <label className="malla-celda-modal__field">
              <span>Salida</span>
              <input
                ref={finRef}
                type="time"
                step="60"
                value={fin}
                onChange={(e) => actualizarHora('fin', e.target.value)}
                onInput={(e) => actualizarHora('fin', e.target.value)}
              />
            </label>
          </div>
        )}

        {error && <p className="malla-celda-modal__error">{error}</p>}
      </div>
    </Modal>
  )
}

export default MallaCeldaModal
