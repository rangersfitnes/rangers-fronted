import Modal from './Modal.jsx'
import './ErrorModal.css'

function ErrorModal({ open, message, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Error"
      footer={
        <button type="button" className="error-modal__btn" onClick={onClose}>
          Entendido
        </button>
      }
    >
      <div className="error-modal__content">
        <div className="error-modal__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7v6" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <p className="error-modal__message">{message || 'Ocurrió un error inesperado.'}</p>
      </div>
    </Modal>
  )
}

export default ErrorModal
