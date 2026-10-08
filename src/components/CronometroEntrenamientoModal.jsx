import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import {
  desbloquearAudioCronometro,
  precargarSonidosCronometro,
  reproducirSonidoCronometro,
} from '../utils/timerSounds.js'
import './CronometroEntrenamientoModal.css'

const MODOS = [
  { id: 'tabata', label: 'Tabata' },
  { id: 'emom', label: 'EMOM' },
  { id: 'normal', label: 'Cronómetro' },
]

const DEFAULTS = {
  tabata: { trabajo: 20, descanso: 10, rondas: 8 },
  emom: { intervalo: 60, rondas: 10 },
  normal: { minutos: 0, segundos: 0, cuentaAtras: false },
}

function clampInt(valor, min, max) {
  const n = Math.floor(Number(valor))
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function formatearMs(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatearSegundos(seg) {
  const total = Math.max(0, Math.floor(seg))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function etiquetaFase(fase) {
  if (fase === 'prep') return 'Preparación'
  if (fase === 'trabajo') return 'Trabajo'
  if (fase === 'descanso') return 'Descanso'
  if (fase === 'ronda') return 'Ronda'
  if (fase === 'marcha') return 'En marcha'
  if (fase === 'fin') return 'Completado'
  return 'Listo'
}

function CronometroEntrenamientoModal({ open, onClose }) {
  const [modo, setModo] = useState('tabata')
  const [config, setConfig] = useState(DEFAULTS)
  const [sonidoOn, setSonidoOn] = useState(true)
  const [corriendo, setCorriendo] = useState(false)
  const [fase, setFase] = useState('idle')
  const [rondaActual, setRondaActual] = useState(0)
  const [restanteMs, setRestanteMs] = useState(0)
  const [transcurridoMs, setTranscurridoMs] = useState(0)

  const engineRef = useRef(null)
  const warnedRef = useRef(new Set())
  const wakeLockRef = useRef(null)

  const totalRondas = useMemo(() => {
    if (modo === 'tabata') return clampInt(config.tabata.rondas, 1, 50)
    if (modo === 'emom') return clampInt(config.emom.rondas, 1, 100)
    return 0
  }, [modo, config])

  useEffect(() => {
    if (!open) return
    precargarSonidosCronometro()
  }, [open])

  useEffect(() => {
    if (!open) {
      detenerMotor()
      liberarWakeLock()
      setCorriendo(false)
      setFase('idle')
      setRondaActual(0)
      setRestanteMs(0)
      setTranscurridoMs(0)
      warnedRef.current = new Set()
    }
  }, [open])

  useEffect(() => () => {
    detenerMotor()
    liberarWakeLock()
  }, [])

  const beep = (nombre) => {
    if (!sonidoOn) return
    reproducirSonidoCronometro(nombre)
  }

  const pedirWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch {
      /* ignore */
    }
  }

  const liberarWakeLock = async () => {
    try {
      await wakeLockRef.current?.release?.()
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null
  }

  const detenerMotor = () => {
    if (engineRef.current?.raf) {
      cancelAnimationFrame(engineRef.current.raf)
    }
    engineRef.current = null
  }

  const actualizarConfig = (tipo, campo, valor) => {
    setConfig((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [campo]: valor },
    }))
  }

  const resetSesion = () => {
    detenerMotor()
    liberarWakeLock()
    setCorriendo(false)
    setFase('idle')
    setRondaActual(0)
    setRestanteMs(0)
    setTranscurridoMs(0)
    warnedRef.current = new Set()
  }

  const cambiarModo = (nuevo) => {
    if (corriendo) return
    setModo(nuevo)
    resetSesion()
  }

  const construirPlan = () => {
    const plan = []
    // 3s de preparación
    plan.push({ fase: 'prep', ronda: 0, duracionMs: 3000 })

    if (modo === 'tabata') {
      const trabajo = clampInt(config.tabata.trabajo, 5, 300) * 1000
      const descanso = clampInt(config.tabata.descanso, 0, 300) * 1000
      const rondas = clampInt(config.tabata.rondas, 1, 50)
      for (let i = 1; i <= rondas; i += 1) {
        plan.push({ fase: 'trabajo', ronda: i, duracionMs: trabajo })
        if (descanso > 0 && i < rondas) {
          plan.push({ fase: 'descanso', ronda: i, duracionMs: descanso })
        }
      }
    } else if (modo === 'emom') {
      const intervalo = clampInt(config.emom.intervalo, 15, 300) * 1000
      const rondas = clampInt(config.emom.rondas, 1, 100)
      for (let i = 1; i <= rondas; i += 1) {
        plan.push({ fase: 'ronda', ronda: i, duracionMs: intervalo })
      }
    } else {
      const mins = clampInt(config.normal.minutos, 0, 180)
      const segs = clampInt(config.normal.segundos, 0, 59)
      const total = (mins * 60 + segs) * 1000
      if (config.normal.cuentaAtras && total > 0) {
        plan.push({ fase: 'marcha', ronda: 0, duracionMs: total, countdown: true })
      } else {
        plan.push({
          fase: 'marcha',
          ronda: 0,
          duracionMs: total > 0 ? total : Number.POSITIVE_INFINITY,
          countdown: total > 0 ? Boolean(config.normal.cuentaAtras) : false,
          countup: !config.normal.cuentaAtras || total === 0,
        })
      }
    }

    plan.push({ fase: 'fin', ronda: 0, duracionMs: 0 })
    return plan
  }

  const iniciarMotor = async () => {
    await desbloquearAudioCronometro()
    await pedirWakeLock()

    const plan = construirPlan()
    let idx = 0
    let segmentoInicio = performance.now()
    warnedRef.current = new Set()

    const segmento = plan[idx]
    setFase(segmento.fase)
    setRondaActual(segmento.ronda)
    setRestanteMs(
      Number.isFinite(segmento.duracionMs) ? segmento.duracionMs : 0,
    )
    setTranscurridoMs(0)
    setCorriendo(true)

    if (segmento.fase === 'prep') beep('tick')

    const tick = (now) => {
      const actual = plan[idx]
      if (!actual) {
        setCorriendo(false)
        return
      }

      if (actual.fase === 'fin') {
        setFase('fin')
        setRestanteMs(0)
        setCorriendo(false)
        beep('complete')
        liberarWakeLock()
        engineRef.current = null
        return
      }

      const elapsed = now - segmentoInicio
      const duracion = actual.duracionMs
      const infinito = !Number.isFinite(duracion)

      if (actual.countup || (actual.fase === 'marcha' && !actual.countdown)) {
        setTranscurridoMs(elapsed)
        if (!infinito) {
          const left = Math.max(0, duracion - elapsed)
          setRestanteMs(left)
          const segLeft = Math.ceil(left / 1000)
          if (segLeft <= 3 && segLeft >= 1) {
            const key = `${idx}-w-${segLeft}`
            if (!warnedRef.current.has(key)) {
              warnedRef.current.add(key)
              beep('warning')
            }
          }
          if (elapsed >= duracion) {
            idx += 1
            segmentoInicio = now
            warnedRef.current = new Set()
            const next = plan[idx]
            if (next) {
              setFase(next.fase)
              setRondaActual(next.ronda)
              if (next.fase === 'fin') {
                setCorriendo(false)
                beep('complete')
                liberarWakeLock()
                engineRef.current = null
                return
              }
            }
          }
        }
      } else {
        const left = Math.max(0, duracion - elapsed)
        setRestanteMs(left)
        setTranscurridoMs(elapsed)

        const segLeft = Math.ceil(left / 1000)
        if (actual.fase === 'prep' && segLeft <= 3 && segLeft >= 1) {
          const key = `prep-${segLeft}`
          if (!warnedRef.current.has(key)) {
            warnedRef.current.add(key)
            beep('tick')
          }
        } else if (segLeft <= 3 && segLeft >= 1 && actual.fase !== 'prep') {
          const key = `${idx}-w-${segLeft}`
          if (!warnedRef.current.has(key)) {
            warnedRef.current.add(key)
            beep('warning')
          }
        }

        if (elapsed >= duracion) {
          idx += 1
          segmentoInicio = now
          warnedRef.current = new Set()
          const next = plan[idx]
          if (!next || next.fase === 'fin') {
            setFase('fin')
            setRestanteMs(0)
            setCorriendo(false)
            beep('complete')
            liberarWakeLock()
            engineRef.current = null
            return
          }

          setFase(next.fase)
          setRondaActual(next.ronda)
          setRestanteMs(
            Number.isFinite(next.duracionMs) ? next.duracionMs : 0,
          )

          if (next.fase === 'trabajo') {
            beep('go')
          } else if (next.fase === 'ronda') {
            beep(next.ronda === 1 ? 'go' : 'round')
          } else if (next.fase === 'descanso') {
            beep('rest')
          } else if (next.fase === 'marcha') {
            beep('go')
          }
        }
      }

      engineRef.current = {
        raf: requestAnimationFrame(tick),
        plan,
        idx,
      }
    }

    engineRef.current = {
      raf: requestAnimationFrame(tick),
      plan,
      idx,
    }
  }

  const handleStartPause = async () => {
    if (corriendo) {
      detenerMotor()
      setCorriendo(false)
      liberarWakeLock()
      return
    }
    // Siempre arranca una sesión limpia (preparación → intervalos)
    resetSesion()
    await iniciarMotor()
  }

  const displayPrincipal = (() => {
    if (fase === 'idle') {
      if (modo === 'tabata') {
        return formatearSegundos(clampInt(config.tabata.trabajo, 5, 300))
      }
      if (modo === 'emom') {
        return formatearSegundos(clampInt(config.emom.intervalo, 15, 300))
      }
      const total =
        clampInt(config.normal.minutos, 0, 180) * 60 +
        clampInt(config.normal.segundos, 0, 59)
      if (config.normal.cuentaAtras && total > 0) return formatearSegundos(total)
      return '00:00'
    }
    if (fase === 'fin') return '00:00'
    if (fase === 'marcha' && (!config.normal.cuentaAtras || (config.normal.minutos === 0 && config.normal.segundos === 0))) {
      return formatearMs(transcurridoMs)
    }
    return formatearMs(restanteMs)
  })()

  const faseClass =
    fase === 'trabajo' || fase === 'ronda'
      ? 'is-work'
      : fase === 'descanso'
        ? 'is-rest'
        : fase === 'prep'
          ? 'is-prep'
          : fase === 'fin'
            ? 'is-done'
            : ''

  return (
    <Modal
      open={open}
      onClose={corriendo ? undefined : onClose}
      title="Cronómetro de entrenamiento"
      className="cronometro-entreno-modal modal--elevated"
      footer={
        <>
          <button
            type="button"
            className="cronometro-entreno__btn cronometro-entreno__btn--ghost"
            onClick={onClose}
            disabled={corriendo}
          >
            Cerrar
          </button>
          <button
            type="button"
            className="cronometro-entreno__btn cronometro-entreno__btn--ghost"
            onClick={resetSesion}
            disabled={fase === 'idle' && !corriendo}
          >
            Reiniciar
          </button>
          <button
            type="button"
            className="cronometro-entreno__btn cronometro-entreno__btn--primary"
            onClick={handleStartPause}
          >
            {corriendo
              ? 'Detener'
              : fase === 'fin'
                ? 'Otra vez'
                : 'Iniciar'}
          </button>
        </>
      }
    >
      <div className="cronometro-entreno">
        <div className="cronometro-entreno__modos" role="tablist">
          {MODOS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={modo === item.id}
              className={`cronometro-entreno__modo${
                modo === item.id ? ' is-active' : ''
              }`}
              onClick={() => cambiarModo(item.id)}
              disabled={corriendo}
            >
              {item.label}
            </button>
          ))}
        </div>

        {modo === 'tabata' && (
          <div className="cronometro-entreno__config">
            <label>
              <span>Trabajo (s)</span>
              <input
                type="number"
                min={5}
                max={300}
                value={config.tabata.trabajo}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('tabata', 'trabajo', e.target.value)
                }
              />
            </label>
            <label>
              <span>Descanso (s)</span>
              <input
                type="number"
                min={0}
                max={300}
                value={config.tabata.descanso}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('tabata', 'descanso', e.target.value)
                }
              />
            </label>
            <label>
              <span>Rondas</span>
              <input
                type="number"
                min={1}
                max={50}
                value={config.tabata.rondas}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('tabata', 'rondas', e.target.value)
                }
              />
            </label>
          </div>
        )}

        {modo === 'emom' && (
          <div className="cronometro-entreno__config">
            <label>
              <span>Intervalo (s)</span>
              <input
                type="number"
                min={15}
                max={300}
                value={config.emom.intervalo}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('emom', 'intervalo', e.target.value)
                }
              />
            </label>
            <label>
              <span>Rondas</span>
              <input
                type="number"
                min={1}
                max={100}
                value={config.emom.rondas}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('emom', 'rondas', e.target.value)
                }
              />
            </label>
            <p className="cronometro-entreno__hint">
              Cada intervalo empieza una ronda nueva (clásico: 60 s).
            </p>
          </div>
        )}

        {modo === 'normal' && (
          <div className="cronometro-entreno__config">
            <label>
              <span>Minutos</span>
              <input
                type="number"
                min={0}
                max={180}
                value={config.normal.minutos}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('normal', 'minutos', e.target.value)
                }
              />
            </label>
            <label>
              <span>Segundos</span>
              <input
                type="number"
                min={0}
                max={59}
                value={config.normal.segundos}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('normal', 'segundos', e.target.value)
                }
              />
            </label>
            <label className="cronometro-entreno__check">
              <input
                type="checkbox"
                checked={config.normal.cuentaAtras}
                disabled={corriendo}
                onChange={(e) =>
                  actualizarConfig('normal', 'cuentaAtras', e.target.checked)
                }
              />
              <span>Cuenta regresiva</span>
            </label>
            <p className="cronometro-entreno__hint">
              Sin tiempo o sin cuenta regresiva: cronómetro ascendente.
            </p>
          </div>
        )}

        <div className={`cronometro-entreno__display ${faseClass}`}>
          <p className="cronometro-entreno__fase">{etiquetaFase(fase)}</p>
          <p className="cronometro-entreno__tiempo" aria-live="polite">
            {displayPrincipal}
          </p>
          {totalRondas > 0 && (
            <p className="cronometro-entreno__ronda">
              Ronda {Math.max(rondaActual, fase === 'idle' ? 0 : rondaActual)} /{' '}
              {totalRondas}
            </p>
          )}
        </div>

        <label className="cronometro-entreno__sonido">
          <input
            type="checkbox"
            checked={sonidoOn}
            onChange={(e) => setSonidoOn(e.target.checked)}
          />
          <span>Sonidos de rondas e intervalos</span>
        </label>
      </div>
    </Modal>
  )
}

export default CronometroEntrenamientoModal
