import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const STORAGE_KEY = 'rb_cronometro_entreno_bg'

function soportaDocumentPiP() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

function inyectarEstilosPip(pipDoc) {
  const style = pipDoc.createElement('style')
  style.textContent = `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      background: #0a0a0a;
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
    .cronometro-pip {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      width: 100%;
      height: 100%;
      padding: 0.75rem;
      text-align: center;
      user-select: none;
    }
    .cronometro-pip.is-work { background: radial-gradient(ellipse at 50% 30%, rgba(249,115,22,.35), #0a0a0a 70%); }
    .cronometro-pip.is-rest { background: radial-gradient(ellipse at 50% 30%, rgba(56,189,248,.28), #0a0a0a 70%); }
    .cronometro-pip.is-prep { background: radial-gradient(ellipse at 50% 30%, rgba(251,191,36,.25), #0a0a0a 70%); }
    .cronometro-pip.is-done { background: radial-gradient(ellipse at 50% 30%, rgba(34,197,94,.28), #0a0a0a 70%); }
    .cronometro-pip__fase {
      margin: 0;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #fb923c;
    }
    .cronometro-pip.is-rest .cronometro-pip__fase { color: #7dd3fc; }
    .cronometro-pip.is-done .cronometro-pip__fase { color: #86efac; }
    .cronometro-pip__tiempo {
      margin: 0;
      font-size: 2.8rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .cronometro-pip__ronda {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: rgba(255,255,255,.7);
    }
    .cronometro-pip__hint {
      margin: 0.35rem 0 0;
      font-size: 0.65rem;
      color: rgba(255,255,255,.45);
    }
  `
  pipDoc.head.appendChild(style)
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

function construirPlan(modo, config) {
  const plan = []
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
      plan.push({
        fase: 'marcha',
        ronda: 0,
        duracionMs: total,
        countdown: true,
      })
    } else {
      plan.push({
        fase: 'marcha',
        ronda: 0,
        duracionMs: total > 0 ? total : Number.POSITIVE_INFINITY,
        countdown: false,
        countup: true,
      })
    }
  }

  plan.push({ fase: 'fin', ronda: 0, duracionMs: 0 })
  return plan
}

function sonidoAlEntrarSegmento(next) {
  if (!next) return null
  if (next.fase === 'trabajo') return 'go'
  if (next.fase === 'ronda') return next.ronda === 1 ? 'go' : 'round'
  if (next.fase === 'descanso') return 'rest'
  if (next.fase === 'marcha') return 'go'
  if (next.fase === 'prep') return 'tick'
  if (next.fase === 'fin') return 'complete'
  return null
}

function CronometroEntrenamientoModal({ open, onClose }) {
  const [modo, setModo] = useState('tabata')
  const [config, setConfig] = useState(DEFAULTS)
  const [sonidoOn, setSonidoOn] = useState(true)
  const [corriendo, setCorriendo] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [pipActivo, setPipActivo] = useState(false)
  const [pipRoot, setPipRoot] = useState(null)
  const [fase, setFase] = useState('idle')
  const [rondaActual, setRondaActual] = useState(0)
  const [restanteMs, setRestanteMs] = useState(0)
  const [transcurridoMs, setTranscurridoMs] = useState(0)
  const [totalRondasUi, setTotalRondasUi] = useState(0)

  const engineRef = useRef(null)
  const warnedRef = useRef(new Set())
  const wakeLockRef = useRef(null)
  const sonidoOnRef = useRef(sonidoOn)
  const keepAliveRef = useRef(null)
  const pipWindowRef = useRef(null)

  useEffect(() => {
    sonidoOnRef.current = sonidoOn
  }, [sonidoOn])

  const totalRondas = useMemo(() => {
    if (modo === 'tabata') return clampInt(config.tabata.rondas, 1, 50)
    if (modo === 'emom') return clampInt(config.emom.rondas, 1, 100)
    return 0
  }, [modo, config])

  const beep = (nombre) => {
    if (!sonidoOnRef.current || !nombre) return
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

  const detenerKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }

  /** Audio periódico suave para que iOS/Android no suspendan tanto el proceso. */
  const iniciarKeepAliveAudio = () => {
    detenerKeepAlive()
    keepAliveRef.current = window.setInterval(() => {
      if (!engineRef.current?.activo) return
      // Pulso casi inaudible: mantiene el AudioContext activo en background
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext
        if (!Ctx) return
        if (!engineRef.current.silentCtx) {
          engineRef.current.silentCtx = new Ctx()
        }
        const ctx = engineRef.current.silentCtx
        if (ctx.state === 'suspended') ctx.resume().catch(() => {})
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        gain.gain.value = 0.00001
        osc.frequency.value = 40
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.05)
      } catch {
        /* ignore */
      }
    }, 8000)
  }

  const persistirEstado = (estado) => {
    try {
      if (!estado?.activo) {
        sessionStorage.removeItem(STORAGE_KEY)
        return
      }
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          modo: estado.modo,
          config: estado.config,
          plan: estado.plan,
          idx: estado.idx,
          segmentStartedAt: estado.segmentStartedAt,
          sessionStartedAt: estado.sessionStartedAt,
          sonidoOn: sonidoOnRef.current,
        }),
      )
    } catch {
      /* ignore */
    }
  }

  const detenerMotor = ({ limpiarPersistencia = true } = {}) => {
    if (engineRef.current?.intervalId) {
      clearInterval(engineRef.current.intervalId)
    }
    if (engineRef.current?.silentCtx) {
      engineRef.current.silentCtx.close?.().catch(() => {})
    }
    engineRef.current = null
    detenerKeepAlive()
    if (limpiarPersistencia) {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
  }

  const aplicarEstadoVisual = (plan, idx, segmentStartedAt, now = Date.now()) => {
    const actual = plan[idx]
    if (!actual) return
    if (actual.fase === 'fin') {
      setFase('fin')
      setRestanteMs(0)
      setTranscurridoMs(0)
      setCorriendo(false)
      return
    }

    const elapsed = Math.max(0, now - segmentStartedAt)
    const duracion = actual.duracionMs
    const infinito = !Number.isFinite(duracion)
    setFase(actual.fase)
    setRondaActual(actual.ronda)

    if (actual.countup || (actual.fase === 'marcha' && !actual.countdown)) {
      setTranscurridoMs(elapsed)
      setRestanteMs(infinito ? 0 : Math.max(0, duracion - elapsed))
    } else {
      setRestanteMs(Math.max(0, duracion - elapsed))
      setTranscurridoMs(elapsed)
    }
  }

  const sincronizarMotor = () => {
    const engine = engineRef.current
    if (!engine?.activo) return

    const now = Date.now()
    let { idx, segmentStartedAt, plan } = engine
    let actual = plan[idx]
    if (!actual) return

    // Avanza tantos segmentos como hayan vencido mientras estaba en background
    while (actual && actual.fase !== 'fin') {
      const duracion = actual.duracionMs
      const infinito = !Number.isFinite(duracion)
      const elapsed = now - segmentStartedAt

      if (infinito || elapsed < duracion) break

      const overflow = elapsed - duracion
      idx += 1
      actual = plan[idx]
      segmentStartedAt = now - Math.min(overflow, 50)
      warnedRef.current = new Set()

      if (!actual || actual.fase === 'fin') {
        setFase('fin')
        setRestanteMs(0)
        setCorriendo(false)
        setMinimizado(false)
        beep('complete')
        liberarWakeLock()
        detenerMotor()
        return
      }

      const cue = sonidoAlEntrarSegmento(actual)
      beep(cue)
    }

    engine.idx = idx
    engine.segmentStartedAt = segmentStartedAt
    persistirEstado(engine)
    aplicarEstadoVisual(plan, idx, segmentStartedAt, now)

    // Avisos 3-2-1 del segmento actual
    actual = plan[idx]
    if (!actual || actual.fase === 'fin') return
    const elapsed = now - segmentStartedAt
    const duracion = actual.duracionMs
    if (!Number.isFinite(duracion)) return
    const left = Math.max(0, duracion - elapsed)
    const segLeft = Math.ceil(left / 1000)
    if (segLeft >= 1 && segLeft <= 3) {
      const key = `${idx}-${actual.fase}-${segLeft}`
      if (!warnedRef.current.has(key)) {
        warnedRef.current.add(key)
        beep(actual.fase === 'prep' ? 'tick' : 'warning')
      }
    }
  }

  const arrancarIntervalo = () => {
    if (!engineRef.current) return
    if (engineRef.current.intervalId) {
      clearInterval(engineRef.current.intervalId)
    }
    // 250ms en foreground; en background el SO lo reduce, pero al volver sincronizamos
    engineRef.current.intervalId = window.setInterval(sincronizarMotor, 250)
    sincronizarMotor()
  }

  const iniciarMotor = async (modoIni, configIni) => {
    await desbloquearAudioCronometro()
    await pedirWakeLock()

    const plan = construirPlan(modoIni, configIni)
    const rondasTotales =
      modoIni === 'tabata'
        ? clampInt(configIni.tabata.rondas, 1, 50)
        : modoIni === 'emom'
          ? clampInt(configIni.emom.rondas, 1, 100)
          : 0

    warnedRef.current = new Set()
    const now = Date.now()
    engineRef.current = {
      activo: true,
      modo: modoIni,
      config: configIni,
      plan,
      idx: 0,
      segmentStartedAt: now,
      sessionStartedAt: now,
      intervalId: null,
      silentCtx: null,
    }

    setTotalRondasUi(rondasTotales)
    setCorriendo(true)
    setFase(plan[0].fase)
    setRondaActual(0)
    setRestanteMs(plan[0].duracionMs)
    setTranscurridoMs(0)
    beep('tick')
    persistirEstado(engineRef.current)
    iniciarKeepAliveAudio()
    arrancarIntervalo()
  }

  const reanudarDesdePersistencia = async (saved) => {
    if (!saved?.plan?.length) return false
    await desbloquearAudioCronometro()
    await pedirWakeLock()
    setModo(saved.modo || 'tabata')
    if (saved.config) setConfig(saved.config)
    if (typeof saved.sonidoOn === 'boolean') setSonidoOn(saved.sonidoOn)

    const rondasTotales =
      saved.modo === 'tabata'
        ? clampInt(saved.config?.tabata?.rondas, 1, 50)
        : saved.modo === 'emom'
          ? clampInt(saved.config?.emom?.rondas, 1, 100)
          : 0

    engineRef.current = {
      activo: true,
      modo: saved.modo,
      config: saved.config,
      plan: saved.plan,
      idx: Number(saved.idx) || 0,
      segmentStartedAt: Number(saved.segmentStartedAt) || Date.now(),
      sessionStartedAt: Number(saved.sessionStartedAt) || Date.now(),
      intervalId: null,
      silentCtx: null,
    }
    setTotalRondasUi(rondasTotales)
    setCorriendo(true)
    setMinimizado(true)
    warnedRef.current = new Set()
    iniciarKeepAliveAudio()
    arrancarIntervalo()
    return true
  }

  useEffect(() => {
    if (!open) return
    precargarSonidosCronometro()
    // Si el usuario vuelve a abrir el botón Cronómetro, expandir
    setMinimizado(false)
  }, [open])

  // Reanudar cronómetro en background si el usuario volvió a la web
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved?.plan?.length) {
        reanudarDesdePersistencia(saved)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && engineRef.current?.activo) {
        pedirWakeLock()
        sincronizarMotor()
      }
    }
    const onPageShow = () => {
      if (engineRef.current?.activo) sincronizarMotor()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('focus', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('focus', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open && !corriendo) return undefined
    if (open && !minimizado) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
    document.body.style.overflow = ''
    return undefined
  }, [open, minimizado, corriendo])

  useEffect(
    () => () => {
      try {
        pipWindowRef.current?.close?.()
      } catch {
        /* ignore */
      }
      detenerMotor({ limpiarPersistencia: false })
      liberarWakeLock()
    },
    [],
  )

  const cerrarPip = () => {
    try {
      pipWindowRef.current?.close?.()
    } catch {
      /* ignore */
    }
    pipWindowRef.current = null
    setPipRoot(null)
    setPipActivo(false)
  }

  const abrirVentanaFlotante = async () => {
    if (!soportaDocumentPiP()) {
      setMinimizado(true)
      return false
    }
    try {
      // Cierra PiP previo si existía
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close()
      }
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 280,
        height: 200,
        preferInitialWindowPlacement: true,
      })
      inyectarEstilosPip(pipWin.document)
      const root = pipWin.document.createElement('div')
      root.id = 'cronometro-pip-root'
      root.style.width = '100%'
      root.style.height = '100%'
      pipWin.document.body.appendChild(root)

      pipWindowRef.current = pipWin
      setPipRoot(root)
      setPipActivo(true)
      setMinimizado(true)

      pipWin.addEventListener(
        'pagehide',
        () => {
          pipWindowRef.current = null
          setPipRoot(null)
          setPipActivo(false)
          // Si el timer sigue, queda la burbuja en la web
          if (engineRef.current?.activo) setMinimizado(true)
        },
        { once: true },
      )
      return true
    } catch (error) {
      console.warn('[cronometro] PiP no disponible:', error?.message || error)
      setMinimizado(true)
      return false
    }
  }

  const resetSesion = () => {
    cerrarPip()
    detenerMotor()
    liberarWakeLock()
    setCorriendo(false)
    setMinimizado(false)
    setFase('idle')
    setRondaActual(0)
    setRestanteMs(0)
    setTranscurridoMs(0)
    setTotalRondasUi(0)
    warnedRef.current = new Set()
  }

  const cambiarModo = (nuevo) => {
    if (corriendo) return
    setModo(nuevo)
    resetSesion()
  }

  const actualizarConfig = (tipo, campo, valor) => {
    setConfig((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [campo]: valor },
    }))
  }

  const handleStartStop = async () => {
    if (corriendo) {
      resetSesion()
      return
    }
    resetSesion()
    await iniciarMotor(modo, config)
  }

  const handleCerrar = async () => {
    if (corriendo) {
      await abrirVentanaFlotante()
      return
    }
    resetSesion()
    onClose?.()
  }

  const handleMinimizar = async () => {
    if (!corriendo) {
      onClose?.()
      return
    }
    await abrirVentanaFlotante()
  }

  const handleExpandir = () => {
    cerrarPip()
    setMinimizado(false)
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
    if (
      fase === 'marcha' &&
      (!config.normal.cuentaAtras ||
        (config.normal.minutos === 0 && config.normal.segundos === 0))
    ) {
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

  const rondasMostrar = totalRondasUi || totalRondas
  const mostrarFullscreen = open && !minimizado
  const mostrarMini = corriendo && minimizado && !pipActivo
  const mostrarPip = Boolean(pipActivo && pipRoot && corriendo)

  if (!mostrarFullscreen && !mostrarMini && !mostrarPip) return null

  const pipWidget = (
    <div className={`cronometro-pip ${faseClass}`}>
      <p className="cronometro-pip__fase">{etiquetaFase(fase)}</p>
      <p className="cronometro-pip__tiempo">{displayPrincipal}</p>
      {rondasMostrar > 0 && (
        <p className="cronometro-pip__ronda">
          Ronda {Math.max(rondaActual, 1)} / {rondasMostrar}
        </p>
      )}
      <p className="cronometro-pip__hint">Rangers Box</p>
    </div>
  )

  return createPortal(
    <>
      {mostrarFullscreen && (
        <div
          className={`cronometro-fs ${faseClass}`}
          role="dialog"
          aria-modal="true"
          aria-label="Cronómetro de entrenamiento"
        >
          <header className="cronometro-fs__top">
            <button
              type="button"
              className="cronometro-fs__icon-btn"
              onClick={handleCerrar}
              aria-label={corriendo ? 'Minimizar cronómetro' : 'Cerrar'}
            >
              {corriendo ? 'Minimizar' : 'Cerrar'}
            </button>
            <h1 className="cronometro-fs__title">Cronómetro</h1>
            {corriendo ? (
              <button
                type="button"
                className="cronometro-fs__icon-btn"
                onClick={handleMinimizar}
              >
                Segundo plano
              </button>
            ) : (
              <span className="cronometro-fs__top-spacer" />
            )}
          </header>

          <div className="cronometro-fs__body">
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

            {!corriendo && modo === 'tabata' && (
              <div className="cronometro-entreno__config">
                <label>
                  <span>Trabajo (s)</span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={config.tabata.trabajo}
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
                    onChange={(e) =>
                      actualizarConfig('tabata', 'rondas', e.target.value)
                    }
                  />
                </label>
              </div>
            )}

            {!corriendo && modo === 'emom' && (
              <div className="cronometro-entreno__config">
                <label>
                  <span>Intervalo (s)</span>
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={config.emom.intervalo}
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

            {!corriendo && modo === 'normal' && (
              <div className="cronometro-entreno__config">
                <label>
                  <span>Minutos</span>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={config.normal.minutos}
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
                    onChange={(e) =>
                      actualizarConfig('normal', 'segundos', e.target.value)
                    }
                  />
                </label>
                <label className="cronometro-entreno__check">
                  <input
                    type="checkbox"
                    checked={config.normal.cuentaAtras}
                    onChange={(e) =>
                      actualizarConfig(
                        'normal',
                        'cuentaAtras',
                        e.target.checked,
                      )
                    }
                  />
                  <span>Cuenta regresiva</span>
                </label>
              </div>
            )}

            <div className={`cronometro-fs__display ${faseClass}`}>
              <p className="cronometro-entreno__fase">{etiquetaFase(fase)}</p>
              <p className="cronometro-fs__tiempo" aria-live="polite">
                {displayPrincipal}
              </p>
              {rondasMostrar > 0 && (
                <p className="cronometro-entreno__ronda">
                  Ronda{' '}
                  {Math.max(rondaActual, fase === 'idle' ? 0 : rondaActual)} /{' '}
                  {rondasMostrar}
                </p>
              )}
            </div>

            <p className="cronometro-fs__bg-hint">
              {soportaDocumentPiP()
                ? '“Segundo plano” abre una ventana flotante encima de otras pestañas/apps (Chrome/Edge). Si tu navegador no lo soporta, queda una burbuja en Rangers Box.'
                : 'Puedes minimizar: el tiempo sigue por reloj. La ventana flotante sobre otras webs requiere Chrome o Edge.'}
            </p>

            <label className="cronometro-entreno__sonido">
              <input
                type="checkbox"
                checked={sonidoOn}
                onChange={(e) => setSonidoOn(e.target.checked)}
              />
              <span>Sonidos de rondas e intervalos</span>
            </label>
          </div>

          <footer className="cronometro-fs__footer">
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
              onClick={handleStartStop}
            >
              {corriendo ? 'Detener' : fase === 'fin' ? 'Otra vez' : 'Iniciar'}
            </button>
          </footer>
        </div>
      )}

      {mostrarMini && (
        <button
          type="button"
          className={`cronometro-mini ${faseClass}`}
          onClick={handleExpandir}
          aria-label="Abrir cronómetro"
        >
          <span className="cronometro-mini__fase">{etiquetaFase(fase)}</span>
          <span className="cronometro-mini__tiempo">{displayPrincipal}</span>
          {rondasMostrar > 0 && (
            <span className="cronometro-mini__ronda">
              {Math.max(rondaActual, 1)}/{rondasMostrar}
            </span>
          )}
        </button>
      )}

      {mostrarPip && createPortal(pipWidget, pipRoot)}
    </>,
    document.body,
  )
}

export default CronometroEntrenamientoModal
