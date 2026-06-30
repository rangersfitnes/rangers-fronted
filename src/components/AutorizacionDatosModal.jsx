import Modal from './Modal.jsx'
import {
  AUTORIZACION_DATOS_PARRAFOS,
  AUTORIZACION_DATOS_TITULO,
} from '../content/autorizacionDatosPersonales.js'
import './AutorizacionDatosModal.css'

function AutorizacionDatosModal({ open, onClose, className = '' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={AUTORIZACION_DATOS_TITULO}
      className={className}
      footer={
        <button
          type="button"
          className="autorizacion-datos__cerrar"
          onClick={onClose}
        >
          Entendido
        </button>
      }
    >
      <div className="autorizacion-datos__texto">
        {AUTORIZACION_DATOS_PARRAFOS.map((parrafo, index) => (
          <p key={index}>{parrafo}</p>
        ))}
      </div>
    </Modal>
  )
}

export default AutorizacionDatosModal
