import { useEffect, useState } from 'react'
import { responderSolicitudEntrenador } from '../services/personalizadosService.js'
import './SolicitudEntrenadorModal.css'

function SolicitudEntrenadorModal({ open, solicitud, onRespondida }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setError('')
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open || !solicitud) return null

  const nombre = solicitud.entrenadorNombre || 'Un entrenador'

  const handleDecision = async (decision) => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const data = await responderSolicitudEntrenador(solicitud.id, decision)
      onRespondida?.(data.solicitud, data.mensaje)
    } catch (err) {
      setError(err.message || 'No se pudo responder la solicitud')
      setLoading(false)
    }
  }

  return (
    <div
      className="solicitud-entrenador-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="solicitud-entrenador-title"
    >
      <div className="solicitud-entrenador-card">
        <p className="solicitud-entrenador-card__etiqueta">
          Entrenamiento personalizado
        </p>
        <h2
          id="solicitud-entrenador-title"
          className="solicitud-entrenador-card__title"
        >
          Solicitud de entrenador
        </h2>
        <p className="solicitud-entrenador-card__texto">
          <strong>{nombre}</strong> quiere agregarte a su lista de
          entrenamiento personalizado.
        </p>
        <p className="solicitud-entrenador-card__texto">
          Si aceptas, tendrá acceso a tu cronograma y demás datos de
          entrenamiento para diseñar tu plan.
        </p>

        {error && (
          <p className="solicitud-entrenador-card__error" role="alert">
            {error}
          </p>
        )}

        <div className="solicitud-entrenador-card__acciones">
          <button
            type="button"
            className="solicitud-entrenador-card__btn solicitud-entrenador-card__btn--ghost"
            onClick={() => handleDecision('rechazar')}
            disabled={loading}
          >
            {loading ? '…' : 'Rechazar'}
          </button>
          <button
            type="button"
            className="solicitud-entrenador-card__btn solicitud-entrenador-card__btn--primary"
            onClick={() => handleDecision('aceptar')}
            disabled={loading}
          >
            {loading ? 'Guardando…' : 'Aceptar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SolicitudEntrenadorModal
