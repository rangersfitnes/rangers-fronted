import logo from '../assets/images/logos/logo.webp'
import './LoadingOverlay.css'

function LoadingOverlay({
  visible,
  label,
  useLogo = false,
  labelNormalCase = false,
}) {
  if (!visible) return null

  return (
    <div
      className="loading-overlay"
      role="status"
      aria-live="polite"
      aria-label={label || 'Cargando'}
    >
      {useLogo ? (
        <div className="loading-overlay__logo-wrap" aria-hidden="true">
          <img src={logo} alt="" className="loading-overlay__logo" />
        </div>
      ) : (
        <div className="loading-overlay__spinner" />
      )}
      {label && (
        <span
          className={`loading-overlay__label${
            labelNormalCase ? ' loading-overlay__label--normal' : ''
          }`}
        >
          {label}
        </span>
      )}
    </div>
  )
}

export default LoadingOverlay
