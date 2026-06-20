import Modal from './Modal.jsx'
import './IniciarJornadaModal.css'

function IniciarJornadaModal({ open, nombre, onIniciar, onClose, submitting }) {
  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      className="modal--jornada"
      title="Iniciar jornada laboral"
      footer={
        <>
          <button
            type="button"
            className="iniciar-jornada__btn iniciar-jornada__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Ahora no
          </button>
          <button
            type="button"
            className="iniciar-jornada__btn"
            onClick={onIniciar}
            disabled={submitting}
          >
            {submitting ? 'Iniciando…' : 'Iniciar jornada'}
          </button>
        </>
      }
    >
      <div className="iniciar-jornada__content">
        <p className="iniciar-jornada__saludo">
          Hola, <strong>{nombre}</strong>
        </p>
        <p className="iniciar-jornada__texto">
          Registra el inicio de tu jornada laboral para llevar el control del tiempo
          trabajado.
        </p>
      </div>
    </Modal>
  )
}

export default IniciarJornadaModal
