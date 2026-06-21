import Modal from './Modal.jsx'
import { formatearTiempoLaborado } from './CronometroTurnoWidget.jsx'
import './FinJornadaTurnoModal.css'

function FinJornadaTurnoModal({
  open,
  horasTurno,
  tiempoMs,
  onTerminarTurno,
  onContinuarTiempoExtra,
  finalizando,
}) {
  const horasEtiqueta =
    Number(horasTurno) === 1 ? '1 hora' : `${horasTurno} horas`

  return (
    <Modal
      open={open}
      className="modal--fin-jornada"
      title="Jornada laboral completada"
      footer={
        <>
          <button
            type="button"
            className="fin-jornada__btn fin-jornada__btn--extra"
            onClick={onContinuarTiempoExtra}
            disabled={finalizando}
          >
            Continuar tiempo extra
          </button>
          <button
            type="button"
            className="fin-jornada__btn fin-jornada__btn--terminar"
            onClick={onTerminarTurno}
            disabled={finalizando}
          >
            {finalizando ? 'Finalizando…' : 'Terminar turno'}
          </button>
        </>
      }
    >
      <div className="fin-jornada__content">
        <p className="fin-jornada__tiempo" aria-live="polite">
          Tiempo registrado: <strong>{formatearTiempoLaborado(tiempoMs)}</strong>
        </p>
        <p className="fin-jornada__texto">
          Has cumplido las <strong>{horasEtiqueta}</strong> de tu jornada según tu
          esquema laboral. Detén el cronómetro y finaliza tu turno.
        </p>
        <p className="fin-jornada__aviso" role="note">
          Si vas a realizar horas extra, repórtalo al administrador o a tu jefe
          inmediato antes de continuar laborando.
        </p>
      </div>
    </Modal>
  )
}

export default FinJornadaTurnoModal
