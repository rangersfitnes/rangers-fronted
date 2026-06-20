import { useCallback, useEffect, useState } from 'react'
import addIcon from '../../assets/images/icons/add.svg'
import trainingIcon from '../../assets/images/icons/training.svg'
import AnadirCronogramaModal from '../../components/AnadirCronogramaModal.jsx'
import ChevronRightIcon from '../../components/icons/ChevronRightIcon.jsx'
import LoadingOverlay from '../../components/LoadingOverlay.jsx'
import { DIAS_SEMANA } from '../../constants/diasSemana.js'
import { colors } from '../../variables/colors.jsx'
import {
  guardarEntrenamiento,
  obtenerMisEntrenamientos,
} from '../../services/userService.js'
import './CuentaRutinas.css'

function ordenarEntrenamientos(lista) {
  const orden = {
    lunes: 0,
    martes: 1,
    miercoles: 2,
    jueves: 3,
    viernes: 4,
    sabado: 5,
    domingo: 6,
  }
  return [...lista].sort((a, b) => (orden[a.dia] ?? 99) - (orden[b.dia] ?? 99))
}

const ABREV_DIA = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
}

function CuentaRutinas() {
  const [entrenamientos, setEntrenamientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [entrenamientoEditar, setEntrenamientoEditar] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  const cargarEntrenamientos = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const data = await obtenerMisEntrenamientos({ signal })
      setEntrenamientos(ordenarEntrenamientos(data))
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudieron cargar los entrenamientos')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    cargarEntrenamientos(controller.signal)
    return () => controller.abort()
  }, [cargarEntrenamientos])

  const diasReservados = entrenamientos.map((e) => e.dia)
  const diasReservadosSet = new Set(diasReservados)
  const puedeAnadirCronograma = diasReservados.length < 7
  const tieneCards = entrenamientos.length > 0
  const progresoSemana = Math.round((entrenamientos.length / 7) * 100)

  const cerrarModal = () => {
    setModalAbierto(false)
    setEntrenamientoEditar(null)
    setErrorModal('')
  }

  const abrirModal = () => {
    setEntrenamientoEditar(null)
    setErrorModal('')
    setModalAbierto(true)
  }

  const abrirEdicion = (item) => {
    setEntrenamientoEditar({
      dia: item.dia,
      titulo: item.titulo,
      actividad: item.actividad,
    })
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleGuardar = async (datos) => {
    setGuardando(true)
    setErrorModal('')
    try {
      const guardado = await guardarEntrenamiento(datos)
      const diaAnterior = datos.diaAnterior
      setEntrenamientos((prev) => {
        const sinReemplazados = prev.filter(
          (e) => e.dia !== guardado.dia && e.dia !== diaAnterior,
        )
        return ordenarEntrenamientos([...sinReemplazados, guardado])
      })
      cerrarModal()
    } catch (err) {
      setErrorModal(err.message || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const mostrarContenido = !loading && !error

  return (
    <main
      className={`rutinas-page${tieneCards ? ' rutinas-page--con-cards' : ''}`}
      style={{ backgroundColor: colors.page_background }}
      aria-label="Rutinas"
    >
      <div className="rutinas-page__glow" aria-hidden="true" />

      <div className="rutinas-page__inner">
        <header className="rutinas-hero">
          <div className="rutinas-hero__icon" aria-hidden="true">
            <img src={trainingIcon} alt="" className="rutinas-hero__icon-img" />
          </div>
          <div className="rutinas-hero__copy">
            <p className="rutinas-hero__eyebrow">Rangers Box</p>
            <h1 className="rutinas-hero__title">Mi cronograma</h1>
            {mostrarContenido && (
              <p className="rutinas-hero__meta">
                <span className="rutinas-hero__count">
                  {entrenamientos.length}
                </span>
                <span className="rutinas-hero__count-label">
                  / 7 días programados
                </span>
              </p>
            )}
          </div>
        </header>

        {mostrarContenido && (
          <div className="rutinas-progress" aria-hidden="true">
            <div
              className="rutinas-progress__fill"
              style={{ width: `${progresoSemana}%` }}
            />
          </div>
        )}

        {error && (
          <p className="rutinas-page__error" role="alert">
            {error}
          </p>
        )}

        {mostrarContenido && (
          <div
            className="rutinas-week"
            role="list"
            aria-label="Días de la semana"
          >
            {DIAS_SEMANA.map((d) => {
              const activo = diasReservadosSet.has(d.value)
              return (
                <span
                  key={d.value}
                  role="listitem"
                  className={`rutinas-week__pill${
                    activo ? ' rutinas-week__pill--active' : ''
                  }`}
                  title={d.label}
                >
                  {ABREV_DIA[d.value]}
                </span>
              )
            })}
          </div>
        )}

        {mostrarContenido && !tieneCards && puedeAnadirCronograma && (
          <section className="rutinas-empty" aria-labelledby="rutinas-empty-title">
            <div className="rutinas-empty__panel">
              <h2 id="rutinas-empty-title" className="rutinas-empty__title">
                Tu semana empieza aquí
              </h2>
              <p className="rutinas-empty__text">
                Programa cada día con un objetivo claro. Toca el botón y define
                tu primer entrenamiento.
              </p>
              <button
                type="button"
                className="rutinas-empty__btn"
                onClick={abrirModal}
              >
                <img src={addIcon} alt="" className="rutinas-empty__btn-icon" />
                Crear cronograma
              </button>
            </div>
          </section>
        )}

        {mostrarContenido && tieneCards && (
          <ul className="rutinas-list">
            {entrenamientos.map((item, index) => (
              <li key={item.id || item.dia}>
                <button
                  type="button"
                  className="rutinas-card"
                  onClick={() => abrirEdicion(item)}
                  aria-label={`Editar entrenamiento del ${item.diaLabel || item.dia}`}
                  style={{ '--card-index': index }}
                >
                  <span className="rutinas-card__accent" aria-hidden="true" />
                  <div className="rutinas-card__main">
                    <span className="rutinas-card__dia">
                      {item.diaLabel || item.dia}
                    </span>
                    <h2 className="rutinas-card__titulo">{item.titulo}</h2>
                    <p className="rutinas-card__actividad">{item.actividad}</p>
                  </div>
                  <span className="rutinas-card__action" aria-hidden="true">
                    <ChevronRightIcon className="rutinas-card__chevron" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {mostrarContenido && !puedeAnadirCronograma && (
          <p className="rutinas-page__badge" role="status">
            Semana completa — 7/7 días
          </p>
        )}
      </div>

      {mostrarContenido && tieneCards && puedeAnadirCronograma && (
        <button
          type="button"
          className="rutinas-fab"
          onClick={abrirModal}
          aria-label="Añadir cronograma"
        >
          <span className="rutinas-fab__ring" aria-hidden="true" />
          <img src={addIcon} alt="" className="rutinas-fab__icon" />
        </button>
      )}

      <LoadingOverlay visible={loading} label="Cargando cronograma" />

      <AnadirCronogramaModal
        open={modalAbierto}
        onClose={cerrarModal}
        onSubmit={handleGuardar}
        submitting={guardando}
        error={errorModal}
        diasReservados={diasReservados}
        entrenamientoEditar={entrenamientoEditar}
      />
    </main>
  )
}

export default CuentaRutinas
