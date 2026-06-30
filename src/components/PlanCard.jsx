import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from './Modal.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import './PlanCard.css'

function formatearPrecio(valor) {
  if (typeof valor !== 'number') return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor)
}

function PlanCard({ plan }) {
  const navigate = useNavigate()
  const { usuario } = useUsuario()
  const [showPuntoFisicoModal, setShowPuntoFisicoModal] = useState(false)

  const tienePlanActivo = Boolean(usuario?.planesActivos?.length)
  const soloPuntoFisico = Boolean(plan.soloPuntoFisico)

  const handleClick = (event) => {
    event.preventDefault()
    if (soloPuntoFisico) {
      setShowPuntoFisicoModal(true)
      return
    }

    if (usuario) {
      navigate(`/payment-plan/${plan.id}`, { state: { plan } })
    } else {
      navigate('/login', {
        state: {
          redirectTo: `/payment-plan/${plan.id}`,
          openSignup: true,
        },
      })
    }
  }

  const handleCardClick = () => {
    if (!soloPuntoFisico) return
    setShowPuntoFisicoModal(true)
  }

  const handleCardKeyDown = (event) => {
    if (!soloPuntoFisico) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setShowPuntoFisicoModal(true)
    }
  }

  return (
    <>
      <article
        className={`plan-card${plan.oferta ? ' plan-card--oferta' : ''}${
          soloPuntoFisico ? ' plan-card--clickable' : ''
        }`}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        role={soloPuntoFisico ? 'button' : undefined}
        tabIndex={soloPuntoFisico ? 0 : undefined}
        aria-label={
          soloPuntoFisico
            ? `Ver condiciones del plan ${plan.nombre}`
            : undefined
        }
      >
      {plan.oferta && (
        <div className="plan-card__ribbon">
          <span className="plan-card__ribbon-text">En oferta</span>
        </div>
      )}

      <header className="plan-card__header">
        <h3 className="plan-card__title">{plan.nombre}</h3>
      </header>

      <div className="plan-card__price">
        <span className="plan-card__price-value">
          {formatearPrecio(plan.precio)}
        </span>
        {plan.duracion && (
          <span className="plan-card__price-period">/ {plan.duracion}</span>
        )}
      </div>

      {Number.isFinite(plan.cantidadPersonas) && (
        <p className="plan-card__personas">
          Atletas: {plan.cantidadPersonas}
        </p>
      )}

      <p className="plan-card__description">{plan.descripcion}</p>

      {tienePlanActivo ? (
        <p className="plan-card__active-note">
          <span className="plan-card__active-dot" aria-hidden="true" />
          Ya tienes un plan activo
        </p>
      ) : (
        <button
          type="button"
          className="plan-card__cta"
          onClick={handleClick}
        >
          Quiero este plan
        </button>
      )}
    </article>

      <Modal
        open={showPuntoFisicoModal}
        onClose={() => setShowPuntoFisicoModal(false)}
        title="Este plan, solo se puede activar desde un punto físico"
      >
        <p className="plan-card__point-modal-text">
          {plan.motivo?.trim()
            ? plan.motivo
            : 'Consulta en el punto físico para conocer el motivo y las condiciones de activación.'}
        </p>
      </Modal>
    </>
  )
}

export default PlanCard
