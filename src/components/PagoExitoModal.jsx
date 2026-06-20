import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import logo from '../assets/images/logos/logo.webp'
import './PagoExitoModal.css'

function PagoExitoModal({ open, onContinue }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="pago-exito-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pago-exito-title"
    >
      <div className="pago-exito-card">
        <div className="pago-exito-card__glow" aria-hidden="true" />

        <img src={logo} alt="Rangers Box" className="pago-exito-card__logo" />

        <span className="pago-exito-card__eyebrow">
          <span className="pago-exito-card__dot" aria-hidden="true" />
          Pago exitoso
        </span>

        <h1 id="pago-exito-title" className="pago-exito-card__title">
          Operación completada
        </h1>

        <div className="pago-exito-card__body">
          <p className="pago-exito-card__lead">
            Tu lugar en Rangers Box está asegurado.
          </p>
          <p className="pago-exito-card__message">
            Cada entrenamiento será una oportunidad para avanzar.
          </p>

          <ul className="pago-exito-card__values" aria-label="Valores">
            <li>Fuerza.</li>
            <li>Resistencia.</li>
            <li>Disciplina.</li>
          </ul>

          <p className="pago-exito-card__closing">
            El trabajo comienza ahora.
          </p>
        </div>

        <button type="button" className="pago-exito-card__cta" onClick={onContinue}>
          Continuar
        </button>
      </div>
    </div>,
    document.body,
  )
}

export default PagoExitoModal
