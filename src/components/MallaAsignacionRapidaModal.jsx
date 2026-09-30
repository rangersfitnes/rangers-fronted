import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { DIAS_SEMANA } from '../services/horariosService.js'
import {
  DIAS_LABORABLES_DEFAULT,
  TURNOS_ESTABLECIDOS,
  construirIntercaladoPareja,
  crearBloquesConTurno,
  obtenerTurnoEstablecidoPorId,
  turnoComplementarioId,
} from '../utils/mallasUtils.js'
import './MallaAsignacionRapidaModal.css'

const PRESETS_DIAS = [
  {
    id: 'lv',
    label: 'Lun–Vie',
    dias: DIAS_LABORABLES_DEFAULT,
  },
  {
    id: 'ls',
    label: 'Lun–Sáb',
    dias: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
  },
  {
    id: 'todos',
    label: 'Toda la semana',
    dias: DIAS_SEMANA.map((d) => d.key),
  },
]

function MallaAsignacionRapidaModal({
  open,
  colaboradores = [],
  onClose,
  onAplicar,
}) {
  const [modo, setModo] = useState('duplicar')
  const [colaboradorUid, setColaboradorUid] = useState('')
  const [colaboradorAUid, setColaboradorAUid] = useState('')
  const [colaboradorBUid, setColaboradorBUid] = useState('')
  const [turnoId, setTurnoId] = useState(TURNOS_ESTABLECIDOS[0].id)
  const [turnoAId, setTurnoAId] = useState('manana')
  const [presetDias, setPresetDias] = useState('lv')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setModo('duplicar')
    setColaboradorUid(colaboradores[0]?.uid || '')
    setColaboradorAUid(colaboradores[0]?.uid || '')
    setColaboradorBUid(colaboradores[1]?.uid || colaboradores[0]?.uid || '')
    setTurnoId(TURNOS_ESTABLECIDOS[0].id)
    setTurnoAId('manana')
    setPresetDias('lv')
    setError('')
  }, [open, colaboradores])

  const diasKeys = useMemo(() => {
    const preset = PRESETS_DIAS.find((item) => item.id === presetDias)
    return preset?.dias || DIAS_LABORABLES_DEFAULT
  }, [presetDias])

  const turnoA = obtenerTurnoEstablecidoPorId(turnoAId)
  const turnoB = obtenerTurnoEstablecidoPorId(turnoComplementarioId(turnoAId))
  const nombreA =
    colaboradores.find((c) => c.uid === colaboradorAUid)?.nombre || 'Colaborador A'
  const nombreB =
    colaboradores.find((c) => c.uid === colaboradorBUid)?.nombre || 'Colaborador B'

  const handleAplicar = () => {
    try {
      if (modo === 'duplicar') {
        const uid = String(colaboradorUid || '').trim()
        if (!uid) {
          setError('Selecciona un colaborador')
          return
        }
        const bloques = crearBloquesConTurno({ turnoId, diasKeys })
        onAplicar?.({
          modo: 'duplicar',
          cambios: { [uid]: bloques },
        })
        onClose?.()
        return
      }

      const cambios = construirIntercaladoPareja({
        colaboradorAUid,
        colaboradorBUid,
        turnoAId,
        diasKeys,
      })
      onAplicar?.({
        modo: 'intercalar',
        cambios,
      })
      onClose?.()
    } catch (err) {
      setError(err.message || 'No se pudo aplicar la asignación')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignar turnos"
      className="malla-asignacion-modal"
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
            onClick={handleAplicar}
            disabled={colaboradores.length === 0}
          >
            Aplicar a esta semana
          </button>
        </>
      }
    >
      <div className="malla-asignacion-modal__body">
        <div className="malla-asignacion-modal__modos" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'duplicar'}
            className={`malla-asignacion-modal__modo${modo === 'duplicar' ? ' malla-asignacion-modal__modo--activo' : ''}`}
            onClick={() => {
              setModo('duplicar')
              setError('')
            }}
          >
            Duplicar turno
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'intercalar'}
            className={`malla-asignacion-modal__modo${modo === 'intercalar' ? ' malla-asignacion-modal__modo--activo' : ''}`}
            onClick={() => {
              setModo('intercalar')
              setError('')
            }}
          >
            Intercalar pareja
          </button>
        </div>

        <p className="malla-asignacion-modal__ayuda">
          {modo === 'duplicar'
            ? 'Asigna el mismo turno (mañana o tarde) a un colaborador en los días elegidos.'
            : 'Un colaborador queda en mañana y el otro en tarde los mismos días.'}
        </p>

        {modo === 'duplicar' ? (
          <>
            <label className="malla-asignacion-modal__field">
              <span>Colaborador</span>
              <select
                value={colaboradorUid}
                onChange={(e) => {
                  setColaboradorUid(e.target.value)
                  setError('')
                }}
              >
                {colaboradores.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="malla-asignacion-modal__turnos" role="group">
              {TURNOS_ESTABLECIDOS.map((turno) => {
                const activo = turno.id === turnoId
                return (
                  <button
                    key={turno.id}
                    type="button"
                    className={`malla-asignacion-modal__turno${activo ? ' malla-asignacion-modal__turno--activo' : ''}`}
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
          </>
        ) : (
          <>
            <label className="malla-asignacion-modal__field">
              <span>Colaborador A (turno principal)</span>
              <select
                value={colaboradorAUid}
                onChange={(e) => {
                  setColaboradorAUid(e.target.value)
                  setError('')
                }}
              >
                {colaboradores.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="malla-asignacion-modal__field">
              <span>Colaborador B (turno complementario)</span>
              <select
                value={colaboradorBUid}
                onChange={(e) => {
                  setColaboradorBUid(e.target.value)
                  setError('')
                }}
              >
                {colaboradores.map((c) => (
                  <option key={c.uid} value={c.uid}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="malla-asignacion-modal__turnos" role="group">
              {TURNOS_ESTABLECIDOS.map((turno) => {
                const activo = turno.id === turnoAId
                return (
                  <button
                    key={turno.id}
                    type="button"
                    className={`malla-asignacion-modal__turno${activo ? ' malla-asignacion-modal__turno--activo' : ''}`}
                    onClick={() => {
                      setTurnoAId(turno.id)
                      setError('')
                    }}
                  >
                    <strong>
                      {nombreA}: {turno.etiqueta}
                    </strong>
                    <span>
                      {turno.inicio} – {turno.fin}
                    </span>
                  </button>
                )
              })}
            </div>

            <p className="malla-asignacion-modal__preview">
              {nombreA}: {turnoA?.etiqueta} ({turnoA?.inicio}–{turnoA?.fin})
              <br />
              {nombreB}: {turnoB?.etiqueta} ({turnoB?.inicio}–{turnoB?.fin})
            </p>
          </>
        )}

        <div className="malla-asignacion-modal__dias" role="group" aria-label="Días">
          <span className="malla-asignacion-modal__dias-label">Días a cubrir</span>
          <div className="malla-asignacion-modal__dias-ops">
            {PRESETS_DIAS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`malla-asignacion-modal__dia-btn${presetDias === preset.id ? ' malla-asignacion-modal__dia-btn--activo' : ''}`}
                onClick={() => setPresetDias(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="malla-asignacion-modal__error">{error}</p>}
      </div>
    </Modal>
  )
}

export default MallaAsignacionRapidaModal
