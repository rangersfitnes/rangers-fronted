import Modal from './Modal.jsx'
import './ConfirmModal.css'

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            className="confirm-modal__btn confirm-modal__btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal__btn confirm-modal__btn--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {message && <p className="confirm-modal__message">{message}</p>}
    </Modal>
  )
}

export default ConfirmModal
