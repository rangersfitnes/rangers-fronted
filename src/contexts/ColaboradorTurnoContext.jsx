import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import CronometroTurnoWidget from '../components/CronometroTurnoWidget.jsx'
import IniciarJornadaModal from '../components/IniciarJornadaModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { getAdminToken } from '../services/authService.js'
import {
  finalizarTurnoLaboral,
  iniciarTurnoLaboral,
  obtenerPerfilColaborador,
  obtenerTurnoActivo,
} from '../services/turnosService.js'

const ColaboradorTurnoContext = createContext(null)

export function ColaboradorTurnoProvider({ children }) {
  const toast = useToast()
  const [perfil, setPerfil] = useState(null)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [modalInicioOpen, setModalInicioOpen] = useState(false)
  const [jornadaPospuesta, setJornadaPospuesta] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [ahora, setAhora] = useState(Date.now())

  const cargarEstadoTurno = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setPerfil(null)
      setTurnoActivo(null)
      setModalInicioOpen(false)
      setJornadaPospuesta(false)
      return
    }

    setCargando(true)
    try {
      const [perfilColaborador, turno] = await Promise.all([
        obtenerPerfilColaborador(),
        obtenerTurnoActivo(),
      ])

      setPerfil(perfilColaborador)
      setTurnoActivo(turno)
    } catch (err) {
      setPerfil(null)
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
    if (!turnoActivo?.inicioEn) return undefined

    const intervalo = window.setInterval(() => {
      setAhora(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalo)
  }, [turnoActivo?.id, turnoActivo?.inicioEn])

  const tiempoTranscurridoMs = useMemo(() => {
    if (!turnoActivo?.inicioEn) return 0
    return Math.max(0, ahora - Number(turnoActivo.inicioEn))
  }, [turnoActivo?.inicioEn, ahora])

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
      setModalInicioOpen(false)
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
      setJornadaPospuesta(false)
      toast.success('Turno finalizado correctamente')
    } catch (err) {
      toast.error(err.message || 'No se pudo finalizar el turno')
    } finally {
      setFinalizando(false)
    }
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
            <CronometroTurnoWidget
              tiempoMs={tiempoTranscurridoMs}
              onFinalizar={handleFinalizarTurno}
              finalizando={finalizando}
            />
          ) : null}
        </>
      ) : null}
    </ColaboradorTurnoContext.Provider>
  )
}

export function useColaboradorTurno() {
  return useContext(ColaboradorTurnoContext)
}
