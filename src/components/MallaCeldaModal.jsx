import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import {
  esHoraValida,
  normalizarHoraInput,
  resolverTurnoEstablecido,
  TURNOS_ESTABLECIDOS,
} from '../utils/mallasUtils.js'
import './MallaCeldaModal.css'

const OPCIONES_ESTADO = [
  { value: 'vacio', label: 'Sin asignar' },
  { value: 'labora', label: 'Labora (turno)' },
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

function inferirTurnoId(inicio, fin) {
  const turno = resolverTurnoEstablecido(inicio, fin)
  return turno?.id || TURNOS_ESTABLECIDOS[0].id
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
  const [turnoId, setTurnoId] = useState(TURNOS_ESTABLECIDOS[0].id)
  const [error, setError] = useState('')

  const celdaActivaRef = useRef('')

  const turnoSeleccionado =
    TURNOS_ESTABLECIDOS.find((t) => t.id === turnoId) || TURNOS_ESTABLECIDOS[0]

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
      setTurnoId(
        inferirTurnoId(bloquesIniciales[0].inicio, bloquesIniciales[0].fin),
      )
    } else {
      setTurnoId(TURNOS_ESTABLECIDOS[0].id)
    }

    setError('')
  }, [open, celdaId, bloquesIniciales])

  const handleGuardar = () => {
    if (estado === 'labora') {
      const inicioNorm = normalizarHoraInput(turnoSeleccionado.inicio)
      const finNorm = normalizarHoraInput(turnoSeleccionado.fin)
      if (!esHoraValida(inicioNorm) || !esHoraValida(finNorm)) {
        setError('Selecciona un turno válido')
        return
      }
      onGuardar?.(bloquesDesdeEstado(estado, inicioNorm, finNorm))
      onClose?.()
      return
    }

    onGuardar?.(bloquesDesdeEstado(estado, '', ''))
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
          <div className="malla-celda-modal__turnos" role="group" aria-label="Turno">
            <span className="malla-celda-modal__turnos-label">Turno establecido</span>
            {TURNOS_ESTABLECIDOS.map((turno) => {
              const activo = turno.id === turnoId
              return (
                <button
                  key={turno.id}
                  type="button"
                  className={`malla-celda-modal__turno${activo ? ' malla-celda-modal__turno--activo' : ''}`}
                  onClick={() => {
                    setTurnoId(turno.id)
                    setError('')
                  }}
                >
                  <strong>{turno.etiqueta}</strong>
                  <span>
                    {turno.inicio} – {turno.fin}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="malla-celda-modal__error">{error}</p>}
      </div>
    </Modal>
  )
}

export default MallaCeldaModal
