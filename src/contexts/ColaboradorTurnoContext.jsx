import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import CronometroTurnoWidget from '../components/CronometroTurnoWidget.jsx'
import FinJornadaTurnoModal from '../components/FinJornadaTurnoModal.jsx'
import IniciarJornadaModal from '../components/IniciarJornadaModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { obtenerAdminToken } from '../services/authService.js'
import { obtenerContenidoWebPublico } from '../services/contenidoWebService.js'
import {
  finalizarTurnoLaboral,
  iniciarTurnoLaboral,
  obtenerPerfilColaborador,
  obtenerTurnoActivo,
} from '../services/turnosService.js'
import {
  obtenerEstadoHorasExtra,
  obtenerEstadoRecargoDominical,
  obtenerEstadoRecargoNocturno,
} from '../utils/calculoPagoTurnoUtils.js'
import { resolverJornadaEsquema } from '../utils/esquemaPagoUtils.js'
import { reproducirAudioAsistencias } from '../utils/reproducirAudioAsistencias.js'
import { normalizarTimestampMs } from '../pages/cuenta/cuentaUtils.js'

const ColaboradorTurnoContext = createContext(null)
const RECORDATORIO_INTERVALO_MS = 30 * 60 * 1000

export function ColaboradorTurnoProvider({ children }) {
  const toast = useToast()
  const [perfil, setPerfil] = useState(null)
  const [esquemaLaboral, setEsquemaLaboral] = useState(null)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [modalInicioOpen, setModalInicioOpen] = useState(false)
  const [jornadaPospuesta, setJornadaPospuesta] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [continuarTiempoExtra, setContinuarTiempoExtra] = useState(false)
  const [ahora, setAhora] = useState(Date.now())
  const [recordatorioActivo, setRecordatorioActivo] = useState(false)
  const [audioRecordatorioUrl, setAudioRecordatorioUrl] = useState(null)
  const [probandoAudio, setProbandoAudio] = useState(false)
  const turnoPrevioIdRef = useRef(null)

  const cargarEstadoTurno = useCallback(async () => {
    const token = await obtenerAdminToken()
    if (!token) {
      setPerfil(null)
      setEsquemaLaboral(null)
      setTurnoActivo(null)
      setModalInicioOpen(false)
      setJornadaPospuesta(false)
      return
    }

    setCargando(true)
    try {
      const [perfilData, turno] = await Promise.all([
        obtenerPerfilColaborador(),
        obtenerTurnoActivo(),
      ])

      setPerfil(perfilData.colaborador)
      setEsquemaLaboral(perfilData.esquema)
      setTurnoActivo(turno)
    } catch (err) {
      setPerfil(null)
      setEsquemaLaboral(null)
      setTurnoActivo(null)
      setModalInicioOpen(false)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarEstadoTurno()
  }, [cargarEstadoTurno])

  useEffect(() => {
    const puedeMostrar =
      perfil?.cronometrajeActivo &&
      Boolean(String(perfil?.sede || '').trim()) &&
      !turnoActivo &&
      !jornadaPospuesta

    setModalInicioOpen(Boolean(puedeMostrar))
  }, [perfil, turnoActivo, jornadaPospuesta])

  useEffect(() => {
    const inicioMs = normalizarTimestampMs(turnoActivo?.inicioEn)
    if (!inicioMs) return undefined

    const intervalo = window.setInterval(() => {
      setAhora(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [turnoActivo?.id, turnoActivo?.inicioEn])

  const inicioTurnoMs = useMemo(
    () => normalizarTimestampMs(turnoActivo?.inicioEn),
    [turnoActivo?.inicioEn],
  )

  const tiempoTranscurridoMs = useMemo(() => {
    if (!inicioTurnoMs) return 0
    return Math.max(0, ahora - inicioTurnoMs)
  }, [inicioTurnoMs, ahora])

  const horasTurnoJornada = useMemo(() => {
    const jornada = resolverJornadaEsquema(
      esquemaLaboral,
      inicioTurnoMs || Date.now(),
    )
    const desdeEsquema = Number(jornada.horasTurno) || 0
    const desdeTurno = Number(turnoActivo?.horasTurno) || 0
    return desdeEsquema || desdeTurno
  }, [esquemaLaboral, inicioTurnoMs, turnoActivo?.horasTurno])

  const estadoHorasExtra = useMemo(() => {
    if (!horasTurnoJornada) {
      return {
        enJornada: true,
        tiempoExtraMs: 0,
        minutosExtra: 0,
        horasExtraLiquidadas: 0,
        minutosParaLiquidar: 0,
      }
    }
    return obtenerEstadoHorasExtra(tiempoTranscurridoMs, horasTurnoJornada)
  }, [horasTurnoJornada, tiempoTranscurridoMs])

  const estadoRecargoDominical = useMemo(() => {
    if (!inicioTurnoMs) {
      return {
        activoAhora: false,
        esDomingoAhora: false,
        esFestivoAhora: false,
        horasDominicales: 0,
        tocaDomingo: false,
        tocaFestivo: false,
        etiqueta: '',
      }
    }
    return obtenerEstadoRecargoDominical(
      inicioTurnoMs,
      tiempoTranscurridoMs,
      horasTurnoJornada,
    )
  }, [inicioTurnoMs, tiempoTranscurridoMs, horasTurnoJornada])

  const estadoRecargoNocturno = useMemo(() => {
    if (!inicioTurnoMs) {
      return {
        activoAhora: false,
        horasNocturnas: 0,
        porcentaje: 0,
        horaInicio: 19,
        horaFin: 6,
        etiqueta: '',
      }
    }
    return obtenerEstadoRecargoNocturno(
      inicioTurnoMs,
      tiempoTranscurridoMs,
      esquemaLaboral || {},
    )
  }, [inicioTurnoMs, tiempoTranscurridoMs, esquemaLaboral])

  const jornadaCompleta =
    horasTurnoJornada > 0 && !estadoHorasExtra.enJornada

  const modalFinJornadaOpen =
    Boolean(turnoActivo) && jornadaCompleta && !continuarTiempoExtra

  useEffect(() => {
    setContinuarTiempoExtra(false)
  }, [turnoActivo?.id])

  // Enciende el recordatorio al iniciar turno; lo apaga al finalizar.
  useEffect(() => {
    const idActual = turnoActivo?.id || null
    const idPrevio = turnoPrevioIdRef.current

    if (idActual && idActual !== idPrevio) {
      setRecordatorioActivo(true)
    }
    if (!idActual && idPrevio) {
      setRecordatorioActivo(false)
    }

    turnoPrevioIdRef.current = idActual
  }, [turnoActivo?.id])

  useEffect(() => {
    if (!turnoActivo) {
      setAudioRecordatorioUrl(null)
      return undefined
    }

    const controller = new AbortController()

    const cargarAudio = async () => {
      try {
        const contenido = await obtenerContenidoWebPublico({
          signal: controller.signal,
        })
        const asistencias = contenido?.asistencias || {}
        const url = String(asistencias.audioUrl || '').trim()
        const habilitado =
          asistencias.audioActivo === undefined
            ? Boolean(url)
            : Boolean(asistencias.audioActivo && url)
        setAudioRecordatorioUrl(habilitado ? url : null)
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }

    cargarAudio()
    const poll = window.setInterval(cargarAudio, 60_000)
    return () => {
      controller.abort()
      window.clearInterval(poll)
    }
  }, [turnoActivo?.id])

  const reproducirRecordatorio = useCallback(async () => {
    if (!audioRecordatorioUrl) {
      throw new Error('No hay audio de recordatorio configurado')
    }
    await reproducirAudioAsistencias(audioRecordatorioUrl)
  }, [audioRecordatorioUrl])

  useEffect(() => {
    if (!recordatorioActivo || !audioRecordatorioUrl || !turnoActivo) {
      return undefined
    }

    const intervaloId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      reproducirRecordatorio().catch(() => {
        // Silencioso en el ciclo automático.
      })
    }, RECORDATORIO_INTERVALO_MS)

    return () => window.clearInterval(intervaloId)
  }, [
    recordatorioActivo,
    audioRecordatorioUrl,
    turnoActivo?.id,
    reproducirRecordatorio,
  ])

  const handleProbarAudio = useCallback(async () => {
    if (probandoAudio) return
    setProbandoAudio(true)
    try {
      await reproducirRecordatorio()
    } catch (err) {
      toast.error(err.message || 'No se pudo reproducir el audio')
    } finally {
      setProbandoAudio(false)
    }
  }, [probandoAudio, reproducirRecordatorio, toast])

  const handleCerrarModalInicio = () => {
    if (iniciando) return
    setJornadaPospuesta(true)
    setModalInicioOpen(false)
  }

  const handleIniciarTurno = async () => {
    setIniciando(true)
    try {
      const turno = await iniciarTurnoLaboral()
      setTurnoActivo(turno)
      setRecordatorioActivo(true)
      setContinuarTiempoExtra(false)
      setModalInicioOpen(false)

      try {
        const perfilData = await obtenerPerfilColaborador()
        setPerfil(perfilData.colaborador)
        setEsquemaLaboral(perfilData.esquema)
      } catch {
        // El turno ya inició; el esquema se puede recargar después.
      }

      const puntualidad = turno?.puntualidad
      if (puntualidad?.nivel === 'baja' || puntualidad?.nivel === 'media') {
        toast.error(puntualidad.mensaje || 'Revisa tu puntualidad de llegada')
      } else if (puntualidad?.mensaje) {
        toast.success(puntualidad.mensaje)
      } else {
        toast.success('Jornada laboral iniciada')
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo iniciar la jornada')
    } finally {
      setIniciando(false)
    }
  }

  const handleFinalizarTurno = async () => {
    if (!turnoActivo?.id) return

    setFinalizando(true)
    try {
      await finalizarTurnoLaboral({ turnoId: turnoActivo.id })
      setTurnoActivo(null)
      setRecordatorioActivo(false)
      setContinuarTiempoExtra(false)
      setJornadaPospuesta(false)
      toast.success('Turno finalizado correctamente')
    } catch (err) {
      toast.error(err.message || 'No se pudo finalizar el turno')
    } finally {
      setFinalizando(false)
    }
  }

  const handleContinuarTiempoExtra = () => {
    setContinuarTiempoExtra(true)
  }

  const mostrarCronometraje =
    Boolean(perfil?.cronometrajeActivo) && Boolean(turnoActivo)

  return (
    <ColaboradorTurnoContext.Provider
      value={{
        perfil,
        turnoActivo,
        cargando,
        recargar: cargarEstadoTurno,
      }}
    >
      {children}

      {perfil?.cronometrajeActivo ? (
        <>
          <IniciarJornadaModal
            open={modalInicioOpen}
            nombre={perfil.nombre}
            onIniciar={handleIniciarTurno}
            onClose={handleCerrarModalInicio}
            submitting={iniciando}
          />
          {mostrarCronometraje ? (
            <>
              <FinJornadaTurnoModal
                open={modalFinJornadaOpen}
                horasTurno={horasTurnoJornada}
                tiempoMs={tiempoTranscurridoMs}
                onTerminarTurno={handleFinalizarTurno}
                onContinuarTiempoExtra={handleContinuarTiempoExtra}
                finalizando={finalizando}
              />
              <CronometroTurnoWidget
                tiempoMs={tiempoTranscurridoMs}
                horasTurno={horasTurnoJornada}
                estadoHorasExtra={estadoHorasExtra}
                estadoRecargoDominical={estadoRecargoDominical}
                estadoRecargoNocturno={estadoRecargoNocturno}
                puntualidad={turnoActivo?.puntualidad || null}
                onFinalizar={handleFinalizarTurno}
                finalizando={finalizando}
                recordatorioActivo={recordatorioActivo}
                onRecordatorioChange={setRecordatorioActivo}
                onProbarAudio={handleProbarAudio}
                probandoAudio={probandoAudio}
                audioDisponible={Boolean(audioRecordatorioUrl)}
              />
            </>
          ) : null}
        </>
      ) : null}
    </ColaboradorTurnoContext.Provider>
  )
}

export function useColaboradorTurno() {
  return useContext(ColaboradorTurnoContext)
}
