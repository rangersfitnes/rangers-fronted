import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import CronometroTurnoWidget from '../components/CronometroTurnoWidget.jsx'
import FinJornadaTurnoModal from '../components/FinJornadaTurnoModal.jsx'
import IniciarJornadaModal from '../components/IniciarJornadaModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { getAdminToken } from '../services/authService.js'
import {
  finalizarTurnoLaboral,
  iniciarTurnoLaboral,
  obtenerPerfilColaborador,
  obtenerTurnoActivo,
} from '../services/turnosService.js'
import { obtenerEstadoHorasExtra } from '../utils/calculoPagoTurnoUtils.js'
import { normalizarTimestampMs } from '../pages/cuenta/cuentaUtils.js'

const ColaboradorTurnoContext = createContext(null)

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

  const cargarEstadoTurno = useCallback(async () => {
    const token = getAdminToken()
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
    const desdeEsquema = Number(esquemaLaboral?.horasTurno) || 0
    const desdeTurno = Number(turnoActivo?.horasTurno) || 0
    return desdeEsquema || desdeTurno
  }, [esquemaLaboral?.horasTurno, turnoActivo?.horasTurno])

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

  const jornadaCompleta =
    horasTurnoJornada > 0 && !estadoHorasExtra.enJornada

  const modalFinJornadaOpen =
    Boolean(turnoActivo) && jornadaCompleta && !continuarTiempoExtra

  useEffect(() => {
    setContinuarTiempoExtra(false)
  }, [turnoActivo?.id])

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
      setContinuarTiempoExtra(false)
      setModalInicioOpen(false)

      try {
        const perfilData = await obtenerPerfilColaborador()
        setPerfil(perfilData.colaborador)
        setEsquemaLaboral(perfilData.esquema)
      } catch {
        // El turno ya inició; el esquema se puede recargar después.
      }

      toast.success('Jornada laboral iniciada')
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
              onFinalizar={handleFinalizarTurno}
              finalizando={finalizando}
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
