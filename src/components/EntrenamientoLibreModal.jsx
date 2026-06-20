import Modal from './Modal.jsx'
import './EntrenamientoLibreModal.css'

function EntrenamientoLibreModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Entrenamiento libre disponible"
      footer={
        <button
          type="button"
          className="entrenamiento-libre-modal__btn"
          onClick={onClose}
        >
          Entendido
        </button>
      }
    >
      <p className="entrenamiento-libre-modal__texto">
        Las clases grupales son opcionales. Puedes entrenar libremente dentro del
        horario de funcionamiento del box y seguir tu propio plan de
        entrenamiento.
      </p>
    </Modal>
  )
}

export default EntrenamientoLibreModal
