import { useEffect } from 'react'
import logo from '../assets/images/logos/logo.webp'
import ChevronRightIcon from './icons/ChevronRightIcon.jsx'
import './BienvenidaModal.css'

function BienvenidaModal({ open, nombre, onContinue }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="bienvenida-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bienvenida-title"
    >
      <div className="bienvenida-card">
        <div className="bienvenida-card__glow" aria-hidden="true" />

        <img
          src={logo}
          alt="Rangers Box"
          className="bienvenida-card__logo"
        />

        <span className="bienvenida-card__eyebrow">
          <span className="bienvenida-card__dot" aria-hidden="true" />
          Bienvenido al equipo
        </span>

        <h1 id="bienvenida-title" className="bienvenida-card__title">
          {nombre || 'Atleta'}
        </h1>

        <p className="bienvenida-card__message">
          Hoy comienza tu evolución. Cada repetición, cada gota de sudor cuenta.
        </p>

        <p className="bienvenida-card__tagline">
          Hechos para resistir.{' '}
          <span className="bienvenida-card__accent">
            Entrenados para vencer.
          </span>
        </p>

        <button
          type="button"
          className="bienvenida-card__cta"
          onClick={onContinue}
        >
          Comenzar
          <ChevronRightIcon className="bienvenida-card__cta-chevron" />
        </button>
      </div>
    </div>
  )
}

export default BienvenidaModal
