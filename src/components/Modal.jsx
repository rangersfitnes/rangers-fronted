import { useEffect } from 'react'
import './Modal.css'

function Modal({ open, onClose, title, children, footer, className = '' }) {
  useEffect(() => {
    if (!open) return

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={`modal${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Modal'}
    >
      <div
        className="modal__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="modal__dialog">
        <header className="modal__header">
          {title && <h2 className="modal__title">{title}</h2>}
          <button
            type="button"
            className="modal__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="modal__body">{children}</div>

        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}

export default Modal
