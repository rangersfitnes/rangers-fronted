import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { obtenerMisComidas } from '../services/caloriasService.js'
import {
  DetalleIngesta,
  etiquetaEstadoComida,
  formatearFechaComida,
} from './comidaIngestaUi.jsx'
import './CalcularCaloriasModal.css'

function MisIngestasModal({ open, onClose, onAbrirCalculadora }) {
  const [historial, setHistorial] = useState([])
  const [comidaExpandidaId, setComidaExpandidaId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const cargarHistorial = async (signal) => {
    setLoading(true)
    setError('')
    try {
      const comidas = await obtenerMisComidas({ signal, limite: 40 })
      if (!signal?.aborted) setHistorial(comidas)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudieron cargar tus ingestas')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setHistorial([])
      setComidaExpandidaId(null)
      setError('')
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    cargarHistorial(controller.signal)
    return () => controller.abort()
  }, [open])

  const resumen = useMemo(() => {
    const consumidas = historial.filter(
      (item) => (item.estado || 'consumido') === 'consumido',
    )
    const kcal = consumidas.reduce(
      (acc, item) => acc + (Number(item.caloriasEstimadas) || 0),
      0,
    )
    return {
      total: historial.length,
      consumidas: consumidas.length,
      kcal,
    }
  }, [historial])

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Mis ingestas"
      className="calcular-calorias-modal"
      footer={
        <>
          <button
            type="button"
            className="calcular-calorias__btn calcular-calorias__btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
          {onAbrirCalculadora && (
            <button
              type="button"
              className="calcular-calorias__btn calcular-calorias__btn--primary"
              onClick={onAbrirCalculadora}
              disabled={loading}
            >
              Calcular calorías
            </button>
          )}
        </>
      }
    >
      <p className="calcular-calorias__intro">
        Historial de consultas e ingestas registradas. Solo las marcadas como
        consumidas alimentan futuros resúmenes de la IA.
      </p>

      {!loading && historial.length > 0 && (
        <p className="calcular-calorias__perfil-ok">
          {resumen.consumidas} consumida{resumen.consumidas === 1 ? '' : 's'} ·{' '}
          ~{resumen.kcal} kcal · {resumen.total} registro
          {resumen.total === 1 ? '' : 's'}
        </p>
      )}

      {error && (
        <p className="calcular-calorias__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && historial.length === 0 && (
        <div className="calcular-calorias__placeholder">
          Aún no tienes ingestas. Analiza una foto en Calcular calorías y
          confirma si la consumiste.
        </div>
      )}

      {historial.length > 0 && (
        <section
          className="calcular-calorias__historial calcular-calorias__historial--solo"
          aria-label="Mis ingestas"
        >
          <ul className="calcular-calorias__historial-list">
            {historial.map((item) => {
              const expandida = comidaExpandidaId === item.id
              const estado = item.estado || 'consumido'
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`calcular-calorias__historial-item${
                      expandida
                        ? ' calcular-calorias__historial-item--abierta'
                        : ''
                    }`}
                    onClick={() =>
                      setComidaExpandidaId((actual) =>
                        actual === item.id ? null : item.id,
                      )
                    }
                    aria-expanded={expandida}
                  >
                    <div className="calcular-calorias__historial-main">
                      <span className="calcular-calorias__historial-plato">
                        {item.plato || 'Comida'}
                      </span>
                      <span className="calcular-calorias__historial-kcal">
                        {item.caloriasEstimadas} kcal
                      </span>
                    </div>
                    <span className="calcular-calorias__historial-meta">
                      <span>
                        {formatearFechaComida(item.fechaLocal, item.horaLocal)}
                        <span
                          className={`calcular-calorias__estado calcular-calorias__estado--${estado}`}
                        >
                          {etiquetaEstadoComida(estado)}
                        </span>
                      </span>
                      <span
                        className="calcular-calorias__historial-chevron"
                        aria-hidden="true"
                      >
                        {expandida ? '▴' : '▾'}
                      </span>
                    </span>
                  </button>
                  {expandida && (
                    <div className="calcular-calorias__historial-detalle">
                      <DetalleIngesta
                        comida={item}
                        mostrarFeedback={!item.feedbackInterpretacion}
                        onFeedbackGuardado={(comida) => {
                          setHistorial((prev) =>
                            prev.map((row) =>
                              row.id === comida.id
                                ? { ...row, ...comida }
                                : row,
                            ),
                          )
                        }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <LoadingOverlay visible={loading} label="Cargando ingestas" />
    </Modal>
  )
}

export default MisIngestasModal
